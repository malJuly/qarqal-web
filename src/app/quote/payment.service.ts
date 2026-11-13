import { Injectable, inject } from '@angular/core';
import { QarqalApi } from '../core/qarqal-api';

// Billplz payment (backend: controller/insurance.controller.ts prepareInsurancePaymentController).
//   1. POST /insurance/prepare-payment { quotation_id, paymentType: 2 (Billplz), redirectURL } → { paymentID, paymentURL }
//   2. the browser goes to paymentURL (Billplz)
//   3. Billplz returns to the backend's /insurance/payment-redirect, which marks the payment and issues the policy,
//      then redirects to `${redirectURL}?status=success|failed`.
// The backend appends "?status=" itself, so redirectURL must not carry a query string of its own.

const BILLPLZ = 2;

interface PreparePaymentRequest { quotation_id: string; paymentType: number; redirectURL: string; [key: string]: unknown }
interface PreparePaymentResponse { status: boolean; data: { paymentID: string; paymentURL: string; status?: string } }

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly api = inject(QarqalApi);

  /** Creates the Billplz bill and returns its URL. redirectUrl: absolute, no query string. */
  async prepare(quotationId: string, redirectUrl: string): Promise<string> {
    const body: PreparePaymentRequest = { quotation_id: quotationId, paymentType: BILLPLZ, redirectURL: redirectUrl };
    const res = await this.api.post<PreparePaymentResponse>('insurance/prepare-payment', body);
    const url = res.data?.paymentURL;
    // Only follow an https URL from the gateway.
    if (!url || !/^https:\/\//i.test(url)) throw new Error('Invalid payment URL');
    return url;
  }
}
