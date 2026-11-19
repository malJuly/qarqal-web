import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, afterNextRender, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { useAgentPage } from '../agent/agent-page';
import { AgentSession } from '../agent/agent-session.service';
import {
  InsurancePurchaseBatch, emptyHolder,
  type BulkBatchState, type BulkOwner, type BulkRow, type BulkRowStatus, type HolderProfile, type QuoteHandoff,
} from '../agent/insurance-purchase-batch';
import { InsurancePurchaseService, type BatchQuoteLine } from '../agent/insurance-purchase.service';
import type { GenerateQuoteRequest, PurchaseOptions, QuoteProvider, QuoteResult } from '../agent/insurance-purchase.types';
import {
  ID_TYPE_NRIC, PAYMENT_RESULT_CHANNEL, QUOTE_COVER_CODE,
  formatNric, isValidNric, isValidPostcode, normalisePlate, quotePlaceholders,
} from '../agent/insurance-purchase.util';
import { Icon } from '../components/icon';
import { ApiError } from '../core/qarqal-api';
import { InsurerLogo } from '../quote/insurer-logo';
import { insurerName } from '../quote/offer.util';
import { downloadCsv } from '../shared/utils/csv.util';
import { fill } from '../shared/utils/format.util';
import { AgentInsurancePurchasePage } from './agent-insurance-purchase.page';

// /agent/insurance-purchase/bulk — quote many vehicles at once. A port of qarqalAngular's insurance-bulk-quote,
// 4 stages on one page:
//   edit   — vehicles from a CSV (read in the browser, never uploaded: it holds ICs) or typed; same owner or
//            one owner per row; checked row by row
//   run    — quoting with live progress
//   review — every quote on one screen: pick the insurer per vehicle (or one for all)
//   pay    — vehicle list on the left, the normal wizard on the right (insurer, add-ons, holder, Billplz in a
//            new tab); each vehicle is paid on its own and turns Paid from My sales.
//            Narrower screens: the list only; a vehicle opens the full-page wizard.
//
// Runner: the backend quotes in parallel (POST generate-quotes, up to 10 vehicles per request, streamed back a
// line per vehicle). The page keeps up to 10 vehicles in flight over at most 2 open requests — the first sends
// 10, the second tops up as results arrive — so the browser's 6-connections-per-host limit never applies.
// Gateway timeouts are retried.

const MAX_ROWS = 30;
const MAX_IN_FLIGHT = 10; // = backend MAX_QUOTES_PER_BATCH
const MAX_OPEN_REQUESTS = 2;
const MAX_RETRIES = 2;
const RETRY_DELAYS_MS = [2000, 5000];
/** Wide enough for the list + the wizard beside it (with the portal sidebar). */
const WIDE_QUERY = '(min-width: 1200px)';
/** Policy statuses that mean "paid". PENDING is not one: it's set when the holder details are saved. */
const PAID_STATUSES = ['SUCCESS', 'PENDING_FOR_APPROVAL', 'PENDING_REFERCASE'];
const RETRYABLE = /\b50[234]\b|timeout|timed out|ETIMEDOUT|ECONNRESET|network error/i;
const CSV_HEADERS = [
  'plate', 'id_type', 'id_number', 'postcode', 'qarqal_id',
  'full_name', 'dob', 'gender', 'marital_status', 'mobile_no', 'email',
  'address_line1', 'address_line2', 'address_line3', 'city', 'state',
];
/** Holder fields that must be filled before a vehicle can be paid. */
const REQUIRED_HOLDER: (keyof HolderProfile)[] = ['full_name', 'dob', 'gender', 'marital_status', 'mobile_no', 'email', 'address_line1', 'city', 'state'];

@Component({
  selector: 'app-agent-insurance-bulk-page',
  imports: [FormsModule, RouterLink, Icon, InsurerLogo, AgentInsurancePurchasePage],
  templateUrl: './agent-insurance-bulk.page.html',
  styleUrl: './agent-insurance-bulk.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentInsuranceBulkPage {
  protected readonly i18n = useAgentPage((t) => `${t.agent.bulk.title} | QarQal`);
  protected readonly session = inject(AgentSession);
  private readonly api = inject(InsurancePurchaseService);
  private readonly batch = inject(InsurancePurchaseBatch);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  protected readonly fill = fill;
  protected readonly maxRows = MAX_ROWS;

  options: PurchaseOptions | null = null;
  /** The batch (kept in InsurancePurchaseBatch so it survives opening a vehicle and coming back). */
  s!: BulkBatchState;
  running = false;
  bulkInsurer = '';
  wide = false;
  /** One key → a fresh wizard per vehicle in the pane (keyed re-render). */
  paneKeys: number[] = [];
  paneHandoff: QuoteHandoff | null = null;
  paymentNoticeKey: number | null = null;

  private stopRequested = false;
  private destroyed = false;
  private readonly openRequests = new Set<AbortController>();
  private readonly retryTimers = new Set<ReturnType<typeof setTimeout>>();
  private nextKey = 1;
  // Payment status without polling: the payment tab announces its return (BroadcastChannel from the result
  // page), and we check once when the agent comes back to this tab — one My sales call per payment.
  private paymentChannel: BroadcastChannel | null = null;
  private readonly onVisible = (): void => {
    if (document.visibilityState === 'visible' && this.awaitingPayment) void this.refreshPaid();
  };

  constructor() {
    this.restoreOrStart();
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const mq = window.matchMedia(WIDE_QUERY);
      this.wide = mq.matches;
      const onWide = (e: MediaQueryListEvent): void => { this.wide = e.matches; this.cdr.markForCheck(); };
      mq.addEventListener('change', onWide);
      destroyRef.onDestroy(() => mq.removeEventListener('change', onWide));
      this.api.options().then((o) => { this.options = o; }).catch(() => undefined).finally(() => this.cdr.markForCheck());
      this.enterPayIfNeeded();
      this.cdr.markForCheck();
    });
    destroyRef.onDestroy(() => {
      this.destroyed = true;
      this.stopRequested = true;
      this.openRequests.forEach((c) => c.abort());
      this.retryTimers.forEach((t) => clearTimeout(t));
      this.stopPaymentWatch();
    });
  }

  private get b() { return this.i18n.t().agent.bulk; }

  private get ownerKey(): string { return `${this.session.user()?.id ?? ''}:${this.session.active()?.upr_id ?? ''}`; }

  private restoreOrStart(): void {
    const saved = this.batch.state;
    if (saved && saved.owner === this.ownerKey) {
      this.s = saved;
      this.nextKey = Math.max(0, ...this.s.rows.map((r) => r.key)) + 1;
      // A run can't resume after leaving the page: unfinished vehicles become failed (retryable).
      if (this.s.phase === 'run') {
        this.s.rows.filter((r) => ['queued', 'quoting', 'waiting'].includes(r.status))
          .forEach((r) => Object.assign(r, { status: 'failed', error: this.b.errors.interrupted }));
        this.s.phase = 'review';
      }
    } else {
      this.s = {
        owner: this.ownerKey, phase: 'edit', sameOwner: true, csvMessage: '', selectedKey: null,
        sharedOwner: { idType: ID_TYPE_NRIC, idNumber: '', postcode: '', qarqalId: '' },
        sharedHolder: emptyHolder(),
        rows: [],
      };
      this.batch.state = this.s;
      this.addRow(); this.addRow(); this.addRow();
    }
  }

  /** Browser only: the payment watch and the pane need window/document. */
  private enterPayIfNeeded(): void {
    if (this.s.phase !== 'pay') return;
    this.startPaymentWatch();
    const open = this.includedRows.find((r) => r.key === this.s.selectedKey);
    if (this.wide && open) this.openInPane(open);
  }

  startNewBatch(): void {
    if (this.s.phase === 'pay' && this.paidCount < this.includedRows.length && !window.confirm(this.b.newBatchConfirm)) return;
    this.stopPaymentWatch();
    this.batch.clear();
    this.paneKeys = [];
    this.paymentNoticeKey = null;
    this.bulkInsurer = '';
    this.restoreOrStart();
  }

  // ═════════ 1. Vehicles ═════════

  private blankRow(): BulkRow {
    return {
      key: this.nextKey++, plate: '', idType: ID_TYPE_NRIC, idNumber: '', postcode: '', qarqalId: '', holder: emptyHolder(),
      status: 'draft', error: '', attempts: 0, result: null, providerCode: '', include: true, policyStatus: null, coverNote: null, snapshot: null,
    };
  }

  addRow(): void { if (this.s.rows.length < MAX_ROWS) this.s.rows.push(this.blankRow()); }
  removeRow(row: BulkRow): void { this.s.rows = this.s.rows.filter((r) => r !== row); }

  private idTypeName(id: number): string { return this.options?.id_types.find((t) => t.id === Number(id))?.name ?? 'NRIC'; }
  idTypeLabel(id: number): string {
    const l = this.i18n.t().agent.wizard.idType;
    return ({ NRIC: l.nric, PASSPORT: l.passport, COMPANY: l.company } as Record<string, string>)[this.idTypeName(id)] ?? l.nric;
  }
  onIdInput(o: BulkOwner): void { if (this.idTypeName(o.idType) === 'NRIC') o.idNumber = formatNric(o.idNumber); }

  private ownerOf(row: BulkRow): BulkOwner {
    return this.s.sameOwner
      ? { ...this.s.sharedOwner }
      : { idType: row.idType, idNumber: row.idNumber, postcode: row.postcode, qarqalId: row.qarqalId };
  }

  private get filledRows(): BulkRow[] {
    return this.s.rows.filter((r) => r.plate.trim() || (!this.s.sameOwner && (r.idNumber.trim() || r.postcode.trim())));
  }

  rowProblem(row: BulkRow): string {
    const e = this.b.problems;
    if (!row.plate.trim()) return e.plate;
    const plate = normalisePlate(row.plate);
    if (!/^[A-Z0-9]{2,10}$/.test(plate)) return e.plateWrong;
    const filled = this.filledRows;
    if (filled.findIndex((r) => normalisePlate(r.plate) === plate) !== filled.indexOf(row)) return e.duplicate;
    const o = this.ownerOf(row);
    if (!o.idNumber.trim()) return this.s.sameOwner ? e.ownerIdAbove : e.ownerId;
    if (this.idTypeName(o.idType) === 'NRIC' && !isValidNric(o.idNumber)) return e.nric;
    if (!isValidPostcode(o.postcode)) return this.s.sameOwner ? e.postcodeAbove : e.postcode;
    return '';
  }

  /** Only once the agent has started on the row. */
  showProblem(row: BulkRow): string { return row.plate || (!this.s.sameOwner && row.idNumber) ? this.rowProblem(row) : ''; }
  get readyRows(): BulkRow[] { return this.filledRows.filter((r) => !this.rowProblem(r)); }
  get problemCount(): number { return this.filledRows.length - this.readyRows.length; }

  // ═════════ CSV (read in the browser, never uploaded) ═════════

  downloadTemplate(): void {
    downloadCsv('bulk-quote-template.csv', CSV_HEADERS, [[
      'WXY1234', 'IC', '900101-14-5678', '50450', '', 'Ahmad bin Ali', '1990-01-01', 'Male', 'Married', '60123456789',
      'ahmad@example.com', 'No. 1 Jalan Contoh', '', '', 'Kuala Lumpur', 'Wilayah Persekutuan Kuala Lumpur',
    ]]);
  }

  onCsvSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    file.text().then((text) => this.applyCsv(text)).catch(() => { this.s.csvMessage = this.b.csv.unreadable; })
      .finally(() => this.cdr.markForCheck());
  }

  private parseCsv(text: string): string[][] {
    return text.replace(/^﻿/, '').split(/\r?\n/).filter((line) => line.trim()).map((line) => {
      const cells: string[] = [];
      let cell = '';
      let quoted = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"' && quoted && line[i + 1] === '"') { cell += '"'; i++; }
        else if (ch === '"') quoted = !quoted;
        else if (ch === ',' && !quoted) { cells.push(cell.trim()); cell = ''; }
        else cell += ch;
      }
      cells.push(cell.trim());
      // Our template download prefixes cells starting with = + - @ with ' (Excel formula guard): undo that.
      return cells.map((c) => c.replace(/^'(?=[=+\-@])/, ''));
    });
  }

  private idTypeFromCsv(value: string): number {
    const v = value.trim().toLowerCase();
    const name = v.startsWith('pass') ? 'PASSPORT' : v.startsWith('comp') ? 'COMPANY' : 'NRIC';
    return this.options?.id_types.find((t) => t.name === name)?.id ?? ID_TYPE_NRIC;
  }
  /** "1990-01-31" or "31/01/1990" → "1990-01-31" (what the date input and the API take). */
  private dateFromCsv(value: string): string {
    const v = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    const m = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : '';
  }
  private genderFromCsv(value: string): number | null {
    const v = value.trim().toLowerCase();
    return v.startsWith('m') || v.startsWith('l') ? 1 : v.startsWith('f') || v.startsWith('p') ? 2 : null;
  }
  private maritalFromCsv(value: string): number | null {
    const v = value.trim().toLowerCase();
    if (!v) return null;
    return this.options?.marital_status.find((m) => m.name.toLowerCase() === v || m.name_ms?.toLowerCase() === v)?.id ?? null;
  }

  /** Fills the table for checking; nothing is quoted until the agent confirms. */
  private applyCsv(text: string): void {
    const lines = this.parseCsv(text);
    if (!lines.length) { this.s.csvMessage = this.b.csv.empty; return; }
    const header = lines[0].map((h) => h.toLowerCase());
    const hasHeader = header.includes('plate');
    const at = (cells: string[], name: string): string => {
      const index = hasHeader ? header.indexOf(name) : CSV_HEADERS.indexOf(name);
      return index >= 0 ? cells[index] ?? '' : '';
    };
    const data = (hasHeader ? lines.slice(1) : lines).filter((cells) => cells.some((c) => c));
    const rows = data.slice(0, MAX_ROWS).map((cells) => {
      const row = this.blankRow();
      row.plate = normalisePlate(at(cells, 'plate'));
      row.idType = at(cells, 'id_type') ? this.idTypeFromCsv(at(cells, 'id_type')) : ID_TYPE_NRIC;
      row.idNumber = at(cells, 'id_number');
      row.postcode = at(cells, 'postcode').replace(/\D/g, '');
      row.qarqalId = at(cells, 'qarqal_id');
      row.holder = {
        ...emptyHolder(),
        full_name: at(cells, 'full_name'),
        dob: this.dateFromCsv(at(cells, 'dob')),
        gender: this.genderFromCsv(at(cells, 'gender')),
        marital_status: this.maritalFromCsv(at(cells, 'marital_status')),
        mobile_no: at(cells, 'mobile_no').replace(/\D/g, ''),
        email: at(cells, 'email'),
        address_line1: at(cells, 'address_line1'),
        address_line2: at(cells, 'address_line2'),
        address_line3: at(cells, 'address_line3'),
        city: at(cells, 'city'),
        state: at(cells, 'state'),
      };
      this.onIdInput(row);
      return row;
    });
    // Rows with their own owner or holder details → "different owners".
    if (rows.some((r) => r.idNumber.trim() || r.postcode.trim() || r.holder.full_name.trim())) this.s.sameOwner = false;
    this.s.rows = rows.length ? rows : [this.blankRow()];
    const dropped = data.length - rows.length;
    this.s.csvMessage = fill(this.b.csv.loaded, { n: rows.length }) + (dropped > 0 ? ' ' + fill(this.b.csv.dropped, { n: dropped, max: MAX_ROWS }) : '');
  }

  // ═════════ 2. Quoting ═════════

  startQuoting(): void {
    if (!this.readyRows.length || this.running) return;
    // Invalid rows stay visible as "skipped" so nothing silently disappears; empty rows are dropped.
    this.s.rows = this.filledRows;
    for (const r of this.s.rows) {
      const problem = this.rowProblem(r);
      Object.assign(r, problem
        ? { status: 'skipped', error: problem, attempts: 0, result: null }
        : { status: 'queued', error: '', attempts: 0, result: null, providerCode: '', include: true, policyStatus: null, coverNote: null, snapshot: null });
    }
    this.s.phase = 'run';
    this.stopRequested = false;
    this.running = true;
    this.pump();
  }

  /** Aborts the open requests; the backend then skips vehicles it hasn't sent to the insurers yet. */
  stop(): void {
    this.stopRequested = true;
    this.openRequests.forEach((c) => c.abort());
    this.openRequests.clear();
    this.s.rows.filter((r) => r.status === 'quoting').forEach((r) => Object.assign(r, { status: 'failed', error: this.b.errors.stopped }));
    this.pump();
  }

  retryFailed(): void {
    this.s.rows.filter((r) => r.status === 'failed').forEach((r) => Object.assign(r, { status: 'queued', error: '', attempts: 0 }));
    this.s.phase = 'run';
    this.stopRequested = false;
    this.running = true;
    this.pump();
  }

  backToEdit(): void {
    this.s.phase = 'edit';
    this.s.rows.forEach((r) => (r.status = 'draft'));
  }

  private count(status: BulkRowStatus): number { return this.s.rows.filter((r) => r.status === status).length; }
  get counts() {
    return { ready: this.count('ready'), failed: this.count('failed'), skipped: this.count('skipped'), total: this.s.rows.length - this.count('skipped') };
  }
  get progressPercent(): number {
    const { ready, failed, total } = this.counts;
    return total ? Math.round(((ready + failed) / total) * 100) : 0;
  }

  /** Sends the next batch when there's room (≤10 vehicles in flight, ≤2 open requests). */
  private pump(): void {
    if (this.destroyed) return;
    const queued = this.s.rows.filter((r) => r.status === 'queued');
    if (!queued.length || this.stopRequested) {
      if (this.stopRequested) queued.forEach((r) => Object.assign(r, { status: 'failed', error: this.b.errors.stopped }));
      if (!this.count('quoting') && !this.count('waiting')) {
        this.running = false;
        if (this.s.phase === 'run') this.s.phase = 'review';
      }
      return;
    }
    const room = MAX_IN_FLIGHT - this.count('quoting');
    if (room < 1 || this.openRequests.size >= MAX_OPEN_REQUESTS) return;
    void this.quoteBatch(queued.slice(0, room));
  }

  private async quoteBatch(rows: BulkRow[]): Promise<void> {
    const coverId = this.options?.cover_types.find((c) => c.name === QUOTE_COVER_CODE)?.id ?? 1;
    rows.forEach((row) => { row.status = 'quoting'; row.attempts++; });
    const vehicles: GenerateQuoteRequest[] = rows.map((row) => {
      const o = this.ownerOf(row);
      const placeholders = quotePlaceholders(Number(o.idType));
      return {
        ...(o.qarqalId.trim() ? { qarqal_id: o.qarqalId.trim() } : {}),
        vehicle_no: normalisePlate(row.plate),
        full_name: placeholders.full_name,
        id_type: Number(o.idType),
        id_number: o.idNumber.trim(),
        dob: placeholders.dob,
        postcode: Number(o.postcode),
        email: placeholders.email,
        vehicle_convert_type: coverId,
        marital_status: placeholders.marital_status,
      };
    });

    const controller = new AbortController();
    this.openRequests.add(controller);
    try {
      await this.api.generateQuotes(vehicles, (line) => {
        const row = rows[line.index];
        if (row?.status === 'quoting') this.applyOutcome(row, line);
        this.pump(); // a slot freed: top up with a second request
        this.cdr.markForCheck();
      }, controller.signal);
    } catch (err) {
      if (!controller.signal.aborted) {
        const message = err instanceof ApiError ? err.message : this.b.errors.generic;
        rows.filter((r) => r.status === 'quoting').forEach((r) => this.applyOutcome(r, { status: false, message }));
      }
    } finally {
      this.openRequests.delete(controller);
      // A vehicle the stream never answered (connection dropped) is retried like a timeout.
      rows.filter((r) => r.status === 'quoting').forEach((r) => this.applyOutcome(r, { status: false, message: 'Request timed out' }));
      this.pump();
      this.cdr.markForCheck();
    }
  }

  private applyOutcome(row: BulkRow, line: Pick<BatchQuoteLine, 'status' | 'message' | 'data' | 'errors'>): void {
    if (line.status && line.data) {
      row.status = 'ready';
      row.result = line.data;
      row.providerCode = this.cheapest(line.data)?.provider ?? '';
      return;
    }
    const message = this.errorText(line);
    if (RETRYABLE.test(message) && row.attempts <= MAX_RETRIES && !this.stopRequested) {
      row.status = 'waiting';
      const timer = setTimeout(() => {
        this.retryTimers.delete(timer);
        if (row.status !== 'waiting') return;
        Object.assign(row, this.stopRequested ? { status: 'failed', error: this.b.errors.stopped } : { status: 'queued' });
        this.pump();
        this.cdr.markForCheck();
      }, RETRY_DELAYS_MS[row.attempts - 1] ?? 5000);
      this.retryTimers.add(timer);
      return;
    }
    row.status = 'failed';
    row.error = this.friendlyError(message);
  }

  private errorText(line: Pick<BatchQuoteLine, 'message' | 'errors'>): string {
    const fromList = (line.errors ?? []).map((e) => e.message).filter(Boolean).join('; ');
    return fromList || line.message || this.b.errors.generic;
  }

  private friendlyError(message: string): string {
    const e = this.b.errors;
    if (RETRYABLE.test(message)) return e.timeout;
    if (/SNG_REFERCASE|prior approval/i.test(message)) return e.referCase;
    if (/unable to identify any insurance provider/i.test(message)) return e.noInsurer;
    if (/customer not found/i.test(message)) return e.customer;
    if (/postcode/i.test(message)) return e.postcode;
    if (/NRIC/i.test(message)) return e.nric;
    return message.replace(/^SENANG_ERROR\s*/i, '');
  }

  // ═════════ 3. Compare ═════════

  private price(p: QuoteProvider | null | undefined): number { return parseFloat(p?.totalContribution ?? '') || 0; }
  private sortedProviders(result: QuoteResult | null): QuoteProvider[] {
    return [...(result?.providers ?? [])].sort((a, b) => (this.price(a) || Infinity) - (this.price(b) || Infinity));
  }
  providersOf(row: BulkRow): QuoteProvider[] { return this.sortedProviders(row.result); }
  cheapest(result: QuoteResult | null): QuoteProvider | null { return this.sortedProviders(result)[0] ?? null; }
  chosen(row: BulkRow): QuoteProvider | null { return row.result?.providers?.find((p) => p.provider === row.providerCode) ?? null; }
  isCheapest(row: BulkRow): boolean { return !!row.providerCode && this.cheapest(row.result)?.provider === row.providerCode; }
  overCheapest(row: BulkRow): number { return Math.max(0, this.price(this.chosen(row)) - this.price(this.cheapest(row.result))); }

  get readyQuotes(): BulkRow[] { return this.s.rows.filter((r) => r.status === 'ready'); }
  get notQuoted(): BulkRow[] { return this.s.rows.filter((r) => r.status === 'failed' || r.status === 'skipped'); }
  get includedRows(): BulkRow[] { return this.readyQuotes.filter((r) => r.include && this.chosen(r)); }
  get includedTotal(): number { return this.includedRows.reduce((sum, r) => sum + this.rowTotal(r), 0); }
  get allIncluded(): boolean { return this.readyQuotes.length > 0 && this.readyQuotes.every((r) => r.include); }
  toggleAll(include: boolean): void { this.readyQuotes.forEach((r) => (r.include = include)); }

  /** Insurers that quoted at least one vehicle, with how many — for "one insurer for all". */
  get insurerChoices(): { code: string; count: number }[] {
    const counts = new Map<string, number>();
    this.readyQuotes.forEach((r) => r.result?.providers?.forEach((p) => counts.set(p.provider, (counts.get(p.provider) ?? 0) + 1)));
    return Array.from(counts, ([code, count]) => ({ code, count })).sort((a, b) => b.count - a.count);
  }

  onBulkInsurer(code: string): void {
    if (!code) { this.readyQuotes.forEach((r) => this.setInsurer(r, this.cheapest(r.result)?.provider ?? r.providerCode)); return; }
    // Applies where that insurer quoted; other vehicles keep their pick.
    this.readyQuotes.forEach((r) => { if (r.result?.providers?.some((p) => p.provider === code)) this.setInsurer(r, code); });
  }

  /** A new pick on the compare screen wins over where the agent left that vehicle. */
  setInsurer(row: BulkRow, code: string): void {
    if (row.providerCode !== code) row.snapshot = null;
    row.providerCode = code;
  }

  goToPayment(): void {
    if (!this.includedRows.length) return;
    this.s.phase = 'pay';
    this.startPaymentWatch();
    const first = this.includedRows.find((r) => !this.isPaid(r)) ?? this.includedRows[0];
    if (this.wide) this.openInPane(first);
  }

  backToReview(): void {
    this.stopPaymentWatch();
    this.paneKeys = []; // closes the pane (its vehicle is kept via onLeave)
    this.s.phase = 'review';
  }

  // ═════════ 4. Review & pay ═════════

  holderOf(row: BulkRow): HolderProfile { return this.s.sameOwner ? this.s.sharedHolder : row.holder; }
  holderComplete(row: BulkRow): boolean {
    const h = this.holderOf(row);
    if (REQUIRED_HOLDER.some((f) => h[f] == null || String(h[f]).trim() === '')) return false;
    return /^60\d{8,10}$/.test(h.mobile_no) && /^\S+@\S+\.\S+$/.test(h.email);
  }
  isPaid(row: BulkRow): boolean { return PAID_STATUSES.includes(row.policyStatus ?? ''); }

  /** '' = nothing to show yet (not paid, payment not started). */
  paymentLabel(row: BulkRow): string {
    const p = this.b.payState;
    switch (row.policyStatus) {
      case 'SUCCESS': return p.issued;
      case 'PENDING_FOR_APPROVAL':
      case 'PENDING_REFERCASE': return p.awaiting;
      case 'PENDING_FOR_PAYMENT': return p.started;
      case 'PAYMENT_FAILED':
      case 'CANCELLED': return p.notCompleted;
      case 'REJECTED': return p.rejected;
      default: return '';
    }
  }

  /** A payment was opened and we don't know the outcome yet. */
  get awaitingPayment(): boolean { return this.includedRows.some((r) => r.policyStatus === 'PENDING_FOR_PAYMENT'); }
  get paidCount(): number { return this.includedRows.filter((r) => this.isPaid(r)).length; }
  get paidTotal(): number { return this.includedRows.filter((r) => this.isPaid(r)).reduce((sum, r) => sum + this.rowTotal(r), 0); }
  get selectedRow(): BulkRow | null { return this.includedRows.find((r) => r.key === this.s.selectedKey) ?? null; }
  get selectedIndex(): number { return this.includedRows.findIndex((r) => r.key === this.s.selectedKey); }

  /** Next vehicle still to pay after the open one (wraps round). */
  get nextUnpaid(): BulkRow | null {
    const rows = this.includedRows;
    const from = Math.max(0, this.selectedIndex);
    return [...rows.slice(from + 1), ...rows.slice(0, from)].find((r) => !this.isPaid(r) && r.policyStatus !== 'PENDING_FOR_PAYMENT') ?? null;
  }

  /** Wide: open in the pane. Narrower: the full-page wizard ("Back to bulk list" returns). */
  openRow(row: BulkRow): void {
    if (this.wide) { this.openInPane(row); return; }
    this.s.selectedKey = row.key;
    this.batch.setHandoff(this.handoffFor(row));
    void this.router.navigateByUrl(this.session.path('insurance-purchase'));
  }

  openInPane(row: BulkRow): void {
    if (row.key === this.s.selectedKey && this.paneKeys.length) return;
    this.s.selectedKey = row.key;
    if (this.paymentNoticeKey !== row.key) this.paymentNoticeKey = null;
    // Straight to the pane's wizard; the previous one hands back its state as it is destroyed.
    this.paneHandoff = this.handoffFor(row);
    this.paneKeys = [row.key];
  }

  private handoffFor(row: BulkRow): QuoteHandoff {
    const o = this.ownerOf(row);
    const holder = (): HolderProfile => this.holderOf(row);
    return {
      result: row.result!,
      values: { qarqal_id: o.qarqalId.trim(), vehicle_no: normalisePlate(row.plate), id_type: Number(o.idType), id_number: o.idNumber.trim(), postcode: o.postcode.trim() },
      providerCode: row.providerCode,
      // Read when the wizard starts: always the latest (same owner: what was typed for the previous vehicle).
      get profile() { return { ...holder() }; },
      snapshot: row.snapshot,
      onProfile: (profile) => { Object.assign(holder(), profile); this.cdr.markForCheck(); },
      onLeave: (snapshot) => {
        row.snapshot = snapshot;
        if (snapshot.selectedProvider) row.providerCode = snapshot.selectedProvider.provider;
        this.cdr.markForCheck();
      },
      onPaymentStarted: () => {
        if (!row.policyStatus || row.policyStatus === 'PAYMENT_FAILED' || row.policyStatus === 'CANCELLED') row.policyStatus = 'PENDING_FOR_PAYMENT';
        this.paymentNoticeKey = row.key;
        this.cdr.markForCheck();
      },
    };
  }

  /** Latest price for the list: where the agent left it (add-ons included), else the quote. */
  rowTotal(row: BulkRow): number { return this.price(row.snapshot?.selectedProvider ?? this.chosen(row)); }

  // Paid status comes from My sales: checked on entering this stage, when a payment tab reports back, when
  // the agent returns to this tab with a payment open, and on "Refresh payment status".
  private startPaymentWatch(): void {
    if (typeof document === 'undefined') return;
    this.stopPaymentWatch();
    void this.refreshPaid();
    if (typeof BroadcastChannel !== 'undefined') {
      this.paymentChannel = new BroadcastChannel(PAYMENT_RESULT_CHANNEL);
      this.paymentChannel.onmessage = () => void this.refreshPaid();
    }
    document.addEventListener('visibilitychange', this.onVisible);
  }

  private stopPaymentWatch(): void {
    this.paymentChannel?.close();
    this.paymentChannel = null;
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.onVisible);
  }

  async refreshPaid(): Promise<void> {
    const rows = new Map(this.includedRows.map((r) => [r.result!.quotationId, r]));
    if (!rows.size) return;
    try {
      const page = await this.api.sales(1, 100);
      for (const sale of page.rows) {
        const row = rows.get(sale.quotation_id);
        if (row) { row.policyStatus = sale.policy_status; row.coverNote = sale.cover_note_no; }
      }
    } catch { /* keep what we have; the agent can refresh again */ }
    this.cdr.markForCheck();
  }

  // ═════════ Formatting ═════════

  vehicleText(result: QuoteResult | null): string {
    if (!result) return '';
    const make = (result.make ?? '').trim();
    const model = (result.model ?? '').replace(new RegExp(`^${make.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s-]*`, 'i'), '').trim();
    return [make, model, result.manufacturingYear].filter(Boolean).join(' ');
  }
  ncd(result: QuoteResult | null): string { return `${parseFloat(String(result?.ncdPercentage ?? '0')) || 0}%`; }
  insurer(code: string): string { return code ? insurerName(code) : '—'; }
  money(value: string | number | null | undefined): string {
    const amount = typeof value === 'number' ? value : parseFloat(value ?? '0');
    return `RM ${(isNaN(amount) ? 0 : amount).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}
