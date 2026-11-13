import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, ViewEncapsulation, afterNextRender, computed, inject, viewChild } from '@angular/core';
import site from '../../config/site.json';
import { environment } from '../../../environments/environment';
import { I18nService } from '../../core/i18n.service';
import type { Dict } from '../../i18n';
import { Icon } from '../icon';
import { StoreBadges } from '../store-badges';
import { createMockApi } from './calculator.mock';
import {
  ApiError, type Addon, type AddonRequest, type CatalogItem, type InsConfig, type InsRequest, type InsResult, type Line,
  type LoanConfig, type LoanRequest, type LoanResult, type MarketValueResult, type RoadTaxRequest, type RoadTaxResult,
  type Usage, type WithUsage,
} from './calculator.types';

// Car insurance, road tax and car loan calculators — the same three the app has
// (lib/pages/calculator/*), with the same request/response shapes as the app's
// /calculator/* and /car-catalog/* endpoints, under environment.apiBaseUrl (the public API root,
// e.g. "https://www.qarqal.com/api/v1/public").
// Car insurance also has the app's optional car picker: make -> model -> variant -> year,
// whose market value estimate sets the sum insured through a slider.
//
// Download nudge: the server counts calculations per visitor (data.usage on each calculate) and the page shows it,
// with an "unlimited in the app" panel once the day's allowance (site.calculator.freePerDay) is used.
// Car insurance follows the app (lib/pages/calculator/car_insurance_calculator_screen.dart): optional add-ons
// from the config, and a result headed by the premium before tax, with tax and stamp duty in a collapsed section.
//
// No apiBaseUrl: the section is left out of the production build. In `ng serve` it runs on
// labelled sample numbers instead (calculator.mock.ts), so the UI can be reviewed before the endpoint exists.
//
// The behaviour is the Astro script ported as is: it runs once in the browser after the first render (setUp),
// and works on this component's own DOM. Server-side prerendering only outputs the empty form.

type Copy = Dict['calc'];
type Field = HTMLInputElement | HTMLSelectElement;
type Step = 'brand' | 'model' | 'variant' | 'year';
type Row = { label: string; sub?: string; pick: () => void };

const CLIENT_KEY = 'qarqal_calc_client_id';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STEPS: Step[] = ['brand', 'model', 'variant', 'year'];
const MIN_YEAR = 1980;

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!));
const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));

@Component({
  selector: 'app-calculator',
  imports: [Icon, StoreBadges],
  templateUrl: './calculator.html',
  styleUrl: './calculator.css',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Calculator {
  protected readonly i18n = inject(I18nService);
  private readonly base = environment.apiBaseUrl.replace(/\/$/, '');
  private readonly isMock = !this.base && !environment.production;
  protected readonly show = Boolean(this.base) || this.isMock;
  private readonly root = viewChild<ElementRef<HTMLElement>>('root');

  /** Fixed option lists (road tax and loan), in the order of the language file. */
  protected readonly opts = computed(() => {
    const o = this.i18n.t().calc.options;
    return {
      vehicleType: Object.entries(o.vehicleType), powertrain: Object.entries(o.powertrain), roadRegion: Object.entries(o.roadRegion),
      vehicleClass: Object.entries(o.vehicleClass), ownership: Object.entries(o.ownership), rateType: Object.entries(o.rateType),
    };
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const root = this.root()?.nativeElement;
      if (root) destroyRef.onDestroy(this.setUp(root, this.i18n.t().calc));
    });
  }

  /** Wires up the three calculators and the car picker. Returns a clean-up function. */
  private setUp(root: HTMLElement, copy: Copy): () => void {
    const base = this.base;
    const isMock = this.isMock;
    const mockApi = isMock ? createMockApi(copy.errors.server) : null;
    const freePerDay = site.calculator.freePerDay || 3;
    const locale = ({ en: 'en-MY', ms: 'ms-MY', zh: 'zh-MY', ta: 'ta-MY' } as const)[this.i18n.lang()] ?? 'en-MY';
    const money = (v: string | number) =>
      new Intl.NumberFormat(locale, { style: 'currency', currency: 'MYR', minimumFractionDigits: 2 }).format(Number(v));
    const moneyWhole = (v: string | number) =>
      new Intl.NumberFormat(locale, { style: 'currency', currency: 'MYR', maximumFractionDigits: 0 }).format(Number(v));
    const cleanups: (() => void)[] = [];

    // ---------- Daily allowance: the server counts (data.usage on each calculate); the page only shows it ----------
    let usage: Usage | null = null; // unknown until the first calculation of this visit
    const leftEl = root.querySelector<HTMLElement>('[data-left]')!;
    const limitEl = root.querySelector<HTMLElement>('[data-limit]')!;
    const goButtons = [...root.querySelectorAll<HTMLButtonElement>('.calc__go')];
    const syncAllowance = () => {
      const out = usage?.remaining === 0;
      leftEl.textContent = usage
        ? fill(copy.left, { n: usage.remaining, max: usage.limit })
        : fill(copy.perDay, { max: freePerDay });
      limitEl.hidden = !out;
      goButtons.forEach((b) => (b.disabled = out));
    };
    syncAllowance();

    // ---------- API (same shapes as the app's /calculator and /car-catalog endpoints) ----------
    // Anonymous visitor ID for the daily quota: kept in localStorage, or in memory if storage is blocked.
    const newId = (): string => {
      if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
      // Fallback UUID v4 for older browsers.
      const b = crypto.getRandomValues(new Uint8Array(16));
      b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
      const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
      return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
    };
    let memoryId: string | null = null;
    const clientId = (): string => {
      try {
        const saved = localStorage.getItem(CLIENT_KEY);
        if (saved && UUID_RE.test(saved)) return saved;
        const id = newId();
        localStorage.setItem(CLIENT_KEY, id);
        return id;
      } catch {
        return (memoryId ??= newId());
      }
    };

    const api = async <T,>(path: string, body?: unknown): Promise<T> => {
      if (mockApi) return mockApi(path, body) as T;
      // GETs (config, car catalog) stay simple requests so the browser can cache them by ETag.
      const res = await fetch(`${base}/${path}`, body === undefined ? undefined : {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Client-Id': clientId() },
        body: JSON.stringify(body),
      });
      type Envelope = { status?: boolean; message?: string; code?: string; details?: { field?: string }; data?: T };
      const json = (await res.json().catch(() => null)) as Envelope | null;
      if (!res.ok || !json?.status) throw new ApiError(json?.message ?? copy.errors.server, json?.details?.field, res.status, json?.code);
      return json.data as T;
    };
    const isDailyLimit = (e: unknown) => e instanceof ApiError && e.status === 429 && e.code === 'DAILY_LIMIT';
    const isRateLimited = (e: unknown) => e instanceof ApiError && e.status === 429 && e.code === 'RATE_LIMITED';

    // ---------- Tabs ----------
    const tabs = [...root.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    const select = (tab: HTMLButtonElement) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        root.querySelector<HTMLElement>(`[data-panel="${t.dataset['tab']}"]`)!.hidden = !on;
      });
      if (tab.dataset['tab'] === 'loan') loadLoanConfig();
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', (e) => {
        const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!step) return;
        const next = tabs[(i + step + tabs.length) % tabs.length];
        next.focus();
        select(next);
      });
    });

    // ---------- Form helpers ----------
    const field = (form: HTMLFormElement, name: string) => form.elements.namedItem(name) as Field | null;
    const input = (form: HTMLFormElement, name: string) => field(form, name) as HTMLInputElement;
    const value = (form: HTMLFormElement, name: string) => field(form, name)!.value;
    const showErr = (el: HTMLElement, msg: string) => {
      el.setAttribute('aria-invalid', msg ? 'true' : 'false');
      const err = el.parentElement?.querySelector<HTMLElement>('.cf__err');
      if (err) err.textContent = msg;
    };
    const clearErrs = (form: HTMLFormElement) => form.querySelectorAll<HTMLElement>('[aria-invalid]').forEach((el) => showErr(el, ''));
    const decimalOnly = (el: HTMLInputElement) => { el.value = el.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1'); };
    // Whole-number money/cc fields: keep digits only as the visitor types.
    root.querySelectorAll<HTMLInputElement>('input[inputmode="numeric"]').forEach((el) =>
      el.addEventListener('input', () => { el.value = el.value.replace(/\D/g, ''); }));
    root.querySelectorAll<HTMLInputElement>('input[inputmode="decimal"]').forEach((el) =>
      el.addEventListener('input', () => decimalOnly(el)));
    const numberIn = (el: HTMLInputElement, min?: number, max?: number): number | null => {
      const raw = el.value.trim();
      if (!raw) { showErr(el, copy.errors.required); return null; }
      const n = Number(raw);
      if (!Number.isFinite(n) || (min !== undefined && n < min) || (max !== undefined && n > max)) {
        showErr(el, fill(copy.errors.range, { min: min ?? 0, max: max ?? '' }));
        return null;
      }
      return n;
    };
    const setOptions = (sel: HTMLSelectElement, items: { value: string; label: string }[], selected?: string) => {
      sel.replaceChildren(...items.map((i) => new Option(i.label, i.value, false, i.value === selected)));
    };

    const resultBox = (panel: HTMLElement) => panel.querySelector<HTMLElement>('[data-result]')!;
    const renderResult = (panel: HTMLElement, title: string, total: string, lines: Line[], note?: string) => {
      const list = lines.map((l) => {
        const neg = l.type === 'DISCOUNT' || l.type === 'DEDUCTION';
        return `<li><span>${escapeHtml(l.label)}</span><span>${neg ? '−' : ''}${money(Math.abs(Number(l.amount)))}</span></li>`;
      }).join('');
      resultBox(panel).innerHTML = `
        <p class="calc__res-label">${escapeHtml(title)}</p>
        <p class="calc__res-total">${money(total)}</p>
        ${list ? `<p class="calc__res-sub">${escapeHtml(copy.result.breakdown)}</p><ul class="calc__res-lines">${list}</ul>` : ''}
        ${note ? `<p class="calc__res-note">${escapeHtml(note)}</p>` : ''}`;
    };
    const showResultMessage = (panel: HTMLElement, msg: string) => {
      resultBox(panel).innerHTML = `<p class="calc__res-error" role="alert">${escapeHtml(msg)}</p>`;
    };
    const showServerError = (panel: HTMLElement, form: HTMLFormElement, err: unknown) => {
      if (isDailyLimit(err)) { usage = { remaining: 0, limit: usage?.limit ?? freePerDay }; syncAllowance(); return; }
      if (isRateLimited(err)) { showResultMessage(panel, copy.errors.slowDown); return; }
      const e = err instanceof ApiError ? err : null;
      const target = e?.status === 422 && e.field ? field(form, e.field) ?? addonParamInput(e.field) : null;
      if (e && target) { showErr(target, e.message); target.focus(); return; }
      showResultMessage(panel, copy.errors.server);
    };

    // One submit flow for all three: validate, call, render, then show the server's count.
    const run = async <T extends WithUsage>(form: HTMLFormElement, build: () => object | null, path: string, render: (data: T) => void) => {
      clearErrs(form);
      if (usage?.remaining === 0) { syncAllowance(); return; }
      const body = build();
      if (body === null) { form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(); return; }
      const btn = form.querySelector<HTMLButtonElement>('.calc__go')!;
      btn.disabled = true; btn.textContent = copy.calculating;
      try {
        const data = await api<T>(path, body);
        render(data);
        // Phones: the result is below the form, so bring it into view.
        if (window.matchMedia('(max-width: 899px)').matches) {
          form.closest<HTMLElement>('[data-panel]')?.querySelector('[data-result]')
            ?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
        }
        if (data?.usage) usage = { remaining: Number(data.usage.remaining), limit: Number(data.usage.limit) };
      } catch (err) {
        showServerError(form.closest<HTMLElement>('[data-panel]')!, form, err);
      } finally {
        btn.textContent = copy.calculate;
        btn.disabled = false;
        syncAllowance();
      }
    };

    // ---------- Car insurance ----------
    const insForm = root.querySelector<HTMLFormElement>('form[data-kind="ins"]')!;
    const insPanel = root.querySelector<HTMLElement>('[data-panel="ins"]')!;
    let insCfg: InsConfig | null = null;
    const needsSum = () => !insCfg || insCfg.sumInsured.requiredFor.includes(value(insForm, 'coverType'));
    const syncCover = () => {
      insForm.querySelectorAll<HTMLElement>('[data-when-cover="insured"]').forEach((el) => (el.hidden = !needsSum()));
      syncSumField();
      syncAddons();
    };

    // ---------- Add-ons ----------
    const addonsBox = insForm.querySelector<HTMLElement>('[data-addons]')!;
    const addonsToggle = addonsBox.querySelector<HTMLButtonElement>('[data-addons-toggle]')!;
    const addonsList = addonsBox.querySelector<HTMLElement>('[data-addons-list]')!;
    const addonsCount = addonsBox.querySelector<HTMLElement>('[data-addons-count]')!;
    let lastAddons: AddonRequest[] = []; // what the last request sent, to map "addons[i]" errors back
    const addonCopy = copy.addons as Record<string, string | undefined>;
    const paramLabel = (key: string) => addonCopy[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, (ch) => ch.toUpperCase());
    const buildAddons = (addons: Addon[]) => {
      addonsList.replaceChildren(...addons.map((a) => {
        const row = document.createElement('div');
        row.className = 'addon';
        row.dataset['addon'] = a.code;
        row.dataset['covers'] = a.allowedCoverTypes.join(',');
        const id = `addon-${a.code.toLowerCase()}`;
        row.innerHTML = `
          <div class="addon__head">
            <input type="checkbox" id="${id}" value="${escapeHtml(a.code)}" />
            <label for="${id}" class="addon__text">
              <span class="addon__label"></span>
              ${a.pricingText ? '<span class="addon__price"></span>' : ''}
            </label>
            ${a.description ? `<button type="button" class="addon__info" aria-expanded="false" aria-controls="${id}-desc" aria-label="${escapeHtml(copy.addons.info)}">i</button>` : ''}
          </div>
          ${a.description ? `<p class="addon__desc" id="${id}-desc" hidden></p>` : ''}
          <div class="addon__params" hidden>
            ${a.params.map((p) => `
              <div class="cf">
                <label for="${id}-${p.key}">${escapeHtml(paramLabel(p.key))}
                  <span class="cf__opt">${escapeHtml(fill(copy.addons.range, { min: moneyWhole(p.min), max: moneyWhole(p.max) }))}</span></label>
                <input id="${id}-${p.key}" type="text" inputmode="decimal" autocomplete="off" placeholder="1500"
                  data-param-code="${escapeHtml(a.code)}" data-param-key="${escapeHtml(p.key)}" data-min="${p.min}" data-max="${p.max}" />
                <p class="cf__err" aria-live="polite"></p>
              </div>`).join('')}
          </div>`;
        row.querySelector('.addon__label')!.textContent = a.label;
        // The API's pricing text can name the raw param ("15% of glassValue"): show its readable name instead.
        if (a.pricingText) row.querySelector('.addon__price')!.textContent = a.params.reduce(
          (txt, p) => txt.replace(p.key, paramLabel(p.key).replace(/\s*\(.*\)$/, '').toLowerCase()), a.pricingText);
        if (a.description) row.querySelector('.addon__desc')!.textContent = a.description;
        const box = row.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
        box.addEventListener('change', () => { row.querySelector<HTMLElement>('.addon__params')!.hidden = !box.checked || !a.params.length; syncAddonCount(); });
        row.querySelector('.addon__info')?.addEventListener('click', (ev) => {
          const btn = ev.currentTarget as HTMLButtonElement;
          const open = btn.getAttribute('aria-expanded') !== 'true';
          btn.setAttribute('aria-expanded', String(open));
          row.querySelector<HTMLElement>('.addon__desc')!.hidden = !open;
        });
        row.querySelectorAll<HTMLInputElement>('input[inputmode="decimal"]').forEach((el) => el.addEventListener('input', () => decimalOnly(el)));
        return row;
      }));
      addonsBox.hidden = !addons.length;
    };
    const visibleAddons = () => [...addonsList.querySelectorAll<HTMLElement>('.addon')].filter((r) => !r.hidden);
    const selectedAddons = () => visibleAddons().filter((r) => r.querySelector<HTMLInputElement>('input[type="checkbox"]')!.checked);
    const syncAddonCount = () => {
      const n = selectedAddons().length;
      addonsCount.hidden = !n;
      addonsCount.textContent = fill(copy.addons.selected, { n });
    };
    // Only the add-ons the chosen cover allows; un-tick any that no longer apply.
    function syncAddons() {
      const cover = value(insForm, 'coverType');
      addonsList.querySelectorAll<HTMLElement>('.addon').forEach((r) => {
        const ok = (r.dataset['covers'] ?? '').split(',').includes(cover);
        r.hidden = !ok;
        if (!ok) {
          r.querySelector<HTMLInputElement>('input[type="checkbox"]')!.checked = false;
          r.querySelector<HTMLElement>('.addon__params')!.hidden = true;
        }
      });
      if (addonsList.childElementCount) addonsBox.hidden = !visibleAddons().length;
      syncAddonCount();
    }
    const openAddons = () => { addonsToggle.setAttribute('aria-expanded', 'true'); addonsList.hidden = false; };
    addonsToggle.addEventListener('click', () => {
      const open = addonsToggle.getAttribute('aria-expanded') !== 'true';
      addonsToggle.setAttribute('aria-expanded', String(open));
      addonsList.hidden = !open;
    });
    // Body for the request; null if a required param is missing or out of range (shown under its field).
    const addonsBody = (): AddonRequest[] | null => {
      let ok = true;
      const out = selectedAddons().map((r) => {
        const params: Record<string, string> = {};
        r.querySelectorAll<HTMLInputElement>('[data-param-key]').forEach((el) => {
          const v = numberIn(el, Number(el.dataset['min']), Number(el.dataset['max']));
          if (v === null) { ok = false; openAddons(); }
          else params[el.dataset['paramKey']!] = v.toFixed(2);
        });
        return { code: r.dataset['addon']!, ...(Object.keys(params).length ? { params } : {}) };
      });
      return ok ? out : null;
    };
    function addonParamInput(serverField: string): HTMLInputElement | null {
      const m = /^addons\[(\d*)\]\.params\.(\w+)$/.exec(serverField);
      if (!m) return null;
      const code = m[1] !== '' ? lastAddons[Number(m[1])]?.code : undefined;
      const sel = code ? `[data-param-code="${code}"][data-param-key="${m[2]}"]` : `[data-param-key="${m[2]}"]`;
      const found = addonsList.querySelector<HTMLInputElement>(sel);
      if (found) openAddons();
      return found;
    }
    const loadInsConfig = async () => {
      if (insCfg) return;
      try {
        insCfg = await api<InsConfig>('calculator/car-insurance/config');
        const d = insCfg.defaults;
        setOptions(field(insForm, 'coverType') as HTMLSelectElement, insCfg.coverTypes.map((x) => ({ value: x.code, label: x.label })), d.coverType);
        setOptions(field(insForm, 'region') as HTMLSelectElement, insCfg.regions.map((x) => ({ value: x.code, label: x.label })), d.region);
        // Phones show NCD beside engine cc, so just the percentage ("38.33%"); wider screens get the full label.
        const shortNcd = window.matchMedia('(max-width: 559px)').matches;
        const pct = (v: string) => `${Number(Number(v).toFixed(2))}%`;
        setOptions(field(insForm, 'ncdPercent') as HTMLSelectElement,
          insCfg.ncdOptions.map((o) => ({ value: o.value, label: shortNcd ? pct(o.value) : o.label })), d.ncdPercent);
        buildAddons(insCfg.addons ?? []);
        syncCover();
        loadList('brand'); // prefetch, so the picker opens with brands ready (as the app does)
      } catch {
        showResultMessage(insPanel, copy.errors.config);
      }
    };
    field(insForm, 'coverType')!.addEventListener('change', syncCover);
    insForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!insCfg) { loadInsConfig(); return; }
      const cfg = insCfg;
      run<InsResult>(insForm, (): InsRequest | null => {
        const coverType = value(insForm, 'coverType');
        const engineCc = numberIn(input(insForm, 'engineCc'), cfg.engineCc.min, cfg.engineCc.max);
        const sumNeeded = cfg.sumInsured.requiredFor.includes(coverType);
        const sum = sumNeeded ? numberIn(input(insForm, 'sumInsured'), cfg.sumInsured.min, cfg.sumInsured.max) : 0;
        const addons = addonsBody();
        if (engineCc === null || sum === null || addons === null) return null;
        lastAddons = addons;
        return {
          coverType, region: value(insForm, 'region'), engineCc,
          ...(sumNeeded ? { sumInsured: sum.toFixed(2) } : {}),
          ncdPercent: value(insForm, 'ncdPercent'), addons,
        };
      }, 'calculator/car-insurance/calculate', (data) => renderInsurance(data));
    });

    // Result, as in the app: the headline is the premium before tax; tax and stamp duty (and any other fee lines
    // the API returns) are added in a collapsed "Add tax and stamp duty" section. Amounts are the server's own.
    const renderInsurance = (data: InsResult) => {
      const r = copy.result;
      const isTax = (l: Line) => l.type === 'TAX' || l.type === 'FEE';
      const before = data.summary.subtotalBeforeTax ?? data.summary.estimatedTotal;
      const line = (l: Line) => {
        const neg = l.type === 'DISCOUNT';
        return `<li class="${neg ? 'is-discount' : ''}"><span><span class="calc__line-label">${escapeHtml(l.label)}${l.type === 'ADDON' ? ` <span class="calc__tag">${escapeHtml(r.addonTag)}</span>` : ''}</span>${l.basis ? `<small>${escapeHtml(l.basis)}</small>` : ''}</span><span>${neg ? '−' : ''}${money(Math.abs(Number(l.amount)))}</span></li>`;
      };
      const simple = (label: string, amount: string) => `<li><span>${escapeHtml(label)}</span><span>${money(amount)}</span></li>`;
      const taxLines = data.breakdown.filter(isTax);
      const box = resultBox(insPanel);
      box.innerHTML = `
        <p class="calc__res-label">${escapeHtml(r.yearly)}</p>
        <p class="calc__res-total">${money(before)} <span class="calc__res-suffix">${escapeHtml(r.beforeTax)}</span></p>
        <p class="calc__res-sub">${escapeHtml(r.breakdown)}</p>
        <ul class="calc__res-lines">${data.breakdown.filter((l) => !isTax(l)).map(line).join('')}
          <li class="calc__res-subtotal"><span>${escapeHtml(r.premiumBeforeTax)}</span><span>${money(before)}</span></li></ul>
        ${taxLines.length ? `
          <button type="button" class="calc__tax-toggle" aria-expanded="false" aria-controls="ins-tax">${escapeHtml(r.addTax)}<span aria-hidden="true"></span></button>
          <div id="ins-tax" class="calc__tax" hidden>
            <ul class="calc__res-lines">${simple(r.premiumBeforeTax, before)}${taxLines.map((l) => simple(l.label, l.amount)).join('')}
              <li class="calc__res-grand"><span>${escapeHtml(r.totalPayable)}</span><span>${money(data.summary.estimatedTotal)}</span></li></ul>
            <p class="calc__res-note">${escapeHtml(r.taxNote)}</p>
          </div>` : ''}
        ${data.disclaimer ? `<p class="calc__res-note">${escapeHtml(data.disclaimer)}</p>` : ''}`;
      box.querySelector<HTMLButtonElement>('.calc__tax-toggle')?.addEventListener('click', (ev) => {
        const btn = ev.currentTarget as HTMLButtonElement;
        const open = btn.getAttribute('aria-expanded') !== 'true';
        btn.setAttribute('aria-expanded', String(open));
        box.querySelector<HTMLElement>('#ins-tax')!.hidden = !open;
      });
    };

    // ---------- Car (optional): picker -> market value -> sum insured, as in the app ----------
    // lib/pages/calculator/widgets/car_picker_sheet.dart and car_insurance_calculator_screen.dart.
    const sheet = root.querySelector<HTMLDialogElement>('[data-sheet]')!;
    const sheetTitle = sheet.querySelector<HTMLElement>('[data-sheet-title]')!;
    const sheetCrumb = sheet.querySelector<HTMLElement>('[data-sheet-crumb]')!;
    const sheetBack = sheet.querySelector<HTMLButtonElement>('[data-sheet-back]')!;
    const sheetSearchWrap = sheet.querySelector<HTMLElement>('[data-sheet-search-wrap]')!;
    const sheetSearch = sheet.querySelector<HTMLInputElement>('[data-sheet-search]')!;
    const sheetList = sheet.querySelector<HTMLElement>('[data-sheet-list]')!;
    const sheetState = sheet.querySelector<HTMLElement>('[data-sheet-state]')!;
    const sheetMsg = sheet.querySelector<HTMLElement>('[data-sheet-msg]')!;
    const sheetRetry = sheet.querySelector<HTMLButtonElement>('[data-sheet-retry]')!;
    const summary = root.querySelector<HTMLElement>('[data-car-summary]')!;
    const clearBtn = root.querySelector<HTMLButtonElement>('[data-car-clear]')!;
    const estBox = root.querySelector<HTMLElement>('[data-car-est]')!;
    const estMsg = root.querySelector<HTMLElement>('[data-car-msg]')!;
    const slider = root.querySelector<HTMLElement>('[data-car-slider]')!;
    const range = root.querySelector<HTMLInputElement>('[data-car-range]')!;
    const amountEl = root.querySelector<HTMLElement>('[data-car-value]')!;
    const minEl = root.querySelector<HTMLElement>('[data-car-min]')!;
    const maxEl = root.querySelector<HTMLElement>('[data-car-max]')!;
    const useBtn = root.querySelector<HTMLButtonElement>('[data-car-use]')!;
    const sumField = insForm.querySelector<HTMLElement>('[data-sum-field]')!;
    const ccField = insForm.querySelector<HTMLElement>('[data-cc-field]')!;
    const sumInput = input(insForm, 'sumInsured');

    // Picker state
    let step: Step = 'brand';
    let brand: CatalogItem | null = null, model: CatalogItem | null = null, variant: CatalogItem | null = null, notListed = false;
    const lists: { brand: CatalogItem[] | null; model: Map<number, CatalogItem[]>; variant: Map<number, CatalogItem[]> } = { brand: null, model: new Map(), variant: new Map() };
    let listError = false;
    let listErrorMsg = '';
    // Market value state
    let car: { label: string; variant: CatalogItem | null; year: number } | null = null;
    let sliderOn = false, manual = false, estSeq = 0;

    const stepTitle: Record<Step, string> = { brand: copy.car.stepBrand, model: copy.car.stepModel, variant: copy.car.stepVariant, year: copy.car.stepYear };
    async function loadList(which: 'brand' | 'model' | 'variant') {
      try {
        if (which === 'brand' && !lists.brand) lists.brand = (await api<{ brands: CatalogItem[] }>('car-catalog/brands')).brands;
        if (which === 'model' && brand && !lists.model.has(brand.id)) lists.model.set(brand.id, (await api<{ models: CatalogItem[] }>(`car-catalog/brands/${brand.id}/models`)).models);
        if (which === 'variant' && model && !lists.variant.has(model.id)) lists.variant.set(model.id, (await api<{ variants: CatalogItem[] }>(`car-catalog/models/${model.id}/variants`)).variants);
        listError = false;
      } catch (err) {
        listError = true;
        listErrorMsg = isRateLimited(err) ? copy.errors.slowDown : copy.car.loadError;
      }
    }
    const currentRows = (): Row[] | null => {
      if (step === 'brand') return lists.brand?.map((b) => ({ label: b.name, pick: () => { brand = b; go('model'); } })) ?? null;
      if (step === 'model') return (brand && lists.model.get(brand.id))?.map((m) => ({ label: m.name, pick: () => { model = m; go('variant'); } })) ?? null;
      if (step === 'variant') {
        const vs = model && lists.variant.get(model.id);
        if (!vs) return null;
        return [
          ...vs.map((v) => ({ label: v.name, sub: v.price ? fill(copy.car.newPrice, { price: money(Math.round(v.price)) }) : undefined, pick: () => { variant = v; notListed = false; go('year'); } })),
          // Many models have no variants yet, so "not listed" is always offered.
          { label: copy.car.notListed, sub: copy.car.notListedHint, pick: () => { variant = null; notListed = true; go('year'); } },
        ];
      }
      const rows: Row[] = [];
      for (let y = new Date().getFullYear(); y >= MIN_YEAR; y--) rows.push({ label: String(y), pick: () => pickYear(y) });
      return rows;
    };
    const renderSheet = () => {
      sheetTitle.textContent = stepTitle[step];
      const crumbs = [step !== 'brand' && brand?.name, (step === 'variant' || step === 'year') && model?.name,
        step === 'year' && (notListed ? copy.car.notListed : variant?.name)].filter(Boolean);
      sheetCrumb.textContent = crumbs.join(' › ');
      sheetBack.hidden = step === 'brand';
      sheetSearchWrap.hidden = step === 'year';
      const rows = currentRows();
      const q = sheetSearch.value.trim().toLowerCase();
      const shown = rows?.filter((r) => step === 'year' || !q || r.label.toLowerCase().includes(q)) ?? [];
      sheetList.replaceChildren(...shown.map((r) => {
        const li = document.createElement('li');
        const b = document.createElement('button');
        b.type = 'button';
        b.innerHTML = `<span class="carsheet__row-label"></span>${r.sub ? '<span class="carsheet__row-sub"></span>' : ''}`;
        b.querySelector('.carsheet__row-label')!.textContent = r.label;
        if (r.sub) b.querySelector('.carsheet__row-sub')!.textContent = r.sub;
        b.addEventListener('click', r.pick);
        li.append(b);
        return li;
      }));
      const loading = !rows && !listError;
      sheetState.hidden = !(loading || listError || (rows && !shown.length));
      sheetMsg.textContent = listError ? listErrorMsg : loading ? '…' : copy.car.noResults;
      sheetRetry.hidden = !listError;
    };
    // Touch screens: don't focus the search box (that pops the keyboard up); the keyboard opens only when
    // the visitor taps the field. Focus the step title instead, so screen readers announce the step.
    const finePointer = window.matchMedia('(pointer: fine)');
    const go = async (next: Step) => {
      step = next;
      sheetSearch.value = '';
      renderSheet();
      if (next !== 'year' && !currentRows()) { await loadList(next); renderSheet(); }
      if (finePointer.matches) (next === 'year' ? sheetList.querySelector('button') : sheetSearch)?.focus();
      else sheetTitle.focus({ preventScroll: true });
    };
    sheetBack.addEventListener('click', () => go(STEPS[Math.max(0, STEPS.indexOf(step) - 1)]));
    sheetRetry.addEventListener('click', async () => { listError = false; renderSheet(); await loadList(step as 'brand' | 'model' | 'variant'); renderSheet(); });
    sheetSearch.addEventListener('input', renderSheet);
    // Touching or scrolling the list puts the keyboard away.
    const hideKeyboard = () => { if (document.activeElement === sheetSearch) sheetSearch.blur(); };
    sheetList.addEventListener('touchstart', hideKeyboard, { passive: true });
    sheetList.addEventListener('scroll', hideKeyboard, { passive: true });
    sheet.querySelector('[data-sheet-close]')!.addEventListener('click', () => sheet.close());
    sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.close(); }); // tap outside
    // Opening always starts at the brand step (lists already loaded stay cached).
    root.querySelector('[data-car-open]')!.addEventListener('click', () => {
      brand = model = variant = null; notListed = false;
      sheet.showModal();
      go('brand');
    });
    cleanups.push(() => { if (sheet.open) sheet.close(); });

    // Sum insured field: hidden while the slider sets it (as in the app).
    // Engine cc takes the whole row when the sum insured box beside it is hidden.
    function syncSumField() {
      sumField.hidden = !needsSum() || (sliderOn && !manual);
      ccField.classList.toggle('cc--alone', sumField.hidden);
    }
    const setEstimateView = () => {
      slider.hidden = !sliderOn || manual;
      useBtn.hidden = !(sliderOn && manual);
      estBox.hidden = !(estMsg.textContent || sliderOn);
      syncSumField();
    };
    const showMsg = (msg: string) => { estMsg.textContent = msg; setEstimateView(); };
    const applySlider = () => {
      amountEl.textContent = moneyWhole(range.value);
      sumInput.value = range.value;
      showErr(sumInput, '');
    };
    function pickYear(year: number) {
      sheet.close();
      // Catalog variant names usually start with the model ("Myvi 1.3L G"), so don't repeat it.
      const variantName = notListed ? '' : variant?.name ?? '';
      const repeatsModel = !!model && variantName.toLowerCase().startsWith(model.name.toLowerCase());
      const name = [brand?.name, repeatsModel ? null : model?.name, variantName].filter(Boolean).join(' ');
      // Year first ("2023 Perodua Myvi …"), so a long variant name can't push it out of view.
      car = { label: `${year} ${name}`, variant: notListed ? null : variant, year };
      summary.textContent = car.label;
      summary.classList.remove('is-empty');
      clearBtn.hidden = false;
      estimate();
    }
    const resetCar = () => {
      estSeq++;
      car = null; sliderOn = false; manual = false;
      summary.textContent = copy.car.placeholder;
      summary.classList.add('is-empty');
      clearBtn.hidden = true;
      showMsg('');
    };
    clearBtn.addEventListener('click', resetCar);

    async function estimate() {
      estSeq++; sliderOn = false; manual = false;
      if (!car) return;
      if (!car.variant) { manual = true; showMsg(copy.car.noEstimate); return; } // "variant not listed": type it
      const seq = estSeq;
      showMsg(copy.car.estimating);
      try {
        const est = await api<MarketValueResult>('calculator/market-value/calculate', { variantId: car.variant.id, manufactureYear: car.year });
        if (seq !== estSeq) return;
        // Slider runs range_low..range_high, clamped to the insurable range from the config.
        const low = Math.max(est.range_low, Math.ceil(insCfg?.sumInsured.min ?? 0));
        const high = Math.min(est.range_high, Math.floor(insCfg?.sumInsured.max ?? Infinity));
        if (low > high) { manual = true; showMsg(fill(copy.car.outOfRange, { value: money(est.estimated_value) })); return; }
        range.min = String(low); range.max = String(high); range.step = '100';
        range.value = String(Math.min(high, Math.max(low, Math.round(est.estimated_value / 100) * 100)));
        minEl.textContent = moneyWhole(low); maxEl.textContent = moneyWhole(high);
        sliderOn = true;
        estMsg.textContent = '';
        applySlider();
        setEstimateView();
      } catch (err) {
        if (seq !== estSeq) return;
        manual = true;
        showMsg(isRateLimited(err) ? copy.errors.slowDown
          : err instanceof ApiError && err.status === 422 ? copy.car.noEstimate : copy.car.loadError);
      }
    }
    range.addEventListener('input', applySlider);
    // "Enter amount manually" / "Use estimated market value"
    root.querySelector('[data-car-manual]')!.addEventListener('click', () => { manual = true; setEstimateView(); sumInput.focus(); });
    useBtn.addEventListener('click', () => { manual = false; applySlider(); setEstimateView(); });

    // ---------- Road tax ----------
    const rtForm = root.querySelector<HTMLFormElement>('form[data-kind="rt"]')!;
    const rtPanel = root.querySelector<HTMLElement>('[data-panel="rt"]')!;
    const syncRoadTax = () => {
      const ev = value(rtForm, 'powertrain') === 'EV';
      const isCar = value(rtForm, 'vehicleType') === 'CAR';
      rtForm.querySelector<HTMLElement>('[data-when-power="engine"]')!.hidden = ev;
      rtForm.querySelector<HTMLElement>('[data-when-power="ev"]')!.hidden = !ev;
      rtForm.querySelectorAll<HTMLElement>('[data-when-type="car"]').forEach((el) => (el.hidden = !isCar));
    };
    rtForm.addEventListener('change', syncRoadTax);
    syncRoadTax();
    rtForm.addEventListener('submit', (e) => {
      e.preventDefault();
      run<RoadTaxResult>(rtForm, (): RoadTaxRequest | null => {
        const vehicleType = value(rtForm, 'vehicleType');
        const powertrain = value(rtForm, 'powertrain');
        const ev = powertrain === 'EV';
        const size = ev ? numberIn(input(rtForm, 'motorKw'), 1, 2000) : numberIn(input(rtForm, 'engineCc'), 1, 10000);
        if (size === null) return null;
        return {
          vehicleType, powertrain, region: value(rtForm, 'region'),
          ...(ev ? { motorKw: size } : { engineCc: size }),
          ...(vehicleType === 'CAR' ? { vehicleClass: value(rtForm, 'vehicleClass'), ownership: value(rtForm, 'ownership') } : {}),
        };
      }, 'calculator/road-tax/calculate', (data) => renderResult(rtPanel, copy.result.roadTax, String(data.estimatedAnnualRoadTax), []));
    });

    // ---------- Car loan ----------
    const loanForm = root.querySelector<HTMLFormElement>('form[data-kind="loan"]')!;
    const loanPanel = root.querySelector<HTMLElement>('[data-panel="loan"]')!;
    let loanCfg: LoanConfig | null = null;
    let rateTouched = false;
    field(loanForm, 'rate')!.addEventListener('input', () => (rateTouched = true));
    const syncLoan = () => {
      if (!loanCfg) return;
      const type = value(loanForm, 'vehicleType');
      const rateType = value(loanForm, 'rateType');
      const vt = loanCfg.vehicleTypes.find((v) => v.code === type) ?? loanCfg.vehicleTypes[0];
      const tenureSel = field(loanForm, 'tenureMonths') as HTMLSelectElement;
      const current = Number(tenureSel.value) || loanCfg.defaults.tenureMonths;
      const stepMonths = Math.max(12, loanCfg.tenure.stepMonths);
      const months: number[] = [];
      for (let m = Math.max(12, loanCfg.tenure.minMonths); m <= vt.maxTenureMonths; m += stepMonths) months.push(m);
      setOptions(tenureSel, months.map((m) => ({ value: String(m), label: m === 12 ? copy.options.oneYear : fill(copy.options.years, { n: m / 12 }) })),
        String(months.includes(current) ? current : months[months.length - 1]));
      if (!rateTouched) {
        const r = loanCfg.defaults.rates.find((x) => x.vehicleType === type && x.rateType === rateType && x.condition === 'NEW')
          ?? loanCfg.defaults.rates.find((x) => x.vehicleType === type && x.rateType === rateType);
        if (r) input(loanForm, 'rate').value = r.rate;
      }
    };
    async function loadLoanConfig() {
      if (loanCfg) return;
      try {
        loanCfg = await api<LoanConfig>('calculator/car-loan/config');
        (field(loanForm, 'vehicleType') as HTMLSelectElement).value = loanCfg.defaults.vehicleType;
        (field(loanForm, 'rateType') as HTMLSelectElement).value = loanCfg.defaults.rateType;
        syncLoan();
      } catch {
        showResultMessage(loanPanel, copy.errors.config);
      }
    }
    field(loanForm, 'vehicleType')!.addEventListener('change', syncLoan);
    field(loanForm, 'rateType')!.addEventListener('change', syncLoan);
    loanForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!loanCfg) { loadLoanConfig(); return; }
      const cfg = loanCfg;
      run<LoanResult>(loanForm, (): LoanRequest | null => {
        const priceEl = input(loanForm, 'vehiclePrice');
        const downEl = input(loanForm, 'downPayment');
        const price = numberIn(priceEl, cfg.vehiclePrice.min, cfg.vehiclePrice.max);
        const down = numberIn(downEl, 0);
        const rate = numberIn(input(loanForm, 'rate'), 0, 30);
        if (price === null || down === null || rate === null) return null;
        if (down >= price) { showErr(downEl, copy.errors.downPayment); return null; }
        return {
          vehicleType: value(loanForm, 'vehicleType'), vehiclePrice: price.toFixed(2), downPayment: down.toFixed(2),
          tenureMonths: Number(value(loanForm, 'tenureMonths')), rate: rate.toFixed(2), rateType: value(loanForm, 'rateType'),
        };
      }, 'calculator/car-loan/calculate', (data) => renderResult(loanPanel, copy.result.loan, data.summary.monthlyInstalment, [
        { label: copy.result.loanAmount, amount: data.summary.loanAmount },
        { label: copy.result.totalInterest, amount: data.summary.totalInterest },
        { label: copy.result.totalPayable, amount: data.summary.totalPayable },
      ], data.disclaimer));
    });

    // Load the insurance options shortly before the section scrolls into view.
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); loadInsConfig(); } }, { rootMargin: '600px' });
      io.observe(root);
      cleanups.push(() => io.disconnect());
    } else loadInsConfig();

    return () => cleanups.forEach((fn) => fn());
  }
}
