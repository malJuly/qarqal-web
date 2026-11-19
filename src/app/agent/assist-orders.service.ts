import { Injectable, inject } from '@angular/core';
import { AgentSession } from './agent-session.service';

// Assist (roadside plan) orders sold through partners. Same API as qarqalAngular's Partner Orders page
// (pages/masters/partner-orders): GET/PATCH /admin/partner-orders (backend services/admin/partnerOrders.service.ts).
//
// Who sees what is decided by the backend: a Merchant (seller) only gets their own company's orders;
// a Provider gets all orders for the product. Only a Provider may update an order.

export const ASSIST_STATUSES = ['New', 'Live', 'Task Completed', 'Refunded', 'Expired'] as const;
export type AssistStatus = (typeof ASSIST_STATUSES)[number];

/** One row of GET /admin/partner-orders (serializePartnerOrderRecord). */
export interface AssistOrder {
  partnerorderid: number;
  partnerid: string;
  partnerName: string | null;
  partnerEmail: string | null;
  partneruserid: string | null;
  vehicletype: string | null;
  veh_reg_no: string | null;
  brandname: string | null;
  vehicleuse: string | null;
  plan_type: number | null;
  purchased_date: string | null;
  plan_startdate: string | null;
  plan_enddate: string | null;
  referenceid: string | null;
  amount: number | null;
  payment_status: string | null;
  additionaldriver: string | null;
  additionaldriver_nric: string | null;
  referralcode: string | null;
  createdAt: string | null;
  status: string | null;
  remarks: string | null;
}

export interface AssistOrderPage {
  data: AssistOrder[];
  count: number;
  totalPages: number;
}

export interface AssistOrderFilters {
  page: number;
  limit: number;
  status: string;
  partnerName: string;
}

@Injectable({ providedIn: 'root' })
export class AssistOrdersService {
  private readonly session = inject(AgentSession);

  async list(f: AssistOrderFilters): Promise<AssistOrderPage> {
    const q = new URLSearchParams({ page: String(f.page), limit: String(f.limit), object_type: '2' });
    if (f.status) q.set('status', f.status);
    if (f.partnerName) q.set('partnerName', f.partnerName);
    const res = await this.session.authed<Partial<AssistOrderPage>>('GET', `admin/partner-orders?${q}`);
    return { data: res.data ?? [], count: res.count ?? 0, totalPages: res.totalPages ?? 1 };
  }

  /** Provider only: mark an order done, with remarks. */
  async updateStatus(id: number, status: AssistStatus, remarks: string): Promise<void> {
    await this.session.authed('PATCH', `admin/partner-orders/${id}`, { status, remarks });
  }
}
