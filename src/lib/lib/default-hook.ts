import { Hook } from './viewer/help';
import { Single } from './parser/single';
import { Viewer } from './viewer/viewer';
import { Fragment } from './parser/fragment';
import { Contents } from './parser/contents';
import { BlockFormat } from './parser/format';
import { Priority } from './toolbar/help';
import { Parser } from './parser/parser';
import { AbstractData } from './toolbar/utils/abstract-data';
import { TBSelection } from './viewer/selection';
import {
  findFirstPosition,
  findLastChild,
  findRerenderFragment,
  getNextPosition,
  getPreviousPosition
} from './viewer/tools';
import { TBRangePosition } from './viewer/range';

export class DefaultHook implements Hook {
  private selection: Selection;
  private inputStartSelection: TBSelection;
  private editingFragment: Fragment;

  onFocus(event: Event, viewer: Viewer, next: () => void): void {
    viewer.cursor.cleanValue();
    this.inputStartSelection = viewer.selection.clone();
    this.editingFragment = viewer.selection.commonAncestorFragment.clone();
  }

  onSelectStart(event: Event, selection: Selection, next: () => void): void {
    this.selection = selection;
    this.selection.removeAllRanges();
  }

  onCursorMove(event: KeyboardEvent, viewer: Viewer, next: () => void): void {
    viewer.selection.ranges.forEach(range => {
      let p: TBRangePosition;
      switch (event.key) {
        case 'ArrowLeft':
          p = getPreviousPosition(range);
          range.startFragment = p.fragment;
          range.startIndex = p.index;
          range.endFragment = p.fragment;
          range.endIndex = p.index;
          break;
        case 'ArrowRight':
          p = getNextPosition(range);
          range.startFragment = p.fragment;
          range.startIndex = p.index;
          range.endFragment = p.fragment;
          range.endIndex = p.index;
          break
      }
    });
    viewer.selection.apply();
    viewer.cursor.cleanValue();
    this.inputStartSelection = viewer.selection.clone();
    this.editingFragment = viewer.selection.commonAncestorFragment.clone();
  }

  onInput(event: Event, viewer: Viewer, parser: Parser, next: () => void): void {
    if (!viewer.selection.collapsed) {
      this.onDelete(event, viewer, parser, () => {
      });
      this.inputStartSelection = viewer.selection.clone();
      this.editingFragment = viewer.selection.commonAncestorFragment.clone();
    }

    const startIndex = this.inputStartSelection.firstRange.startIndex;
    const selection = viewer.selection;
    const commonAncestorFragment = selection.commonAncestorFragment;

    const c = new Contents();
    commonAncestorFragment.useContents(c);
    this.editingFragment.clone().sliceContents(0).forEach(i => {
      commonAncestorFragment.append(i);
    });
    // commonAncestorFragment.useFormats(this.editingFragment.getFormatMatrix());

    let index = 0;
    viewer.cursor.input.value.replace(/\n+|[^\n]+/g, (str) => {
      if (/\n+/.test(str)) {
        for (let i = 0; i < str.length; i++) {
          const s = new Single('br', parser.getFormatStateByData(new AbstractData({
            tag: 'br'
          })));
          commonAncestorFragment.insert(s, index + startIndex);
          index++;
        }
      } else {
        commonAncestorFragment.insert(str, startIndex + index);
        index += str.length;
      }
      return str;
    });

    selection.firstRange.startIndex = startIndex;
    selection.firstRange.endIndex = startIndex;
    const last = commonAncestorFragment.getContentAtIndex(commonAncestorFragment.contentLength - 1);
    if (startIndex + viewer.cursor.input.selectionStart === commonAncestorFragment.contentLength &&
      last instanceof Single && last.tagName === 'br') {
      commonAncestorFragment.append(new Single('br', parser.getFormatStateByData(new AbstractData({
        tag: 'br'
      }))));
    }
    viewer.rerender();
    viewer.selection.apply(viewer.cursor.input.selectionStart);
  }

  onPaste(event: Event, viewer: Viewer, parser: Parser, next: () => void): void {
    const div = document.createElement('div');
    div.style.cssText = 'width:10px; height:10px; overflow: hidden; position: fixed; left: -9999px';
    div.contentEditable = 'true';
    document.body.appendChild(div);
    div.focus();
    setTimeout(() => {
      const fragment = parser.parse(div, new Fragment(null));
      const contents = new Contents();
      contents.insertElements(fragment.sliceContents(0), 0);
      document.body.removeChild(div);
      const selection = viewer.selection;
      if (!viewer.selection.collapsed) {
        this.onDelete(event, viewer, parser, () => {
        });
      }
      const firstRange = selection.firstRange;
      const newContents = contents.slice(0);
      const last = newContents[newContents.length - 1] as Fragment;

      const commonAncestorFragment = selection.commonAncestorFragment;
      const firstChild = commonAncestorFragment.getContentAtIndex(0);
      const isEmpty = commonAncestorFragment.contentLength === 0 ||
        commonAncestorFragment.contentLength === 1 && firstChild instanceof Single && firstChild.tagName === 'br';

      let index = commonAncestorFragment.getIndexInParent();
      const parent = commonAncestorFragment.parent;
      if (isEmpty) {
        parent.delete(index, index + 1);
      } else {
        let startIndex = firstRange.startIndex;
        this.newLine(viewer, parser);
        firstRange.startFragment = firstRange.endFragment = commonAncestorFragment;
        firstRange.startIndex = firstRange.endIndex = startIndex;
        const firstContent = newContents[0];
        if (firstContent instanceof Fragment) {
          if (!(firstContent.getContentAtIndex(0) instanceof Fragment)) {
            newContents.shift();
            commonAncestorFragment.insertFragmentContents(firstContent, startIndex);
            if (!newContents.length) {
              firstRange.startIndex = firstRange.endIndex = startIndex + firstContent.contentLength;
            }
          }
        }
      }
      if (newContents.length) {
        newContents.forEach(item => {
          parent.insert(item, isEmpty ? index : index + 1);
          index++;
        });
        viewer.rerender();
        const p = findLastChild(last, last.contentLength - 1);
        firstRange.startFragment = firstRange.endFragment = p.fragment;
        firstRange.startIndex = firstRange.endIndex = p.index;
        selection.apply();
      } else {
        viewer.rerender();
        selection.apply();
      }
    });

  }

  onEnter(event: Event, viewer: Viewer, parser: Parser, next: () => void): void {
    viewer.cursor.cleanValue();
    event.preventDefault();
    if (!viewer.selection.collapsed) {
      this.onDelete(event, viewer, parser, () => {
      });
    }
    this.newLine(viewer, parser);
    this.inputStartSelection = viewer.selection.clone();
    this.editingFragment = viewer.selection.commonAncestorFragment.clone();
  }

  onDelete(event: Event, viewer: Viewer, parser: Parser, next: () => void): void {
    viewer.cursor.cleanValue();
    this.inputStartSelection = viewer.selection.clone();
    this.editingFragment = viewer.selection.commonAncestorFragment.clone();
    const selection = viewer.selection;
    selection.ranges.forEach(range => {
      if (range.collapsed) {
        if (range.startIndex > 0) {
          range.commonAncestorFragment.delete(range.startIndex - 1, range.startIndex);
          if (!range.commonAncestorFragment.contentLength) {
            range.commonAncestorFragment.append(new Single('br', parser.getFormatStateByData(new AbstractData({
              tag: 'br'
            }))));
          }
          viewer.rerender();
          selection.apply(-1);
        } else {
          const firstContent = range.startFragment.getContentAtIndex(0);
          if (firstContent instanceof Single && firstContent.tagName === 'br') {
            range.startFragment.delete(0, 1);
          }
          const rerenderFragment = findRerenderFragment(range.startFragment);
          if (range.startFragment.contentLength) {
            if (!rerenderFragment.fragment.parent && rerenderFragment.index === 0) {
              const startFragment = new Fragment();
              parser.getFormatStateByData(new AbstractData({
                tag: 'p'
              })).forEach(item => {
                startFragment.mergeFormat(new BlockFormat({
                  ...item,
                  context: startFragment
                }), true)
              });

              rerenderFragment.fragment.insert(startFragment, 0);
              startFragment.insertFragmentContents(range.startFragment, 0);
              range.startFragment.cleanEmptyFragmentTreeBySelf();
              range.startFragment = startFragment;
              range.startIndex = 0;
            } else {
              const p = findLastChild(rerenderFragment.fragment, rerenderFragment.index - 1);
              p.fragment.insertFragmentContents(range.startFragment, p.index);
              range.startFragment.cleanEmptyFragmentTreeBySelf();
              range.startFragment = p.fragment;
              range.startIndex = p.index;
            }
          } else {
            if (rerenderFragment.index === 0) {
              range.startFragment.cleanEmptyFragmentTreeBySelf();
              if (rerenderFragment.fragment.contentLength) {
                const p = findFirstPosition(rerenderFragment.fragment);
                range.startFragment = p.fragment;
                range.startIndex = 0;
              } else {
                const startFragment = new Fragment();
                parser.getFormatStateByData(new AbstractData({
                  tag: 'p'
                })).forEach(item => {
                  startFragment.mergeFormat(new BlockFormat({
                    ...item,
                    context: startFragment
                  }))
                });

                startFragment.append(new Single('br', parser.getFormatStateByData(new AbstractData({
                  tag: 'br'
                }))));
                rerenderFragment.fragment.insert(startFragment, 0);
                range.startFragment = startFragment;
                range.startIndex = 0;
              }
            } else {
              const p = findLastChild(rerenderFragment.fragment, rerenderFragment.index - 1);
              range.startFragment.cleanEmptyFragmentTreeBySelf();
              range.startFragment = p.fragment;
              range.startIndex = p.index;
            }
          }
          viewer.rerender();
          selection.collapse();
        }
      } else {
        let isDeletedEnd = false;
        range.getSelectedScope().forEach(s => {
          const isDelete = s.startIndex === 0 && s.endIndex === s.context.contentLength;
          if (isDelete && s.context !== range.startFragment) {
            if (s.context === range.endFragment) {
              isDeletedEnd = true;
            }
            s.context.cleanEmptyFragmentTreeBySelf();
          } else {
            s.context.delete(s.startIndex, s.endIndex);
          }
        });
        if (range.endFragment !== range.startFragment && !isDeletedEnd) {
          const startLength = range.startFragment.contentLength;
          const endContents = range.endFragment.sliceContents(0);
          for (const item of endContents) {
            range.startFragment.append(item);
          }
          range.endFragment.getFormatRanges().reduce((v, n) => {
            return v.concat(n);
          }, []).forEach(f => {
            if ([Priority.Inline, Priority.Property].includes(f.handler.priority)) {
              const ff = f.clone();
              ff.startIndex += startLength;
              ff.endIndex += startLength;
              range.startFragment.mergeFormat(ff, true);
            }
          });
          range.endFragment.cleanEmptyFragmentTreeBySelf();
        }
        range.endFragment = range.startFragment;
        range.endIndex = range.startIndex;
        if (range.startFragment.contentLength === 0) {
          range.startFragment.append(new Single('br', parser.getFormatStateByData(new AbstractData({
            tag: 'br'
          }))));
        }
        viewer.rerender();
        selection.collapse();
      }
    });
  }

  private newLine(viewer: Viewer, parser: Parser) {
    const selection = viewer.selection;
    selection.ranges.forEach(range => {
      const commonAncestorFragment = range.commonAncestorFragment;
      if (/th|td/i.test(commonAncestorFragment.token.elementRef.name)) {
        if (range.endIndex === commonAncestorFragment.contentLength) {
          commonAncestorFragment.append(new Single('br', parser.getFormatStateByData(new AbstractData({
            tag: 'br'
          }))));
        }
        commonAncestorFragment.append(new Single('br', parser.getFormatStateByData(new AbstractData({
          tag: 'br'
        }))));
        range.startIndex = range.endIndex = range.endIndex + 1;
        viewer.rerender();
        viewer.selection.apply();
      } else {
        const afterFragment = commonAncestorFragment.delete(range.startIndex,
          commonAncestorFragment.contentLength);
        if (!commonAncestorFragment.contentLength) {
          commonAncestorFragment.append(new Single('br', parser.getFormatStateByData(new AbstractData({
            tag: 'br'
          }))));
        }
        const index = commonAncestorFragment.getIndexInParent();
        parser.getFormatStateByData(new AbstractData({
          tag: 'p'
        })).forEach(item => {
          afterFragment.mergeFormat(new BlockFormat({
            ...item,
            context: afterFragment
          }))
        });
        if (!afterFragment.contentLength) {
          afterFragment.append(new Single('br', parser.getFormatStateByData(new AbstractData({
            tag: 'br'
          }))));
        }
        commonAncestorFragment.parent.insert(afterFragment, index + 1);
        range.startFragment = range.endFragment = afterFragment;
        range.startIndex = range.endIndex = 0;
        viewer.rerender();
      }
    });
    selection.apply();
  }
}
