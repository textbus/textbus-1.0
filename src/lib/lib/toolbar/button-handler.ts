import { Observable, Subject } from 'rxjs';

import { ButtonHandlerOption, Handler } from './help';
import { Matcher, MatchStatus } from '../matcher';

export class ButtonHandler implements Handler {
  readonly elementRef = document.createElement('button');
  matcher: Matcher;
  onCompleted: Observable<void>;
  private eventSource = new Subject<void>();

  constructor(private handler: ButtonHandlerOption) {
    this.matcher = new Matcher(handler.match);
    this.onCompleted = this.eventSource.asObservable();
    this.elementRef.type = 'button';
    this.elementRef.title = (handler.tooltip === null || handler.tooltip === undefined) ? '' : handler.tooltip;
    this.elementRef.innerText = (handler.label === null || handler.label === undefined) ? '' : handler.label;
    this.elementRef.classList.add('tanbo-editor-handler', ...(handler.classes || []));
    this.elementRef.addEventListener('click', () => {
      this.eventSource.next();
    });
  }

  updateStatus(status: MatchStatus): void {
    if (status.inContainer || status.matchAllChild) {
      this.elementRef.classList.add('tanbo-editor-handler-active');
    } else {
      this.elementRef.classList.remove('tanbo-editor-handler-active');
    }
  }
}