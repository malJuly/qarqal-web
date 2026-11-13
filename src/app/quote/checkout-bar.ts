import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { formatMoney } from '../shared/utils/format.util';

/**
 * Action bar for a checkout step, sticky at the bottom on phones and tablets: the running total on the left, the step's
 * primary button (projected) on the right. Keeps the price and the next action in reach on phones.
 *   <app-checkout-bar [label]="t.total" [total]="offer.totalContribution" [dim]="updating()">
 *     <button class="btn btn--primary" …>Continue</button>
 *   </app-checkout-bar>
 */
@Component({
  selector: 'app-checkout-bar',
  host: { '[class.floating]': 'floating()' },
  template: `
    <div class="bar">
      <div class="total" [class.dim]="dim()">
        <span>{{ label() }}</span>
        <strong>RM {{ money(total()) }}</strong>
      </div>
      <div class="action"><ng-content /></div>
    </div>`,
  styles: `
    :host { position: sticky; bottom: 0; z-index: 5; display: block; margin: 8px calc(var(--gutter) * -1) 0; }
    .bar {
      display: flex; align-items: center; justify-content: space-between; gap: 16px;
      padding: 12px var(--gutter) calc(12px + env(safe-area-inset-bottom));
      background: #fff; border-top: 1px solid var(--line); box-shadow: 0 -6px 20px rgb(4 11 36 / 0.08);
    }
    .total { display: grid; min-width: 0; transition: opacity 0.2s; }
    .total.dim { opacity: 0.4; }
    .total span { font-size: 0.75rem; color: var(--ink-3); }
    .total strong { font-size: 1.25rem; font-weight: 900; letter-spacing: -0.01em; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .action { flex: 0 1 auto; display: flex; }
    @media (min-width: 640px) {
      :host { margin-inline: 0; }
      .bar { padding: 14px 20px; border: 1px solid var(--line); border-radius: var(--radius) var(--radius) 0 0; }
    }
    /* Wide screens: the order summary sits beside the step, so the bar stops floating and ends the column. */
    @media (min-width: 960px) {
      :host(:not(.floating)) { position: static; margin-top: 0; }
      :host(:not(.floating)) .bar { border-radius: var(--radius); box-shadow: none; }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutBar {
  readonly label = input.required<string>();
  readonly total = input.required<string | number>();
  /** Keep it sticky on wide screens too, for steps with no order summary beside them. */
  readonly floating = input(false);
  /** Dim the total while it's being re-priced. */
  readonly dim = input(false);
  protected readonly money = formatMoney;
}
