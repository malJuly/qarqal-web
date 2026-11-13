import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { I18nService } from '../core/i18n.service';
import { Icon } from '../components/icon';
import { formatMoney } from '../shared/utils/format.util';
import { InsurerLogo } from './insurer-logo';
import { insurerName, tilePrice } from './offer.util';
import type { Offer } from './quote.types';

/**
 * One insurer as a square glass tile: name on top, logo, then the gross contribution. A "Lowest price"
 * banner marks the cheapest. The whole tile is the control (a radio): tap to select. Use in a grid
 * inside an element with role="radiogroup".
 *   <app-offer-card [offer]="o" [selected]="isSelected(o)" [lowest]="i === 0" (choose)="pick(o)" />
 * The tile shows the gross contribution; the total to pay lives in the order summary.
 */
@Component({
  selector: 'app-offer-card',
  imports: [InsurerLogo, Icon],
  template: `
    @let r = i18n.t().quoteFlow.results;
    @let o = offer();
    <button type="button" class="tile" role="radio" [attr.aria-checked]="selected()" [class.tile--on]="selected()" [class.tile--lowest]="lowest()"
      [attr.aria-label]="name() + ', ' + r.gross + ' RM ' + money(price()) + (lowest() ? ', ' + r.lowest : '')" (click)="choose.emit(o)">
      @if (lowest()) { <span class="banner">{{ r.lowest }}</span> }
      @if (selected()) { <span class="mark" aria-hidden="true"><app-icon name="check" [size]="12" /></span> }
      <span class="name">{{ name() }}</span>
      <app-insurer-logo class="logo" [code]="o.provider" [apiLogo]="o.imageUrl" />
      <span class="price">
        <span class="price__label">{{ r.gross }}</span>
        <strong>RM {{ money(price()) }}</strong>
      </span>
    </button>`,
  styles: `
    :host { display: block; min-width: 0; }
    .tile {
      position: relative; width: 100%; aspect-ratio: 1; display: grid; grid-template-rows: auto 1fr auto; justify-items: center; align-items: center;
      gap: 4px; padding: 12px 6px 10px; overflow: hidden; cursor: pointer; text-align: center; font: inherit; color: var(--ink);
      /* Glass: a soft white sheen over the page tint, a light edge, a gentle lift. */
      background: linear-gradient(160deg, rgb(255 255 255 / 0.95), rgb(255 255 255 / 0.62));
      border: 1px solid rgb(255 255 255 / 0.9); border-radius: 18px;
      box-shadow: 0 8px 24px rgb(30 60 150 / 0.1), inset 0 1px 0 #fff;
      backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
      transition: transform 0.2s var(--ease-out), box-shadow 0.2s, border-color 0.2s;
      --logo-w: 100%; --logo-h: clamp(30px, 9vw, 40px);
    }
    .tile:hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgb(30 60 150 / 0.16), inset 0 1px 0 #fff; }
    .tile:focus-visible { outline: 3px solid rgb(0 160 230 / 0.5); outline-offset: 2px; }
    .tile--on { border-color: var(--navy); box-shadow: 0 0 0 2px var(--navy), 0 10px 26px rgb(30 60 150 / 0.2); background: linear-gradient(160deg, #fff, #eef3ff); }
    /* Lowest price: a cyan edge with a soft glow that breathes, so it reads first in the grid. */
    .tile--lowest {
      padding-top: 26px; border-color: var(--cyan);
      box-shadow: 0 0 0 2px var(--cyan), 0 0 18px 2px rgb(0 158 225 / 0.55), 0 10px 26px rgb(30 60 150 / 0.18);
      animation: glow 2.4s ease-in-out infinite;
    }
    .tile--lowest.tile--on { border-color: var(--navy); box-shadow: 0 0 0 2px var(--navy), 0 0 20px 3px rgb(0 158 225 / 0.6), 0 10px 26px rgb(30 60 150 / 0.2); animation: none; }
    @keyframes glow {
      50% { box-shadow: 0 0 0 2px var(--cyan), 0 0 28px 6px rgb(0 158 225 / 0.8), 0 10px 26px rgb(30 60 150 / 0.18); }
    }
    .banner { position: absolute; top: 0; left: 0; right: 0; padding: 4px 4px; background: linear-gradient(90deg, var(--navy-deep), var(--cyan)); color: #fff; font-size: 0.6875rem; font-weight: 900; letter-spacing: 0.03em; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .mark { position: absolute; top: 6px; right: 6px; display: grid; place-items: center; width: 20px; height: 20px; border-radius: 999px; background: var(--navy); color: #fff; }
    .tile--lowest .mark { top: 26px; }
    .name { font-size: 0.8125rem; font-weight: 900; line-height: 1.2; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .logo { width: 76%; display: grid; place-items: center; }
    .logo ::ng-deep .tile { border: 0; background: none; padding: 0; }
    .price { display: grid; justify-items: center; line-height: 1.15; }
    .price__label { font-size: 0.5625rem; font-weight: 700; color: var(--navy); white-space: nowrap; }
    .price strong { font-size: 0.9375rem; font-weight: 900; white-space: nowrap; font-variant-numeric: tabular-nums; }
    @media (prefers-reduced-motion: reduce) { .tile:hover { transform: none; } .tile--lowest { animation: none; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OfferCard {
  protected readonly i18n = inject(I18nService);
  protected readonly money = formatMoney;

  readonly offer = input.required<Offer>();
  readonly selected = input(false);
  /** Marks the cheapest offer in the list. */
  readonly lowest = input(false);
  readonly choose = output<Offer>();

  protected readonly name = computed(() => insurerName(this.offer().provider));
  protected readonly price = computed(() => tilePrice(this.offer()));
}
