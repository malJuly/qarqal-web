import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { GetApp } from '../components/get-app';
import { I18nService } from '../core/i18n.service';
import { ApiError } from '../core/qarqal-api';
import { Alert } from '../shared/ui/alert';
import { CheckCard } from '../shared/ui/check-card';
import { LoadingOverlay } from '../shared/ui/loading-overlay';
import { SelectField, type SelectOption } from '../shared/ui/select-field';
import { TextField } from '../shared/ui/text-field';
import { fill, formatMoney } from '../shared/utils/format.util';
import {
  defaultSelection, driverRules, filterAddons, parseAddons,
  type Addon, type AddonKey, type AddonSelection, type Bilingual, type DriverRules, type NamedDriver,
} from './addons';
import { NamedDrivers } from './named-drivers';
import { isThirdParty, snapToRange, sumInsuredInRange, sumInsuredRange, sumInsuredStep, valueTypes, variantsOf } from './plan';
import { PlanOptions } from './plan-options';
import { QuoteService } from './quote.service';
import type { Offer, PlanChoice, ValueType } from './quote.types';

/**
 * Everything the visitor can set on the selected insurer, with live pricing: the plan options
 * (variant, market/agreed value, sum insured, road tax), add-ons and named drivers.
 *   <app-plan-customiser [offer]="selected()" [vehicleType]="v.vehicleType" (updated)="store.select($event)" />
 *
 * - When the offer's insurer or cover changes, everything is rebuilt from that offer and update-quote runs
 *   once: that call is also what tells the backend which insurer was chosen.
 * - Every change re-prices with update-quote behind a blocking "Updating your quotation" popup. Typed
 *   amounts wait for a pause (add-on amount) or for the visitor to finish (sum insured). Only the latest
 *   answer is applied.
 * - (updated) gives the re-priced offer; `updating`, `error` and `invalid` are readable by the parent.
 * Rules follow the admin purchase wizard, which follows the app.
 */
const TYPING_PAUSE_MS = 800;

@Component({
  selector: 'app-plan-customiser',
  imports: [PlanOptions, CheckCard, SelectField, TextField, Alert, NamedDrivers, LoadingOverlay, GetApp],
  template: `
    @let a = i18n.t().quoteFlow.addons;
    @if (error()) {
      <app-alert tone="error">
        {{ error() }}
        <button type="button" class="retry" (click)="reprice()">{{ i18n.t().quoteFlow.results.retry }}</button>
      </app-alert>
    }

    @if (choice(); as c) {
      @if (showPlan()) {
        <app-plan-options [choice]="c" [variants]="variants()" [valueTypes]="types()" [showValue]="!thirdParty()"
          [range]="range()" [step]="step()" [sumInvalid]="invalid()" [roadTax]="offer().roadTax"
          (variantChange)="setVariant($event)" (valueTypeChange)="setValueType($event)"
          (sumChange)="setSum($event)" (sumCommit)="commitSum()" (roadTaxChange)="setRoadTax($event)" />
      }
    }

    <section class="panel" aria-labelledby="addons-title">
      <div class="head">
        <h2 id="addons-title">{{ a.title }}</h2>
        <p>{{ addons().length ? a.lede : a.none }}</p>
      </div>
      @if (resetNote()) { <app-alert>{{ a.resetNote }}</app-alert> }

      @if (addons().length) {
        <div class="list">
          @for (ad of addons(); track ad.key) {
            <app-check-card [inputId]="'addon-' + ad.key" [title]="label(ad.title)" [description]="label(ad.description)"
              [meta]="priceOf(ad)" [checked]="isOn(ad)" (checkedChange)="toggle(ad, $event)">
              @if (ad.kind === 'plan') {
                <app-select-field [inputId]="'addon-' + ad.key + '-plan'" [label]="a.plan" [options]="planOptions(ad)"
                  [placeholder]="a.choosePlan" [value]="planOf(ad)" (valueChange)="set(ad.key, $event)" />
              } @else if (ad.kind === 'amount' && ad.range) {
                <app-text-field [inputId]="'addon-' + ad.key + '-amount'" [label]="a.amount" inputmode="decimal"
                  [value]="amountOf(ad)" (valueChange)="setAmount(ad, $event)" [error]="amountErr()[ad.key]" />
                <p class="hint">{{ fill(a.range, { min: money(ad.range.min), max: money(ad.range.max) }) }}</p>
              }
            </app-check-card>
          }
          @if (rules()?.allowed) {
            <app-named-drivers [rules]="rules()!" [drivers]="drivers()" (driversChange)="setDrivers($event)" />
          }
        </div>
      }
    </section>
    <app-loading-overlay [open]="updating()" [message]="a.updatingQuote">
      <app-get-app [text]="i18n.t().quoteFlow.earnInApp" [badgeHeight]="34" [gutter]="124" />
    </app-loading-overlay>`,
  styles: `
    :host { display: grid; gap: 16px; }
    .panel { display: grid; gap: 14px; }
    .head h2 { font-size: 1.125rem; font-weight: 900; color: var(--navy); }
    .head p { font-size: var(--fs-small); color: var(--ink-2); }
    .list { display: grid; gap: 10px; }
    .hint { margin-top: 6px; font-size: 0.8125rem; color: var(--ink-3); }
    .retry { margin-left: 8px; padding: 0; border: 0; background: none; font: 700 inherit; color: inherit; text-decoration: underline; cursor: pointer; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanCustomiser {
  protected readonly i18n = inject(I18nService);
  private readonly quotes = inject(QuoteService);
  protected readonly fill = fill;
  protected readonly money = formatMoney;

  readonly offer = input.required<Offer>();
  /** e.g. "Motorcycle": applies the app's add-on allow-list and defaults. */
  readonly vehicleType = input('');
  /** The offer after update-quote (same insurer and cover, new prices, the choices just made). */
  readonly updated = output<Offer>();

  /** True while update-quote is running. */
  readonly updating = signal(false);
  /** Message when the last update failed; empty otherwise. */
  readonly error = signal('');

  // ── Plan options ──
  protected readonly choice = signal<PlanChoice | null>(null);
  /** The offer as first chosen: source of the real sum insured ranges and slider step. */
  private readonly base = signal<Offer | null>(null);
  private readonly variantChanged = signal(false);
  protected readonly variants = computed(() => variantsOf(this.offer()));
  /**
   * Value types to offer: whatever the insurer offered in its first quote, plus anything the latest
   * response adds. Not the latest response alone: update-quote can come back without the range of the
   * type that isn't selected, which would hide that option and leave the visitor unable to switch back.
   */
  protected readonly types = computed<ValueType[]>(() => {
    const offered = new Set([...valueTypes(this.base() ?? this.offer()), ...valueTypes(this.offer())]);
    return (['market', 'agreed'] as const).filter((t) => offered.has(t));
  });
  protected readonly thirdParty = computed(() => isThirdParty(this.offer()));
  protected readonly range = computed(() => {
    const c = this.choice();
    return c ? sumInsuredRange(this.offer(), this.base() ?? this.offer(), c.valueType, this.variantChanged()) : null;
  });
  protected readonly step = computed(() => sumInsuredStep(this.offer(), this.base() ?? this.offer()));
  /** The sum insured is outside the insurer's range: the parent should block "Continue". */
  readonly invalid = computed(() => {
    const c = this.choice();
    return !!c && !sumInsuredInRange(this.offer(), c.sumInsured, this.range());
  });
  /** Nothing to set for third party without variants or road tax: hide the section. */
  protected readonly showPlan = computed(() => !this.thirdParty() || this.variants().length > 0 || this.offer().roadTax.supported);

  // ── Add-ons ──
  protected readonly addons = signal<Addon[]>([]);
  protected readonly rules = signal<DriverRules | null>(null);
  protected readonly selection = signal<AddonSelection>({});
  protected readonly drivers = signal<NamedDriver[]>([]);
  protected readonly amountErr = signal<Partial<Record<AddonKey, string>>>({});
  /** Shown after add-ons were cleared by a value type change. */
  protected readonly resetNote = signal(false);
  /** Plan and amount cards stay open after ticking, before a value is chosen. */
  private readonly opened = signal(new Set<AddonKey>());

  /** Insurer + cover: everything is rebuilt only when this changes, not on every price update. */
  private readonly key = computed(() => `${this.offer().provider}|${this.offer().cover}`);
  private timer: ReturnType<typeof setTimeout> | null = null;
  /** Increments per request; only the latest response is applied. */
  private seq = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.timer && clearTimeout(this.timer));
    effect(() => {
      this.key();
      untracked(() => this.rebuild());
    });
  }

  private rebuild(): void {
    const o = this.offer();
    this.base.set(o);
    this.variantChanged.set(false);
    this.choice.set({ ...o.choice });
    this.resetAddons(o);
    this.resetNote.set(false);
    // Confirms the price and records the chosen insurer on the quotation.
    void this.reprice();
  }

  /** Add-ons back to this insurer's defaults (the app's defaults plus what's already in the price). */
  private resetAddons(o: Offer): void {
    const list = filterAddons(parseAddons(o), o, this.vehicleType());
    this.addons.set(list);
    this.rules.set(driverRules(o, list));
    this.selection.set(defaultSelection(o, list, this.vehicleType()));
    this.drivers.set([]);
    this.opened.set(new Set());
    this.amountErr.set({});
  }

  // ── Plan option changes ──
  private patch(part: Partial<PlanChoice>): void {
    this.choice.update((c) => (c ? { ...c, ...part } : c));
  }

  protected setVariant(nvic: string): void {
    const variant = this.variants().find((v) => v.nvic === nvic);
    if (!variant) return;
    this.variantChanged.set(true);
    const value = Number(variant.marketValue ?? 0);
    // A new variant brings its own value; third party keeps 0.
    this.patch({ nvic, vehmakeminor: String(variant.vehmakeminor ?? ''), ...(value > 0 && !this.thirdParty() ? { sumInsured: value } : {}) });
    void this.reprice();
  }

  /** Switching market/agreed keeps the amount if it fits, else the new minimum, and resets add-ons (as in the app). */
  protected setValueType(valueType: ValueType): void {
    const c = this.choice();
    if (!c || c.valueType === valueType) return;
    const hadAddons = Object.values(this.selection()).some((v) => v === true || (typeof v === 'string' && v !== '') || (typeof v === 'number' && v > 0)) || this.drivers().length > 0;
    this.patch({ valueType });
    this.patch({ sumInsured: snapToRange(c.sumInsured, this.range()) });
    this.resetAddons(this.base() ?? this.offer());
    this.resetNote.set(hadAddons);
    void this.reprice();
  }

  protected setSum(value: number): void {
    this.patch({ sumInsured: value });
  }

  protected commitSum(): void {
    if (!this.invalid()) void this.reprice();
  }

  protected setRoadTax(on: boolean): void {
    this.patch({ inclusiveRoadTax: on });
    void this.reprice();
  }

  // ── Add-on changes ──
  protected label(b: Bilingual): string {
    return this.i18n.lang() === 'ms' ? b.bm : b.en;
  }

  protected priceOf(ad: Addon): string {
    if (ad.included) return this.i18n.t().quoteFlow.addons.included;
    const n = Number(ad.premium);
    return Number.isFinite(n) && n > 0 ? `RM ${formatMoney(n)}` : '';
  }

  protected isOn(ad: Addon): boolean {
    const v = this.selection()[ad.key];
    if (ad.kind === 'toggle') return v === true;
    return this.opened().has(ad.key) || (ad.kind === 'plan' ? this.planOf(ad) !== '' : Number(v) > 0);
  }

  protected planOf(ad: Addon): string {
    const v = this.selection()[ad.key];
    return typeof v === 'string' ? v : '';
  }

  protected amountOf(ad: Addon): string {
    const v = Number(this.selection()[ad.key]);
    return v > 0 ? String(v) : '';
  }

  protected planOptions(ad: Addon): SelectOption[] {
    return ad.plans.map((p) => {
      const n = Number(p.premium);
      return { value: p.id, label: `${this.label(p.title)}${Number.isFinite(n) && n > 0 ? ` (RM ${formatMoney(n)})` : ''}` };
    });
  }

  protected toggle(ad: Addon, on: boolean): void {
    this.opened.update((s) => { const n = new Set(s); if (on) n.add(ad.key); else n.delete(ad.key); return n; });
    if (ad.kind === 'toggle') { this.set(ad.key, on); return; }
    if (!on) {
      this.amountErr.update((e) => ({ ...e, [ad.key]: '' }));
      // Nothing was chosen yet: no need to re-price.
      const had = ad.kind === 'plan' ? this.planOf(ad) !== '' : Number(this.selection()[ad.key]) > 0;
      if (had) this.set(ad.key, ad.kind === 'plan' ? '' : 0);
    } else if (ad.kind === 'amount' && ad.range) {
      // Start at the lowest cover; the visitor can raise it.
      this.set(ad.key, ad.range.min);
    }
  }

  protected setAmount(ad: Addon, raw: string): void {
    if (!ad.range) return;
    const v = Number(raw);
    const ok = raw !== '' && Number.isFinite(v) && v >= ad.range.min && v <= ad.range.max;
    const a = this.i18n.t().quoteFlow.addons;
    this.amountErr.update((e) => ({ ...e, [ad.key]: ok ? '' : fill(a.range, { min: formatMoney(ad.range!.min), max: formatMoney(ad.range!.max) }) }));
    if (!ok) return;
    this.selection.update((s) => ({ ...s, [ad.key]: v }));
    // Wait for typing to stop, so the popup doesn't appear mid-number.
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.reprice(), TYPING_PAUSE_MS);
  }

  protected set(key: AddonKey, value: boolean | string | number): void {
    this.resetNote.set(false);
    this.selection.update((s) => ({ ...s, [key]: value }));
    void this.reprice();
  }

  protected setDrivers(list: NamedDriver[]): void {
    this.drivers.set(list);
    void this.reprice();
  }

  // ── Pricing ──
  protected async reprice(): Promise<void> {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    const choice = this.choice();
    if (!choice) return;
    const mine = ++this.seq;
    this.error.set('');
    this.updating.set(true);
    try {
      const next = await this.quotes.update(this.offer(), choice, this.selection(), this.drivers());
      if (mine === this.seq) this.updated.emit(next);
    } catch (err) {
      if (mine !== this.seq) return;
      const a = this.i18n.t().quoteFlow.addons;
      this.error.set(err instanceof ApiError && err.message ? `${a.failed} (${err.message})` : a.failed);
    } finally {
      if (mine === this.seq) this.updating.set(false);
    }
  }
}
