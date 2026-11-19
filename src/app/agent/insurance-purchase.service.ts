import { Injectable, inject } from '@angular/core';
import { AgentSession } from './agent-session.service';
import type { Envelope } from './agent.types';
import type { GenerateQuoteRequest, PolicyHolderRequest, PurchaseOptions, QuoteResult, UpdateQuoteRequest } from './insurance-purchase.types';

// Agent insurance purchase API (qarqal-backend routes/admin/admin-insurance-purchase.route.ts), same calls as
// qarqalAngular's InsurancePurchaseService. The backend works out the company from the agent's login; the
// sale lands under that company and is linked to the agent (dt_agent_sale_ags).

export interface RecentVehicle {
  vehicle_no: string;
  last_quoted_date: string;
  prefill: {
    qarqal_id: string | null;
    id_type: number | null;
    id_number: string | null;
    postcode: number | null;
    dob: string | null;
    email: string | null;
    marital_status: number | null;
    profile: Record<string, unknown> | null;
  };
}

export interface AgentSale {
  ags_id: number;
  quotation_id: string;
  status: string;
  customer_linked: boolean;
  vehicle_no: string | null;
  policy_status: string | null;
  total_contribution: string | null;
  cover_note_no: string | null;
  created_date: string;
}

export interface AgentSalesPage { rows: AgentSale[]; total: number; page: number; limit: number }

/** One vehicle's outcome in a bulk quote (one NDJSON line). */
export interface BatchQuoteLine {
  index: number;
  status: boolean;
  message: string;
  data?: QuoteResult;
  errors?: { message?: string }[];
}

const BASE = 'admin/insurance-purchase';

@Injectable({ providedIn: 'root' })
export class InsurancePurchaseService {
  private readonly session = inject(AgentSession);

  async options(): Promise<PurchaseOptions> {
    return (await this.session.authed<Envelope<PurchaseOptions>>('GET', `${BASE}/options`)).data;
  }

  /** The customer's masked name ("Ahm** B** A**"). 404 when there's no such QarQal ID. */
  async lookupCustomer(qarqalId: string): Promise<string> {
    const res = await this.session.authed<Envelope<{ masked_name: string }>>('GET', `${BASE}/customer?qarqal_id=${encodeURIComponent(qarqalId)}`);
    return res.data.masked_name;
  }

  /** Plates this agent quoted before, newest first, filtered by prefix. */
  async recentVehicles(q = ''): Promise<RecentVehicle[]> {
    const res = await this.session.authed<Envelope<RecentVehicle[]>>('GET', `${BASE}/recent-vehicles?q=${encodeURIComponent(q)}`);
    return res.data ?? [];
  }

  async generateQuote(body: GenerateQuoteRequest): Promise<QuoteResult> {
    return (await this.session.authed<Envelope<QuoteResult>>('POST', `${BASE}/generate-quote`, body)).data;
  }

  /**
   * Bulk quote: up to 10 vehicles in one request, quoted in parallel by the backend. Each vehicle's
   * outcome arrives as soon as it's ready (onLine); `index` is its position in `vehicles`.
   */
  async generateQuotes(vehicles: GenerateQuoteRequest[], onLine: (line: BatchQuoteLine) => void, signal?: AbortSignal): Promise<void> {
    await this.session.authedStream(`${BASE}/generate-quotes`, { vehicles }, (raw) => {
      const line = raw as Partial<BatchQuoteLine> | null;
      if (line && typeof line.index === 'number') onLine(line as BatchQuoteLine);
    }, signal);
  }

  async updateQuote(body: UpdateQuoteRequest): Promise<QuoteResult> {
    return (await this.session.authed<Envelope<QuoteResult>>('POST', `${BASE}/update-quote`, body)).data;
  }

  async savePolicyHolderProfile(body: PolicyHolderRequest): Promise<void> {
    await this.session.authed('POST', `${BASE}/policy-holder-profile`, body);
  }

  /** Billplz bill. redirectURL must be the portal's result page on this site (backend checks it). */
  async preparePayment(quotationId: string, paymentType: number, redirectURL: string): Promise<{ paymentURL: string }> {
    const res = await this.session.authed<Envelope<{ paymentURL: string }>>('POST', `${BASE}/prepare-payment`,
      { quotation_id: quotationId, paymentType, redirectURL });
    return res.data;
  }

  async sales(page: number, limit: number): Promise<AgentSalesPage> {
    return (await this.session.authed<Envelope<AgentSalesPage>>('GET', `${BASE}/sales?page=${page}&limit=${limit}`)).data;
  }
}
