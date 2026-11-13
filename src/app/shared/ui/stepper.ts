import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../../components/icon';

/**
 * Progress through a multi-step flow: a bar per step, done steps ticked, the current one named.
 * Made for a dark band (white on blue). Phones show only the current step's label.
 *   <app-stepper [steps]="['Quotes', 'Add-ons', 'Details', 'Payment']" [current]="2" ariaLabel="Purchase progress" />
 */
@Component({
  selector: 'app-stepper',
  imports: [Icon],
  template: `
    <ol class="steps" [attr.aria-label]="ariaLabel()">
      @for (label of steps(); track label; let i = $index) {
        <li [class.done]="i + 1 < current()" [class.active]="i + 1 === current()" [attr.aria-current]="i + 1 === current() ? 'step' : null">
          <span class="dot">
            @if (i + 1 < current()) { <app-icon name="check" [size]="14" /> } @else { {{ i + 1 }} }
          </span>
          <span class="label">{{ label }}</span>
        </li>
      }
    </ol>`,
  styles: `
    .steps { display: flex; gap: 8px; list-style: none; margin: 0; padding: 0; }
    li {
      flex: 1 1 0; min-width: 0; display: flex; align-items: center; gap: 8px;
      padding-top: 10px; border-top: 3px solid rgb(255 255 255 / 0.22);
      font-size: 0.8125rem; color: var(--night-ink-2);
    }
    li.done { border-top-color: var(--cyan-bright); }
    li.active { border-top-color: #fff; color: #fff; font-weight: 700; }
    .dot {
      flex: none; display: grid; place-items: center; width: 24px; height: 24px; border-radius: 999px;
      background: rgb(255 255 255 / 0.14); font-size: 0.75rem; font-weight: 700;
    }
    li.done .dot { background: var(--cyan-bright); color: #fff; }
    li.active .dot { background: #fff; color: var(--navy); }
    .label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    @media (max-width: 639px) { li:not(.active) .label { display: none; } li:not(.active) { flex: 0 1 44px; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Stepper {
  readonly steps = input.required<string[]>();
  /** 1-based. */
  readonly current = input.required<number>();
  readonly ariaLabel = input('');
}
