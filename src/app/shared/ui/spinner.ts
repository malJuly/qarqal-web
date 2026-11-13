import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { QLoader } from './q-loader';

/**
 * Centred loading state: the QarQal loader and a message, announced to screen readers. Anything
 * projected into it shows under the message (e.g. something to do while waiting).
 *   <app-spinner [label]="t.loading" />
 *   <app-spinner [label]="t.loading"><app-get-app /></app-spinner>
 */
@Component({
  selector: 'app-spinner',
  imports: [QLoader],
  template: `
    <div class="spinner" role="status">
      <app-q-loader [size]="84" />
      @if (label()) { <p>{{ label() }}</p> }
      <ng-content />
    </div>`,
  styles: `
    .spinner { display: grid; justify-items: center; gap: 16px; padding: 40px 0; color: var(--ink-2); text-align: center; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Spinner {
  readonly label = input('');
}
