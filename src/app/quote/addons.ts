import { cleanNric, toDmy } from '../shared/utils/nric.util';
import type { Offer } from './quote.types';

// Add-ons for one offer, mapped from the app (insurance_transaction.dart add-on list + UpdateQuoteModel.addOn).
// Pure functions: parse what the insurer offers, and turn the visitor's choices into the update-quote payload.
//
// Every availableAddon entry has the same shape: { title{en,bm}, description{en,bm}, premium, range{min,max}, plans[], status }.
// Three kinds:
//   plan    — pa_plus, twcd, cart, bantuan_ikhlas_supreme: send the chosen plan's id
//   amount  — windshield: send a sum insured within range
//   toggle  — everything else: send true/false
// Also mapped from the app: the per-insurer / motorcycle allow-lists (filterAddons) and named drivers (driverRules).

export type AddonKind = 'toggle' | 'plan' | 'amount';

export interface Bilingual { en: string; bm: string }

export interface AddonPlan { id: string; title: Bilingual; premium: string }

export interface Addon {
  key: AddonKey;
  kind: AddonKind;
  title: Bilingual;
  description: Bilingual;
  /** Price shown before selecting, when the insurer gives one. */
  premium: string;
  plans: AddonPlan[];
  range: { min: number; max: number } | null;
  /** In the quoted price at no charge. */
  included: boolean;
  /** In the quoted price (free or paid), e.g. chosen on an earlier visit to this step. */
  selected: boolean;
}

/** Keys as the update-quote payload names them. */
export type AddonKey =
  | 'windshield' | 'iosp' | 'llop' | 'pche' | 'srcc' | 'lltp' | 'sprc' | 'all_riders' | 'all_drivers' | 'lspa' | 'pabp'
  | 'pa_plus' | 'twcd' | 'cart' | 'bantuan_ikhlas_supreme';

/** Value per add-on: toggles → boolean, plans → plan id ('' = none), windshield → amount (0 = none). */
export type AddonSelection = Partial<Record<AddonKey, boolean | string | number>>;

// The API spells some keys several ways; the app normalises them like this.
const ALIASES: Record<string, AddonKey> = {
  windshield: 'windshield', windscreen: 'windshield',
  iosp: 'iosp', llop: 'llop', pche: 'pche', srcc: 'srcc', lltp: 'lltp', sprc: 'sprc',
  all_riders: 'all_riders', all_rider: 'all_riders', all_drivers: 'all_drivers', all_driver: 'all_drivers',
  lspa: 'lspa', lsap: 'lspa', pabp: 'pabp', papb: 'pabp',
  pa_plus: 'pa_plus', paplus: 'pa_plus', paPlus: 'pa_plus', motor_pa_plus: 'pa_plus',
  twcd: 'twcd', twcd_plans: 'twcd', cart: 'cart', cart_plans: 'cart',
  bantuanIkhlasSupreme: 'bantuan_ikhlas_supreme', bantuan_ikhlas_supreme: 'bantuan_ikhlas_supreme',
};

/** "all_driver" → "all_drivers"; unknown codes come back unchanged. */
export const normaliseAddonKey = (code: string): string => ALIASES[code] ?? code;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): string => (v === null || v === undefined ? '' : String(v));
const bilingual = (v: unknown, fallback: string): Bilingual =>
  isObj(v) ? { en: text(v['en']) || fallback, bm: text(v['bm']) || text(v['en']) || fallback } : { en: fallback, bm: fallback };
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** The add-ons this offer's insurer sells, in a stable order. */
export function parseAddons(offer: Offer): Addon[] {
  const available = offer.raw.availableAddon;
  if (!isObj(available)) return [];
  const inPrice = new Map((offer.raw.addOn ?? []).map((a) => [ALIASES[text(a.code)] ?? text(a.code), num(a.premium)]));

  const out = new Map<AddonKey, Addon>();
  for (const [rawKey, value] of Object.entries(available)) {
    const key = ALIASES[rawKey];
    if (!key || !isObj(value) || value['status'] === false || out.has(key)) continue;

    const plans: AddonPlan[] = Array.isArray(value['plans'])
      ? value['plans'].filter(isObj).map((p) => ({ id: text(p['id']), title: bilingual(p['title'], text(p['id'])), premium: text(p['premium']) }))
        .filter((p) => p.id)
      : [];
    const range = isObj(value['range']) ? { min: num(value['range']['min']), max: num(value['range']['max']) } : null;

    out.set(key, {
      key,
      kind: plans.length ? 'plan' : key === 'windshield' ? 'amount' : 'toggle',
      title: bilingual(value['title'], key),
      description: bilingual(value['description'], ''),
      premium: text(value['premium']),
      plans,
      range: range && range.max > 0 ? range : null,
      included: inPrice.has(key) && inPrice.get(key) === 0,
      selected: inPrice.has(key),
    });
  }
  return [...out.values()].sort((a, b) => a.title.en.localeCompare(b.title.en));
}

/** Starting choices: switches already in the price are on, everything else off (a plan's id isn't in the price list). */
export function initialSelection(addons: Addon[]): AddonSelection {
  const sel: AddonSelection = {};
  for (const a of addons) sel[a.key] = a.kind === 'toggle' ? a.selected : a.kind === 'plan' ? '' : 0;
  return sel;
}

// ── Which add-ons a vehicle may buy ───────────────────────────────────────────
// The app hides some add-ons per insurer and, for motorcycles, only allows a short list per cover type.
// Third party, fire & theft motorcycles aren't filtered in the app, so they aren't here either.
const MOTORCYCLE_ALLOWED: Partial<Record<Offer['cover'], AddonKey[]>> = {
  COMP: ['lltp', 'pa_plus', 'srcc', 'iosp', 'twcd'],
  TP: ['lltp', 'pa_plus', 'srcc', 'twcd'],
};
const MOTORCYCLE_EXTRA: Record<string, Partial<Record<Offer['cover'], AddonKey[]>>> = {
  zurich: { COMP: ['lspa', 'all_riders', 'pabp'], TP: ['all_riders'] },
  takaful_ikhlas: { COMP: ['all_riders'], TP: ['all_riders'] },
};

export function filterAddons(addons: Addon[], offer: Offer, vehicleType: string): Addon[] {
  const insurer = offer.provider.toLowerCase();
  let list = insurer === 'takaful_ikhlas' ? addons.filter((a) => a.key !== 'all_drivers') : addons;
  const allowed = MOTORCYCLE_ALLOWED[offer.cover];
  if (vehicleType.toLowerCase() === 'motorcycle' && allowed) {
    const ok = new Set([...allowed, ...(MOTORCYCLE_EXTRA[insurer]?.[offer.cover] ?? [])]);
    list = list.filter((a) => ok.has(a.key));
  }
  return list;
}

// ── Named drivers ─────────────────────────────────────────────────────────────
export interface NamedDriver {
  fullName: string;
  idType: 'nric' | 'passport';
  idNumber: string;
  /** yyyy-mm-dd */
  dob: string;
}

export interface DriverRules {
  /** False when this insurer doesn't take named drivers online. */
  allowed: boolean;
  max: number;
  /** Price of each driver after the first (the first is free). */
  extraPremium: number;
}

/** As the app: named drivers sit with the CART add-on, not for Zurich or Takaful Ikhlas; Allianz car takes 2. */
export function driverRules(offer: Offer, addons: Addon[]): DriverRules {
  const insurer = offer.provider.toLowerCase();
  const raw = offer.raw.availableAddon?.['additionalDrivers'];
  const premium = isObj(raw) ? num(raw['premium']) : 0;
  return {
    allowed: addons.some((a) => a.key === 'cart') && insurer !== 'zurich' && insurer !== 'takaful_ikhlas',
    max: insurer === 'allianz_car' ? 2 : 1,
    extraPremium: premium > 0 ? premium : 10,
  };
}

/** The app's additionalDrivers entries: id type in lower case, number under nric or passport, dob dd/mm/yyyy. */
const toDriverPayload = (d: NamedDriver): Record<string, unknown> => ({
  fullName: d.fullName.trim(),
  idType: d.idType,
  dob: toDmy(d.dob),
  nric: d.idType === 'nric' ? cleanNric(d.idNumber) : null,
  passport: d.idType === 'passport' ? d.idNumber.trim().toUpperCase() : null,
});

/**
 * Starting choices for an insurer: initialSelection plus the add-ons the app switches on by default
 * (insurance_transaction.dart; same rule in the admin wizard's applyDefaultAddons).
 */
export function defaultSelection(offer: Offer, addons: Addon[], vehicleType: string): AddonSelection {
  const sel = initialSelection(addons);
  const insurer = offer.provider.toLowerCase();
  const available = isObj(offer.raw.availableAddon) ? offer.raw.availableAddon : {};
  const entry = (...keys: string[]): unknown => keys.map((k) => available[k]).find((v) => v !== undefined && v !== null);
  const isFree = (addon: unknown): boolean => {
    const premium = isObj(addon) ? addon['premium'] : undefined;
    return premium === undefined || premium === null || ['0', '0.00', 'free'].includes(String(premium).toLowerCase());
  };
  const drivers = entry('all_drivers', 'all_driver', 'additionalDrivers');
  const riders = entry('all_riders', 'all_rider');
  const takafulOrZurich = ['zurich', 'takaful_ikhlas'].includes(insurer);

  if (insurer === 'takaful_malaysia' || (takafulOrZurich && isFree(drivers))) sel.all_drivers = true;
  if (vehicleType.toLowerCase() === 'motorcycle' && (takafulOrZurich || insurer === 'takaful_malaysia' || (riders !== undefined && isFree(riders)))) {
    sel.all_riders = true;
  }
  return sel;
}

/** The update-quote "addOn" object, with every key the app sends. */
export function toAddOnPayload(sel: AddonSelection, drivers: NamedDriver[] = []): Record<string, unknown> {
  const bool = (k: AddonKey) => sel[k] === true;
  const plan = (k: AddonKey) => (typeof sel[k] === 'string' && sel[k] ? sel[k] : null);
  const windshield = num(sel.windshield);
  return {
    windshield: windshield > 0 ? windshield : null,
    iosp: bool('iosp'), llop: bool('llop'), pche: bool('pche'), srcc: bool('srcc'), lltp: bool('lltp'), sprc: bool('sprc'),
    all_riders: bool('all_riders'), all_drivers: bool('all_drivers'), lspa: bool('lspa'), pabp: bool('pabp'),
    twcd: plan('twcd'), paPlus: plan('pa_plus'), cart: plan('cart'), bantuanIkhlasSupreme: plan('bantuan_ikhlas_supreme'),
    additionalDrivers: drivers.length ? drivers.map(toDriverPayload) : null,
  };
}
