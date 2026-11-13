import { ChangeDetectionStrategy, Component, afterNextRender, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { usePageLang } from '../core/page-lang';
import { SeoService } from '../core/seo.service';
import { Icon } from '../components/icon';
import { OrderSummary } from '../quote/order-summary';
import { QuoteLayout } from '../quote/quote-layout';
import { QuoteStore } from '../quote/quote.store';
import type { Offer } from '../quote/quote.types';

// /insurance/quote/result?status=success|failed — where the backend sends the visitor back after Billplz.
// The backend has already marked the payment and started issuing the policy before redirecting here; this page
// only reports the outcome. Anything other than success/failed is shown as "unknown".

type Status = 'success' | 'failed' | 'unknown';

@Component({
  selector: 'app-insurance-result-page',
  imports: [QuoteLayout, OrderSummary, Icon],
  template: `
    @let r = i18n.t().quoteFlow.result;
    <app-quote-layout [title]="r.pageTitle" subpath="insurance/quote/result/">
      @if (ready()) {
        <section class="status" [class]="'status status--' + status()" role="status">
          <span class="status__icon" aria-hidden="true">
            <app-icon [name]="status() === 'success' ? 'check' : status() === 'failed' ? 'x' : 'clock24'" [size]="28" />
          </span>
          <h2>{{ status() === 'success' ? r.successTitle : status() === 'failed' ? r.failedTitle : r.unknownTitle }}</h2>
          <p>{{ status() === 'success' ? r.successBody : status() === 'failed' ? r.failedBody : r.unknownBody }}</p>
          <div class="actions">
            @if (status() === 'failed' && offer()?.quotationId) {
              <a class="btn btn--primary" [href]="retryHref()">{{ r.retry }}</a>
            }
            <a [class]="status() === 'failed' ? 'link' : 'btn btn--primary'" [href]="i18n.home()">{{ r.home }}</a>
          </div>
        </section>
        @if (offer(); as o) { <app-order-summary [offer]="o" /> }
      }
    </app-quote-layout>`,
  styles: `
    .status { display: grid; justify-items: center; gap: 10px; padding: 28px 20px; text-align: center; background: #fff; border: 1px solid var(--line); border-radius: var(--radius); }
    .status__icon { display: grid; place-items: center; width: 56px; height: 56px; border-radius: 999px; background: var(--bg-soft); color: var(--ink-2); }
    .status--success .status__icon { background: #ecfdf3; color: #067647; }
    .status--failed .status__icon { background: #fef3f2; color: #b42318; }
    .status h2 { font-size: 1.375rem; font-weight: 900; color: var(--ink); }
    .status p { max-width: 46ch; color: var(--ink-2); }
    .actions { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 8px 16px; margin-top: 8px; }
    .link { min-height: 44px; display: inline-flex; align-items: center; font-weight: 700; color: var(--navy); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InsuranceResultPage {
  protected readonly i18n = usePageLang();
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(QuoteStore);

  protected readonly ready = signal(false);
  protected readonly status = signal<Status>('unknown');
  protected readonly offer = signal<Offer | null>(null);
  /** Back to the payment step for the same quote. The quote list's id isn't known here; payment only needs the stored offer. */
  protected readonly retryHref = (): string => `${this.i18n.home()}insurance/quote/payment`;

  constructor() {
    const t = this.i18n.t();
    inject(SeoService).apply({ t, subpath: 'insurance/quote/result/', title: `${t.quoteFlow.result.unknownTitle} | QarQal` });
    afterNextRender(() => {
      const s = this.route.snapshot.queryParamMap.get('status');
      this.status.set(s === 'success' || s === 'failed' ? s : 'unknown');
      this.offer.set(this.store.selected());
      // Paid: this quote is done, so a new hero submit starts clean.
      if (s === 'success') this.store.select(null);
      this.ready.set(true);
    });
  }
}
