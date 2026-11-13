import { ChangeDetectionStrategy, Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { usePageLang } from '../core/page-lang';
import { ApiError } from '../core/qarqal-api';
import { SeoService } from '../core/seo.service';
import { Icon } from '../components/icon';
import { OrderSummary } from '../quote/order-summary';
import { PaymentService } from '../quote/payment.service';
import { QuoteLayout } from '../quote/quote-layout';
import { QuoteStore } from '../quote/quote.store';
import { Alert } from '../shared/ui/alert';
import { fill, formatMoney } from '../shared/utils/format.util';

// /insurance/quote/payment?quotation_id=<id> — review and pay with Billplz (step 3 of 3).
// "Pay" creates the bill and leaves the site for Billplz; the visitor comes back to /insurance/quote/result.

@Component({
  selector: 'app-insurance-payment-page',
  imports: [QuoteLayout, OrderSummary, Alert, Icon],
  template: `
    @let f = i18n.t().quoteFlow;
    @let p = f.payment;
    <app-quote-layout [title]="p.title" [lede]="p.lede" subpath="insurance/quote/payment/" [step]="3"
      [backHref]="backHref()" [backLabel]="p.back">
      @if (ready()) {
        @if (offer(); as o) {
          <app-order-summary [offer]="o" [plateNo]="plateNo()" />

          @if (error()) { <app-alert tone="error">{{ error() }}</app-alert> }

          <div class="pay">
            <button class="btn btn--primary pay__btn" type="button" [disabled]="busy()" (click)="pay()">
              <app-icon name="lock" [size]="18" /> {{ busy() ? p.paying : fill(p.payAmount, { amount: money(o.totalContribution) }) }}
            </button>
            <p class="note">{{ p.secure }} {{ p.totalNote }}</p>
          </div>
        } @else {
          <div class="panel">
            <p>{{ f.page.missing }}</p>
            <div><a class="btn btn--primary" [href]="i18n.home()">{{ f.page.newQuote }}</a></div>
          </div>
        }
      }
    </app-quote-layout>`,
  styles: `
    .panel { display: grid; gap: 14px; padding: 20px; background: #fff; border: 1px solid var(--line); border-radius: var(--radius); color: var(--ink-2); }
    .pay { display: grid; gap: 10px; }
    .pay__btn { width: 100%; min-height: 52px; font-size: 1.0625rem; }
    .pay__btn:disabled { opacity: 0.7; cursor: progress; }
    .note { font-size: 0.8125rem; color: var(--ink-3); text-align: center; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InsurancePaymentPage {
  protected readonly i18n = usePageLang();
  private readonly route = inject(ActivatedRoute);
  private readonly payments = inject(PaymentService);
  private readonly store = inject(QuoteStore);
  protected readonly fill = fill;
  protected readonly money = formatMoney;

  protected readonly offer = this.store.selected;
  /** The store reads sessionStorage, which only exists in the browser: render after hydration. */
  protected readonly ready = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  private readonly quoteId = this.route.snapshot.queryParamMap.get('quotation_id') ?? '';
  protected readonly plateNo = (): string => this.store.load(this.quoteId)?.vehicle.plateNo ?? '';
  protected readonly backHref = computed(() => `${this.i18n.home()}insurance/quote/details?quotation_id=${encodeURIComponent(this.quoteId)}`);

  constructor() {
    const t = this.i18n.t();
    inject(SeoService).apply({ t, subpath: 'insurance/quote/payment/', title: `${t.quoteFlow.payment.title} | QarQal` });
    afterNextRender(() => this.ready.set(true));
  }

  protected async pay(): Promise<void> {
    const quotationId = this.offer()?.quotationId;
    if (!quotationId) return;
    this.busy.set(true);
    this.error.set('');
    try {
      // Plain path, no query: the backend appends ?status=.
      const returnUrl = `${location.origin}${this.i18n.home()}insurance/quote/result`;
      const url = await this.payments.prepare(quotationId, returnUrl);
      location.assign(url); // leave for Billplz; busy stays on while the page unloads
    } catch (err) {
      const p = this.i18n.t().quoteFlow.payment;
      this.error.set(err instanceof ApiError && err.message ? `${p.failed} (${err.message})` : p.failed);
      this.busy.set(false);
    }
  }
}
