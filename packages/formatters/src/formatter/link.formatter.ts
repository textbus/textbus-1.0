import {
  InlineFormatter,
  FormatData,
  VElement,
  FormatterPriority, FormatRendingContext
} from '@textbus/core';

export class LinkFormatter extends InlineFormatter {
  private link = document.createElement('a');

  constructor() {
    super({
      tags: ['a']
    }, FormatterPriority.InlineTag);
  }

  read(node: HTMLElement): FormatData {
    const data = this.extractData(node, {
      tag: true,
      attrs: ['target', 'href', 'data-href']
    });
    if (data.attrs.get('href')) {
      data.attrs.delete('data-href');
    }
    return data;
  }

  render(context: FormatRendingContext) {
    const el = new VElement('a');
    const target = context.formatData.attrs.get('target');
    const href = context.formatData.attrs.get('href') || context.formatData.attrs.get('data-href');
    target && el.attrs.set('target', target);

    this.link.href = href as string
    if (href && this.link.hostname) {
      el.attrs.set(context.isOutputMode ? 'href' : 'data-href', href);
    }
    return el;
  }
}

export const linkFormatter = new LinkFormatter();
