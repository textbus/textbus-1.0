import { Fragment } from './fragment';
import { VElement, VTextNode } from './element';
import {
  BackboneAbstractComponent,
  BranchAbstractComponent,
  AbstractComponent,
  DivisionAbstractComponent,
  LeafAbstractComponent
} from './component';
import { Renderer, FormatConfig } from './renderer';
import { FormatRendingContext } from './formatter';
import { makeError } from '../_utils/make-error';

const outputRendererErrorFn = makeError('OutputRenderer');

export class OutputRenderer {
  // 记录已渲染的组件
  private componentVDomCacheMap = new WeakMap<AbstractComponent, VElement>();
  // 记录 fragment 对应的虚拟节点
  private fragmentVDomMapping = new WeakMap<Fragment, VElement>();
  // 记录 fragment 对应的容器节点
  private fragmentContentContainerMapping = new WeakMap<Fragment, VElement>();

  render<T extends AbstractComponent>(component: T): VElement {
    const root = this.rendingComponent(component);
    // hack 防止根节点替换插件时，没有父级虚拟 DOM 节点
    new VElement('html', {
      childNodes: [root]
    })
    // hack end
    return root;
  }

  private rendingFragment(fragment: Fragment, host: VElement, forceUpdate = false): VElement {
    if (fragment.outputDirty || forceUpdate) {
      const {childFormats, containerFormats} = Renderer.formatSeparate(fragment);
      const elements = this.rendingSlotFormats(containerFormats, host);
      const root = elements[0];
      const slot = elements[elements.length - 1];

      if (root !== host) {
        throw outputRendererErrorFn('slot elements cannot be replaced.')
      }
      this.rendingContents(fragment, childFormats, 0, fragment.length).forEach(child => {
        (slot || host).appendChild(child);
      });
      fragment.outputRendered();
      this.fragmentContentContainerMapping.set(fragment, host);
      return host;
    }
    fragment.sliceContents().forEach(content => {
      if (content instanceof AbstractComponent && content.outputChanged) {
        const isDirty = content.outputDirty;
        const oldVDom = this.componentVDomCacheMap.get(content);
        const newVDom = this.rendingComponent(content);
        if (isDirty) {
          this.componentVDomCacheMap.set(content, newVDom);
          oldVDom.parentNode.replaceChild(newVDom, oldVDom);
        }
      }
    })
    return host;
  }

  private rendingComponent(component: AbstractComponent): VElement {
    if (component.outputDirty) {
      let vElement: VElement;
      if (component instanceof DivisionAbstractComponent) {
        vElement = component.render(true, slot => {
          if (slot.outputDirty) {
            const host = component.slotRender(true, (s, contentContainer) => {
              return this.rendingFragment(s, contentContainer);
            })
            this.fragmentVDomMapping.set(slot, host);
            return host;
          } else {
            return this.fragmentVDomMapping.get(slot)
          }
        })
      } else if (component instanceof BranchAbstractComponent || component instanceof BackboneAbstractComponent) {
        vElement = component.render(true, slot => {
          if (slot.outputDirty) {
            const host = component.slotRender(slot, true, (s, contentContainer) => {
              return this.rendingFragment(s, contentContainer);
            })
            this.fragmentVDomMapping.set(slot, host);
            return host;
          } else {
            return this.fragmentVDomMapping.get(slot)
          }
        })
      } else if (component instanceof LeafAbstractComponent) {
        vElement = component.render(true)
      }
      if (!(vElement instanceof VElement)) {
        throw outputRendererErrorFn(`component render method must return a virtual element.`);
      }
      this.componentVDomCacheMap.set(component, vElement);
      component.outputRendered();
      return vElement;
    }
    if (component instanceof DivisionAbstractComponent) {
      if (component.slot.outputDirty) {
        this.replaceSlotView(component, component.slot);
      } else if (component.slot.outputChanged) {
        this.rendingFragment(component.slot, this.fragmentContentContainerMapping.get(component.slot))
      }
    } else if (component instanceof BranchAbstractComponent) {
      component.slots.forEach(fragment => {
        if (fragment.outputDirty) {
          this.replaceSlotView(component, fragment);
        } else if (fragment.outputChanged) {
          this.rendingFragment(fragment, this.fragmentContentContainerMapping.get(fragment));
        }
      })
    } else if (component instanceof BackboneAbstractComponent) {
      Array.from(component).forEach(fragment => {
        if (fragment.outputDirty) {
          this.replaceSlotView(component, fragment);
        } else if (fragment.outputChanged) {
          this.rendingFragment(fragment, this.fragmentContentContainerMapping.get(fragment));
        }
      })
    }
    component.outputRendered();
    return this.componentVDomCacheMap.get(component);
  }

  private replaceSlotView(
    component: DivisionAbstractComponent | BranchAbstractComponent | BackboneAbstractComponent,
    slot: Fragment) {
    const oldView = this.fragmentVDomMapping.get(slot);
    let newView: VElement;
    if (component instanceof DivisionAbstractComponent) {
      const componentRootView = this.componentVDomCacheMap.get(component);
      newView = component.slotRender(true, (slot, contentContainer) => {
        return this.rendingFragment(slot, contentContainer);
      })
      if (oldView === componentRootView) {
        this.componentVDomCacheMap.set(component, newView);
      }
      this.fragmentVDomMapping.set(slot, newView);
    } else {
      newView = component.slotRender(slot, true, (slot, contentContainer) => {
        return this.rendingFragment(slot, contentContainer);
      })
      this.fragmentVDomMapping.set(slot, newView);
    }
    oldView.parentNode.replaceChild(newView, oldView);
  }

  private rendingSlotFormats(formats: FormatConfig[], vDom?: VElement): VElement[] {
    let elements: VElement[] = [];
    if (vDom) {
      elements.push(vDom);
    }
    formats.reduce((vEle, next) => {
      const context: FormatRendingContext = {
        isOutputMode: true,
        effect: next.params.effect,
        formatData: next.params.formatData,
      };
      const newVElement = next.token.render(context, vEle);
      if (newVElement && newVElement !== vEle) {
        elements.push(newVElement);
        return newVElement;
      }
      return vEle;
    }, vDom);
    if (!elements.length) {
      if (vDom) {
        elements = [vDom];
      } else {
        return [];
      }
    }

    elements.reduce((parent, child) => {
      parent.appendChild(child);
      return child;
    })

    return elements;
  }

  private createVDOMByExtractContent(fragment: Fragment, startIndex: number, endIndex: number) {
    const children: Array<VElement | VTextNode> = [];
    const contents = fragment.sliceContents(startIndex, endIndex);
    contents.forEach(item => {
      if (typeof item === 'string') {
        const textNode = new VTextNode(item);
        children.push(textNode);
      } else {
        const vDom = this.rendingComponent(item);
        children.push(vDom);
      }
    });
    return children;
  }

  private rendingContents(fragment: Fragment, formats: FormatConfig[], startIndex: number, endIndex: number) {
    const children: Array<VElement | VTextNode> = [];
    while (startIndex < endIndex) {
      const firstRange = formats.shift();
      if (firstRange) {
        if (startIndex < firstRange.params.startIndex) {
          children.push(...this.createVDOMByExtractContent(fragment, startIndex, firstRange.params.startIndex));
        }
        const childFormats: FormatConfig[] = [firstRange];
        while (true) {
          const f = formats[0];
          if (f && f.params.startIndex === firstRange.params.startIndex && f.params.endIndex === firstRange.params.endIndex) {
            childFormats.push(formats.shift());
          } else {
            break;
          }
        }
        const elements = this.rendingSlotFormats(childFormats);

        const host = elements[0];
        const slot = elements[elements.length - 1];

        const progenyFormats: FormatConfig[] = [];
        let index = 0;
        while (true) {
          const f = formats[index];
          if (f && f.params.startIndex < firstRange.params.endIndex) {
            if (f.params.endIndex <= firstRange.params.endIndex) {
              progenyFormats.push(formats.splice(index, 1)[0]);
            } else {
              const cloneRange: FormatConfig = {
                token: f.token,
                params: {
                  ...f.params,
                  endIndex: firstRange.params.endIndex
                }
              };
              progenyFormats.push(cloneRange);
              f.params.startIndex = firstRange.params.endIndex;
              index++;
            }
          } else {
            break;
          }
        }

        formats = Renderer.calculatePriority(formats);

        if (progenyFormats.length) {
          this.rendingContents(fragment, progenyFormats, firstRange.params.startIndex, firstRange.params.endIndex).forEach(item => {
            slot ? slot.appendChild(item) : children.push(item);
          });
        } else {
          this.createVDOMByExtractContent(fragment, firstRange.params.startIndex, firstRange.params.endIndex).forEach(item => {
            slot ? slot.appendChild(item) : children.push(item);
          })
        }
        host && children.push(host);
        startIndex = firstRange.params.endIndex;
      } else {
        children.push(...this.createVDOMByExtractContent(fragment, startIndex, endIndex));
        break;
      }
    }
    return children;
  }
}
