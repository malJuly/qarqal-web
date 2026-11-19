import { ChangeDetectionStrategy, ChangeDetectorRef, Component, afterNextRender, inject } from '@angular/core';
import { BULK_PAY_TAB_FLAG, PAYMENT_RESULT_CHANNEL } from '../agent/insurance-purchase.util';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { useAgentPage } from '../agent/agent-page';
import { AgentSession } from '../agent/agent-session.service';
import { Icon } from '../components/icon';

// /agent/insurance-purchase/result?status=success|failed — where Billplz sends the agent back
// (via the backend's /insurance/payment-redirect, which checks the payment and adds ?status=).
// This path must stay in the backend's allowed list (insurancePurchase.service.ts validateAgentRedirectURL).

@Component({
  selector: 'app-agent-purchase-result-page',
  imports: [RouterLink, Icon],
  template: `
    @let r = i18n.t().agent.purchase.result;
    <section class="pr" [class.pr--ok]="success">
      <span class="pr__icon"><app-icon [name]="success ? 'check' : 'x'" [size]="28" /></span>
      <h2>{{ success ? r.successTitle : r.failedTitle }}</h2>
      <p>{{ success ? r.successBody : r.failedBody }}</p>
      <div class="pr__actions">
        @if (fromBulk) {
          <p class="pr__bulk">{{ i18n.t().agent.bulk.resultNote }}</p>
          <button type="button" class="btn btn--primary" (click)="closeTab()">{{ i18n.t().agent.bulk.closeTab }}</button>
        } @else if (success) {
          <a class="btn btn--primary" [routerLink]="session.path('insurance-purchase/sales')">{{ r.viewSales }}</a>
          <a class="btn pr__secondary" [routerLink]="session.path('insurance-purchase')">{{ r.newSale }}</a>
        } @else {
          <a class="btn btn--primary" [routerLink]="session.path('insurance-purchase')">{{ r.tryAgain }}</a>
          <a class="btn pr__secondary" [routerLink]="session.path('insurance-purchase/sales')">{{ r.viewSales }}</a>
        }
      </div>
    </section>`,
  styles: `
    .pr { display: grid; justify-items: center; gap: 10px; max-width: 520px; margin: 24px auto; padding: 24px; text-align: center; background: #fff; border: 1px solid var(--line); border-radius: 10px; }
    .pr__icon { display: grid; place-items: center; width: 56px; height: 56px; border-radius: 50%; background: #fef3f2; color: #b42318; }
    .pr--ok .pr__icon { background: #eaf1ff; color: var(--navy); }
    h2 { font-size: 1.25rem; font-weight: 900; color: var(--ink); }
    p { color: var(--ink-2); }
    .pr__actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 6px; }
    .pr__secondary { background: #fff; color: var(--navy); border: 1px solid var(--line); }
    .pr__bulk { flex-basis: 100%; font-size: 0.875rem; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentPurchaseResultPage {
  protected readonly i18n = useAgentPage((t) => `${t.agent.purchase.title} | QarQal`);
  protected readonly session = inject(AgentSession);
  /** Follows the URL, so the page is right even when only ?status= changes. */
  private readonly status = toSignal(inject(ActivatedRoute).queryParamMap.pipe(map((q) => q.get('status'))), { initialValue: null });
  protected get success(): boolean { return this.status() === 'success'; }
  /** A payment tab opened by bulk quote: the list is in the other tab, which updates itself. */
  protected fromBulk = false;

  constructor() {
    const cdr = inject(ChangeDetectorRef);
    afterNextRender(() => {
      try { this.fromBulk = sessionStorage.getItem(BULK_PAY_TAB_FLAG) === '1'; } catch { this.fromBulk = false; }
      // Bulk quote (another tab) re-checks its payment status from My sales when it hears this.
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel(PAYMENT_RESULT_CHANNEL);
        channel.postMessage({ status: this.success ? 'success' : 'failed' });
        channel.close();
      }
      cdr.markForCheck();
    });
  }

  closeTab(): void { window.close(); }
}
