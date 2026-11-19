import { ChangeDetectionStrategy, Component, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { AGENT_LIST_STYLES } from '../agent/agent-list.styles';
import { useAgentPage } from '../agent/agent-page';
import { AgentSession } from '../agent/agent-session.service';
import {
  InsuranceOrder, InsuranceOrdersService, PAYMENT_STATUSES, POLICY_STATUSES, PolicyDetails,
} from '../agent/insurance-orders.service';
import { Alert } from '../shared/ui/alert';
import { Badge, BadgeTone } from '../shared/ui/badge';
import { Modal } from '../shared/ui/modal';
import { MultiSelect } from '../shared/ui/multi-select';
import { Pagination } from '../shared/ui/pagination';
import { SelectField, SelectOption } from '../shared/ui/select-field';
import { Spinner } from '../shared/ui/spinner';
import { TextField } from '../shared/ui/text-field';
import { downloadCsv } from '../shared/utils/csv.util';
import { formatDate, formatMoney, toStr } from '../shared/utils/format.util';

// /agent/insurance-orders — rebuilt from qarqalAngular's Insurance Orders page (pages/masters/list-orders).
// Payment status, policy status (multi) and date range filters (this month by default), the company's
// total contribution, a table or cards, the policy popup, and CSV of the current page.
//
// Left out on purpose (internal QarQal data): supplier (Senang/InsureKu), commission, commission invoice,
// "Pay to Senang", and the payment logs link.

const PAGE_SIZE = 25;

const POLICY_TONE: Record<string, BadgeTone> = {
  SUCCESS: 'success', PENDING_FOR_PAYMENT: 'warning', PENDING_FOR_APPROVAL: 'info', PENDING_REFERCASE: 'info',
  PENDING: 'info', REJECTED: 'danger', CANCELLED: 'danger', PAYMENT_FAILED: 'danger', REFUNDED: 'neutral',
};
const PAYMENT_TONE: Record<string, BadgeTone> = { Success: 'success', Failed: 'danger', Initiated: 'warning' };

const pad = (n: number): string => String(n).padStart(2, '0');
const thisMonth = (): { from: string; to: string } => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const last = new Date(y, m, 0).getDate();
  return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(last)}` };
};

@Component({
  selector: 'app-agent-insurance-orders-page',
  imports: [Alert, Badge, Modal, MultiSelect, Pagination, SelectField, Spinner, TextField],
  template: `
    @let o = i18n.t().agent.insurance;
    @let c = i18n.t().agent.common;
      <div class="ls-bar">
        <app-text-field class="ls-filter" inputId="io-from" [label]="o.from" type="date" [compact]="true" [value]="fromDate()" (valueChange)="setFrom($event)" />
        <app-text-field class="ls-filter" inputId="io-to" [label]="o.to" type="date" [compact]="true" [value]="toDate()" (valueChange)="setTo($event)" />
        <app-select-field class="ls-filter" inputId="io-payment" [label]="o.payment" [options]="paymentOptions()" [compact]="true"
          [value]="paymentStatus()" (valueChange)="setPayment($event)" />
        <app-multi-select class="ls-filter io-policy" inputId="io-policy" [label]="o.policyStatus" [options]="policyOptions()"
          [allLabel]="c.all" [selectedLabel]="o.nSelected" [clearLabel]="o.clear" [value]="selectedPolicy()" (valueChange)="setPolicy($event)" />
        <button type="button" class="btn ls-csv" [disabled]="!rows().length" (click)="exportCsv()">{{ c.downloadCsv }}</button>
      </div>

      @if (error()) { <app-alert tone="error">{{ error() }}</app-alert> }

        <div class="io-summary">
          <span>{{ loading() ? c.loading : count() + ' ' + c.records }}</span>
          <span>{{ o.totalContribution }}: <strong>RM {{ loading() ? '—' : money(total()) }}</strong></span>
        </div>

        <div class="ls-table-wrap">
          <table class="ls-table">
            <thead>
              <tr>
                <th>{{ o.cols.order }}</th>
                <th>{{ o.cols.customer }}</th>
                <th>{{ o.cols.vehicle }}</th>
                <th>{{ o.cols.insurer }}</th>
                <th>{{ o.cols.payment }}</th>
                <th class="num">{{ o.cols.contribution }}</th>
                <th>{{ o.cols.policy }}</th>
                <th>{{ o.cols.created }}</th>
                <th><span class="sr-only">{{ c.view }}</span></th>
              </tr>
            </thead>
            <tbody>
              @if (loading()) {
                <tr class="ls-state"><td colspan="9">{{ c.loading }}</td></tr>
              } @else if (!rows().length) {
                <tr class="ls-state"><td colspan="9">{{ c.empty }}</td></tr>
              }
              @for (r of loading() ? [] : rows(); track r.id) {
                <tr>
                  <td class="mono">{{ r.order_random_id || '—' }}</td>
                  <td>{{ r.username || '—' }}<small>{{ r.qarqal_id }}</small></td>
                  <td><strong>{{ r.vehilcle_no || '—' }}</strong></td>
                  <td>{{ r.insurance_provider || '—' }}</td>
                  <td><app-badge [tone]="paymentTone(r.payment_status)">{{ paymentLabel(r.payment_status) }}</app-badge></td>
                  <td class="num">RM {{ money(r.amount) }}</td>
                  <td><app-badge [tone]="policyTone(r.policy_status)">{{ policyLabel(r.policy_status) }}</app-badge></td>
                  <td>{{ dateTime(r.createdAt) }}</td>
                  <td>
                    @if (r.vehilcle_no) { <button type="button" class="ls-view" (click)="openPolicy(r)">{{ o.viewPolicy }}</button> }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <ul class="ls-cards">
          @if (loading()) {
            <li class="ls-card ls-state">{{ c.loading }}</li>
          } @else if (!rows().length) {
            <li class="ls-card ls-state">{{ c.empty }}</li>
          }
          @for (r of loading() ? [] : rows(); track r.id) {
            <li class="ls-card">
              <div class="ls-card-head">
                <div><strong>{{ r.vehilcle_no || '—' }}</strong><small>{{ r.username || '—' }}</small></div>
                <app-badge [tone]="policyTone(r.policy_status)">{{ policyLabel(r.policy_status) }}</app-badge>
              </div>
              <dl class="ls-card-body">
                <div><dt>{{ o.cols.order }}</dt><dd class="mono">{{ r.order_random_id || '—' }}</dd></div>
                <div><dt>{{ o.cols.contribution }}</dt><dd>RM {{ money(r.amount) }}</dd></div>
                <div><dt>{{ o.cols.insurer }}</dt><dd>{{ r.insurance_provider || '—' }}</dd></div>
                <div><dt>{{ o.cols.payment }}</dt><dd><app-badge [tone]="paymentTone(r.payment_status)">{{ paymentLabel(r.payment_status) }}</app-badge></dd></div>
                <div><dt>{{ o.cols.created }}</dt><dd>{{ dateTime(r.createdAt) }}</dd></div>
              </dl>
              @if (r.vehilcle_no) {
                <button type="button" class="btn btn--primary ls-card-btn" (click)="openPolicy(r)">{{ o.viewPolicy }}</button>
              }
            </li>
          }
        </ul>

        <app-pagination [page]="page()" [totalPages]="totalPages()" [label]="c.pages" [prevLabel]="c.prev" [nextLabel]="c.next"
          (pageChange)="goTo($event)" />

      <app-modal #policyModal modalId="io-policy" [heading]="o.policyTitle" [closeLabel]="c.close" style="--modal-width: 600px">
        @if (policyLoading()) {
          <app-spinner [label]="c.loading" />
        } @else if (policyError()) {
          <app-alert tone="error">{{ policyError() }}</app-alert>
        } @else if (policy(); as p) {
          <dl class="ls-detail">
            @for (f of policyFields(p); track f.label) {
              <div><dt>{{ f.label }}</dt><dd>{{ f.value }}</dd></div>
            }
          </dl>
          @if (safeUrl(p.policy_url); as url) {
            <a class="btn btn--primary io-doc" [href]="url" target="_blank" rel="noopener noreferrer">{{ o.openPolicyDoc }}</a>
          }
        }
      </app-modal>`,
  styles: [AGENT_LIST_STYLES, `
    .io-policy { flex-basis: 220px; }
    .io-summary { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; margin-bottom: 8px; font-size: var(--fs-small); color: var(--ink-2); }
    .io-summary strong { color: var(--ink); }
    .io-doc { width: 100%; margin-top: 20px; min-height: 48px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentInsuranceOrdersPage {
  protected readonly i18n = useAgentPage((t) => `${t.agent.insurance.title} | QarQal`);
  private readonly session = inject(AgentSession);
  private readonly orders = inject(InsuranceOrdersService);
  private readonly policyModal = viewChild.required<Modal>('policyModal');

  protected readonly money = formatMoney;
  protected readonly dateTime = (v: string | null): string => formatDate(v, true);

  protected readonly rows = signal<InsuranceOrder[]>([]);
  protected readonly count = signal(0);
  protected readonly total = signal(0);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  protected readonly fromDate = signal(thisMonth().from);
  protected readonly toDate = signal(thisMonth().to);
  protected readonly paymentStatus = signal('');
  protected readonly selectedPolicy = signal<string[]>([]);

  protected readonly policy = signal<PolicyDetails | null>(null);
  protected readonly policyLoading = signal(false);
  protected readonly policyError = signal('');

  protected readonly policyOptions = computed<SelectOption[]>(() =>
    POLICY_STATUSES.map((s) => ({ value: s, label: this.policyLabel(s) })),
  );
  protected readonly paymentOptions = computed<SelectOption[]>(() => [
    { value: '', label: this.i18n.t().agent.common.all },
    ...PAYMENT_STATUSES.map((s) => ({ value: s, label: this.paymentLabel(s) })),
  ]);

  constructor() {
    afterNextRender(() => void this.load());
  }

  protected setFrom(v: string): void { this.fromDate.set(v); this.reload(); }
  protected setTo(v: string): void { this.toDate.set(v); this.reload(); }
  protected setPayment(v: string): void { this.paymentStatus.set(v); this.reload(); }
  protected setPolicy(v: string[]): void { this.selectedPolicy.set(v); this.reload(); }
  protected goTo(p: number): void { this.page.set(p); void this.load(); }

  protected policyTone(s: string | null): BadgeTone { return (s && POLICY_TONE[s]) || 'neutral'; }
  protected paymentTone(s: string | null): BadgeTone { return (s && PAYMENT_TONE[s]) || 'neutral'; }
  protected policyLabel(s: string | null): string {
    if (!s) return '—';
    return (this.i18n.t().agent.insurance.policyStatuses as Record<string, string>)[s] ?? s;
  }
  protected paymentLabel(s: string | null): string {
    if (!s) return '—';
    return (this.i18n.t().agent.insurance.paymentStatuses as Record<string, string>)[s] ?? s;
  }

  /** Only http(s) links are opened, so a bad value in the data can't run script. */
  protected safeUrl(url: string | null): string | null {
    return url && /^https?:\/\//i.test(url) ? url : null;
  }

  protected async openPolicy(row: InsuranceOrder): Promise<void> {
    if (!row.vehilcle_no) return;
    this.policy.set(null);
    this.policyError.set('');
    this.policyLoading.set(true);
    this.policyModal().open();
    try {
      const p = await this.orders.policy(row.vehilcle_no, row.quotation_id);
      if (p) this.policy.set(p);
      else this.policyError.set(this.i18n.t().agent.insurance.policyMissing);
    } catch {
      if (this.session.isLoggedIn()) this.policyError.set(this.i18n.t().agent.insurance.policyMissing);
    } finally {
      this.policyLoading.set(false);
    }
  }

  protected policyFields(p: PolicyDetails): { label: string; value: string }[] {
    const d = this.i18n.t().agent.insurance.policy;
    const rm = (v: number | null): string => (v === null || v === undefined ? '—' : `RM ${formatMoney(v)}`);
    const valuation = p.is_agreed_value ? d.agreedValue : p.is_market_value ? d.marketValue : '—';
    return [
      { label: d.vehicle, value: toStr(p.vehicle_no, '—') },
      { label: d.status, value: this.policyLabel(p.status) },
      { label: d.coverNote, value: toStr(p.cover_note_no, '—') },
      { label: d.issued, value: formatDate(p.issued_date) },
      { label: d.effective, value: formatDate(p.effective_date) },
      { label: d.expiry, value: formatDate(p.expiry_date) },
      { label: d.sumInsured, value: rm(p.sum_insured) },
      { label: d.valuation, value: valuation },
      { label: d.ncd, value: p.ncd_percentage === null || p.ncd_percentage === undefined ? '—' : `${p.ncd_percentage}%` },
      { label: d.ncdValue, value: rm(p.ncd_value) },
      { label: d.basic, value: rm(p.basic_contribution) },
      { label: d.gross, value: rm(p.gross_contribution) },
      { label: d.stampDuty, value: rm(p.stamp_duty) },
      { label: d.sst, value: rm(p.sst) },
      { label: d.processingFee, value: rm(p.processing_fee) },
      { label: d.roadTax, value: rm(p.road_tax_fee) },
      { label: d.total, value: rm(p.total_contribution) },
      { label: d.promo, value: toStr(p.promo_code, '—') },
      { label: d.quotation, value: toStr(p.quotation_id, '—') },
    ];
  }

  protected exportCsv(): void {
    const cols = this.i18n.t().agent.insurance.cols;
    const headers = [cols.order, cols.customer, cols.qarqalId, cols.vehicle, cols.insurer, cols.payment, cols.contribution, cols.policy, cols.created, cols.referral];
    const rows = this.rows().map((r) => [r.order_random_id, r.username, r.qarqal_id, r.vehilcle_no, r.insurance_provider,
      this.paymentLabel(r.payment_status), formatMoney(r.amount), this.policyLabel(r.policy_status), formatDate(r.createdAt, true), r.referral_code]);
    downloadCsv(`insurance-orders-page-${this.page()}.csv`, headers, rows);
  }

  private reload(): void {
    this.page.set(1);
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const res = await this.orders.list({
        page: this.page(), limit: PAGE_SIZE, paymentStatus: this.paymentStatus(),
        policyStatuses: this.selectedPolicy(), fromDate: this.fromDate(), toDate: this.toDate(),
      });
      this.rows.set(res.data);
      this.count.set(res.count);
      this.total.set(res.totalContribution);
      this.totalPages.set(Math.max(1, res.totalPages));
    } catch {
      this.rows.set([]);
      if (this.session.isLoggedIn()) this.error.set(this.i18n.t().agent.common.loadFailed);
    } finally {
      this.loading.set(false);
    }
  }
}
