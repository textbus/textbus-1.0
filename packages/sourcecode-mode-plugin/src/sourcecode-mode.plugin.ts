import { fromEvent, Subscription } from 'rxjs';
import { distinctUntilChanged, map, tap } from 'rxjs/operators';
import pretty from 'pretty';
import codemirror from 'codemirror';
import 'codemirror/mode/htmlmixed/htmlmixed';

import {
  Injectable,
  TBPlugin,
  EditorController,
  Editor,
  Layout,
  createElement,
  I18n,
  createTextNode
} from '@textbus/core';

@Injectable()
export class SourcecodeModePlugin implements TBPlugin {
  private codeMirrorInstance: codemirror.Editor
  private subs: Subscription[] = [];
  private btn: HTMLButtonElement;
  private container = createElement('div', {
    classes: ['textbus-sourcecode-mode-plugin-container']
  });

  constructor(private layout: Layout,
              private editor: Editor,
              private i18n: I18n,
              private editorController: EditorController) {
  }

  setup() {
    const el = createElement('div', {
      classes: [],
      children: [
        this.btn = createElement('button', {
          classes: ['textbus-status-bar-btn'],
          attrs: {
            type: 'button'
          },
          children: [createTextNode(this.i18n.get('plugins.sourcecodeMode.switchText') || '源代码')]
        }) as HTMLButtonElement
      ]
    });
    this.layout.bottomBar.appendChild(el);
    this.layout.workbench.appendChild(this.container);

    this.subs.push(
      fromEvent(this.btn, 'click').subscribe(() => {
        this.editorController.sourceCodeMode = !this.editorController.sourceCodeMode;
      }),
      this.editorController.onStateChange.pipe(tap(status => {
        this.btn.disabled = status.readonly;
        if (this.codeMirrorInstance) {
          this.codeMirrorInstance.setOption('readOnly', this.editorController.readonly ? 'nocursor' : false);
        }
      }), map(status => {
        return status.sourcecodeMode
      }), distinctUntilChanged()).subscribe(b => {
        this.switch(b);
      })
    )
  }

  onDestroy() {
    this.subs.forEach(i => i.unsubscribe());
  }

  private switch(b: boolean) {
    this.layout.dashboard.style.display = b ? 'none' : '';
    this.container.style.display = b ? 'block' : 'none'
    if (b) {
      this.btn.classList.add('textbus-status-bar-btn-active');
      this.codeMirrorInstance = codemirror(this.container, {
        lineNumbers: true,
        mode: 'text/html',
        theme: 'textbus',
        indentUnit: 2,
        lineWrapping: true,
        value: pretty(this.editor.getContents().content)
      })
      this.codeMirrorInstance.setOption('readOnly', this.editorController.readonly ? 'nocursor' : false);

    } else {
      this.btn.classList.remove('textbus-status-bar-btn-active');
      if (this.codeMirrorInstance) {
        const value = this.codeMirrorInstance.getValue().split('\n').map(i => i.trim()).join('');
        this.editor.setContents(value);
        this.codeMirrorInstance = null;
        this.container.innerHTML = '';
      }
    }
  }
}
