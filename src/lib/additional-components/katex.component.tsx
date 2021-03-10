import * as Katex from 'katex'
import { Injectable } from '@tanbo/di';

import {
  Component,
  ComponentControlPanelView,
  ComponentLoader,
  ComponentSetter,
  LeafAbstractComponent,
  VElement,
  ViewData
} from '../core/_api';
import { ComponentCreator, Dialog } from '../workbench/_api';
import { Form, FormTextarea } from '../uikit/_api';

const defaultSource = `% \\f is defined as #1f(#2) using the macro
\\f\\relax{x} = \\int_{-\\infty}^\\infty
    \\f\\hat\\xi\\,e^{2 \\pi i \\xi x}
    \\,d\\xi`

function domToVDom(el: HTMLElement): VElement {
  const attrs: { [key: string]: string } = {};
  el.getAttributeNames().forEach(key => {
    attrs[key] = el.getAttribute(key);
  })
  return VElement.createElement(el.tagName.toLowerCase(), attrs, Array.from(el.childNodes).map(child => {
    if (child.nodeType === Node.ELEMENT_NODE) {
      return domToVDom(child as HTMLElement)
    }
    return child.textContent;
  }))
}

@Injectable()
class KatexComponentLoader implements ComponentLoader {
  match(element: HTMLElement): boolean {
    return element.tagName.toLowerCase() === 'tb-katex';
  }

  read(element: HTMLElement): ViewData {
    const component = new KatexComponent(decodeURIComponent(element.getAttribute('source')));
    return {
      component,
      slotsMap: []
    }
  }
}

@Injectable()
export class KatexComponentSetter implements ComponentSetter<KatexComponent> {
  create(instance: KatexComponent): ComponentControlPanelView {
    const textarea = new FormTextarea({
      name: 'source',
      placeholder: '请输入代码',
      label: '',
      value: instance.source
    });
    const el = textarea.elementRef.querySelector('textarea')
    el.style.minHeight = '200px';
    el.style.fontFamily = 'Microsoft YaHei Mono, Menlo, Monaco, Consolas, Courier New, monospace'
    const form = new Form({
      mini: true,
      items: [
        textarea
      ]
    })
    form.onComplete.subscribe(map => {
      instance.source = map.get('source');
      instance.markAsDirtied();
    });
    return {
      title: '数学公式设置',
      view: form.elementRef
    }
  }
}

@Component({
  loader: new KatexComponentLoader(),
  links: [{
    rel: 'stylesheet',
    href: '//cdn.jsdelivr.net/npm/katex@0.13.0/dist/katex.min.css',
    integrity: 'sha384-t5CR+zwDAROtph0PXGte6ia8heboACF9R5l/DiY+WZ3P2lxNgvJkQk5n7GPvLMYw',
    crossOrigin: 'anonymous'
  }],
  providers: [{
    provide: ComponentSetter,
    useClass: KatexComponentSetter
  }],
  styles: [
    `tb-katex, .katex-display, .katex, .katex-html{display: inline-block} tb-katex{margin-left: 0.5em; margin-right: 0.5em}`
  ]
})
export class KatexComponent extends LeafAbstractComponent {
  block = false;

  constructor(public source = defaultSource) {
    super('tb-katex');
  }

  render(): VElement {
    let htmlString: string;
    try {
      htmlString = Katex.renderToString(this.source, {
        displayMode: true,
        leqno: false,
        fleqn: false,
        throwOnError: true,
        errorColor: '#cc0000',
        strict: 'warn',
        output: 'html',
        trust: false,
        macros: {'\\f': '#1f(#2)'}
      })
    } catch (e) {
      htmlString = '';
    }
    const dom = new DOMParser().parseFromString(htmlString, 'text/html').body.children[0] as HTMLElement;
    return new VElement('tb-katex', {
      attrs: {
        source: encodeURIComponent(this.source)
      },
      childNodes: dom ? [domToVDom(dom)] : []
    })
  }

  clone(): KatexComponent {
    return new KatexComponent(this.source);
  }
}

export const katexComponentExample: ComponentCreator = {
  name: '数学公式',
  example: `<img src="data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg width="100" height="70" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40.541"><path d="M4.618 27.925c-.299.299-.591.478-.874.538-.284.06-1.039.105-2.264.135H0v2.062h.493c.508-.09 2.66-.135 6.456-.135 3.796 0 5.948.045 6.456.135h.493v-2.062h-1.48c-1.764-.029-2.765-.209-3.004-.538-.09-.119-.135-1.584-.135-4.394v-4.259l2.062-2.018a83.544 83.544 0 002.063-1.972c.209-.209.388-.373.538-.493l3.901 5.873c2.331 3.587 3.661 5.62 3.99 6.098.09.179.135.359.135.538 0 .778-.688 1.166-2.062 1.166h-.359v2.062h.493c.628-.09 2.764-.135 6.412-.135.269 0 .673.008 1.211.022.538.015.956.022 1.255.022.298 0 .68.008 1.143.022.463.015.807.03 1.031.045.224.015.366.022.426.022h.359v-2.062h-.942c-1.255-.029-2.152-.194-2.69-.493a3.197 3.197 0 01-1.076-1.031l-5.179-7.779c-3.273-4.917-4.91-7.39-4.91-7.42 0-.029 1.33-1.33 3.99-3.901 2.66-2.57 4.065-3.93 4.215-4.08C26.6 2.817 28.379 2.219 30.62 2.1h.628V.037h-.269c-.03 0-.135.008-.314.022-.179.015-.434.03-.762.045a18.99 18.99 0 01-.852.022c-.209 0-.523.008-.942.022-.419.015-.747.022-.986.022-3.408 0-5.366-.045-5.873-.135h-.448v2.062h.179l.202.022.247.022c.836.209 1.255.643 1.255 1.3-.06.24-.12.404-.179.493-.06.12-2.272 2.317-6.636 6.591l-6.546 6.367-.045-6.95c0-4.663.015-7.024.045-7.084.06-.508.897-.762 2.511-.762h2.062V.037h-.493c-.509.09-2.661.135-6.456.135C3.152.172 1 .127.492.037H0v2.062h1.48c1.225.03 1.98.075 2.264.135.284.06.575.24.874.538v25.153zm34.924-16.858h1.793v-.269c.029-.119.074-.478.135-1.076.239-3.198.836-5.201 1.793-6.008.747-.628 1.763-1.046 3.049-1.255.298-.029 1.15-.045 2.556-.045h1.211c.687 0 1.113.022 1.278.067.164.045.291.202.381.471.029.06.045 4.23.045 12.509v12.375c-.24.329-.613.538-1.121.628-1.076.09-2.421.135-4.035.135h-1.345v2.062h.583c.628-.09 3.377-.135 8.25-.135 4.872 0 7.622.045 8.25.135h.583v-2.062h-1.345c-1.614 0-2.959-.045-4.035-.135-.509-.09-.882-.298-1.121-.628V15.461c0-8.279.015-12.449.045-12.509.09-.269.216-.426.381-.471.164-.045.59-.067 1.278-.067h1.211c1.674 0 2.825.075 3.452.224 1.136.329 1.957.807 2.466 1.435.747.867 1.225 2.75 1.435 5.649.06.598.104.957.135 1.076v.269h1.793v-.269c0-.06-.134-1.763-.404-5.111C67.97 2.34 67.82.636 67.791.576v-.27H40.394v.269c0 .06-.135 1.764-.404 5.111-.269 3.348-.419 5.052-.448 5.111v.27zm60.461 19.593v-2.062h-.359c-.658-.06-1.226-.254-1.704-.583-.478-.329-.717-.702-.717-1.121 0-.209.015-.329.045-.359.029-.09 1.031-1.629 3.004-4.618.448-.687.836-1.293 1.166-1.816.329-.523.605-.956.829-1.3.224-.343.411-.62.56-.829.149-.209.254-.343.314-.404l.135-.135 1.659 2.556a514.118 514.118 0 013.273 5.111c1.076 1.704 1.614 2.6 1.614 2.69 0 .209-.314.397-.942.56-.628.165-1.196.247-1.704.247h-.269v2.062h.493c.687-.09 2.869-.135 6.546-.135 3.318 0 5.201.045 5.649.135H120v-2.062h-1.39c-1.166-.029-1.958-.09-2.376-.179-.419-.09-.747-.269-.986-.538-.09-.09-1.667-2.526-4.73-7.308-3.064-4.782-4.596-7.203-4.596-7.263 0-.029.986-1.584 2.959-4.663 2.092-3.139 3.183-4.753 3.273-4.842 1.016-1.046 2.75-1.614 5.201-1.704h.762V.037h-.359c-.359.09-2.003.135-4.932.135-3.468 0-5.396-.045-5.784-.135h-.404v2.062h.359c.926.09 1.614.389 2.062.897.388.389.493.747.314 1.076 0 .03-.778 1.248-2.331 3.654-1.555 2.406-2.347 3.609-2.376 3.609-.06 0-.979-1.397-2.757-4.192-1.779-2.795-2.668-4.237-2.668-4.327.06-.149.404-.306 1.031-.471.628-.164 1.195-.247 1.704-.247h.224V.037h-.493c-.658.09-2.84.135-6.546.135-3.318 0-5.201-.045-5.649-.135h-.404v2.062h1.525c1.614 0 2.69.224 3.228.673.09.09 1.464 2.212 4.125 6.367 2.66 4.155 3.99 6.262 3.99 6.322 0 .03-1.188 1.868-3.564 5.515a2726.32 2726.32 0 01-3.744 5.739c-.957 1.166-2.765 1.793-5.425 1.883h-.763v2.062h.359c.359-.09 2.002-.135 4.932-.135 3.467 0 5.395.045 5.784.135h.448z"/><path d="M37.736 15.499h-3.429c-2.264 0-3.396-.011-3.396-.034l1.715-5.077 1.681-5.043.672 1.984a629.242 629.242 0 011.715 5.077l1.042 3.093zm-6.153 8.573v-1.547h-.168c-.493 0-.958-.095-1.395-.286-.437-.19-.723-.431-.857-.723a.491.491 0 01-.101-.303c0-.134.224-.863.672-2.185l.672-1.984h7.834l.807 2.387c.538 1.614.807 2.443.807 2.488 0 .403-.785.605-2.353.605h-.437v1.547h.336c.336-.067 1.95-.101 4.841-.101 2.51 0 3.934.034 4.27.101h.303v-1.547h-1.009c-1.166-.022-1.872-.146-2.118-.37a1.261 1.261 0 01-.235-.336c-.516-1.591-1.855-5.581-4.018-11.969C37.271 3.461 36.178.256 36.156.233c-.09-.132-.359-.21-.808-.233h-.303c-.359 0-.572.09-.639.269-.023.023-.611 1.754-1.765 5.194a16100.31 16100.31 0 01-5.262 15.65c-.449.874-1.479 1.345-3.093 1.412h-.504v1.547h.235c.269-.067 1.401-.101 3.396-.101 2.174 0 3.463.034 3.866.101h.304zm36.735 13.734c-.299.299-.591.478-.874.538-.284.06-1.039.105-2.264.135H63.7v2.062h26.229v-.135c.06-.09.381-2.085.964-5.986s.889-5.896.919-5.986v-.135h-1.793v.135c-.03.06-.105.464-.224 1.211-.269 1.793-.613 3.244-1.031 4.349-.509 1.375-1.248 2.399-2.219 3.071-.972.673-2.324 1.114-4.058 1.323-.419.03-1.973.045-4.663.045h-2.287c-1.375 0-2.152-.074-2.331-.224-.09-.06-.15-.164-.179-.314-.03-.06-.045-2.107-.045-6.142v-6.008h2.421c1.943.03 3.139.12 3.587.269.836.24 1.405.666 1.704 1.278.298.613.478 1.547.538 2.802v.897h1.793V18.437h-1.793v.897c-.06 1.255-.24 2.19-.538 2.802-.299.613-.867 1.039-1.704 1.278-.448.15-1.644.24-3.587.269h-2.421v-5.425c0-3.646.015-5.499.045-5.56.09-.298.269-.463.538-.493.239-.06 1.853-.09 4.842-.09 1.733 0 2.75.015 3.049.045 2.451.15 4.177.74 5.179 1.771 1.001 1.031 1.681 2.952 2.04 5.761.06.538.104.852.135.942v.179h1.793v-.179c0-.029-.209-1.763-.628-5.201l-.628-5.201v-.179H63.7v2.062h1.48c1.225.03 1.98.075 2.264.135.284.06.575.24.874.538v25.018z"/></svg>')}">`,
  category: 'TextBus',
  factory(dialog: Dialog) {
    const textarea = new FormTextarea({
      name: 'source',
      placeholder: '请输入代码',
      label: '源代码',
      value: defaultSource
    });
    const el = textarea.elementRef.querySelector('textarea')
    el.style.width = '300px';
    el.style.minHeight = '200px';
    el.style.fontFamily = 'Microsoft YaHei Mono, Menlo, Monaco, Consolas, Courier New, monospace'
    const form = new Form({
      title: '数学公式设置',
      items: [
        textarea
      ]
    })
    dialog.dialog(form.elementRef);
    return new Promise(resolve => {
      const sub = form.onComplete.subscribe(data => {
        dialog.close();
        resolve(new KatexComponent(data.get('source')));
        sub.unsubscribe();
      })
      const sub2 = form.onClose.subscribe(() => {
        dialog.close();
        sub.unsubscribe();
        sub2.unsubscribe();
      })
    })
  }
}
