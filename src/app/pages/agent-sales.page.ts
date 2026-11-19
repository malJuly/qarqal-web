import { ChangeDetectionStrategy, Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { AGENT_LIST_STYLES } from '../agent/agent-list.styles';
import { useAgentPage } from '../agent/agent-page';
import { AgentSession } from '../agent/agent-session.service';
import { InsurancePurchaseService, type AgentSale } from '../agent/insurance-purchase.service';
import { Alert } from '../shared/ui/alert';
import { Badge, type BadgeTone } from '../shared/ui/badge';
import { Pagination } from '../shared/ui/pagination';
import { downloadCsv } from '../shared/utils/csv.util';
import { formatDate, formatMoney } from '../shared/utils/format.util';

// /agent/insurance-purchase/sales — the insurance this agent sold (qarqalAngular: purchase/insurance/sales).
// GET /admin/insurance-purchase/sales: only the calling agent's sales (backend dt_agent_sale_ags).

const PAGE_SIZE = 25;
const POLICY_TONE: Record<string, BadgeTone> = {
  SUCCESS: 'success', PENDING_FOR_PAYMENT: 'warning', PENDING_FOR_APPROVAL: 'info', PENDING_REFERCASE: 'info',
  PENDING: 'info', REJECTED: 'danger', CANCELLED: 'danger', PAYMENT_FAILED: 'danger', REFUNDED: 'neutral',
};

@Component({
  selector: 'app-agent-sales-page',
  imports: [Alert, Badge, Pagination],
  template: `
    @let s = i18n.t().agent.sales;
    @let c = i18n.t().agent.common;
    <div class="ls-bar">
      <span class="ls-count">{{ loading() ? c.loading : total() + ' ' + c.records }}</span>
      <button type="button" class="btn ls-csv" [disabled]="!rows().length" (click)="exportCsv()">{{ c.downloadCsv }}</button>
    </div>
    @if (error()) { <app-alert tone="error">{{ error() }}</app-alert> }

    <div class="ls-table-wrap">
      <table class="ls-table">
        <thead>
          <tr>
            <th>{{ s.cols.date }}</th><th>{{ s.cols.vehicle }}</th><th>{{ s.cols.quotation }}</th><th>{{ s.cols.customer }}</th>
            <th class="num">{{ s.cols.total }}</th><th>{{ s.cols.policy }}</th><th>{{ s.cols.coverNote }}</th>
          </tr>
        </thead>
        <tbody>
          @if (loading()) {
            <tr class="ls-state"><td colspan="7">{{ c.loading }}</td></tr>
          } @else if (!rows().length) {
            <tr class="ls-state"><td colspan="7">{{ s.empty }}</td></tr>
          }
          @for (r of loading() ? [] : rows(); track r.ags_id) {
            <tr>
              <td>{{ dateTime(r.created_date) }}</td>
              <td><strong>{{ r.vehicle_no || '—' }}</strong></td>
              <td class="mono">{{ r.quotation_id }}</td>
              <td>{{ r.customer_linked ? s.linked : s.company }}</td>
              <td class="num">{{ r.total_contribution ? 'RM ' + money(r.total_contribution) : '—' }}</td>
              <td><app-badge [tone]="tone(r.policy_status)">{{ policyLabel(r.policy_status) }}</app-badge></td>
              <td class="mono">{{ r.cover_note_no || '—' }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <ul class="ls-cards">
      @if (loading()) { <li class="ls-card ls-state">{{ c.loading }}</li> }
      @else if (!rows().length) { <li class="ls-card ls-state">{{ s.empty }}</li> }
      @for (r of loading() ? [] : rows(); track r.ags_id) {
        <li class="ls-card">
          <div class="ls-card-head">
            <div><strong>{{ r.vehicle_no || '—' }}</strong><small>{{ dateTime(r.created_date) }}</small></div>
            <app-badge [tone]="tone(r.policy_status)">{{ policyLabel(r.policy_status) }}</app-badge>
          </div>
          <dl class="ls-card-body">
            <div><dt>{{ s.cols.total }}</dt><dd>{{ r.total_contribution ? 'RM ' + money(r.total_contribution) : '—' }}</dd></div>
            <div><dt>{{ s.cols.customer }}</dt><dd>{{ r.customer_linked ? s.linked : s.company }}</dd></div>
            <div><dt>{{ s.cols.quotation }}</dt><dd class="mono">{{ r.quotation_id }}</dd></div>
            <div><dt>{{ s.cols.coverNote }}</dt><dd class="mono">{{ r.cover_note_no || '—' }}</dd></div>
          </dl>
        </li>
      }
    </ul>

    <app-pagination [page]="page()" [totalPages]="totalPages()" [label]="c.pages" [prevLabel]="c.prev" [nextLabel]="c.next" (pageChange)="goTo($event)" />`,
  styles: [AGENT_LIST_STYLES],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentSalesPage {
  protected readonly i18n = useAgentPage((t) => `${t.agent.sales.title} | QarQal`);
  private readonly session = inject(AgentSession);
  private readonly purchase = inject(InsurancePurchaseService);
  protected readonly money = formatMoney;
  protected readonly dateTime = (v: string): string => formatDate(v, true);

  protected readonly rows = signal<AgentSale[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));

  constructor() {
    afterNextRender(() => void this.load());
  }

  protected tone(s: string | null): BadgeTone { return (s && POLICY_TONE[s]) || 'neutral'; }
  protected policyLabel(s: string | null): string {
    if (!s) return this.i18n.t().agent.sales.draft;
    return (this.i18n.t().agent.insurance.policyStatuses as Record<string, string>)[s] ?? s;
  }
  protected goTo(p: number): void { this.page.set(p); void this.load(); }

  protected exportCsv(): void {
    const c = this.i18n.t().agent.sales.cols;
    const s = this.i18n.t().agent.sales;
    downloadCsv(`my-sales-page-${this.page()}.csv`,
      [c.date, c.vehicle, c.quotation, c.customer, c.total, c.policy, c.coverNote],
      this.rows().map((r) => [formatDate(r.created_date, true), r.vehicle_no, r.quotation_id, r.customer_linked ? s.linked : s.company,
        r.total_contribution ? formatMoney(r.total_contribution) : '', this.policyLabel(r.policy_status), r.cover_note_no]));
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const res = await this.purchase.sales(this.page(), PAGE_SIZE);
      this.rows.set(res.rows ?? []);
      this.total.set(res.total ?? 0);
    } catch {
      this.rows.set([]);
      if (this.session.isLoggedIn()) this.error.set(this.i18n.t().agent.common.loadFailed);
    } finally {
      this.loading.set(false);
    }
  }
}
