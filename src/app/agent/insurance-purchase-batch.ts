import { Injectable } from '@angular/core';
import type { QuoteProvider, QuoteResult } from './insurance-purchase.types';
import type { AddonRow, DriverInput, QuoteValues } from './insurance-purchase.util';

// Bulk quote state, kept in memory while the agent moves between the bulk page and one vehicle's wizard.
// Port of qarqalAngular's insurance-purchase-batch.service + insurance-purchase-handoff.service.
// Memory only: it holds IC numbers, so it is never written to browser storage. A reload starts a fresh
// batch (the quotes are still in My sales).

/** Policy holder fields, same names as the wizard's profile form. */
export interface HolderProfile {
  full_name: string;
  dob: string;
  gender: number | null;
  marital_status: number | null;
  mobile_no: string;
  email: string;
  nationality: string;
  address_line1: string;
  address_line2: string;
  address_line3: string;
  city: string;
  state: string;
}

export interface WizardCover { coverType: string; nvic: string; valueType: 'market' | 'agreed'; sumInsured: number; inclusiveRoadTax: boolean }

/** Everything needed to put a vehicle back exactly as the agent left it (no re-quote, no lost add-on picks). */
export interface WizardSnapshot {
  quote: QuoteResult;
  originalProviders: QuoteProvider[];
  selectedProvider: QuoteProvider | null;
  quotedValues: QuoteValues;
  cover: WizardCover;
  addonRows: AddonRow[];
  addonValues: Record<string, boolean | number | string | null>;
  driversAvailable: boolean;
  drivers: DriverInput[];
  agentPickedAddons: boolean;
  step: number;
  mobileView: 'list' | 'customise';
  priceStale: boolean;
  savedProfileKey: string;
}

/** One finished bulk quote handed to the wizard, which opens on step 2 with it (no second generate-quote). */
export interface QuoteHandoff {
  result: QuoteResult;
  values: QuoteValues;
  /** Insurer picked on the compare screen. */
  providerCode: string;
  profile: Partial<HolderProfile>;
  /** Where the agent left this vehicle last time. */
  snapshot: WizardSnapshot | null;
  /** Holder edits (same owner → the next vehicle is prefilled). */
  onProfile: (profile: HolderProfile) => void;
  /** The vehicle's state when the agent moves on. */
  onLeave: (snapshot: WizardSnapshot) => void;
  /** Billplz opened in a new tab. */
  onPaymentStarted: () => void;
}

/** waiting = timed out, paused before an automatic retry; skipped = failed the row checks. */
export type BulkRowStatus = 'draft' | 'queued' | 'quoting' | 'waiting' | 'ready' | 'failed' | 'skipped';

export interface BulkOwner { idType: number; idNumber: string; postcode: string; qarqalId: string }

export interface BulkRow extends BulkOwner {
  key: number;
  plate: string;
  holder: HolderProfile;
  status: BulkRowStatus;
  error: string;
  attempts: number;
  result: QuoteResult | null;
  /** Insurer chosen on the compare screen. */
  providerCode: string;
  /** Ticked on the compare screen. */
  include: boolean;
  /** From My sales once a payment started (SUCCESS / PENDING_* / …). */
  policyStatus: string | null;
  coverNote: string | null;
  snapshot: WizardSnapshot | null;
}

export interface BulkBatchState {
  /** Agent + company the batch belongs to: a different login or company starts a fresh batch. */
  owner: string;
  phase: 'edit' | 'run' | 'review' | 'pay';
  sameOwner: boolean;
  sharedOwner: BulkOwner;
  sharedHolder: HolderProfile;
  rows: BulkRow[];
  csvMessage: string;
  /** Vehicle open in the review pane. */
  selectedKey: number | null;
}

export const emptyHolder = (): HolderProfile => ({
  full_name: '', dob: '', gender: null, marital_status: null, mobile_no: '', email: '', nationality: 'Malaysian',
  address_line1: '', address_line2: '', address_line3: '', city: '', state: '',
});

@Injectable({ providedIn: 'root' })
export class InsurancePurchaseBatch {
  state: BulkBatchState | null = null;
  /** Phones: the vehicle the bulk list just opened in the full-page wizard (taken once). */
  private pending: QuoteHandoff | null = null;

  setHandoff(handoff: QuoteHandoff): void { this.pending = handoff; }
  takeHandoff(): QuoteHandoff | null {
    const handoff = this.pending;
    this.pending = null;
    return handoff;
  }
  clear(): void { this.state = null; this.pending = null; }
}
