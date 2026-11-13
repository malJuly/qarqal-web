import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { I18nService } from '../core/i18n.service';
import { CheckCard } from '../shared/ui/check-card';
import { PillTabs, type PillTab } from '../shared/ui/pill-tabs';
import { RangeField } from '../shared/ui/range-field';
import { SelectField, type SelectOption } from '../shared/ui/select-field';
import { fill, formatMoney } from '../shared/utils/format.util';
import type { Range } from './plan';
import type { PlanChoice, RawVariant, ValueType } from './quote.types';

/**
 * The "Plan" section for one insurer: vehicle variant, market/agreed value, sum insured and road tax.
 * Presentational: it shows the current choice and reports what the visitor changed; the parent
 * (plan-customiser) applies the rules and re-prices.
 *   <app-plan-options [choice]="choice()" [variants]="…" [valueTypes]="…" [range]="…" [step]="…" [showValue]="…"
 *     [roadTax]="offer.roadTax" (variantChange)="…" (valueTypeChange)="…" (sumChange)="…" (sumCommit)="…" (roadTaxChange)="…" />
 */
@Component({
  selector: 'app-plan-options',
  imports: [SelectField, PillTabs, RangeField, CheckCard],
  template: `
    @let p = i18n.t().quoteFlow.plan;
    @let c = choice();
    <section class="plan" aria-labelledby="plan-title">
      <h2 id="plan-title">{{ p.title }}</h2>

      @if (variantOptions().length) {
        <app-select-field inputId="plan-variant" [label]="p.variant" [options]="variantOptions()" [placeholder]="p.chooseVariant"
          [value]="c.nvic" (valueChange)="variantChange.emit($event)" />
      }

      @if (showValue()) {
        <div class="group">
          <span class="label" id="plan-valuetype">{{ p.valueType }}</span>
          @if (valueTabs().length > 1) {
            <app-pill-tabs [compact]="true" [tabs]="valueTabs()" [selected]="c.valueType" (selectedChange)="valueTypeChange.emit($event)" [ariaLabel]="p.valueType" />
          } @else {
            <p class="only">{{ c.valueType === 'agreed' ? p.agreed : p.market }}</p>
          }
          <p class="help">{{ c.valueType === 'agreed' ? p.agreedHelp : p.marketHelp }}</p>
        </div>

        <app-range-field inputId="plan-sum" [label]="p.sumInsured" [hint]="p.sumHint" prefix="RM"
          [min]="range()?.min ?? 0" [max]="range()?.max ?? 0" [step]="step()" [value]="c.sumInsured"
          (valueChange)="sumChange.emit($event)" (commit)="sumCommit.emit()" [error]="sumError()" />
      }

      @if (roadTax().supported) {
        <app-check-card inputId="plan-roadtax" [title]="p.roadTax" [description]="p.roadTaxHelp"
          [meta]="roadTax().amount > 0 ? '+ RM ' + money(roadTax().amount) : ''"
          [checked]="c.inclusiveRoadTax" (checkedChange)="roadTaxChange.emit($event)" />
      }
    </section>`,
  styles: `
    .plan { display: grid; gap: 16px; padding: 20px; border: 1px solid var(--line); border-radius: var(--radius); background: #fff; }
    h2 { font-size: 1.125rem; font-weight: 900; color: var(--navy); }
    .group { display: grid; gap: 6px; }
    .label { font-size: 0.8125rem; font-weight: 700; color: var(--ink-2); }
    .only { font-weight: 700; }
    .help { font-size: 0.8125rem; color: var(--ink-3); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanOptions {
  protected readonly i18n = inject(I18nService);
  protected readonly money = formatMoney;

  readonly choice = input.required<PlanChoice>();
  readonly variants = input<RawVariant[]>([]);
  readonly valueTypes = input<ValueType[]>([]);
  /** False for third party: no value type or sum insured. */
  readonly showValue = input(true);
  readonly range = input<Range | null>(null);
  readonly step = input(100);
  /** True when the sum insured is outside the insurer's range. */
  readonly sumInvalid = input(false);
  readonly roadTax = input<{ supported: boolean; amount: number }>({ supported: false, amount: 0 });

  readonly variantChange = output<string>();
  readonly valueTypeChange = output<ValueType>();
  /** While dragging or typing. */
  readonly sumChange = output<number>();
  /** When the visitor finishes choosing the amount. */
  readonly sumCommit = output<void>();
  readonly roadTaxChange = output<boolean>();

  protected readonly variantOptions = computed<SelectOption[]>(() =>
    this.variants().filter((v) => v.nvic).map((v) => ({ value: String(v.nvic), label: String(v.vehVariantDesc || v.nvic) })));

  protected readonly valueTabs = computed<PillTab<ValueType>[]>(() => {
    const p = this.i18n.t().quoteFlow.plan;
    return this.valueTypes().map((t) => ({ id: t, label: t === 'agreed' ? p.agreed : p.market }));
  });

  protected readonly sumError = computed(() => {
    const r = this.range();
    return this.sumInvalid() && r ? fill(this.i18n.t().quoteFlow.plan.sumRange, { min: formatMoney(r.min), max: formatMoney(r.max) }) : '';
  });
}
