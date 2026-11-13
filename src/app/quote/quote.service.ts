import { Injectable, inject } from '@angular/core';
import { ApiError, QarqalApi } from '../core/qarqal-api';
import { toStr as str } from '../shared/utils/format.util';
import { toAddOnPayload, type AddonSelection, type NamedDriver } from './addons';
import { priceField as field } from './offer.util';
import { initialChoice } from './plan';
import {
  COVER_TYPES, type CoverTypeId, type GenerateQuoteData, type GenerateQuoteRequest, type GenerateQuoteResponse,
  type Offer, type OtherOffer, type PlanChoice, type QuoteInput, type QuoteOutcome, type RawProvider, type UpdateQuoteRequest, type Vehicle,
} from './quote.types';

// Quote mapping taken from the app (VehicleController.requestQuote / updateQuote):
// - one generate-quote call per cover type (COMP, TPFT, TP), in parallel; one failing doesn't block the others
// - offers from every successful call are merged and tagged with their cover type
// - an "other provider" is dropped when the same insurer already quoted online for the same cover type
// - every call failing with 404 / NOT_FOUND / "unable to identify any insurance provider" → not found
// - update-quote re-prices one offer with add-ons; its response has the same shape as generate-quote
//
// The app also sends placeholder holder details (name, date of birth, email, marital status). Kept the same
// here until the backend stops requiring them at this step; real details are collected before payment.
const PLACEHOLDER = { full_name: 'demo user', dob: '1982-01-01', email: 'demo@qarqal.com', marital_status: 1 };

/** A top-level price that update-quote may send; ignored when missing or zero, as in the app. */
const nonZero = (v: unknown): string | null => {
  const s = str(v);
  return s && Number(s) !== 0 ? s : null;
};

const isNotFound = (err: unknown): boolean => {
  if (!(err instanceof ApiError)) return false;
  const msg = err.message.toLowerCase();
  return err.httpStatus === 404 || err.code === 'NOT_FOUND' || msg.includes('not_found')
    || msg.includes('unable to identify any insurance provider');
};

/** One API provider entry → Offer, with the starting plan choices (quote/plan.ts initialChoice). */
function toOffer(p: RawProvider, cover: CoverTypeId, data: GenerateQuoteData, fallbackPostcode: string): Offer {
  const provider = str(p.provider);
  const sumInsured = field(p, 'sumInsured');
  const quoteNvic = data.variant?.nvic && data.variant.nvic !== '-' ? data.variant.nvic : null;
  return {
    provider,
    cover,
    // Logo: the API's insuranceProviderLogos.logo (as the admin wizard reads it), else imageUrl.
    imageUrl: str((p['insuranceProviderLogos'] as { logo?: unknown } | undefined)?.logo) || str(p.imageUrl),
    basicPremium: field(p, 'basicPremium'),
    totalContribution: field(p, 'totalContribution'),
    grossContribution: field(p, 'grossContribution'),
    sumInsured,
    quotationId: data.quotationId ?? null,
    choice: initialChoice(p, { provider, cover, sumInsured }, quoteNvic),
    roadTax: { supported: data.roadtax?.isSupported === true, amount: Number(data.roadtax?.finalAmount) || 0 },
    postcode: str(data.postcode, fallbackPostcode),
    location: { city: str(data.city), state: str(data.state), postcode: str(data.postcode, fallbackPostcode) },
    raw: p,
  };
}

@Injectable({ providedIn: 'root' })
export class QuoteService {
  private readonly api = inject(QarqalApi);

  async generate(input: QuoteInput): Promise<QuoteOutcome> {
    const base = {
      ...PLACEHOLDER,
      vehicle_no: input.plateNo,
      id_type: input.idType,
      id_number: input.idNumber,
      postcode: Number(input.postcode),
    };

    const settled = await Promise.allSettled(
      COVER_TYPES.map((ct) => {
        const body: GenerateQuoteRequest = { ...base, vehicle_convert_type: ct.convertType, vehicleCoverTypeID: ct.id };
        return this.api.post<GenerateQuoteResponse>('insurance/generate-quote', body)
          .then((res) => ({ cover: ct.id, data: res.data }));
      }),
    );

    const ok: { cover: CoverTypeId; data: GenerateQuoteData }[] = [];
    const errors: unknown[] = [];
    for (const s of settled) {
      if (s.status === 'fulfilled' && s.value.data) ok.push(s.value);
      else if (s.status === 'rejected') errors.push(s.reason);
    }

    if (!ok.length) {
      if (errors.some(isNotFound)) return { kind: 'notFound' };
      const first = errors[0];
      return { kind: 'error', message: first instanceof Error ? first.message : 'Unable to generate quote' };
    }

    const offers: Offer[] = ok.flatMap(({ cover, data }) => (data.providers ?? []).map((p) => toOffer(p, cover, data, input.postcode)));

    const quoted = new Set(offers.map((o) => `${o.provider.toLowerCase()}_${o.cover}`));
    const others: OtherOffer[] = ok
      .flatMap(({ cover, data }) => (data.insuranceNotProviders ?? []).map((op) => ({ provider: str(op.provider), cover, raw: op })))
      .filter((o) => !quoted.has(`${o.provider.toLowerCase()}_${o.cover}`));

    const d = ok[0].data;
    const vehicle: Vehicle = {
      plateNo: str(d.vehRegNo, input.plateNo),
      make: str(d.make),
      model: str(d.model),
      year: str(d.manufacturingYear),
      marketValue: str(d.marketValue),
      ncdPercentage: str(d.ncdPercentage),
      vehicleType: str(d['vehicleType']),
    };

    // Cheapest first within the page; the view groups them by cover type.
    offers.sort((a, b) => Number(a.basicPremium) - Number(b.basicPremium));
    // The page URL uses the first successful call's quotation id (?quotation_id=).
    const quotationId = ok.map((r) => r.data.quotationId).find((id): id is string => !!id) ?? null;
    return { kind: 'ok', quotationId, vehicle, offers, others };
  }

  /**
   * Re-prices one offer with the chosen plan options, add-ons and named drivers. Returns the updated offer
   * (same insurer and cover) carrying those choices. This call is also what records the chosen insurer.
   */
  async update(offer: Offer, choice: PlanChoice, selection: AddonSelection, drivers: NamedDriver[] = []): Promise<Offer> {
    if (!offer.quotationId) throw new Error('Offer has no quotation id');
    const body: UpdateQuoteRequest = {
      id: offer.quotationId,
      vehicleCoverTypeID: offer.cover,
      inclusiveRoadTax: choice.inclusiveRoadTax,
      nvic: choice.nvic,
      vehmakeminor: choice.vehmakeminor,
      postcode: offer.postcode,
      marketValue: choice.valueType === 'market',
      agreedValue: choice.valueType === 'agreed',
      // Third party has no vehicle damage cover: the app sends 0.
      sumInsured: offer.cover === 'TP' ? 0 : choice.sumInsured,
      provider: offer.provider,
      platformDiscountPerc: 0,
      platformDiscount: 0,
      discountPerc: 0,
      addOn: toAddOnPayload(selection, drivers),
    };
    const res = await this.api.post<GenerateQuoteResponse>('insurance/update-quote', body);
    const data = res.data;
    const p = data?.providers?.[0];
    if (!p) throw new Error('No price returned');

    const next = toOffer(p, offer.cover, { ...data, quotationId: data.quotationId ?? offer.quotationId }, offer.postcode);
    // The app prefers the response's top-level prices when present (latest computation).
    next.basicPremium = nonZero(data.basicPremium) ?? next.basicPremium;
    next.totalContribution = nonZero(data.totalContribution) ?? next.totalContribution;
    next.grossContribution = nonZero(data.grossContribution) ?? next.grossContribution;
    // Keep the logo from the list, the choices just sent, and the road tax offer (update-quote may omit it).
    return {
      ...next,
      imageUrl: next.imageUrl || offer.imageUrl,
      choice,
      roadTax: data.roadtax ? next.roadTax : offer.roadTax,
      // City/state come with this response; keep the earlier ones if this one has none.
      location: next.location.city || next.location.state ? next.location : offer.location ?? next.location,
    };
  }
}
