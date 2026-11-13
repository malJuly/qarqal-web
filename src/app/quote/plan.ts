import type { Offer, PlanChoice, RawProvider, RawVariant, ValueType } from './quote.types';

// Plan options for one offer besides add-ons: vehicle variant, market/agreed value, sum insured and road tax.
// Rules follow the admin purchase wizard (qarqalAngular insurance-purchase-wizard), which follows the app.
// Pure functions over the insurer's own data.

export interface Range { min: number; max: number }

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown): number => {
  const n = parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
};
const rawRange = (p: RawProvider, key: 'marketValueRange' | 'agreedValueRange'): Range | null => {
  const r = p[key];
  return isObj(r) ? { min: num(r['min']), max: num(r['max']) } : null;
};

const isChubb = (o: Offer): boolean => o.provider.toLowerCase().includes('chubb');
/** Third party has no vehicle damage cover, so no sum insured or value type. */
export const isThirdParty = (o: Offer): boolean => o.cover === 'TP';

export const variantsOf = (o: Offer): RawVariant[] => o.raw.variants ?? [];

/** Value types this insurer offers. Chubb is agreed value only. */
export function valueTypes(o: Offer): ValueType[] {
  const market = rawRange(o.raw, 'marketValueRange');
  const agreed = rawRange(o.raw, 'agreedValueRange');
  const out: ValueType[] = [];
  if (!isChubb(o) && market && (market.max > 0 || num(o.raw['marketValue']) > 0)) out.push('market');
  if (isChubb(o) || (agreed && agreed.max > 0)) out.push('agreed');
  return out;
}

/** The insurer's sum insured range for a value type, as sent (may be collapsed after an update-quote). */
function rangeFor(o: Offer, type: ValueType): Range | null {
  if (type === 'agreed') return rawRange(o.raw, 'agreedValueRange') ?? (isChubb(o) ? rawRange(o.raw, 'marketValueRange') : null);
  const market = rawRange(o.raw, 'marketValueRange');
  if (market) return market;
  const value = num(o.raw['marketValue']);
  return value > 0 ? { min: value, max: value } : null;
}

/**
 * Sum insured range to offer. update-quote can return a collapsed range (min = max, or 0–0); unless the
 * variant was changed, the real one is recovered from the offer as first quoted (`base`).
 */
export function sumInsuredRange(o: Offer, base: Offer, type: ValueType, variantChanged: boolean): Range | null {
  let range = rangeFor(o, type);
  if ((!range || range.min === range.max) && !variantChanged) {
    const original = rangeFor(base, type);
    if (original && original.max > original.min) range = original;
  }
  return range && range.max > 0 ? range : null;
}

/** Slider step: the insurer's moveSliderValue, default 100. */
export const sumInsuredStep = (o: Offer, base: Offer): number => num(o.raw['moveSliderValue']) || num(base.raw['moveSliderValue']) || 100;

/** These insurers don't enforce the range on third-party covers (same exemption as the app). */
const rangeExempt = (o: Offer): boolean =>
  ['takaful_malaysia', 'takaful_ikhlas', 'zurich'].includes(o.provider.toLowerCase()) && (o.cover === 'TP' || o.cover === 'TPFT');

export const sumInsuredInRange = (o: Offer, value: number, range: Range | null): boolean =>
  isThirdParty(o) || rangeExempt(o) || !range || (value >= range.min && value <= range.max);

/** Keeps the amount if it fits the range, else the range's minimum. */
export const snapToRange = (value: number, range: Range | null): number =>
  range && (value < range.min || value > range.max) ? Math.round(range.min) : value;

/**
 * Starting choices when an insurer is picked: the quote's own variant if this insurer lists it (else its first),
 * market value when offered, and the sum insured the list price was quoted with (so the first re-price matches).
 */
export function initialChoice(p: RawProvider, offer: Pick<Offer, 'provider' | 'cover' | 'sumInsured'>, quoteNvic: string | null): PlanChoice {
  const variants = p.variants ?? [];
  const variant = (quoteNvic && variants.find((v) => v.nvic === quoteNvic)) || variants[0];
  const probe = { ...offer, raw: p } as Offer;
  const types = valueTypes(probe);
  const valueType: ValueType = types.includes('market') || !types.length ? 'market' : 'agreed';
  const quoted = num(offer.sumInsured);
  const sum = quoted > 0 ? quoted : num(variant?.marketValue);
  return {
    nvic: String(variant?.nvic ?? ''),
    vehmakeminor: String(variant?.vehmakeminor ?? ''),
    valueType,
    sumInsured: isThirdParty(probe) ? 0 : snapToRange(sum, sumInsuredRange(probe, probe, valueType, false)),
    inclusiveRoadTax: false,
  };
}
