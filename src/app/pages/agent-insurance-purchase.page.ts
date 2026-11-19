import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, ElementRef, afterNextRender, inject, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { useAgentPage } from '../agent/agent-page';
import { AgentSession } from '../agent/agent-session.service';
import { InsurancePurchaseBatch, type HolderProfile, type QuoteHandoff, type WizardSnapshot } from '../agent/insurance-purchase-batch';
import { InsurancePurchaseService, type RecentVehicle } from '../agent/insurance-purchase.service';
import type {
  AddonSelection, PolicyHolderRequest, PurchaseOptions, QuoteProvider, QuoteResult, UpdateQuoteRequest, ValueRange,
} from '../agent/insurance-purchase.types';
import {
  BULK_PAY_TAB_FLAG, QUOTE_COVER_CODE, formatNric, normalisePlate, quotePlaceholders,
  type AddonKind, type AddonRow, type DriverInput, type QuoteValues,
} from '../agent/insurance-purchase.util';
import { Icon } from '../components/icon';
import { ApiError } from '../core/qarqal-api';
import { InsurerLogo } from '../quote/insurer-logo';
import { insurerName } from '../quote/offer.util';
import { fill, formatDate } from '../shared/utils/format.util';

// /agent/insurance-purchase — the agent buys insurance for a customer. A port of qarqalAngular's
// insurance-purchase wizard (pages/masters/insurance-purchase/insurance-purchase-wizard): same steps, rules and
// API calls, in this site's style.
//   1 Vehicle & owner: plate (recent plates pre-fill), owner ID, postcode, optional QarQal customer
//   2 Insurer & add-ons: one Comprehensive quote; insurer cards; plan (cover type re-prices the chosen
//     insurer, variant, value type, sum insured slider, road tax) and add-ons. Every change re-prices via
//     update-quote (debounced; a newer change drops an older response).
//   3 Details & payment: policy holder → saved once per change → "Check before payment" → Billplz, which
//     returns to /agent/insurance-purchase/result.
// Business rules mirror the mobile app (placeholders, value-type ranges, variant pre-selection, default add-ons).
//
// From bulk quote (agent-insurance-bulk.page) one vehicle opens here on step 2 with its finished quote:
//   embedded — inside the bulk page's review pane, next to the vehicle list (one column, no step 1);
//   phones   — the full page, with "Back to bulk list".
// Either way payment opens in a new tab so the bulk list stays put, and the vehicle's state goes back to
// the list when the agent moves on.

type ProfileField = 'full_name' | 'dob' | 'marital_status' | 'email' | 'mobile_no' | 'gender' | 'address_line1' | 'city' | 'state';

const BILLPLZ_PAYMENT_TYPE = 2;
const REPRICE_DEBOUNCE_MS = 600;
const PRICE_DELTA_VISIBLE_MS = 2500;
const RECENT_CHIP_LIMIT = 6;
const QUOTE_KEY_FIELDS: (keyof QuoteValues)[] = ['qarqal_id', 'vehicle_no', 'id_type', 'id_number', 'postcode'];
const NON_ROW_ADDON_KEYS = ['additionalDrivers'];
const POPULAR_ADDON_CODES = ['iosp', 'windshield', 'srcc'];
const BOOLEAN_ADDON_KEYS: (keyof AddonSelection)[] = ['iosp', 'llop', 'pche', 'srcc', 'lltp', 'sprc', 'all_riders', 'all_drivers', 'lspa', 'pabp'];
const PLAN_ADDON_KEYS: (keyof AddonSelection)[] = ['twcd', 'paPlus', 'cart', 'bantuanIkhlasSupreme'];
const SLIDER_RESOLUTION = 1000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Component({
  selector: 'app-agent-insurance-purchase-page',
  imports: [FormsModule, NgTemplateOutlet, RouterLink, Icon, InsurerLogo],
  templateUrl: './agent-insurance-purchase.page.html',
  styleUrl: './agent-insurance-purchase.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentInsurancePurchasePage {
  protected readonly i18n = useAgentPage((t) => `${t.agent.purchase.title} | QarQal`);
  protected readonly session = inject(AgentSession);
  private readonly api = inject(InsurancePurchaseService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly batch = inject(InsurancePurchaseBatch);
  private readonly router = inject(Router);
  protected readonly fill = fill;

  /** Inside bulk quote's review pane: always one column with the bottom bar, no step 1 or Start over. */
  readonly embedded = input(false);
  /** Embedded: the vehicle comes straight from the bulk page (a re-render restores it, never an empty step 1). */
  readonly batchHandoff = input<QuoteHandoff | null>(null);
  /** Opened from bulk quote (embedded or phone full page). */
  fromBatch = false;
  paymentOpened = false;
  private batchLink: QuoteHandoff | null = null;
  protected readonly insurerName = (p: QuoteProvider): string => insurerName(p.provider);
  protected readonly SLIDER_RESOLUTION = SLIDER_RESOLUTION;

  step = 1;
  options: PurchaseOptions | null = null;
  optionsError = false;

  // ── Step 1 ──
  form: QuoteValues = { qarqal_id: '', vehicle_no: '', id_type: 1, id_number: '', postcode: '' };
  touched: Partial<Record<keyof QuoteValues, boolean>> = {};
  idNumberError = '';
  showCustomerField = false;
  customerName = '';
  customerLookupError = '';
  isLookingUp = false;
  private lookedUpQarqalId = '';
  recentVehicles: RecentVehicle[] = [];
  recentChips: RecentVehicle[] = [];
  prefilledFrom: RecentVehicle | null = null;
  private plateTimer?: ReturnType<typeof setTimeout>;

  // ── Quote / cover ──
  quote: QuoteResult | null = null;
  originalProviders: QuoteProvider[] = [];
  selectedProvider: QuoteProvider | null = null;
  quotedValues: QuoteValues | null = null;
  showRequoteConfirm = false;
  private variantChanged = false;
  cover = { coverType: QUOTE_COVER_CODE, nvic: '', valueType: 'market' as 'market' | 'agreed', sumInsured: 0, inclusiveRoadTax: false };
  addonRows: AddonRow[] = [];
  addonValues: Record<string, boolean | number | string | null> = {};
  driversAvailable = false;
  drivers: DriverInput[] = [];
  addonsResetNote = false;
  private agentPickedAddons = false;

  // ── Pricing / status ──
  isBusy = false;
  busyMessage = '';
  isQuoting = false;
  quoteElapsed = 0;
  private quoteTimer?: ReturnType<typeof setInterval>;
  isRepricing = false;
  priceStale = false;
  repriceFailed = false;
  priceDelta: number | null = null;
  private deltaTimer?: ReturnType<typeof setTimeout>;
  private repriceTimer?: ReturnType<typeof setTimeout>;
  /** Bumped on every re-price; an older response is ignored (qarqalAngular's switchMap). */
  private repriceSeq = 0;
  private suppressNextDelta = false;
  errorMessage = '';
  fieldErrors: string[] = [];
  showStartOverConfirm = false;

  // ── Phones and tablets (< 992px): one decision per screen, summary in a bottom sheet ──
  compact = false;
  mobileView: 'list' | 'customise' = 'list';
  showSheet = false;

  // ── Checkout ──
  profile = {
    full_name: '', dob: '', marital_status: null as number | null, email: '', mobile_no: '', gender: null as number | null,
    nationality: 'Malaysian', address_line1: '', address_line2: '', address_line3: '', city: '', state: '',
  };
  profileTouched = false;
  showConfirm = false;
  pdsAcknowledged = false;
  private savedProfileKey = '';

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') this.onEscape(); };
      document.addEventListener('keydown', onKey);
      destroyRef.onDestroy(() => document.removeEventListener('keydown', onKey));
      if (this.embedded()) {
        this.compact = true;
      } else {
        const mq = window.matchMedia('(max-width: 991.98px)');
        this.compact = mq.matches;
        const onChange = (e: MediaQueryListEvent): void => { this.compact = e.matches; this.cdr.markForCheck(); };
        mq.addEventListener('change', onChange);
        destroyRef.onDestroy(() => mq.removeEventListener('change', onChange));
      }

      // From bulk quote: start on step 2 with that quote and the insurer picked on the compare screen,
      // or exactly where the agent left this vehicle last time.
      const handoff = this.embedded() ? this.batchHandoff() : this.batch.takeHandoff();
      this.fromBatch = !!handoff;
      this.batchLink = handoff;
      this.api.options()
        .then((o) => { this.options = o; if (handoff) this.applyHandoff(handoff); })
        .catch(() => { this.optionsError = true; })
        .finally(() => this.cdr.markForCheck());
      // Step 1 never shows for a bulk vehicle, so no plate suggestions.
      if (!handoff) {
        this.api.recentVehicles().then((v) => { this.recentVehicles = v; this.recentChips = v.slice(0, RECENT_CHIP_LIMIT); })
          .catch(() => undefined).finally(() => this.cdr.markForCheck());
      }
      this.cdr.markForCheck();
    });
    destroyRef.onDestroy(() => {
      if (this.batchLink && this.quote && this.quotedValues) {
        this.batchLink.onProfile({ ...this.profile });
        this.batchLink.onLeave(this.takeSnapshot());
      }
      for (const t of [this.plateTimer, this.deltaTimer, this.repriceTimer]) if (t) clearTimeout(t);
      this.stopQuoteTimer();
    });
  }

  // ═════════ Bulk quote ═════════

  private applyHandoff(handoff: QuoteHandoff): void {
    this.form = { ...handoff.values };
    if (handoff.values.qarqal_id) { this.showCustomerField = true; void this.checkCustomer(); }
    if (handoff.snapshot) {
      this.restoreSnapshot(handoff.snapshot);
    } else {
      this.applyNewQuote(handoff.result, { ...handoff.values });
      const picked = this.originalProviders.find((p) => p.provider === handoff.providerCode);
      if (picked && picked !== this.selectedProvider) this.selectProvider(picked);
      // The insurer was already chosen on the compare screen: open on its plan & add-ons ("All insurers" switches).
      if (picked && this.compact) this.mobileView = 'customise';
    }
    // The holder details win over the quote's city/state; empty ones leave what's there.
    const filled = Object.entries(handoff.profile).filter(([, v]) => v !== null && v !== '');
    if (filled.length) this.profile = { ...this.profile, ...Object.fromEntries(filled) };
  }

  /** Any edit in the holder form: same owner → the other vehicles get it too. */
  profileEdited(): void { this.batchLink?.onProfile({ ...this.profile }); }

  /** Phones: back to the bulk list (this vehicle's state goes back with it on destroy). */
  backToBulk(): void { void this.router.navigateByUrl(this.session.path('insurance-purchase/bulk')); }

  private takeSnapshot(): WizardSnapshot {
    return {
      quote: this.quote!,
      originalProviders: this.originalProviders,
      selectedProvider: this.selectedProvider,
      quotedValues: this.quotedValues!,
      cover: { ...this.cover },
      addonRows: this.addonRows,
      addonValues: { ...this.addonValues },
      driversAvailable: this.driversAvailable,
      drivers: this.drivers.map((d) => ({ ...d })),
      agentPickedAddons: this.agentPickedAddons,
      step: this.step,
      mobileView: this.mobileView,
      // A change still waiting for its re-price is re-priced on return.
      priceStale: this.priceStale || this.isRepricing || this.repriceFailed,
      savedProfileKey: this.savedProfileKey,
    };
  }

  private restoreSnapshot(s: WizardSnapshot): void {
    this.quote = s.quote;
    this.originalProviders = s.originalProviders;
    this.selectedProvider = s.selectedProvider;
    this.quotedValues = s.quotedValues;
    this.cover = { ...s.cover };
    this.addonRows = s.addonRows;
    this.addonValues = { ...s.addonValues };
    this.driversAvailable = s.driversAvailable;
    this.drivers = s.drivers.map((d) => ({ ...d }));
    this.agentPickedAddons = s.agentPickedAddons;
    this.step = s.step;
    this.mobileView = s.mobileView;
    this.savedProfileKey = s.savedProfileKey;
    if (s.priceStale && this.selectedProvider) {
      this.suppressNextDelta = true;
      this.queueReprice();
    }
  }

  private get w() { return this.i18n.t().agent.wizard; }

  // ═════════ Navigation ═════════

  get pageHeading(): string {
    if (this.step === 2 && this.compact && this.mobileView === 'customise') return this.w.headings.customise;
    return [this.w.headings.step1, this.w.headings.step2, this.w.headings.step3][this.step - 1];
  }
  get steps(): string[] { return this.w.steps; }
  get showInsurerList(): boolean { return !this.compact || this.mobileView === 'list'; }
  get showCustomise(): boolean { return !this.compact || this.mobileView === 'customise'; }
  get showBottomBar(): boolean {
    if (this.step < 2 || !this.selectedProvider) return false;
    return !(this.step === 2 && this.compact && this.mobileView === 'list');
  }

  private scrollTop(): void {
    const el = this.host.nativeElement as HTMLElement;
    if (el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: 'start' });
  }

  openCustomise(): void {
    if (!this.selectedProvider || this.isBusy) return;
    this.mobileView = 'customise';
    this.scrollTop();
  }

  backToList(): void { this.mobileView = 'list'; this.scrollTop(); }

  backFromCheckout(): void {
    if (this.isBusy) return;
    this.step = 2;
    this.mobileView = 'customise';
    this.errorMessage = '';
    this.scrollTop();
  }

  goTo(step: number): void {
    // A bulk vehicle's plate and owner are fixed by the bulk list: no step 1.
    if (this.fromBatch && step < 2) return;
    if (step < this.step && !this.isBusy) {
      if (step === 2) this.mobileView = 'list';
      this.showSheet = false;
      this.errorMessage = '';
      this.fieldErrors = [];
      this.showConfirm = false;
      this.step = step;
    }
  }

  get barActionLabel(): string {
    if (this.step === 3) return this.w.reviewPay;
    return this.compact && this.mobileView === 'list' ? this.w.nextAddons : this.w.continue;
  }
  get barActionDisabled(): boolean {
    if (this.isBusy) return true;
    if (this.step === 3) return false;
    return this.compact && this.mobileView === 'list' ? !this.selectedProvider : !this.canContinue;
  }
  barAction(): void {
    this.showSheet = false;
    if (this.step === 3) void this.reviewAndPay();
    else if (this.compact && this.mobileView === 'list') this.openCustomise();
    else this.continueToCheckout();
  }

  private onEscape(): void {
    if (this.isBusy) return;
    this.showConfirm = false;
    this.showStartOverConfirm = false;
    this.showSheet = false;
    if (this.showRequoteConfirm) this.keepCurrentQuote();
    this.cdr.markForCheck();
  }

  askStartOver(): void {
    if (this.isBusy) return;
    if (!this.quote && !this.form.vehicle_no && !this.form.id_number) { this.startOver(); return; }
    this.showStartOverConfirm = true;
  }
  confirmStartOver(): void { this.showStartOverConfirm = false; this.startOver(); }

  startOver(): void {
    this.quote = null;
    this.originalProviders = [];
    this.selectedProvider = null;
    this.quotedValues = null;
    this.prefilledFrom = null;
    this.savedProfileKey = '';
    this.showConfirm = false;
    this.showRequoteConfirm = false;
    this.showCustomerField = false;
    this.priceStale = false;
    this.resetCustomer();
    this.resetAddons();
    this.addonRows = [];
    this.form = { qarqal_id: '', vehicle_no: '', id_type: 1, id_number: '', postcode: '' };
    this.touched = {};
    this.cover = { coverType: QUOTE_COVER_CODE, nvic: '', valueType: 'market', sumInsured: 0, inclusiveRoadTax: false };
    this.resetProfile();
    this.errorMessage = '';
    this.fieldErrors = [];
    this.step = 1;
  }

  // ═════════ Step 1: vehicle & owner ═════════

  get idTypeCode(): string {
    return this.options?.id_types.find((t) => t.id === Number(this.form.id_type))?.name ?? 'NRIC';
  }
  get idNumberLabel(): string {
    const l = this.w.idNumber;
    return ({ NRIC: l.nric, PASSPORT: l.passport, COMPANY: l.company } as Record<string, string>)[this.idTypeCode] ?? l.other;
  }
  get idNumberPlaceholder(): string {
    return ({ NRIC: '900101-14-5678', PASSPORT: 'A12345678', COMPANY: '202001012345' } as Record<string, string>)[this.idTypeCode] ?? '';
  }
  idTypeLabel(name: string): string {
    const l = this.w.idType;
    return ({ NRIC: l.nric, PASSPORT: l.passport, COMPANY: l.company } as Record<string, string>)[name] ?? name;
  }
  onIdTypeChange(): void { this.idNumberError = ''; this.formatIdNumber(); }

  /** NRIC: digits only, dashes added as 6-2-4 (same shape the app sends). */
  formatIdNumber(): void {
    if (this.idTypeCode === 'NRIC') this.form.id_number = formatNric(this.form.id_number);
  }

  /** Checked on blur and before quoting, so a typo never costs a 20-second insurer round-trip. */
  validateIdNumber(): boolean {
    const value = String(this.form.id_number ?? '').trim();
    this.idNumberError = '';
    if (!value) return false;
    if (this.idTypeCode === 'NRIC' && value.replace(/\D/g, '').length !== 12) {
      this.idNumberError = this.w.idNumberError;
      return false;
    }
    return true;
  }
  get idNumberValid(): boolean {
    const value = String(this.form.id_number ?? '').trim();
    return !!value && (this.idTypeCode !== 'NRIC' || value.replace(/\D/g, '').length === 12);
  }
  invalid(field: keyof QuoteValues): boolean {
    if (!this.touched[field]) return false;
    const v = String(this.form[field] ?? '').trim();
    if (field === 'postcode') return !/^\d{5}$/.test(v);
    if (field === 'qarqal_id') return false;
    return !v;
  }

  onPlateInput(): void {
    const plate = normalisePlate(this.form.vehicle_no ?? '');
    const match = this.recentVehicles.find((v) => v.vehicle_no === plate);
    if (match && match !== this.prefilledFrom) this.applyRecentVehicle(match);
    // Suggestions narrow as the agent types; failures just mean no suggestions.
    if (this.plateTimer) clearTimeout(this.plateTimer);
    this.plateTimer = setTimeout(() => {
      this.api.recentVehicles(plate).then((v) => { this.recentVehicles = v; }).catch(() => undefined).finally(() => this.cdr.markForCheck());
    }, 300);
  }

  pickRecent(vehicle: RecentVehicle): void { this.applyRecentVehicle(vehicle); }

  private applyRecentVehicle(vehicle: RecentVehicle): void {
    const p = vehicle.prefill;
    this.form = {
      vehicle_no: vehicle.vehicle_no,
      qarqal_id: p.qarqal_id ?? this.form.qarqal_id,
      id_type: p.id_type ?? this.form.id_type,
      id_number: p.id_number ?? this.form.id_number,
      postcode: p.postcode != null ? String(p.postcode).padStart(5, '0') : this.form.postcode,
    };
    const prof = p.profile ?? {};
    const str = (k: string): string | undefined => (typeof prof[k] === 'string' ? (prof[k] as string) : undefined);
    this.profile = {
      ...this.profile,
      ...(p.dob ? { dob: p.dob } : {}),
      ...(p.email ? { email: p.email } : {}),
      ...(p.marital_status != null ? { marital_status: p.marital_status } : {}),
      ...(str('full_name') ? { full_name: str('full_name')! } : {}),
      ...(str('mobile_no') ? { mobile_no: str('mobile_no')! } : {}),
      ...(str('address_line1') ? { address_line1: str('address_line1')! } : {}),
      ...(str('address_line2') ? { address_line2: str('address_line2')! } : {}),
      ...(str('address_line3') ? { address_line3: str('address_line3')! } : {}),
      ...(str('city') ? { city: str('city')! } : {}),
      ...(str('state') ? { state: str('state')! } : {}),
      ...(typeof prof['gender'] === 'number' ? { gender: prof['gender'] as number } : {}),
    };
    this.formatIdNumber();
    this.prefilledFrom = vehicle;
    if (p.qarqal_id) { this.showCustomerField = true; void this.checkCustomer(); }
  }

  clearPrefill(): void {
    this.prefilledFrom = null;
    this.resetCustomer();
    this.form = { qarqal_id: '', vehicle_no: '', id_type: 1, id_number: '', postcode: '' };
    this.touched = {};
    this.resetProfile();
  }

  toggleCustomerField(): void {
    this.showCustomerField = !this.showCustomerField;
    if (!this.showCustomerField) { this.form.qarqal_id = ''; this.resetCustomer(); }
  }
  private resetCustomer(): void { this.customerName = ''; this.customerLookupError = ''; this.lookedUpQarqalId = ''; }

  /** Checked automatically when the field loses focus. */
  async checkCustomer(): Promise<void> {
    const qarqalId = (this.form.qarqal_id ?? '').trim();
    if (qarqalId === this.lookedUpQarqalId) return;
    this.resetCustomer();
    if (!qarqalId) return;
    this.isLookingUp = true;
    this.lookedUpQarqalId = qarqalId;
    try {
      this.customerName = await this.api.lookupCustomer(qarqalId);
    } catch {
      this.customerLookupError = this.w.customerNotFound;
    } finally {
      this.isLookingUp = false;
      this.cdr.markForCheck();
    }
  }

  private currentQuoteValues(): QuoteValues {
    return {
      qarqal_id: (this.form.qarqal_id ?? '').trim(),
      vehicle_no: normalisePlate(this.form.vehicle_no ?? ''),
      id_type: Number(this.form.id_type),
      id_number: (this.form.id_number ?? '').trim(),
      postcode: String(this.form.postcode ?? '').trim(),
    };
  }
  private get quoteChanged(): boolean {
    if (!this.quotedValues) return true;
    const current = this.currentQuoteValues();
    return QUOTE_KEY_FIELDS.some((f) => current[f] !== this.quotedValues![f]);
  }

  /** Unchanged details go back to the existing quote; changed details ask first (it clears the cover choices). */
  submitQuote(ev?: Event): void {
    ev?.preventDefault();
    this.touched = { vehicle_no: true, id_number: true, postcode: true };
    const idOk = this.validateIdNumber();
    if (this.invalid('vehicle_no') || this.invalid('id_number') || this.invalid('postcode') || !idOk) return;
    if (this.quote && !this.quoteChanged) { this.step = 2; return; }
    if (this.quote) { this.showRequoteConfirm = true; return; }
    void this.requestQuote();
  }
  confirmRequote(): void { this.showRequoteConfirm = false; void this.requestQuote(); }
  keepCurrentQuote(): void {
    this.showRequoteConfirm = false;
    if (this.quotedValues) { this.form = { ...this.quotedValues }; this.step = 2; }
  }

  private async requestQuote(): Promise<void> {
    const values = this.currentQuoteValues();
    const placeholders = quotePlaceholders(values.id_type);
    this.startQuoteTimer();
    await this.run(
      () => this.api.generateQuote({
        ...(values.qarqal_id ? { qarqal_id: values.qarqal_id } : {}),
        vehicle_no: values.vehicle_no,
        full_name: placeholders.full_name,
        id_type: values.id_type,
        id_number: values.id_number,
        dob: placeholders.dob,
        postcode: Number(values.postcode),
        email: placeholders.email,
        vehicle_convert_type: this.coverIdFor(QUOTE_COVER_CODE),
        marital_status: placeholders.marital_status,
      }),
      (result) => this.applyNewQuote(result, values),
      this.w.errors.quote,
      this.w.busy.quoting,
    );
  }

  private applyNewQuote(result: QuoteResult, values: QuoteValues): void {
    this.quote = result;
    this.originalProviders = result.providers ?? [];
    this.quotedValues = values;
    this.selectedProvider = null;
    this.savedProfileKey = '';
    this.resetAddons();
    this.addonRows = [];
    this.prefillProfileLocation(result);
    this.step = 2;
    this.mobileView = 'list';
    // Start from the cheapest insurer: one click less for the common case.
    const cheapest = this.sortedProviders[0];
    if (cheapest) this.selectProvider(cheapest);
  }

  private startQuoteTimer(): void {
    this.stopQuoteTimer();
    this.quoteElapsed = 0;
    this.isQuoting = true;
    this.quoteTimer = setInterval(() => { this.quoteElapsed++; this.cdr.markForCheck(); }, 1000);
  }
  private stopQuoteTimer(): void {
    if (this.quoteTimer) clearInterval(this.quoteTimer);
    this.quoteTimer = undefined;
    this.isQuoting = false;
  }

  // ═════════ Step 2: insurer & add-ons ═════════

  coverInfo(code: string): { title: string; text: string; popular?: boolean } {
    const c = this.w.covers as Record<string, { title: string; text: string }>;
    return { ...(c[code] ?? { title: code, text: '' }), popular: code === 'COMP' };
  }
  get coverTypeCode(): string { return this.cover.coverType || QUOTE_COVER_CODE; }
  private coverIdFor(code: string): number { return this.options?.cover_types.find((c) => c.name === code)?.id ?? 1; }
  get listPricesDifferFromCover(): boolean { return this.coverTypeCode !== QUOTE_COVER_CODE; }
  get isThirdParty(): boolean { return this.coverTypeCode === 'TP'; }

  onCoverTypeChange(): void {
    const hadAddons = this.agentPickedAddons;
    this.snapSumInsured();
    this.resetAddons();
    // Back on Comprehensive: restore the add-ons the insurer priced in, so the total matches the list again.
    if (this.coverTypeCode === QUOTE_COVER_CODE) this.buildAddonRows();
    this.applyDefaultAddons();
    this.addonsResetNote = hadAddons;
    this.queueReprice();
  }

  get sortedProviders(): QuoteProvider[] {
    return [...this.originalProviders].sort(
      (a, b) => (parseFloat(a.totalContribution ?? '') || Infinity) - (parseFloat(b.totalContribution ?? '') || Infinity));
  }

  /** Market value if the insurer gives one, otherwise agreed value (e.g. Chubb sends market 0–0). */
  listRange(p: QuoteProvider): { min: string; max: string; agreed: boolean } | null {
    if (this.hasMax(p.marketValueRange)) return { ...p.marketValueRange!, agreed: false };
    if (this.hasMax(p.agreedValueRange)) return { ...p.agreedValueRange!, agreed: true };
    return null;
  }
  shortRange(min: string, max: string): string { return `${this.shortMoney(min)} – ${this.shortMoney(max).replace(/^RM\s*/, '')}`; }
  shortMoney(value: string | number | null | undefined): string {
    const amount = typeof value === 'number' ? value : parseFloat(value ?? '0');
    if (isNaN(amount)) return '—';
    return amount >= 1000 ? `RM ${+(amount / 1000).toFixed(1)}k` : this.money(amount);
  }
  addonCount(p: QuoteProvider): number {
    return Object.entries(p.availableAddon ?? {}).filter(([code, a]) => a != null && !NON_ROW_ADDON_KEYS.includes(code)).length;
  }

  /** The card's own action: pick this insurer and go straight to customising. */
  chooseProvider(p: QuoteProvider): void {
    if (this.isBusy) return;
    this.selectProvider(p);
    if (this.compact) this.openCustomise();
    else setTimeout(() => document.getElementById('ip-plan')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  isLowest(p: QuoteProvider): boolean {
    return this.originalProviders.length > 1 && this.sortedProviders[0]?.provider === p.provider;
  }
  /** The selected row shows its live price once re-priced, so list and summary never disagree. */
  rowPricing(p: QuoteProvider): QuoteProvider {
    return this.isSelected(p) && this.selectedProvider && !this.priceStale && !this.isRepricing ? this.selectedProvider : p;
  }
  isSelected(p: QuoteProvider): boolean { return this.selectedProvider?.provider === p.provider; }
  ncdLabel(value?: string | number | null): string { return `${parseFloat(String(value ?? '0')) || 0}%`; }

  /** Senang's model often repeats the make ("TOYOTA- AVANZA …"); show it once. */
  get vehicleLabel(): string {
    const make = (this.quote?.make ?? '').trim();
    const model = (this.quote?.model ?? '').replace(new RegExp(`^${make.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s-]*`, 'i'), '').trim();
    return [make, model, this.quote?.manufacturingYear].filter(Boolean).join(' ');
  }

  // Market/agreed rules follow the app: Chubb is agreed-value only; otherwise each shows when its range has a max.
  private get isChubb(): boolean { return (this.selectedProvider?.provider ?? '').toLowerCase().includes('chubb'); }
  private hasMax(range?: ValueRange | null): boolean { return !!range && (parseFloat(range.max) || 0) > 0; }
  get marketValueAvailable(): boolean {
    const p = this.selectedProvider;
    if (!p || this.isChubb || !p.marketValueRange) return false;
    return this.hasMax(p.marketValueRange) || (parseFloat(p.marketValue ?? '0') || 0) > 0;
  }
  get agreedValueAvailable(): boolean {
    const p = this.selectedProvider;
    return !!p && (this.isChubb || this.hasMax(p.agreedValueRange));
  }
  get singleValueType(): string {
    if (this.marketValueAvailable && !this.agreedValueAvailable) return this.w.marketValue;
    if (this.agreedValueAvailable && !this.marketValueAvailable) return this.w.agreedValue;
    return '';
  }
  private rangeFor(p: QuoteProvider, agreed: boolean): { min: number; max: number } | null {
    if (agreed) {
      const r = this.isChubb ? p.agreedValueRange ?? p.marketValueRange : p.agreedValueRange;
      return r ? { min: parseFloat(r.min) || 0, max: parseFloat(r.max) || 0 } : null;
    }
    if (p.marketValueRange) return { min: parseFloat(p.marketValueRange.min) || 0, max: parseFloat(p.marketValueRange.max) || 0 };
    const mv = parseFloat(p.marketValue ?? '');
    return isNaN(mv) ? null : { min: mv, max: mv };
  }
  /** update-quote can return a collapsed range; unless the variant changed, recover it from the original quote. */
  get sumInsuredRange(): { min: number; max: number } | null {
    const p = this.selectedProvider;
    if (!p) return null;
    const agreed = this.cover.valueType === 'agreed';
    let range = this.rangeFor(p, agreed);
    if ((!range || range.min === range.max) && !this.variantChanged) {
      const original = this.originalProviders.find((o) => o.provider.toLowerCase() === p.provider.toLowerCase());
      const originalRange = original ? this.rangeFor(original, agreed) : null;
      if (originalRange && originalRange.max > originalRange.min) range = originalRange;
    }
    return range && range.max > 0 ? range : null;
  }
  get sliderKey(): string {
    const r = this.sumInsuredRange;
    return `${this.selectedProvider?.provider}|${this.cover.valueType}|${r?.min}|${r?.max}|${this.sumInsuredStep}`;
  }
  get sliderPosition(): number {
    const r = this.sumInsuredRange;
    if (!r || r.max <= r.min) return 0;
    const v = Number(this.cover.sumInsured) || r.min;
    return Math.round(((Math.min(Math.max(v, r.min), r.max) - r.min) / (r.max - r.min)) * SLIDER_RESOLUTION);
  }
  /** Dragging snaps to the insurer's stops (min + n × moveSliderValue, and the max), like the app. */
  onSumSliderInput(event: Event): void {
    const r = this.sumInsuredRange;
    if (!r) return;
    const raw = r.min + (Number((event.target as HTMLInputElement).value) / SLIDER_RESOLUTION) * (r.max - r.min);
    const step = this.sumInsuredStep;
    const snapped = Math.min(r.max, r.min + Math.round((raw - r.min) / step) * step);
    this.cover.sumInsured = Math.round(r.max - raw < step / 2 ? r.max : snapped);
  }
  private get sumInsuredRangeExempt(): boolean {
    return ['takaful_malaysia', 'takaful_ikhlas', 'zurich'].includes(this.selectedProvider?.provider ?? '') && ['TP', 'TPFT'].includes(this.coverTypeCode);
  }
  get sumInsuredError(): string {
    if (this.isThirdParty || this.sumInsuredRangeExempt) return '';
    const r = this.sumInsuredRange;
    const v = Number(this.cover.sumInsured);
    if (!r) return '';
    return v < r.min || v > r.max ? fill(this.w.sumInsuredRangeError, { min: this.money(r.min), max: this.money(r.max) }) : '';
  }
  get sumInsuredStep(): number {
    const own = this.selectedProvider?.moveSliderValue;
    const original = this.originalProviders.find((p) => p.provider === this.selectedProvider?.provider)?.moveSliderValue;
    return Number(own || original) || 100;
  }
  private defaultValueType(): 'market' | 'agreed' { return this.marketValueAvailable || !this.agreedValueAvailable ? 'market' : 'agreed'; }
  private get quoteVariantNvic(): string {
    const v = this.quote?.variant;
    return typeof v === 'object' && v ? v.nvic ?? '' : '';
  }
  get variantMissing(): boolean { return !!this.selectedProvider?.variants?.length && !this.cover.nvic; }

  selectProvider(p: QuoteProvider): void {
    if (this.isSelected(p) || this.isBusy) return;
    const hadAddons = this.agentPickedAddons;
    this.selectedProvider = p;
    this.variantChanged = false;
    const variant = p.variants?.find((v) => v.nvic && v.nvic === this.quoteVariantNvic);
    const variantValue = Number(variant?.marketValue ?? 0);
    // Start at the sum insured the list price was quoted with, so the first re-price matches the list.
    const quotedSum = parseFloat(p.sumInsured ?? '0') || 0;
    this.cover = { ...this.cover, nvic: variant?.nvic ?? '', valueType: this.defaultValueType(), sumInsured: quotedSum > 0 ? quotedSum : variantValue };
    this.snapSumInsured();
    this.resetAddons();
    this.buildAddonRows();
    this.applyDefaultAddons();
    this.addonsResetNote = hadAddons;
    this.suppressNextDelta = true;
    this.queueReprice();
  }

  onVariantChange(): void {
    this.variantChanged = true;
    const variant = this.selectedProvider?.variants?.find((v) => v.nvic === this.cover.nvic);
    const value = Number(variant?.marketValue ?? 0);
    if (value > 0) this.cover.sumInsured = value;
    this.queueReprice();
  }

  onValueTypeChange(): void {
    this.snapSumInsured();
    const hadAddons = this.agentPickedAddons;
    this.resetAddons();
    this.buildAddonRows();
    this.applyDefaultAddons();
    this.addonsResetNote = hadAddons;
    this.queueReprice();
  }

  private snapSumInsured(): void {
    const r = this.sumInsuredRange;
    const v = Number(this.cover.sumInsured);
    if (r && (v < r.min || v > r.max)) this.cover.sumInsured = Math.round(r.min);
  }

  // ── Add-ons ──
  private resetAddons(): void { this.addonValues = {}; this.drivers = []; this.addonsResetNote = false; this.agentPickedAddons = false; }
  onAddonEdited(): void { this.agentPickedAddons = true; this.queueReprice(); }

  private buildAddonRows(): void {
    const available = this.selectedProvider?.availableAddon ?? {};
    this.driversAvailable = available['additionalDrivers'] != null;
    this.addonRows = Object.entries(available)
      .filter(([code, a]) => a != null && !NON_ROW_ADDON_KEYS.includes(code))
      .map(([code, a]) => ({ code, kind: (a!.plans?.length ? 'plan' : a!.range ? 'amount' : 'toggle') as AddonKind, addon: a!, popular: POPULAR_ADDON_CODES.includes(code) }))
      .sort((a, b) => Number(b.popular) - Number(a.popular));
    for (const row of this.addonRows) if (!(row.code in this.addonValues)) this.addonValues[row.code] = row.kind === 'toggle' ? false : null;
    this.applyIncludedAddons();
  }

  /** Add-ons the insurer already priced in come back with status: true; pre-select them so prices match the list. */
  private applyIncludedAddons(): void {
    const included = this.selectedProvider?.addOn ?? [];
    for (const row of this.addonRows) {
      if (row.addon.status !== true) continue;
      if (row.kind === 'toggle') this.addonValues[row.code] = true;
      else if (row.kind === 'amount') {
        const item = included.find((a) => a.code === row.code);
        this.addonValues[row.code] = parseFloat(item?.sumInsured ?? row.addon.sumInsured ?? row.addon.range?.min ?? '0') || this.rangeMin(row);
      } else {
        const item = included.find((a) => a.code === row.code);
        const plan = row.addon.plans?.find((pl) => item?.premium && pl.premium === item.premium) ?? row.addon.plans?.[0];
        this.addonValues[row.code] = plan?.id ?? null;
      }
    }
  }

  /** Add-ons this insurer doesn't offer but another insurer in the quote does, so nobody thinks QarQal hides them. */
  get unavailableAddons(): { code: string; title: string; offeredBy: string }[] {
    const available = this.selectedProvider?.availableAddon ?? {};
    return Object.keys(available)
      .filter((code) => available[code] == null && !NON_ROW_ADDON_KEYS.includes(code))
      .map((code) => {
        const other = this.originalProviders.find((p) => p.availableAddon?.[code]?.title?.en);
        return other ? { code, title: other.availableAddon![code]!.title!.en, offeredBy: this.insurerName(other) } : null;
      })
      .filter((x): x is { code: string; title: string; offeredBy: string } => !!x)
      .filter((item, i, list) => {
        const title = item.title.toLowerCase();
        return !this.addonRows.some((r) => this.addonTitle(r).toLowerCase() === title) && list.findIndex((o) => o.title.toLowerCase() === title) === i;
      });
  }

  /** Same defaults the app applies when an insurer is picked. */
  private applyDefaultAddons(): void {
    const provider = (this.selectedProvider?.provider ?? '').toLowerCase();
    const available = this.selectedProvider?.availableAddon ?? {};
    const isFree = (premium?: string | null) => premium == null || ['0', '0.00', 'free'].includes(String(premium).toLowerCase());
    const driversAddon = available['all_drivers'] ?? available['additionalDrivers'];
    const ridersAddon = available['all_riders'];
    const isMotorcycle = (this.quote?.vehicleType ?? '').toLowerCase() === 'motorcycle';
    if (provider === 'takaful_malaysia' || (['zurich', 'takaful_ikhlas'].includes(provider) && isFree(driversAddon?.premium))) this.addonValues['all_drivers'] = true;
    if (isMotorcycle && (['zurich', 'takaful_malaysia', 'takaful_ikhlas'].includes(provider) || (ridersAddon != null && isFree(ridersAddon.premium)))) this.addonValues['all_riders'] = true;
  }

  rangeMin(row: AddonRow): number { return parseFloat(row.addon.range?.min ?? '0') || 0; }
  rangeMax(row: AddonRow): number { return parseFloat(row.addon.range?.max ?? '0') || 0; }
  rangeStep(row: AddonRow): number { return Math.max(1, Math.round((this.rangeMax(row) - this.rangeMin(row)) / 100)); }
  addonTitle(row: AddonRow): string { return row.addon.title?.en || row.code; }
  isAddonOn(row: AddonRow): boolean { const v = this.addonValues[row.code]; return v !== false && v != null; }
  toggleAddon(row: AddonRow, checked: boolean): void {
    if (row.kind === 'amount') this.addonValues[row.code] = checked ? parseFloat(row.addon.range?.min ?? row.addon.sumInsured ?? '0') || 0 : null;
    else if (row.kind === 'toggle') this.addonValues[row.code] = checked;
    this.onAddonEdited();
  }
  addonAmountError(row: AddonRow): string {
    const v = this.addonValues[row.code];
    if (row.kind !== 'amount' || v == null || !row.addon.range) return '';
    const min = parseFloat(row.addon.range.min) || 0;
    const max = parseFloat(row.addon.range.max) || 0;
    const amount = Number(v);
    return amount < min || amount > max ? fill(this.w.between, { min: this.money(min), max: this.money(max) }) : '';
  }
  addDriver(): void { this.drivers.push({ fullName: '', idType: 'nric', idNumber: '', dob: '', nationality: 'Malaysia' }); this.agentPickedAddons = true; }
  removeDriver(i: number): void { this.drivers.splice(i, 1); this.onAddonEdited(); }
  private get completeDrivers(): DriverInput[] { return this.drivers.filter((d) => d.fullName.trim() && d.dob && d.idNumber.trim()); }
  get hasIncompleteDriver(): boolean { return this.drivers.length !== this.completeDrivers.length; }
  get selectedAddonCount(): number { return this.addonRows.filter((r) => this.isAddonOn(r)).length + this.completeDrivers.length; }

  // ── Pricing ──
  private get coverInvalid(): boolean {
    return !this.selectedProvider || this.variantMissing || !!this.sumInsuredError || this.addonRows.some((r) => !!this.addonAmountError(r));
  }

  /** Any cover change: mark the price stale and re-price (debounced) once inputs are valid. */
  queueReprice(): void {
    this.priceStale = true;
    if (this.coverInvalid) return;
    if (this.repriceTimer) clearTimeout(this.repriceTimer);
    this.repriceTimer = setTimeout(() => void this.reprice(), REPRICE_DEBOUNCE_MS);
  }

  private async reprice(): Promise<void> {
    const seq = ++this.repriceSeq;
    this.isRepricing = true;
    this.repriceFailed = false;
    this.errorMessage = '';
    this.cdr.markForCheck();
    try {
      const result = await this.api.updateQuote(this.buildUpdateQuoteBody());
      if (seq !== this.repriceSeq) return; // a newer change is already on its way
      this.applyQuoteResult(result);
      this.priceStale = false;
    } catch (err) {
      if (seq !== this.repriceSeq) return;
      this.showError(err, this.w.errors.reprice);
      this.repriceFailed = true;
    } finally {
      if (seq === this.repriceSeq) this.isRepricing = false;
      this.cdr.markForCheck();
    }
  }

  get canContinue(): boolean {
    return this.step === 2 && !this.priceStale && !this.isRepricing && !this.coverInvalid && !this.hasIncompleteDriver;
  }
  get continueHint(): string {
    const h = this.w.hints;
    if (!this.selectedProvider) return h.chooseInsurer;
    if (this.variantMissing) return h.variant;
    if (this.sumInsuredError) return h.sumInsured;
    if (this.hasIncompleteDriver) return h.driver;
    if (this.repriceFailed && !this.isRepricing) return h.failed;
    if (this.isRepricing || this.priceStale) return h.updating;
    return '';
  }
  retryReprice(): void { this.queueReprice(); }

  continueToCheckout(): void {
    if (!this.canContinue) return;
    this.errorMessage = '';
    this.step = 3;
    if (this.compact) this.scrollTop();
  }

  // ═════════ Step 3: details & payment ═════════

  private prefillProfileLocation(result: QuoteResult): void {
    if (!this.profile.city && result.city) this.profile.city = result.city;
    if (!this.profile.state && result.state) this.profile.state = result.state;
  }

  profileInvalid(field: ProfileField): boolean {
    if (!this.profileTouched) return false;
    const p = this.profile;
    switch (field) {
      case 'full_name': return p.full_name.trim().length < 3 || p.full_name.trim().length > 100;
      case 'email': return !EMAIL.test(p.email.trim());
      case 'mobile_no': return !/^60\d{8,10}$/.test(p.mobile_no.trim());
      case 'address_line1': return p.address_line1.trim().length < 5;
      case 'marital_status': return p.marital_status == null;
      case 'gender': return p.gender == null;
      default: return !String(p[field] ?? '').trim();
    }
  }
  private get profileValid(): boolean {
    const was = this.profileTouched;
    this.profileTouched = true;
    const ok = (['full_name', 'dob', 'marital_status', 'email', 'mobile_no', 'gender', 'address_line1', 'city', 'state'] as ProfileField[])
      .every((f) => !this.profileInvalid(f));
    this.profileTouched = was || !ok;
    return ok;
  }

  private buildProfileBody(): PolicyHolderRequest {
    const p = this.profile;
    const q = this.quotedValues!;
    return {
      full_name: p.full_name.trim(),
      id_type: q.id_type,
      id_number: q.id_number,
      email: p.email.trim(),
      mobile_no: p.mobile_no.trim(),
      dob: p.dob,
      gender: Number(p.gender),
      marital_status: Number(p.marital_status),
      nationality: p.nationality.trim(),
      address_line1: p.address_line1.trim(),
      address_line2: p.address_line2.trim(),
      address_line3: p.address_line3.trim(),
      state: p.state.trim(),
      city: p.city.trim(),
      pincode: Number(q.postcode),
      quotation_id: this.quote!.quotationId,
      vehicle_reg_no: this.quote!.vehRegNo ?? q.vehicle_no,
      inclusiveRoadTax: !!this.cover.inclusiveRoadTax,
    };
  }

  /** Save the holder's details (once per change), then the confirm popup, then Billplz. */
  async reviewAndPay(ev?: Event): Promise<void> {
    ev?.preventDefault();
    if (!this.profileValid || !this.quote || !this.quotedValues) {
      this.errorMessage = this.w.errors.fields;
      return;
    }
    const body = this.buildProfileBody();
    const key = JSON.stringify(body);
    if (key === this.savedProfileKey) { this.pdsAcknowledged = false; this.showConfirm = true; return; }
    await this.run(
      () => this.api.savePolicyHolderProfile(body),
      () => { this.savedProfileKey = key; this.pdsAcknowledged = false; this.showConfirm = true; },
      this.w.errors.profile,
      this.w.busy.saving,
    );
  }

  /** Required only when the insurer provides a PDS (customer gets it before buying). */
  get canPay(): boolean { return !this.selectedProvider || !this.pdsLink(this.selectedProvider) || this.pdsAcknowledged; }

  editFromConfirm(section: 'cover' | 'holder'): void {
    if (this.isBusy) return;
    this.showConfirm = false;
    if (section === 'cover') this.backFromCheckout();
  }
  closeConfirm(): void { if (!this.isBusy) this.showConfirm = false; }

  async pay(): Promise<void> {
    if (!this.quote) return;
    // Billplz returns to the portal's result page on this site (the backend only accepts that page).
    const redirect = `${window.location.origin}${this.session.path('insurance-purchase/result')}`;
    // From bulk: open the tab now, inside the click (browsers block window.open after an await), and send
    // it to Billplz once the bill is ready. See BULK_PAY_TAB_FLAG for why the opener link is cut.
    const tab = this.fromBatch ? this.openPaymentTab() : null;
    let sentToBillplz = false;
    await this.run(
      () => this.api.preparePayment(this.quote!.quotationId, BILLPLZ_PAYMENT_TYPE, redirect),
      (result) => {
        if (!/^https:\/\//i.test(result.paymentURL ?? '')) { tab?.close(); this.errorMessage = this.w.errors.payment; return; }
        if (tab) {
          tab.location.href = result.paymentURL;
          sentToBillplz = true;
          this.showConfirm = false;
          this.paymentOpened = true;
          this.batchLink?.onPaymentStarted();
          return;
        }
        // Keep the popup up while the browser leaves for Billplz.
        this.isBusy = true;
        this.busyMessage = this.w.busy.redirecting;
        window.location.href = result.paymentURL;
      },
      this.w.errors.payment,
      this.w.busy.payment,
    );
    // Failed before Billplz: close the blank tab.
    if (tab && !sentToBillplz) tab.close();
  }

  private openPaymentTab(): Window | null {
    try { sessionStorage.setItem(BULK_PAY_TAB_FLAG, '1'); } catch { /* storage blocked: the result page just shows its normal links */ }
    const tab = window.open('', '_blank');
    try { sessionStorage.removeItem(BULK_PAY_TAB_FLAG); } catch { /* see above */ }
    if (tab) tab.opener = null;
    return tab;
  }

  // ═════════ Summary helpers ═════════

  get selectedAddons(): { code: string; benefit?: string; premium?: string; sumInsured?: string }[] { return this.selectedProvider?.addOn ?? []; }
  addonLabel(code: string): string {
    const title = this.selectedProvider?.availableAddon?.[code]?.title?.en || this.addonRows.find((r) => r.code === code)?.addon.title?.en;
    if (title) return title;
    const benefit = this.selectedAddons.find((a) => a.code === code)?.benefit;
    if (benefit) return benefit.replace(/\s*\(RM[^)]*\)\s*$/, '');
    return code.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
  isFree(premium?: string): boolean { return (parseFloat(premium ?? '0') || 0) === 0; }
  priceBeforeNcdOnly(p: QuoteProvider): number { return parseFloat(p.basicContribution ?? '') || parseFloat(p.basicPremium ?? '0') || 0; }
  addonsTotal(p: QuoteProvider): number { return (p.addOn ?? []).reduce((s, a) => s + (parseFloat(a.premium ?? '0') || 0), 0); }
  processingFee(p: QuoteProvider): number {
    const total = parseFloat(p.totalContribution ?? '');
    const premium = parseFloat(p.premium ?? '');
    return !isNaN(total) && !isNaN(premium) && total - premium > 0.005 ? total - premium : 0;
  }
  perDay(p: QuoteProvider): number { return (parseFloat(p.totalContribution ?? '0') || 0) / 365; }
  ncdSaving(p: QuoteProvider): number { return parseFloat(p.ncdValue ?? '0') || 0; }
  get roadTaxAmount(): number { return this.cover.inclusiveRoadTax ? parseFloat(this.quote?.roadtax?.finalAmount ?? '0') || 0 : 0; }
  pdsLink(p: QuoteProvider): string {
    const pds = p.insuranceProviderLogos?.pds;
    const url = ((this.quote?.vehicleType ?? '').toLowerCase() === 'motorcycle' ? pds?.motorcycle?.en : pds?.car?.en) || '';
    return /^https?:\/\//i.test(url) ? url : '';
  }
  privacyLink(p: QuoteProvider): string {
    const url = p.insuranceProviderLogos?.privacy || '';
    return /^https?:\/\//i.test(url) ? url : '';
  }
  logo(p: QuoteProvider): string { return p.insuranceProviderLogos?.logo ?? ''; }
  maritalName(id: number | null): string { return this.options?.marital_status.find((m) => m.id === id)?.name ?? ''; }
  date(v: string): string { return formatDate(v); }
  money(value: string | number | null | undefined): string {
    const amount = typeof value === 'number' ? value : parseFloat(value ?? '0');
    return `RM ${(isNaN(amount) ? 0 : amount).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  abs(n: number): number { return Math.abs(n); }

  // ═════════ API plumbing ═════════

  private buildUpdateQuoteBody(): UpdateQuoteRequest {
    const c = this.cover;
    const variant = this.selectedProvider?.variants?.find((v) => v.nvic === c.nvic);
    const addOn: AddonSelection = {
      windshield: null, iosp: false, llop: false, pche: false, srcc: false, lltp: false, sprc: false,
      all_riders: false, all_drivers: false, twcd: null, paPlus: null, cart: null, bantuanIkhlasSupreme: null, lspa: false, pabp: false,
      additionalDrivers: null,
    };
    const windshield = this.addonValues['windshield'];
    addOn.windshield = windshield != null && Number(windshield) > 0 ? Number(windshield) : null;
    const set = addOn as unknown as Record<string, unknown>;
    for (const key of BOOLEAN_ADDON_KEYS) set[key] = this.addonValues[key] === true;
    for (const key of PLAN_ADDON_KEYS) {
      const v = this.addonValues[key];
      set[key] = typeof v === 'string' && v ? v : null;
    }
    const drivers = this.completeDrivers;
    addOn.additionalDrivers = drivers.length
      ? drivers.map((d) => ({
          fullName: d.fullName.trim(),
          nric: d.idType === 'nric' ? d.idNumber.trim() : null,
          passport: d.idType === 'passport' ? d.idNumber.trim() : null,
          dob: d.dob,
          nationality: d.nationality.trim() || 'Malaysia',
        }))
      : null;
    return {
      id: this.quote!.quotationId,
      vehicleCoverTypeID: this.coverTypeCode,
      inclusiveRoadTax: !!c.inclusiveRoadTax,
      nvic: c.nvic ?? '',
      vehmakeminor: variant?.vehmakeminor ?? '',
      postcode: String(this.quotedValues?.postcode ?? ''),
      marketValue: c.valueType === 'market',
      agreedValue: c.valueType === 'agreed',
      sumInsured: this.isThirdParty ? 0 : Number(c.sumInsured),
      provider: this.selectedProvider!.provider,
      addOn,
    };
  }

  private applyQuoteResult(result: QuoteResult): void {
    const previousTotal = parseFloat(this.selectedProvider?.totalContribution ?? '');
    this.quote = { ...this.quote!, ...result };
    const priced = result.providers?.find((p) => p.provider === this.selectedProvider?.provider);
    if (priced) this.selectedProvider = priced;
    this.prefillProfileLocation(result);
    const newTotal = parseFloat(this.selectedProvider?.totalContribution ?? '');
    if (this.suppressNextDelta) { this.suppressNextDelta = false; this.priceDelta = null; return; }
    if (!isNaN(previousTotal) && !isNaN(newTotal) && Math.abs(newTotal - previousTotal) >= 0.01) {
      this.priceDelta = newTotal - previousTotal;
      if (this.deltaTimer) clearTimeout(this.deltaTimer);
      this.deltaTimer = setTimeout(() => { this.priceDelta = null; this.cdr.markForCheck(); }, PRICE_DELTA_VISIBLE_MS);
    }
  }

  /** Blocking call (quote, save, payment) with the busy popup; re-pricing stays inline. */
  private async run<T>(request: () => Promise<T>, onSuccess: (v: T) => void, fallback: string, busyMessage: string): Promise<void> {
    this.isBusy = true;
    this.busyMessage = busyMessage;
    this.errorMessage = '';
    this.fieldErrors = [];
    this.cdr.markForCheck();
    try {
      const value = await request();
      this.isBusy = false;
      this.stopQuoteTimer();
      onSuccess(value);
    } catch (err) {
      this.isBusy = false;
      this.stopQuoteTimer();
      if (this.session.isLoggedIn()) this.showError(err, fallback);
    } finally {
      this.cdr.markForCheck();
    }
  }

  /** Raw gateway errors mean nothing to an agent: say what happened and what to do. */
  private friendlyError(message: string): string {
    if (/\b50[234]\b|timeout|timed out|ETIMEDOUT|ECONNRESET/i.test(message)) return this.w.errors.timeout;
    if (/SNG_REFERCASE|prior approval/i.test(message)) return this.w.errors.referCase;
    return message.replace(/^SENANG_ERROR\s*/i, '');
  }
  private showError(err: unknown, fallback: string): void {
    this.errorMessage = err instanceof ApiError && err.message && err.httpStatus !== 0 ? this.friendlyError(err.message) : fallback;
  }

  private resetProfile(): void {
    this.profile = {
      full_name: '', dob: '', marital_status: null, email: '', mobile_no: '', gender: null, nationality: 'Malaysian',
      address_line1: '', address_line2: '', address_line3: '', city: '', state: '',
    };
    this.profileTouched = false;
  }
}
