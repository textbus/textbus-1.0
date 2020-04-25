import { Plugin } from './help';
import { EditableFragment } from './editable-fragment';
import { MatchState } from '../../../lib/lib/matcher/matcher';

export class Parser {
  constructor(private plugins: Plugin[]) {
  }

  parse(el: HTMLElement) {
    return this.readTemplate(el, new EditableFragment());
  }

  private readTemplate(el: Node, slot: EditableFragment) {
    if (el.nodeType === 1) {
      this.plugins.forEach(plugin => {
        if (plugin.matcher.match(el as HTMLElement) === MatchState.Valid) {
          const template = plugin.getViewTemplate();
          slot.contents.append(template);
          template.from(el as HTMLElement).forEach(item => {
            this.readTemplate(item.from, item.inSlot);
          });
        }
      });
    } else if (el.nodeType === 3) {
      slot.contents.append(el.textContent);
    }
    return slot;
  }
}
