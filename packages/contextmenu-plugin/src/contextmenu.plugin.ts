import { Injectable, TBPlugin, Input, I18n, RootComponent, BrComponent, TBSelection } from '@textbus/core';
import { BlockComponent } from '@textbus/components';

@Injectable()
export class ContextmenuPlugin implements TBPlugin {
  constructor(private input: Input,
              private i18n: I18n,
              private selection: TBSelection,
              private rootComponent: RootComponent) {
  }

  setup() {
    this.input.addContextMenus([{
      iconClasses: ['textbus-icon-insert-paragraph-before'],
      label: this.i18n.get('plugins.contextmenu.insertParagraphBefore'),
      action: () => {
        this.insertParagraph(true)
      }
    }, {
      iconClasses: ['textbus-icon-insert-paragraph-after'],
      label: this.i18n.get('plugins.contextmenu.insertParagraphAfter'),
      action: () => {
        this.insertParagraph(false)
      }
    }])
  }

  private insertParagraph(insertBefore: boolean) {
    const selection = this.selection;
    if (selection.rangeCount === 0) {
      return;
    }
    const firstRange = selection.firstRange;
    let component = selection.commonAncestorComponent;

    if (component === this.rootComponent) {
      const commonAncestorFragmentScope = firstRange.getCommonAncestorFragmentScope();
      component = insertBefore ?
        commonAncestorFragmentScope.startChildComponent :
        commonAncestorFragmentScope.endChildComponent;
    }

    const parentFragment = component.parentFragment;
    const p = new BlockComponent('p');
    p.slot.append(new BrComponent());

    insertBefore ? parentFragment.insertBefore(p, component) : parentFragment.insertAfter(p, component);

    selection.removeAllRanges();
    firstRange.setStart(p.slot, 0);
    firstRange.collapse();
    selection.addRange(firstRange);
  }
}
