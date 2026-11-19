import { Injectable, inject } from '@angular/core';
import { AgentSession } from './agent-session.service';

// Insurance orders of the agent's company. Same API as qarqalAngular's Insurance Orders page
// (pages/masters/list-orders): GET /admin/orders?object_type=1, scoped by the backend to the agent's
// active company (services/admin/orders.service.ts resolveOrdersScope), and the policy popup's
// GET /admin/vehicle-policy-details (same scope).
//
// The API also returns QarQal's commission and supplier (comm_amt, partner_aggregator). They are left out
// of these types on purpose so no page shows them.

export const POLICY_STATUSES = [
  'PENDING_FOR_PAYMENT', 'PENDING_FOR_APPROVAL', 'SUCCESS', 'REJECTED', 'CANCELLED',
  'PENDING_REFERCASE', 'PENDING', 'PAYMENT_FAILED', 'REFUNDED',
] as const;
export const PAYMENT_STATUSES = ['Success', 'Failed', 'Initiated'] as const;

/** One row of GET /admin/orders (only the fields the portal shows). */
export interface InsuranceOrder {
  id: number;
  order_random_id: string | null;
  quotation_id: string | null;
  qarqal_id: string | null;
  username: string | null;
  vehilcle_no: string | null; // sic: the backend's spelling
  insurance_provider: string | null;
  payment_status: string | null;
  amount: number | null;
  policy_status: string | null;
  createdAt: string | null;
  referral_code: string | null;
}

export interface InsuranceOrderPage {
  data: InsuranceOrder[];
  count: number;
  totalPages: number;
  totalContribution: number;
}

export interface InsuranceOrderFilters {
  page: number;
  limit: number;
  paymentStatus: string;
  policyStatuses: string[];
  fromDate: string;
  toDate: string;
}

/** GET /admin/vehicle-policy-details → data[0] (only the fields the portal shows). */
export interface PolicyDetails {
  quotation_id: string | null;
  vehicle_no: string | null;
  status: string | null;
  cover_note_no: string | null;
  issued_date: string | null;
  effective_date: string | null;
  expiry_date: string | null;
  sum_insured: number | null;
  is_market_value: boolean | null;
  is_agreed_value: boolean | null;
  ncd_percentage: number | null;
  ncd_value: number | null;
  basic_contribution: number | null;
  gross_contribution: number | null;
  stamp_duty: number | null;
  sst: number | null;
  processing_fee: number | null;
  road_tax_fee: number | null;
  total_contribution: number | null;
  promo_code: string | null;
  policy_url: string | null;
}

interface OrdersResponse {
  data?: InsuranceOrder[];
  count?: number;
  totalPages?: number;
  total_contribution?: number;
}

@Injectable({ providedIn: 'root' })
export class InsuranceOrdersService {
  private readonly session = inject(AgentSession);

  async list(f: InsuranceOrderFilters): Promise<InsuranceOrderPage> {
    const q = new URLSearchParams({ page: String(f.page), limit: String(f.limit), object_type: '1' });
    if (f.paymentStatus) q.set('status', f.paymentStatus);
    if (f.policyStatuses.length) q.set('policy_status', f.policyStatuses.join(','));
    if (f.fromDate) q.set('fromDate', f.fromDate);
    if (f.toDate) q.set('toDate', f.toDate);
    const res = await this.session.authed<OrdersResponse>('GET', `admin/orders?${q}`);
    return {
      data: res.data ?? [],
      count: res.count ?? 0,
      totalPages: res.totalPages ?? 1,
      totalContribution: res.total_contribution ?? 0,
    };
  }

  async policy(vehicleNo: string, quotationId: string | null): Promise<PolicyDetails | null> {
    const q = new URLSearchParams({ vehicle_no: vehicleNo });
    if (quotationId) q.set('quotation_id', quotationId);
    const res = await this.session.authed<{ data?: PolicyDetails[] }>('GET', `admin/vehicle-policy-details?${q}`);
    return res.data?.[0] ?? null;
  }
}
