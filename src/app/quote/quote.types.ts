// Shapes for POST /insurance/generate-quote, mapped from the app's InsuranceModel (lib/models/insurance_model.dart).
// Only the fields the web flow reads are typed; everything else stays on `raw` for later steps (add-ons, update-quote).

/** What the hero form collects. */
export interface QuoteInput {
  /** 1 = NRIC, 2 = Passport, 3 = Company / Police / Army (same ids as the app). */
  idType: number;
  /** Without dashes. */
  idNumber: string;
  /** Upper case, no spaces. */
  plateNo: string;
  postcode: string;
}

/** vehicle_convert_type → vehicleCoverTypeID, the three covers the app asks for in parallel. */
export const COVER_TYPES = [
  { convertType: 1, id: 'COMP' },
  { convertType: 2, id: 'TPFT' },
  { convertType: 3, id: 'TP' },
] as const;
export type CoverTypeId = (typeof COVER_TYPES)[number]['id'];

/** Request body, one per cover type. */
export interface GenerateQuoteRequest {
  vehicle_no: string;
  full_name: string;
  id_type: number;
  id_number: string;
  dob: string;
  postcode: number;
  email: string;
  marital_status: number;
  vehicle_convert_type: number;
  vehicleCoverTypeID: CoverTypeId;
  [key: string]: unknown;
}

/** A provider entry as the API sends it. Prices sit in vehicleSummary/premiumSummary or at the top level. */
export interface RawProvider {
  provider?: string;
  imageUrl?: string;
  vehicleSummary?: Record<string, unknown>;
  premiumSummary?: Record<string, unknown>;
  variants?: RawVariant[];
  /** Add-ons this insurer offers; parsed by quote/addons.ts. */
  availableAddon?: Record<string, unknown>;
  /** Add-ons already in the price (code + premium). */
  addOn?: { code?: string; premium?: string | number; sumInsured?: string | number }[];
  [key: string]: unknown;
}

export interface RawVariant { nvic?: string; vehmakeminor?: string; vehVariantDesc?: string; marketValue?: number | string; [key: string]: unknown }

export interface RawOtherProvider {
  provider?: string;
  [key: string]: unknown;
}

export interface GenerateQuoteData {
  quotationId?: string;
  vehRegNo?: string;
  make?: string;
  model?: string;
  manufacturingYear?: string | number;
  marketValue?: string | number;
  ncdPercentage?: string | number;
  postcode?: string | number;
  city?: string;
  state?: string;
  variant?: { nvic?: string; [key: string]: unknown } | null;
  roadtax?: { isSupported?: boolean; finalAmount?: string | number; [key: string]: unknown } | null;
  basicPremium?: string | number;
  grossContribution?: string | number;
  totalContribution?: string | number;
  providers?: RawProvider[];
  insuranceNotProviders?: RawOtherProvider[];
  [key: string]: unknown;
}

export interface GenerateQuoteResponse {
  status: boolean;
  message?: string;
  data: GenerateQuoteData;
}

/** One insurer offer for one cover type, ready to show. */
export interface Offer {
  provider: string;
  cover: CoverTypeId;
  imageUrl: string;
  /** Headline price before tax and add-ons, as the app shows before a quote update. */
  basicPremium: string;
  totalContribution: string;
  /** Contribution before tax and stamp duty: the price shown on the insurer tiles. */
  grossContribution: string;
  sumInsured: string;
  /** Quotation this offer belongs to (each cover-type call returns its own). */
  quotationId: string | null;
  /** Variant, value type, sum insured and road tax for update-quote; starts as the app picks them. */
  choice: PlanChoice;
  /**
   * City and state the backend resolved from the postcode. They arrive with update-quote (not with the
   * first quote), which is where the app takes them from to pre-fill the address. Empty when unknown.
   */
  location: { city: string; state: string; postcode: string };
  /** Road tax renewal offered with this quote (from the quote's roadtax block). */
  roadTax: { supported: boolean; amount: number };
  postcode: string;
  raw: RawProvider;
}

export type ValueType = 'market' | 'agreed';

/** What the visitor can set on a plan besides add-ons. */
export interface PlanChoice {
  nvic: string;
  vehmakeminor: string;
  valueType: ValueType;
  /** 0 for third party. */
  sumInsured: number;
  inclusiveRoadTax: boolean;
}

/** POST /insurance/update-quote, mapped from the app's UpdateQuoteModel.toJson(). */
export interface UpdateQuoteRequest {
  id: string;
  vehicleCoverTypeID: CoverTypeId;
  inclusiveRoadTax: boolean;
  nvic: string;
  vehmakeminor: string;
  postcode: string;
  marketValue: boolean;
  agreedValue: boolean;
  sumInsured: number;
  provider: string;
  platformDiscountPerc: number;
  platformDiscount: number;
  discountPerc: number;
  addOn: Record<string, unknown>;
  [key: string]: unknown;
}

/** Insurer that couldn't quote online for that cover type. */
export interface OtherOffer {
  provider: string;
  cover: CoverTypeId;
  raw: RawOtherProvider;
}

export interface Vehicle {
  plateNo: string;
  make: string;
  model: string;
  year: string;
  marketValue: string;
  ncdPercentage: string;
  /** e.g. "Motorcycle"; drives the app's add-on allow-list. */
  vehicleType?: string;
}

export type QuoteOutcome =
  | { kind: 'ok'; quotationId: string | null; vehicle: Vehicle; offers: Offer[]; others: OtherOffer[] }
  | { kind: 'notFound' }
  | { kind: 'error'; message: string };
