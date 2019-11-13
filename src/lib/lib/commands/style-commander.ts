import { Observable } from 'rxjs';

import { ReplaceModel, UpdateCommander } from './commander';
import { FormatState } from '../matcher/matcher';
import { TBSelection } from '../selection/selection';
import { Handler } from '../toolbar/handlers/help';

export class StyleCommander implements UpdateCommander {
  private value: string | number;

  constructor(private name: string,
              value: string | number | Observable<string | number>) {
  }

  updateValue(value: string | number) {
    this.value = value;
  }

  command(selection: TBSelection, handler: Handler, overlap: boolean): void {
  }

  render(state: FormatState, rawElement?: HTMLElement): ReplaceModel {
    return;
  }
}