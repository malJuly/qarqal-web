import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { I18nService } from '../core/i18n.service';
import { Icon } from '../components/icon';
import { fill, formatMoney } from '../shared/utils/format.util';
import { normaliseAddonKey, parseAddons } from './addons';
import { InsurerLogo } from './insurer-logo';
import { breakdown, insurerName } from './offer.util';
import type { Offer } from './quote.types';

/**
 * Order summary for the chosen offer: plan, add-ons, the price breakdown (always shown, laid out as the
 * app does and adding up to the total), then the total to pay with "Only" and the NCD saving.
 * Shown beside every step after choosing a plan, so the visitor always sees what they're buying and paying.
 *   <app-order-summary [offer]="o" [updating]="repricing()" [changeHref]="quotesUrl" />
 * All figures come from the insurer's response; nothing is recalculated here.
 */
@Component({
  selector: 'app-order-summary',
  imports: [InsurerLogo, Icon],
  template: `
    @let s = i18n.t().quoteFlow.summary;
    @let o = offer();
    @let b = lines();
    <section class="sum" aria-labelledby="sum-title" aria-live="polite">
      <h2 id="sum-title">{{ s.title }}</h2>

      <div class="block">
        <div class="label">
          <span>{{ s.plan }}</span>
          @if (changeHref()) { <a [href]="changeHref()">{{ s.change }}</a> }
        </div>
        <div class="plan">
          <app-insurer-logo [code]="o.provider" [apiLogo]="o.imageUrl" />
          <div>
            <strong>{{ name() }}</strong>
            <span>{{ i18n.t().quoteFlow.covers[o.cover] }}</span>
          </div>
        </div>
        <dl class="facts">
          @if (plateNo()) { <dt>{{ s.vehicle }}</dt><dd>{{ plateNo() }}</dd> }
          @if (b.effectiveDate && b.expiryDate) { <dt>{{ s.period }}</dt><dd>{{ b.effectiveDate }} – {{ b.expiryDate }}</dd> }
          @if (hasSumInsured()) {
            <dt>{{ i18n.t().quoteFlow.results.sumInsured }}</dt>
            <dd>RM {{ money(o.sumInsured) }} <span class="soft">· {{ o.choice.valueType === 'agreed' ? i18n.t().quoteFlow.plan.agreed : i18n.t().quoteFlow.plan.market }}</span></dd>
          }
          @if (o.choice.inclusiveRoadTax) { <dt>{{ s.roadTax }}</dt><dd>{{ i18n.t().quoteFlow.addons.included }}</dd> }
        </dl>
      </div>

      <div class="block">
        <div class="label"><span>{{ s.addons }}</span></div>
        @if (b.addOns.length) {
          <ul class="lines">
            @for (a of b.addOns; track a.code) {
              <li><span>{{ addonTitle(a.code) }}</span><span class="amt">{{ a.premium > 0 ? 'RM ' + money(a.premium) : s.free }}</span></li>
            }
          </ul>
        } @else {
          <p class="muted">{{ s.none }}</p>
        }
      </div>

      <!-- Price breakdown: always open, straight after the add-ons, so the total below needs no explaining. -->
      <div class="block">
        <div class="label"><span>{{ s.breakdown }}</span></div>
        <ul class="lines lines--breakdown">
          <li><span>{{ s.basic }}</span><span class="amt">RM {{ money(b.basic) }}</span></li>
          @if (b.ncdValue > 0) { <li class="less"><span>{{ fill(s.ncd, { pct: b.ncdPercentage }) }}</span><span class="amt">{{ minus(b.ncdValue) }}</span></li> }
          @if (b.addOnsTotal > 0) { <li><span>{{ s.addons }}</span><span class="amt">RM {{ money(b.addOnsTotal) }}</span></li> }
          <li class="sub"><span>{{ s.gross }}</span><span class="amt">RM {{ money(b.gross) }}</span></li>
          @if (b.sst > 0) { <li><span>{{ s.sst }}@if (b.sstPercentage) { {{ ' ' + b.sstPercentage + '%' }} }</span><span class="amt">RM {{ money(b.sst) }}</span></li> }
          @if (b.stampDuty > 0) { <li><span>{{ s.stampDuty }}</span><span class="amt">RM {{ money(b.stampDuty) }}</span></li> }
          @if (b.processingFee > 0) { <li><span>{{ s.processingFee }}</span><span class="amt">RM {{ money(b.processingFee) }}</span></li> }
          @if (b.roadTax > 0) { <li><span>{{ s.roadTax }}</span><span class="amt">RM {{ money(b.roadTax) }}</span></li> }
          @if (b.discount > 0) { <li class="less"><span>{{ s.discount }}</span><span class="amt">{{ minus(b.discount) }}</span></li> }
          @if (b.other > 0) { <li><span>{{ s.other }}</span><span class="amt">RM {{ money(b.other) }}</span></li> }
          @if (b.other < 0) { <li class="less"><span>{{ s.otherLess }}</span><span class="amt">{{ minus(-b.other) }}</span></li> }
        </ul>
      </div>

      <div class="block">
        <div class="label"><span>{{ s.total }}</span></div>
        <p class="total" [class.stale]="updating()"><span class="only">{{ s.only }}</span> RM {{ money(b.total) }}</p>
        @if (updating()) {
          <p class="muted">{{ s.updating }}</p>
        } @else {
          <p class="muted">{{ s.incl }}</p>
        }
        @if (b.ncdValue > 0) {
          <p class="saving"><app-icon name="check" [size]="16" /> {{ fill(s.saving, { amount: money(b.ncdValue), pct: b.ncdPercentage }) }}</p>
        }
      </div>
    </section>`,
  styles: `
    .sum { display: grid; gap: 0; padding: 20px; border: 1px solid var(--line); border-radius: var(--radius); background: #fff; }
    h2 { font-size: 1.0625rem; font-weight: 900; color: var(--navy); margin-bottom: 4px; }
    .block { padding: 14px 0; border-top: 1px solid var(--line); }
    .block:first-of-type { border-top: 0; }
    .block:last-child { padding-bottom: 0; }
    .label { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ink-3); }
    .label a { font-size: 0.875rem; letter-spacing: 0; text-transform: none; color: var(--navy); }
    .plan { display: flex; gap: 12px; align-items: center; }
    .plan div { display: grid; min-width: 0; }
    .plan strong { font-weight: 900; overflow-wrap: anywhere; }
    .plan span { font-size: 0.875rem; color: var(--ink-2); }
    .facts { display: grid; grid-template-columns: auto 1fr; gap: 4px 16px; margin-top: 12px; font-size: 0.875rem; }
    .facts dt { color: var(--ink-3); }
    .facts dd { text-align: right; color: var(--ink); overflow-wrap: anywhere; }
    .soft { color: var(--ink-3); }
    .lines { list-style: none; padding: 0; display: grid; gap: 6px; font-size: 0.875rem; }
    .lines li { display: flex; justify-content: space-between; gap: 12px; }
    .lines .less .amt { color: #067647; }
    .lines .sub { margin-top: 2px; padding-top: 8px; border-top: 1px dashed var(--line); font-weight: 700; }
    .amt { white-space: nowrap; text-align: right; font-variant-numeric: tabular-nums; }
    .muted { font-size: 0.8125rem; color: var(--ink-3); }
    .total { font-size: 1.75rem; font-weight: 900; letter-spacing: -0.02em; line-height: 1.1; color: var(--ink); transition: opacity 0.2s; font-variant-numeric: tabular-nums; }
    .total.stale { opacity: 0.4; }
    .saving { display: inline-flex; align-items: center; gap: 6px; margin-top: 10px; padding: 6px 10px; border-radius: 999px; background: #ecfdf3; color: #067647; font-size: 0.8125rem; font-weight: 700; }
    /* Plain word before the amount, lighter than the figure so the price still leads. */
    .only { margin-right: 4px; font-size: 1.0625rem; font-weight: 700; letter-spacing: 0; color: var(--navy); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderSummary {
  protected readonly i18n = inject(I18nService);
  protected readonly money = formatMoney;
  protected readonly fill = fill;

  readonly offer = input.required<Offer>();
  readonly plateNo = input('');
  /** True while update-quote is running: the total is dimmed. */
  readonly updating = input(false);
  /** Link back to the quote list ("Change"). Leave empty to hide. */
  readonly changeHref = input('');

  /** A deduction, written with a minus sign: "− RM 648.43". */
  protected minus(value: number): string {
    return `− RM ${formatMoney(value)}`;
  }

  protected readonly name = computed(() => insurerName(this.offer().provider));
  protected readonly lines = computed(() => breakdown(this.offer()));
  protected readonly hasSumInsured = computed(() => Number(this.offer().sumInsured) > 0);

  private readonly titles = computed(() => new Map(parseAddons(this.offer()).map((a) => [a.key as string, a.title])));

  /** Add-on name from the insurer's list; the code in capitals if it isn't there. */
  protected addonTitle(code: string): string {
    const t = this.titles().get(normaliseAddonKey(code));
    return t ? (this.i18n.lang() === 'ms' ? t.bm : t.en) : code.replace(/_/g, ' ').toUpperCase();
  }
}
