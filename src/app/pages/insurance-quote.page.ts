import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { usePageLang } from '../core/page-lang';
import { QarqalApi } from '../core/qarqal-api';
import { SeoService } from '../core/seo.service';
import { PlanCustomiser } from '../quote/plan-customiser';
import { CheckoutBar } from '../quote/checkout-bar';
import { OfferCard } from '../quote/offer-card';
import { insurerName, tilePrice } from '../quote/offer.util';
import { OrderSummary } from '../quote/order-summary';
import { QuoteLayout } from '../quote/quote-layout';
import { QuoteService } from '../quote/quote.service';
import { QuoteStore } from '../quote/quote.store';
import { COVER_TYPES, type CoverTypeId, type Offer, type QuoteOutcome } from '../quote/quote.types';
import { VehicleBar } from '../quote/vehicle-bar';
import { Alert } from '../shared/ui/alert';
import { ConfirmDialog } from '../shared/ui/confirm-dialog';
import { PillTabs, type PillTab } from '../shared/ui/pill-tabs';
import { Spinner } from '../shared/ui/spinner';
import { SuccessPopup } from '../shared/ui/success-popup';
import { GetApp } from '../components/get-app';
import { fill } from '../shared/utils/format.util';
import { maskMobile } from '../shared/utils/phone.util';

// /insurance/quote?quotation_id=<id> — choose a plan (step 1 of 3): insurer tiles and the order summary in the side column,
// the selected insurer's plan options (variant, value type, sum insured, road tax), add-ons and live price
// in the main column. Picking an insurer (the cheapest is
// picked to start) shows its add-ons at once; the customiser then calls update-quote, which confirms the
// price and tells the backend which insurer was chosen. Phones: insurers first, add-ons under them.
//
// Every visitor arriving from the hero form gets a popup with the app store badges over the loading state;
// verified visitors are also told they'll earn points.
// Arriving from the hero form (QuoteStore.pending set, no id): runs generate-quote, saves the result under its
// quotation id and puts ?quotation_id= in the URL. Arriving with it (refresh, back button): reads the saved
// result. Prerendered as an empty shell; everything runs in the browser.
//
// ?quotation_id= stays the same on every later step (it names the saved result); the chosen offer carries
// its own quotation id for the API calls.

type View = 'loading' | 'ok' | 'notFound' | 'error' | 'missing';
type OkOutcome = Extract<QuoteOutcome, { kind: 'ok' }>;
const sameOffer = (a: Offer | null, b: Offer): boolean => !!a && a.provider === b.provider && a.cover === b.cover;

@Component({
  selector: 'app-insurance-quote-page',
  imports: [QuoteLayout, VehicleBar, OfferCard, OrderSummary, PillTabs, PlanCustomiser, CheckoutBar, Spinner, Alert, SuccessPopup, ConfirmDialog, GetApp],
  template: `
    @let f = i18n.t().quoteFlow;
    <app-quote-layout [title]="f.results.title" [lede]="view() === 'ok' ? f.results.lede : ''" subpath="insurance/quote/" [step]="1"
      [hasAside]="view() === 'ok'" [asideFirst]="true" [stickyAside]="false" [backHref]="i18n.home()" [backLabel]="f.page.home">
      @switch (view()) {
        @case ('loading') {
          <div class="panel">
            <app-spinner [label]="f.loading">
              <app-get-app class="promo" [text]="f.earnInApp" [badgeHeight]="40" [gutter]="72" />
            </app-spinner>
          </div>
        }

        @case ('ok') {
          <div #customise class="customise">
            @if (selected(); as o) {
              <app-plan-customiser [offer]="o" [vehicleType]="result()?.vehicle?.vehicleType ?? ''" (updated)="onUpdated($event)" />

              @if (mobile()) {
                <app-alert tone="success">{{ fill(f.results.earning, { mobile: mobile() }) }}</app-alert>
              } @else {
                <app-alert>{{ f.results.notEarning }}</app-alert>
              }

              <!-- Phones and tablets: the summary follows the options (wide screens show it under the insurers). -->
              <app-order-summary class="narrow-only" [offer]="o" [plateNo]="result()?.vehicle?.plateNo ?? ''" [updating]="busy()" />

              <app-checkout-bar [floating]="true" [label]="insurer(o) + ' · ' + f.summary.total" [total]="o.totalContribution" [dim]="busy()">
                <button class="btn btn--primary" type="button" [disabled]="busy() || blocked()" (click)="next()">{{ f.addons.continue }}</button>
              </app-checkout-bar>
            } @else {
              <p class="panel empty">{{ f.results.noneForCover }}</p>
            }
          </div>
        }

        @case ('notFound') {
          <div class="panel state">
            <h2>{{ f.results.notFoundTitle }}</h2>
            <p>{{ f.results.notFound }}</p>
            <div class="actions">
              <a class="btn btn--primary" [href]="i18n.home()">{{ f.results.editDetails }}</a>
              <a class="link" [href]="i18n.home() + '#download'">{{ f.results.openApp }}</a>
            </div>
          </div>
        }

        @case ('error') {
          <div class="panel state">
            <app-alert tone="error">{{ f.results.error }}</app-alert>
            <div class="actions">
              @if (canRetry()) { <button class="btn btn--primary" type="button" (click)="generate()">{{ f.results.retry }}</button> }
              <a class="link" [href]="i18n.home()">{{ f.results.editDetails }}</a>
            </div>
          </div>
        }

        @case ('missing') {
          <div class="panel state">
            <p>{{ f.page.missing }}</p>
            <div class="actions"><a class="btn btn--primary" [href]="i18n.home()">{{ f.page.newQuote }}</a></div>
          </div>
        }
      }

      @if (view() === 'ok' && result(); as r) {
        <div aside class="pick">
          <app-vehicle-bar [vehicle]="r.vehicle" [editLabel]="f.results.edit" (edit)="leaveConfirm.open()" />
          <app-pill-tabs [compact]="true" [tabs]="tabs()" [selected]="cover()" (selectedChange)="setCover($event)" [ariaLabel]="f.results.coverLabel" />
          <div class="offers" role="radiogroup" [attr.aria-label]="f.results.insurers">
            @for (o of shown(); track o.provider + o.cover) {
              <app-offer-card [offer]="o" [selected]="isSelected(o)" [lowest]="o.provider === lowest()" (choose)="pick($event, true)" />
            } @empty {
              <p class="note">{{ f.results.noneForCover }}</p>
            }
          </div>
          <p class="note">
            {{ f.results.priceNote }}
            @if (others().length) { {{ f.results.others }} {{ others().join(', ') }}. }
          </p>
          @if (selected(); as o) {
            <app-order-summary class="wide-only" [offer]="o" [plateNo]="r.vehicle.plateNo" [updating]="busy()" />
          }
        </div>
      }
    </app-quote-layout>
    <app-confirm-dialog #leaveConfirm modalId="edit-vehicle" [heading]="f.results.editConfirm.title" [message]="f.results.editConfirm.body"
      [confirmLabel]="f.results.editConfirm.yes" [cancelLabel]="f.results.editConfirm.no" [closeLabel]="f.close" (confirmed)="startOver()" />
    <app-success-popup modalId="points" [heading]="mobile() ? f.success.title : f.success.guestTitle"
      [message]="mobile() ? fill(f.success.body, { mobile: mobile() }) : f.success.guestBody" [closeLabel]="f.close" [seconds]="7" [closingText]="f.success.closing">
      <app-get-app [badgeHeight]="32" />
    </app-success-popup>`,
  styles: `
    :host { --aside-w: 420px; }
    .promo { display: block; width: 100%; max-width: 440px; margin-top: 8px; }
    .panel { padding: 20px; border: 1px solid var(--line); border-radius: var(--radius); background: #fff; }
    .customise { display: grid; gap: 16px; scroll-margin-top: calc(var(--top-h) + 12px); }
    .pick { display: grid; gap: 12px; }
    .offers { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; padding: 4px; }
    .offers .note { grid-column: 1 / -1; }
    .wide-only { display: none; }
    @media (min-width: 960px) { .wide-only { display: block; } .narrow-only { display: none; } }
    .empty { color: var(--ink-3); text-align: center; }
    .note { font-size: 0.8125rem; color: var(--ink-3); }
    .state { display: grid; gap: 14px; }
    .state h2 { font-size: 1.125rem; font-weight: 900; color: var(--navy); }
    .state p { color: var(--ink-2); }
    .actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; }
    .link { min-height: 44px; display: inline-flex; align-items: center; font-weight: 700; color: var(--navy); }
    .btn:disabled { opacity: 0.7; cursor: progress; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InsuranceQuotePage {
  protected readonly i18n = usePageLang();
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(QarqalApi);
  private readonly quotes = inject(QuoteService);
  private readonly store = inject(QuoteStore);
  protected readonly fill = fill;

  protected readonly view = signal<View>('loading');
  protected readonly result = signal<OkOutcome | null>(null);
  protected readonly cover = signal<CoverTypeId>('COMP');
  /** The saved result's id (?quotation_id=), carried to the later steps. */
  private readonly quoteId = signal(this.route.snapshot.queryParamMap.get('quotation_id') ?? '');

  /** The chosen offer, with its live (update-quote) price once re-priced. */
  protected readonly selected = this.store.selected;
  private readonly panel = viewChild(PlanCustomiser);
  private readonly pointsPopup = viewChild.required(SuccessPopup);
  private readonly customise = viewChild<ElementRef<HTMLElement>>('customise');
  protected readonly busy = computed(() => this.panel()?.updating() ?? false);
  /** The last price update failed, or the sum insured is out of range: fix or retry before moving on. */
  protected readonly blocked = computed(() => !!this.panel()?.error() || !!this.panel()?.invalid());

  /** The verified number, masked (+60 *****380): it's only a reminder here, so most of it stays hidden. */
  protected readonly mobile = computed(() => (this.api.mobile() ? maskMobile(this.api.mobile()!) : ''));
  protected readonly canRetry = computed(() => !!this.store.pending());
  private readonly offers = computed<Offer[]>(() => this.result()?.offers ?? []);
  /** This cover type's offers in first-quoted order (cheapest first), so tiles don't move when one is tapped; the selected insurer shows its live price. */
  protected readonly shown = computed(() => {
    const sel = this.selected();
    return this.offers()
      .filter((o) => o.cover === this.cover())
      .sort((a, b) => tilePrice(a) - tilePrice(b))
      .map((o) => (sel && sameOffer(sel, o) ? sel : o));
  });
  /**
   * Insurer with the lowest price as shown on the tiles right now. The selected tile carries its live
   * (update-quote) price, which can differ from its first quote, so this is worked out from what's on
   * screen rather than from the order. Empty when there's only one insurer.
   */
  protected readonly lowest = computed(() => {
    const list = this.shown();
    if (list.length < 2) return '';
    return list.reduce((best, o) => (tilePrice(o) < tilePrice(best) ? o : best)).provider;
  });
  protected readonly others = computed(() =>
    (this.result()?.others ?? []).filter((o) => o.cover === this.cover()).map((o) => insurerName(o.provider)));
  protected readonly tabs = computed<PillTab<CoverTypeId>[]>(() => {
    const covers = this.i18n.t().quoteFlow.covers;
    return COVER_TYPES.map((c) => ({ id: c.id, label: covers[c.id], count: this.offers().filter((o) => o.cover === c.id).length }));
  });

  constructor() {
    const t = this.i18n.t();
    inject(SeoService).apply({ t, subpath: 'insurance/quote/', title: `${t.quoteFlow.results.title} | QarQal` });
    afterNextRender(() => this.init());
  }

  protected insurer(o: Offer): string {
    return insurerName(o.provider);
  }

  protected isSelected(o: Offer): boolean {
    return sameOffer(this.selected(), o);
  }

  private init(): void {
    const saved = this.quoteId() ? this.store.load(this.quoteId()) : null;
    if (saved) { this.show(saved); return; }
    if (this.store.pending()) {
      // Every time quotes are requested: a popup over the loading state that offers the app. Verified
      // visitors are told they'll earn points; visitors who skipped get a neutral message (no points to
      // promise). Closes itself after 7 seconds, or with the X.
      this.pointsPopup().show();
      void this.generate();
      return;
    }
    this.view.set('missing');
  }

  protected async generate(): Promise<void> {
    const input = this.store.pending();
    if (!input) { this.view.set('missing'); return; }
    this.view.set('loading');
    const outcome = await this.quotes.generate(input);
    if (outcome.kind !== 'ok') { this.view.set(outcome.kind); return; }

    this.show(outcome);
    if (outcome.quotationId) {
      this.quoteId.set(outcome.quotationId);
      this.store.save(outcome.quotationId, outcome);
      void this.router.navigate([], { relativeTo: this.route, queryParams: { quotation_id: outcome.quotationId }, replaceUrl: true });
    }
  }

  private show(r: OkOutcome): void {
    this.result.set(r);
    // Keep an earlier choice from this result (refresh, back from the next step); otherwise start on the
    // first cover type that has offers, with its cheapest insurer selected.
    const kept = this.selected();
    if (kept && r.offers.some((o) => sameOffer(kept, o))) {
      this.cover.set(kept.cover);
    } else {
      this.setCover(COVER_TYPES.map((c) => c.id).find((c) => r.offers.some((o) => o.cover === c)) ?? 'COMP');
    }
    this.view.set('ok');
  }

  /** Switching cover type selects that cover's cheapest insurer, so add-ons and price always match the tab. */
  protected setCover(cover: CoverTypeId): void {
    this.cover.set(cover);
    const first = this.shown()[0];
    if (first) this.pick(first, false);
    else this.store.select(null);
  }

  protected pick(offer: Offer, byVisitor: boolean): void {
    if (this.busy()) return;
    if (!this.isSelected(offer)) this.store.select(offer);
    // Phones: the add-ons sit under the list, so bring them into view after a tap.
    if (byVisitor && window.matchMedia('(max-width: 959px)').matches) {
      const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.customise()?.nativeElement.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
    }
  }

  /** After the visitor confirms "Edit": back to the home page's form to enter the vehicle and ID again. */
  protected startOver(): void {
    void this.router.navigateByUrl(this.i18n.home());
  }

  protected onUpdated(offer: Offer): void {
    this.store.select(offer);
  }

  protected next(): void {
    void this.router.navigate([this.i18n.home() + 'insurance/quote/details'], { queryParams: { quotation_id: this.quoteId() } });
  }
}
