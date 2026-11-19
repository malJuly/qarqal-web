import type { AvailableAddon } from './insurance-purchase.types';

// Shared by the single-vehicle wizard and bulk quote (same rules as qarqalAngular's insurance-purchase.util.ts).

export const ID_TYPE_NRIC = 1;
export const ID_TYPE_COMPANY = 3;
/** Quotes are created as Comprehensive; the cover type is then changed per insurer via update-quote. */
export const QUOTE_COVER_CODE = 'COMP';

/** generate-quote needs owner fields the insurer doesn't price on: the app sends these; real values go in at checkout. */
export const quotePlaceholders = (idType: number) =>
  idType === ID_TYPE_COMPANY
    ? { full_name: 'COMPANY USER', dob: '01/01/1970', email: 'demo@qarqal.com', marital_status: 5 }
    : { full_name: 'demo user', dob: '1982-01-01', email: 'demo@qarqal.com', marital_status: 1 };

export const normalisePlate = (v: string): string => v.trim().toUpperCase().replace(/\s+/g, '');

/** NRIC: digits only, dashes added as 6-2-4 (same shape the app sends). */
export const formatNric = (v: string): string => {
  const digits = String(v ?? '').replace(/\D/g, '').slice(0, 12);
  return [digits.slice(0, 6), digits.slice(6, 8), digits.slice(8, 12)].filter(Boolean).join('-');
};
export const isValidNric = (v: string): boolean => String(v ?? '').replace(/\D/g, '').length === 12;
export const isValidPostcode = (v: string): boolean => /^\d{5}$/.test(String(v ?? '').trim());

/** The Billplz return page tells the bulk page (another tab) that a payment finished. */
export const PAYMENT_RESULT_CHANNEL = 'qq-agent-insurance-payment-result';
/**
 * Set in sessionStorage just before bulk opens a payment tab. A tab opened with window.open starts with a
 * copy of the opener's sessionStorage, so the result page in that tab knows it came from bulk — without
 * keeping window.opener (which would let the payment site's tab reach back into the portal tab).
 */
export const BULK_PAY_TAB_FLAG = 'qq.agent.bulkPayTab';

// ── Wizard state (exported so bulk quote can keep it per vehicle) ──
export type AddonKind = 'toggle' | 'amount' | 'plan';
export interface AddonRow { code: string; kind: AddonKind; addon: AvailableAddon; popular: boolean }
export interface DriverInput { fullName: string; idType: 'nric' | 'passport'; idNumber: string; dob: string; nationality: string }
export interface QuoteValues { qarqal_id: string; vehicle_no: string; id_type: number; id_number: string; postcode: string }
