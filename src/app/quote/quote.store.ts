import { Injectable, signal } from '@angular/core';
import type { Offer, QuoteInput, QuoteOutcome } from './quote.types';

// State shared by the quote pages (/insurance/quote, and the steps after it).
//
// - pending: the hero form's details, in memory only. They include the ID number, so they never go to
//   storage or the URL. Lost on reload, which only matters before quotes are generated.
// - results: saved in sessionStorage under the quotation id from the URL (?quotation_id=), so a refresh keeps the page.
//   The backend has no "get quote by id" endpoint yet; when it does, load() can fall back to it.
// - selected: the offer the visitor picked, for the next step.

type OkOutcome = Extract<QuoteOutcome, { kind: 'ok' }>;
// v2: offers carry plan choices and road tax; older saved data is ignored.
const KEY = 'qq.v2.quote.';
const SELECTED_KEY = 'qq.v2.selected';

@Injectable({ providedIn: 'root' })
export class QuoteStore {
  readonly pending = signal<QuoteInput | null>(null);
  readonly selected = signal<Offer | null>(this.read<Offer>(SELECTED_KEY));

  start(input: QuoteInput): void {
    this.pending.set(input);
    this.select(null);
  }

  /** The offer picked on the quote page; kept for refreshes of the later steps. */
  select(offer: Offer | null): void {
    this.selected.set(offer);
    this.write(SELECTED_KEY, offer);
  }

  save(id: string, result: OkOutcome): void {
    this.write(KEY + id, result);
  }

  load(id: string): OkOutcome | null {
    return this.read<OkOutcome>(KEY + id);
  }

  // try/catch: sessionStorage is missing during prerender and can be blocked by privacy settings.
  private read<T>(key: string): T | null {
    try {
      const raw = typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  private write(key: string, value: unknown): void {
    try {
      if (typeof sessionStorage === 'undefined') return;
      if (value === null) sessionStorage.removeItem(key); else sessionStorage.setItem(key, JSON.stringify(value));
    } catch { /* storage blocked: the page still works until a reload */ }
  }
}
