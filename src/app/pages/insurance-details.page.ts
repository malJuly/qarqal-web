import { ChangeDetectionStrategy, Component, afterNextRender, computed, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { usePageLang } from '../core/page-lang';
import { ApiError, QarqalApi } from '../core/qarqal-api';
import { SeoService } from '../core/seo.service';
import { CheckoutBar } from '../quote/checkout-bar';
import { OrderSummary } from '../quote/order-summary';
import { PolicyHolderService, type HolderForm, type Lookup } from '../quote/policy-holder.service';
import { QuoteLayout } from '../quote/quote-layout';
import { QuoteStore } from '../quote/quote.store';
import { Alert } from '../shared/ui/alert';
import { PhoneInput } from '../shared/ui/phone-input';
import { SelectField, type SelectOption } from '../shared/ui/select-field';
import { Spinner } from '../shared/ui/spinner';
import { TextField } from '../shared/ui/text-field';
import { matchState } from '../shared/utils/address.util';
import { dobFromNric, genderFromNric } from '../shared/utils/nric.util';
import { isValidMobile, normaliseMobile } from '../shared/utils/phone.util';

// /insurance/quote/details?quotation_id=<id> — policy holder details for the chosen offer (step 2 of 3).
// The ID type/number come from the hero form while it's in memory; after a reload the visitor re-enters them
// (they're never stored). On success: POST /policy-holder-profile, then /insurance/quote/payment.

type Field = 'fullName' | 'idNumber' | 'email' | 'mobile' | 'dob' | 'gender' | 'maritalStatus' | 'address1' | 'city' | 'state' | 'postcode';
type View = 'loading' | 'form' | 'missing';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const today = (): string => new Date().toISOString().slice(0, 10);

@Component({
  selector: 'app-insurance-details-page',
  imports: [QuoteLayout, OrderSummary, CheckoutBar, TextField, SelectField, PhoneInput, Alert, Spinner],
  template: `
    @let f = i18n.t().quoteFlow;
    @let d = f.details;
    <app-quote-layout [title]="d.title" [lede]="d.lede" subpath="insurance/quote/details/" [step]="2" [hasAside]="view() === 'form'"
      [backHref]="backHref()" [backLabel]="d.back">
      @switch (view()) {
        @case ('loading') { <div class="panel"><app-spinner /></div> }

        @case ('missing') {
          <div class="panel state">
            <p>{{ f.page.missing }}</p>
            <div><a class="btn btn--primary" [href]="i18n.home()">{{ f.page.newQuote }}</a></div>
          </div>
        }

        @case ('form') {
          <form class="form" (submit)="submit($event)" novalidate>
            <section class="panel">
              <h2>{{ d.holder }}</h2>
              <div class="grid">
                <app-text-field class="full" inputId="h-name" [label]="d.fullName" autocomplete="name" [maxLength]="100"
                  [(value)]="form.fullName" [error]="errs().fullName" />
                <app-select-field inputId="h-idtype" [label]="i18n.t().quote.idType" [options]="idTypes()" [(value)]="form.idType" [disabled]="idLocked()" />
                <app-text-field inputId="h-idnumber" [label]="idLabel()" [maxLength]="20"
                  [readonly]="idLocked()" [(value)]="form.idNumber" [error]="errs().idNumber" />
                <app-text-field inputId="h-dob" type="date" [label]="d.dob" [max]="maxDob" [(value)]="form.dob" [error]="errs().dob" />
                <app-select-field inputId="h-gender" [label]="d.gender" [options]="genders()" [placeholder]="d.choose"
                  [(value)]="form.gender" [error]="errs().gender" />
                <app-select-field inputId="h-marital" [label]="d.marital" [options]="maritals()" [placeholder]="d.choose"
                  [(value)]="form.maritalStatus" [error]="errs().maritalStatus" />
                @if (form.idType() === '2') {
                  <app-text-field inputId="h-nationality" [label]="d.nationality" [(value)]="form.nationality" />
                }
              </div>
            </section>

            <section class="panel">
              <h2>{{ d.contact }}</h2>
              <div class="grid">
                <app-text-field inputId="h-email" type="email" [label]="d.email" autocomplete="email" [(value)]="form.email" [error]="errs().email" />
                <app-phone-input inputId="h-mobile" [label]="f.points.mobile" [placeholder]="f.points.mobileHint"
                  [(value)]="form.mobile" [error]="errs().mobile" />
              </div>
            </section>

            <section class="panel">
              <h2>{{ d.address }}</h2>
              <div class="grid">
                <app-text-field class="full" inputId="h-a1" [label]="d.address1" autocomplete="address-line1" [maxLength]="255"
                  [(value)]="form.address1" [error]="errs().address1" />
                <app-text-field class="full" inputId="h-a2" [label]="d.address2" autocomplete="address-line2" [optional]="d.optional" [(value)]="form.address2" />
                <app-text-field class="full" inputId="h-a3" [label]="d.address3" autocomplete="address-line3" [optional]="d.optional" [(value)]="form.address3" />
                <app-text-field inputId="h-city" [label]="d.city" autocomplete="address-level2" [(value)]="form.city" [error]="errs().city" />
                <app-text-field inputId="h-postcode" [label]="i18n.t().quote.postcode" inputmode="numeric" autocomplete="postal-code" [maxLength]="5"
                  [(value)]="form.postcode" [error]="errs().postcode" />
                <app-select-field class="full" inputId="h-state" [label]="d.state" [options]="states()" [placeholder]="d.choose"
                  [(value)]="form.state" [error]="errs().state" />
              </div>
            </section>

            @if (serverErr()) { <app-alert tone="error">{{ serverErr() }}</app-alert> }

            @if (offer(); as o) {
              <app-checkout-bar [label]="f.summary.total" [total]="o.totalContribution">
                <button class="btn btn--primary" type="submit" [disabled]="busy()">{{ busy() ? d.saving : d.continue }}</button>
              </app-checkout-bar>
            }
          </form>
        }
      }
      @if (view() === 'form' && offer(); as o) {
        <app-order-summary aside [offer]="o" [plateNo]="plateNo()" [changeHref]="quotesHref()" />
      }
    </app-quote-layout>`,
  styles: `
    .panel { display: grid; gap: 14px; padding: 20px; background: #fff; border: 1px solid var(--line); border-radius: var(--radius); }
    .panel h2 { font-size: 1.0625rem; font-weight: 900; color: var(--navy); }
    .state p { color: var(--ink-2); }
    .form { display: grid; gap: 16px; }
    .grid { display: grid; gap: 12px; }
    @media (min-width: 640px) { .grid { grid-template-columns: 1fr 1fr; } .full { grid-column: 1 / -1; } }
    .btn:disabled { opacity: 0.7; cursor: progress; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InsuranceDetailsPage {
  protected readonly i18n = usePageLang();
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(QarqalApi);
  private readonly holder = inject(PolicyHolderService);
  private readonly store = inject(QuoteStore);
  protected readonly maxDob = today();

  protected readonly view = signal<View>('loading');
  protected readonly busy = signal(false);
  protected readonly serverErr = signal('');
  protected readonly errs = signal<Partial<Record<Field, string>>>({});
  private readonly lookups = signal<{ genders: Lookup[]; maritalStatuses: Lookup[]; states: Lookup[] } | null>(null);

  protected readonly offer = this.store.selected;
  private readonly pending = this.store.pending();
  /** ID from the hero form can't change here: the quote was priced for it. */
  protected readonly idLocked = signal(!!this.pending);

  // One signal per field, so the shared field components can bind with [(value)].
  protected readonly form = {
    fullName: signal(''),
    idType: signal(String(this.pending?.idType ?? 1)),
    idNumber: signal(this.pending?.idNumber ?? ''),
    email: signal(''),
    mobile: signal(this.api.mobile() ?? ''),
    // NRIC holders: date of birth starts from the number (YYMMDD), as in the app. Still editable.
    dob: signal(this.pending?.idType === 1 ? dobFromNric(this.pending.idNumber) ?? '' : ''),
    gender: signal(''),
    maritalStatus: signal(''),
    nationality: signal('Malaysian'),
    address1: signal(''),
    address2: signal(''),
    address3: signal(''),
    city: signal(''),
    state: signal(''),
    postcode: signal(this.pending?.postcode ?? ''),
  };

  private readonly quoteId = this.route.snapshot.queryParamMap.get('quotation_id') ?? '';
  /** Plate as the insurer returned it, else as typed in the hero form. */
  protected readonly plateNo = (): string => this.store.load(this.quoteId)?.vehicle.plateNo ?? this.pending?.plateNo ?? '';
  protected readonly idLabel = computed(() => {
    const n = this.i18n.t().quote.idNumber;
    return this.form.idType() === '2' ? n.passport : this.form.idType() === '3' ? n.company : n.nric;
  });
  protected readonly quotesHref = computed(() => `${this.i18n.home()}insurance/quote?quotation_id=${encodeURIComponent(this.quoteId)}`);
  protected readonly backHref = computed(() => `${this.i18n.home()}insurance/quote?quotation_id=${encodeURIComponent(this.quoteId)}`);
  protected readonly idTypes = computed<SelectOption[]>(() => {
    const t = this.i18n.t().quote.idTypes;
    return [{ value: '1', label: t.nric }, { value: '2', label: t.passport }, { value: '3', label: t.company }];
  });
  private readonly isMalay = computed(() => this.i18n.lang() === 'ms');
  private readonly toOptions = (list: Lookup[] = []): SelectOption[] =>
    list.map((x) => ({ value: String(x.id), label: this.isMalay() && x.name_ms ? x.name_ms : x.name }));
  protected readonly genders = computed(() => this.toOptions(this.lookups()?.genders));
  protected readonly maritals = computed(() => this.toOptions(this.lookups()?.maritalStatuses));
  // State goes to the backend by name.
  /** The insurer's own name for the state, kept as an extra option when it isn't in the list (the app sends it as-is). */
  private readonly extraState = signal('');
  protected readonly states = computed<SelectOption[]>(() => {
    const list = (this.lookups()?.states ?? []).map((s) => ({ value: s.name, label: s.name }));
    return this.extraState() ? [{ value: this.extraState(), label: this.extraState() }, ...list] : list;
  });

  constructor() {
    const t = this.i18n.t();
    inject(SeoService).apply({ t, subpath: 'insurance/quote/details/', title: `${t.quoteFlow.details.title} | QarQal` });
    afterNextRender(() => void this.init());
    // Runs when the ID number or type changes, and once the gender list has loaded.
    effect(() => {
      this.form.idNumber(); this.form.idType(); this.lookups();
      untracked(() => this.fillFromNric());
    });
  }

  private async init(): Promise<void> {
    if (!this.offer()?.quotationId) { this.view.set('missing'); return; }
    try {
      this.lookups.set(await this.holder.getLookups());
    } catch {
      this.serverErr.set(this.i18n.t().quoteFlow.details.lookupsFailed);
    }
    this.prefillAddress();
    this.view.set('form');
  }

  /**
   * City, state and postcode from the quote (the backend resolves them from the postcode during
   * update-quote; the app pre-fills the same way). Only fills what's still empty; all stay editable.
   */
  private prefillAddress(): void {
    const loc = this.offer()?.location;
    if (!loc) return;
    if (!this.form.postcode() && loc.postcode) this.form.postcode.set(loc.postcode);
    if (!this.form.city() && loc.city) this.form.city.set(loc.city);
    if (!this.form.state() && loc.state) {
      const names = (this.lookups()?.states ?? []).map((s) => s.name);
      const match = matchState(loc.state, names);
      if (!match) this.extraState.set(loc.state);
      this.form.state.set(match ?? loc.state);
    }
  }

  /**
   * From a full NRIC: date of birth (first six digits) and gender (last digit: odd = male, even = female).
   * Only fills fields that are still empty, so anything the visitor chose is left alone.
   */
  private fillFromNric(): void {
    if (this.form.idType() !== '1') return;
    const nric = this.form.idNumber();
    if (!this.form.dob()) {
      const dob = dobFromNric(nric);
      if (dob && nric.replace(/\D/g, '').length === 12) this.form.dob.set(dob);
    }
    if (!this.form.gender()) {
      const g = genderFromNric(nric);
      const option = g && (this.lookups()?.genders ?? []).find((x) => new RegExp(`^${g}$`, 'i').test(x.name.trim()));
      if (option) this.form.gender.set(String(option.id));
    }
  }

  private validate(): Partial<Record<Field, string>> {
    const d = this.i18n.t().quoteFlow.details;
    const req = this.i18n.t().quote.errors.required;
    const v = (k: keyof typeof this.form) => this.form[k]().trim();
    const e: Partial<Record<Field, string>> = {};
    const name = v('fullName');
    if (name.length < 3) e.fullName = name ? d.errName : req;
    if (v('idNumber').length < 5) e.idNumber = req;
    if (!EMAIL.test(v('email'))) e.email = v('email') ? d.errEmail : req;
    if (!isValidMobile(normaliseMobile(v('mobile')))) e.mobile = this.i18n.t().quoteFlow.points.invalid;
    if (!v('dob') || v('dob') >= this.maxDob) e.dob = req;
    if (!v('gender')) e.gender = req;
    if (!v('maritalStatus')) e.maritalStatus = req;
    if (v('address1').length < 5) e.address1 = v('address1') ? d.errAddress : req;
    if (!v('city')) e.city = req;
    if (!v('state')) e.state = req;
    if (!/^\d{5}$/.test(v('postcode'))) e.postcode = this.i18n.t().quote.errors.postcode;
    return e;
  }

  protected async submit(ev: Event): Promise<void> {
    ev.preventDefault();
    const errors = this.validate();
    this.errs.set(errors);
    if (Object.keys(errors).length) {
      // Focus the first invalid field (in DOM order).
      (document.querySelector('.form [aria-invalid="true"]') as HTMLElement | null)?.focus();
      return;
    }

    const offer = this.offer();
    if (!offer?.quotationId) { this.view.set('missing'); return; }

    const form: HolderForm = {
      fullName: this.form.fullName(),
      idType: Number(this.form.idType()),
      idNumber: this.form.idNumber().replace(/-/g, ''),
      email: this.form.email(),
      mobile: normaliseMobile(this.form.mobile()),
      dob: this.form.dob(),
      gender: Number(this.form.gender()),
      maritalStatus: Number(this.form.maritalStatus()),
      nationality: this.form.idType() === '2' ? this.form.nationality() : 'Malaysian',
      address1: this.form.address1(),
      address2: this.form.address2(),
      address3: this.form.address3(),
      city: this.form.city(),
      state: this.form.state(),
      postcode: this.form.postcode(),
    };

    this.busy.set(true);
    this.serverErr.set('');
    try {
      await this.holder.submit(form, offer.quotationId, this.plateNo(), offer.choice.inclusiveRoadTax);
      void this.router.navigate([this.i18n.home() + 'insurance/quote/payment'], { queryParams: { quotation_id: this.quoteId } });
    } catch (err) {
      const d = this.i18n.t().quoteFlow.details;
      this.serverErr.set(err instanceof ApiError && err.message ? `${d.failed} (${err.message})` : d.failed);
    } finally {
      this.busy.set(false);
    }
  }
}
