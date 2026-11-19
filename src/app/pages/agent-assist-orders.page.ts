import { ChangeDetectionStrategy, Component, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { AGENT_LIST_STYLES } from '../agent/agent-list.styles';
import { useAgentPage } from '../agent/agent-page';
import { AgentSession } from '../agent/agent-session.service';
import { ASSIST_STATUSES, AssistOrder, AssistOrdersService, AssistStatus } from '../agent/assist-orders.service';
import { Alert } from '../shared/ui/alert';
import { Badge, BadgeTone } from '../shared/ui/badge';
import { Modal } from '../shared/ui/modal';
import { Pagination } from '../shared/ui/pagination';
import { SelectField, SelectOption } from '../shared/ui/select-field';
import { downloadCsv } from '../shared/utils/csv.util';
import { formatDate, formatMoney, toStr } from '../shared/utils/format.util';

// /agent/assist-orders — rebuilt from qarqalAngular's Partner Orders page (pages/masters/partner-orders).
// Filters by status (and company, for a Provider who sees every seller), a table on wide screens and cards
// on phones, a details popup, and CSV of the current page. A Provider can mark an order "Task Completed".

const PAGE_SIZE = 25;
/** user_type 4: owns the product and fulfils the orders (backend: only they may PATCH). */
const PROVIDER = 4;

const STATUS_TONE: Record<string, BadgeTone> = {
  New: 'info',
  Live: 'success',
  'Task Completed': 'brand',
  Refunded: 'warning',
  Expired: 'danger',
};

@Component({
  selector: 'app-agent-assist-orders-page',
  imports: [Alert, Badge, Modal, Pagination, SelectField],
  template: `
    @let a = i18n.t().agent.assist;
    @let c = i18n.t().agent.common;
      <div class="ls-bar">
        <app-select-field class="ls-filter" inputId="ao-status" [label]="a.status" [options]="statusOptions()" [compact]="true"
          [value]="status()" (valueChange)="setStatus($event)" />
        @if (isProvider()) {
          <app-select-field class="ls-filter" inputId="ao-company" [label]="a.company" [options]="companyOptions()" [compact]="true"
            [value]="company()" (valueChange)="setCompany($event)" />
        }
        <span class="ls-count">{{ loading() ? c.loading : count() + ' ' + c.records }}</span>
        <button type="button" class="btn ls-csv" [disabled]="!rows().length" (click)="exportCsv()">{{ c.downloadCsv }}</button>
      </div>

      @if (error()) { <app-alert tone="error">{{ error() }}</app-alert> }

        <div class="ls-table-wrap">
          <table class="ls-table">
            <thead>
              <tr>
                <th>{{ a.cols.reference }}</th>
                <th>{{ a.cols.company }}</th>
                <th>{{ a.cols.vehicle }}</th>
                <th>{{ a.cols.plan }}</th>
                <th class="num">{{ a.cols.amount }}</th>
                <th>{{ a.cols.purchased }}</th>
                <th>{{ a.cols.period }}</th>
                <th>{{ a.cols.status }}</th>
                <th><span class="sr-only">{{ c.view }}</span></th>
              </tr>
            </thead>
            <tbody>
              @if (loading()) {
                <tr class="ls-state"><td colspan="9">{{ c.loading }}</td></tr>
              } @else if (!rows().length) {
                <tr class="ls-state"><td colspan="9">{{ c.empty }}</td></tr>
              }
              @for (r of loading() ? [] : rows(); track r.partnerorderid) {
                <tr>
                  <td class="mono">{{ r.referenceid || '—' }}</td>
                  <td>{{ r.partnerName || '—' }}</td>
                  <td><strong>{{ r.veh_reg_no || '—' }}</strong><small>{{ r.vehicletype }}</small></td>
                  <td>{{ r.plan_type ?? '—' }}</td>
                  <td class="num">RM {{ money(r.amount) }}</td>
                  <td>{{ date(r.purchased_date) }}</td>
                  <td>{{ date(r.plan_startdate) }} – {{ date(r.plan_enddate) }}</td>
                  <td><app-badge [tone]="tone(r.status)">{{ statusLabel(r.status) }}</app-badge></td>
                  <td><button type="button" class="ls-view" (click)="open(r)">{{ c.view }}</button></td>
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
          @for (r of loading() ? [] : rows(); track r.partnerorderid) {
            <li class="ls-card">
              <div class="ls-card-head">
                <div><strong>{{ r.veh_reg_no || '—' }}</strong><small>{{ r.partnerName || '—' }}</small></div>
                <app-badge [tone]="tone(r.status)">{{ statusLabel(r.status) }}</app-badge>
              </div>
              <dl class="ls-card-body">
                <div><dt>{{ a.cols.reference }}</dt><dd class="mono">{{ r.referenceid || '—' }}</dd></div>
                <div><dt>{{ a.cols.amount }}</dt><dd>RM {{ money(r.amount) }}</dd></div>
                <div><dt>{{ a.cols.plan }}</dt><dd>{{ r.plan_type ?? '—' }}</dd></div>
                <div><dt>{{ a.cols.period }}</dt><dd>{{ date(r.plan_startdate) }} – {{ date(r.plan_enddate) }}</dd></div>
              </dl>
              <button type="button" class="btn btn--primary ls-card-btn" (click)="open(r)">{{ c.view }}</button>
            </li>
          }
        </ul>

        <app-pagination [page]="page()" [totalPages]="totalPages()" [label]="c.pages" [prevLabel]="c.prev" [nextLabel]="c.next"
          (pageChange)="goTo($event)" />

      <app-modal #detail modalId="ao-detail" [heading]="a.detailTitle" [closeLabel]="c.close" style="--modal-width: 560px">
        @if (selected(); as r) {
          <dl class="ls-detail">
            @for (f of detailFields(r); track f.label) {
              <div><dt>{{ f.label }}</dt><dd>{{ f.value }}</dd></div>
            }
          </dl>

          @if (isProvider()) {
            <form class="ao__update" (submit)="save($event)">
              <h3>{{ a.updateTitle }}</h3>
              @if (saveError()) { <app-alert tone="error">{{ saveError() }}</app-alert> }
              <app-select-field inputId="ao-new-status" [label]="a.status" [options]="providerStatusOptions()" [(value)]="newStatus" />
              <div class="ao__remarks">
                <label for="ao-remarks">{{ a.remarks }}</label>
                <textarea id="ao-remarks" rows="3" maxlength="500" [value]="remarks()" (input)="remarks.set($any($event.target).value)"></textarea>
              </div>
              <button type="submit" class="btn btn--primary" [disabled]="saving()">{{ saving() ? c.saving : c.save }}</button>
            </form>
          }
        }
      </app-modal>`,
  styles: [AGENT_LIST_STYLES, `
    .ao__update { display: grid; gap: 12px; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--line); }
    .ao__update h3 { font-size: 1rem; font-weight: 800; }
    .ao__remarks { display: grid; gap: 6px; }
    .ao__remarks label { font-size: 0.8125rem; font-weight: 700; color: var(--ink-2); }
    .ao__remarks textarea { width: 100%; padding: 10px 14px; font: 400 1rem var(--font); border: 1px solid #c9d1e4; border-radius: 10px; resize: vertical; }
    .ao__remarks textarea:focus { outline: none; border-color: var(--navy); box-shadow: 0 0 0 3px rgb(0 160 230 / 0.28); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentAssistOrdersPage {
  protected readonly i18n = useAgentPage((t) => `${t.agent.assist.title} | QarQal`);
  private readonly session = inject(AgentSession);
  private readonly orders = inject(AssistOrdersService);
  private readonly detail = viewChild.required<Modal>('detail');

  protected readonly money = formatMoney;
  protected readonly date = (v: string | null): string => formatDate(v);
  protected readonly isProvider = computed(() => this.session.userType() === PROVIDER);

  protected readonly rows = signal<AssistOrder[]>([]);
  protected readonly count = signal(0);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly status = signal('');
  protected readonly company = signal('');
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  /** Company names seen so far, for the Provider's company filter (the API has no list endpoint). */
  private readonly companies = signal<string[]>([]);

  protected readonly selected = signal<AssistOrder | null>(null);
  protected readonly newStatus = signal<string>('Task Completed');
  protected readonly remarks = signal('');
  protected readonly saving = signal(false);
  protected readonly saveError = signal('');

  protected readonly statusOptions = computed<SelectOption[]>(() => [
    { value: '', label: this.i18n.t().agent.common.all },
    ...ASSIST_STATUSES.map((s) => ({ value: s, label: this.statusLabel(s) })),
  ]);
  protected readonly companyOptions = computed<SelectOption[]>(() => [
    { value: '', label: this.i18n.t().agent.assist.allCompanies },
    ...this.companies().map((name) => ({ value: name, label: name })),
  ]);
  /** Same as qarqalAngular: a Provider can only move an order to "Task Completed". */
  protected readonly providerStatusOptions = computed<SelectOption[]>(() => [
    { value: 'Task Completed', label: this.statusLabel('Task Completed') },
  ]);

  constructor() {
    afterNextRender(() => void this.load());
  }

  protected setStatus(value: string): void {
    this.status.set(value);
    this.page.set(1);
    void this.load();
  }

  protected setCompany(value: string): void {
    this.company.set(value);
    this.page.set(1);
    void this.load();
  }

  protected goTo(p: number): void {
    this.page.set(p);
    void this.load();
  }

  protected tone(status: string | null): BadgeTone {
    return (status && STATUS_TONE[status]) || 'neutral';
  }

  protected statusLabel(status: string | null): string {
    if (!status) return '—';
    const labels = this.i18n.t().agent.assist.statuses as Record<string, string>;
    return labels[status] ?? status;
  }

  protected open(row: AssistOrder): void {
    this.selected.set(row);
    this.newStatus.set('Task Completed');
    this.remarks.set(row.remarks ?? '');
    this.saveError.set('');
    this.detail().open();
  }

  protected detailFields(r: AssistOrder): { label: string; value: string }[] {
    const d = this.i18n.t().agent.assist.detail;
    return [
      { label: d.reference, value: toStr(r.referenceid, '—') },
      { label: d.status, value: this.statusLabel(r.status) },
      { label: d.company, value: toStr(r.partnerName, '—') },
      { label: d.companyEmail, value: toStr(r.partnerEmail, '—') },
      { label: d.customerId, value: toStr(r.partneruserid, '—') },
      { label: d.vehicle, value: toStr(r.veh_reg_no, '—') },
      { label: d.vehicleType, value: toStr(r.vehicletype, '—') },
      { label: d.brand, value: toStr(r.brandname, '—') },
      { label: d.plan, value: toStr(r.plan_type, '—') },
      { label: d.amount, value: `RM ${formatMoney(r.amount)}` },
      { label: d.purchased, value: formatDate(r.purchased_date) },
      { label: d.start, value: formatDate(r.plan_startdate) },
      { label: d.end, value: formatDate(r.plan_enddate) },
      { label: d.payment, value: toStr(r.payment_status, '—') },
      { label: d.driver, value: toStr(r.additionaldriver, '—') },
      { label: d.driverId, value: toStr(r.additionaldriver_nric, '—') },
      { label: d.referral, value: toStr(r.referralcode, '—') },
      { label: d.remarks, value: toStr(r.remarks, '—') },
    ];
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    const row = this.selected();
    if (!row || this.saving()) return;
    this.saving.set(true);
    this.saveError.set('');
    try {
      await this.orders.updateStatus(row.partnerorderid, this.newStatus() as AssistStatus, this.remarks().trim());
      this.detail().close();
      await this.load();
    } catch {
      if (this.session.isLoggedIn()) this.saveError.set(this.i18n.t().agent.common.saveFailed);
    } finally {
      this.saving.set(false);
    }
  }

  protected exportCsv(): void {
    const cols = this.i18n.t().agent.assist.detail;
    const headers = [cols.reference, cols.company, cols.customerId, cols.vehicle, cols.vehicleType, cols.plan, cols.amount,
      cols.purchased, cols.start, cols.end, cols.payment, cols.driver, cols.referral, cols.status];
    const rows = this.rows().map((r) => [r.referenceid, r.partnerName, r.partneruserid, r.veh_reg_no, r.vehicletype, r.plan_type,
      formatMoney(r.amount), formatDate(r.purchased_date), formatDate(r.plan_startdate), formatDate(r.plan_enddate),
      r.payment_status, r.additionaldriver, r.referralcode, this.statusLabel(r.status)]);
    downloadCsv(`assist-orders-page-${this.page()}.csv`, headers, rows);
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const res = await this.orders.list({ page: this.page(), limit: PAGE_SIZE, status: this.status(), partnerName: this.company() });
      this.rows.set(res.data);
      this.count.set(res.count);
      this.totalPages.set(Math.max(1, res.totalPages));
      const seen = new Set([...this.companies(), ...res.data.map((r) => r.partnerName).filter((n): n is string => !!n)]);
      this.companies.set([...seen].sort((x, y) => x.localeCompare(y)));
    } catch {
      this.rows.set([]);
      if (this.session.isLoggedIn()) this.error.set(this.i18n.t().agent.common.loadFailed);
    } finally {
      this.loading.set(false);
    }
  }
}
