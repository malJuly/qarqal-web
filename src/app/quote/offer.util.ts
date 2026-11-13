import { toStr } from '../shared/utils/format.util';
import type { Offer, RawProvider } from './quote.types';

// Display helpers for offers, following the admin purchase wizard (qarqalAngular insurance-purchase-wizard):
// insurer names from their codes, logo fallbacks, and the price breakdown. Pure functions.

/** Reads a price field the way the app does: summary object first, then the provider itself. */
export const priceField = (p: RawProvider, key: string, fallback = '0.00'): string => {
  const summary = p.vehicleSummary ?? p.premiumSummary ?? {};
  return toStr(summary[key] ?? p[key], fallback);
};

const amount = (v: unknown): number => {
  const n = parseFloat(toStr(v, '0'));
  return Number.isFinite(n) ? n : 0;
};

/** Price shown on an insurer tile: the gross contribution, or the total when the insurer doesn't send one. */
export const tilePrice = (o: Offer): number => amount(o.grossContribution) || amount(o.totalContribution);

/** "takaful_ikhlas" → "Takaful Ikhlas". */
export const insurerName = (code: string): string => code.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// Logos already on the landing page (public/assets/logos), by insurer code. Codes with a suffix
// ("allianz_car") fall back to their first word.
const L = '/assets/logos/';
const BUNDLED_LOGOS: Record<string, string> = {
  allianz: `${L}allianz_logo.svg`,
  berjaya: `${L}berjaya_sompo.png`,
  chubb: `${L}chubb.svg`,
  etiqa: `${L}etiqa_logo.svg`,
  generali: `${L}generali.png`,
  msig: `${L}msig.svg`,
  pacific: `${L}pacific_insurance.png`,
  takaful_ikhlas: `${L}takaful_ikhlas_logo.svg`,
  takaful_malaysia: `${L}takaful_malaysia_logo.svg`,
  tune: `${L}tune_protect.png`,
  zurich: `${L}zurich_logo.svg`,
};

export const bundledLogo = (code: string): string | null => {
  const key = code.toLowerCase();
  return BUNDLED_LOGOS[key] ?? BUNDLED_LOGOS[key.split('_')[0]] ?? null;
};

/** The API often repeats the make in the model ("TOYOTA- AVANZA …"); show it once. */
export function vehicleLabel(make: string, model: string, year: string): string {
  const m = make.trim();
  const escaped = m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rest = m ? model.replace(new RegExp(`^${escaped}[\\s-]*`, 'i'), '').trim() : model.trim();
  return [m, rest, year].filter(Boolean).join(' ');
}

export interface AddOnLine { code: string; premium: number }

export interface Breakdown {
  /** Basic contribution, before the NCD discount. */
  basic: number;
  ncdValue: number;
  ncdPercentage: number;
  addOns: AddOnLine[];
  addOnsTotal: number;
  /** Basic − NCD + add-ons: the insurer's grossContribution. */
  gross: number;
  sst: number;
  sstPercentage: number;
  stampDuty: number;
  /** The insurer's processingFee, else 0. */
  processingFee: number;
  /** Road tax in the price: the insurer's roadTaxFee, else the quote's road tax amount when ticked. */
  roadTax: number;
  /** Platform, promo-code and other discounts the insurer took off. */
  discount: number;
  /**
   * Whatever the lines above leave unexplained (total − their sum), so the breakdown always adds up to
   * the total. Positive: a charge with no field of its own; negative: a reduction. 0 when it all adds up.
   */
  other: number;
  total: number;
  effectiveDate: string;
  expiryDate: string;
}

/**
 * Price lines for the order summary, laid out as the app does (quotation_details.dart):
 *   basic contribution − NCD + add-ons = gross contribution; + service tax + stamp duty (+ fees) = total.
 * Every figure is the insurer's own; nothing is recalculated except the gross fallback and `other`.
 */
export function breakdown(offer: Offer): Breakdown {
  const p = offer.raw;
  const total = amount(offer.totalContribution);
  const addOns: AddOnLine[] = (p.addOn ?? [])
    .map((a) => ({ code: toStr(a.code), premium: amount(a.premium) }))
    .filter((a) => a.code);
  const addOnsTotal = addOns.reduce((sum, a) => sum + a.premium, 0);
  const basic = amount(priceField(p, 'basicContribution', '')) || amount(offer.basicPremium);
  const ncdValue = amount(priceField(p, 'ncdValue'));
  const gross = amount(offer.grossContribution) || amount(priceField(p, 'grossContribution', '')) || basic - ncdValue + addOnsTotal;
  const sst = amount(priceField(p, 'sst'));
  const stampDuty = amount(priceField(p, 'stampDuty'));
  const processingFee = amount(priceField(p, 'processingFee'));
  const roadTax = amount(priceField(p, 'roadTaxFee')) || (offer.choice?.inclusiveRoadTax ? offer.roadTax?.amount ?? 0 : 0);
  const discount = ['platformDiscount', 'promoCodeDiscount', 'roadTaxDiscount', 'discount'].reduce((sum, k) => sum + amount(priceField(p, k)), 0);
  const explained = gross + sst + stampDuty + processingFee + roadTax - discount;
  const other = Math.round((total - explained) * 100) / 100;
  return {
    basic,
    ncdValue,
    ncdPercentage: amount(priceField(p, 'ncdPercentage')),
    addOns,
    addOnsTotal,
    gross,
    sst,
    sstPercentage: amount(priceField(p, 'sstPercentage')),
    stampDuty,
    processingFee,
    roadTax,
    discount,
    // Ignore rounding of a few sen between the insurer's own lines and its total.
    other: Math.abs(other) > 0.05 ? other : 0,
    total,
    effectiveDate: priceField(p, 'effectiveDate', ''),
    expiryDate: priceField(p, 'expiryDate', ''),
  };
}
