// Shapes for the agent insurance purchase, ported from qarqalAngular (core/models/insurance-purchase.model.ts).
// Quote responses are the same ones the mobile app gets from /insurance/generate-quote and /update-quote
// (the backend's agent endpoints pass them through unchanged), so only the fields the portal reads are typed.

export interface LocalizedText { en: string; bm: string }
export interface ValueRange { min: string; max: string }

export interface PurchaseOption { id: number; name: string; name_ms: string }
export interface PurchaseOptions {
  id_types: PurchaseOption[];
  cover_types: PurchaseOption[];
  marital_status: PurchaseOption[];
}

export interface AddonPlan { id: string; title?: LocalizedText; description?: LocalizedText; sumInsured?: string; premium?: string }

/** One entry of a provider's availableAddon map: on/off, amount-in-range (windshield), or pick-a-plan. */
export interface AvailableAddon {
  title?: LocalizedText;
  description?: LocalizedText;
  premium?: string;
  sumInsured?: string;
  range?: ValueRange;
  plans?: AddonPlan[];
  status?: boolean;
}

export interface ProviderVariant { nvic: string; vehVariantDesc?: string; vehmakeminor?: string; marketValue?: number | string }

export interface QuoteProvider {
  provider: string;
  marketValueRange?: ValueRange | null;
  marketValue?: string;
  agreedValueRange?: ValueRange | null;
  sumInsured?: string;
  basicPremium?: string;
  /** Senang: premium before NCD. premium = gross + SST + stamp duty; total = premium + processing fee. */
  basicContribution?: string;
  premium?: string;
  grossContribution?: string;
  totalContribution?: string;
  ncdValue?: string;
  ncdPercentage?: string;
  sst?: number;
  sstPercentage?: string;
  stampDuty?: string;
  effectiveDate?: string;
  expiryDate?: string;
  addOn?: { code: string; benefit?: string; premium?: string; sumInsured?: string }[];
  availableAddon?: Record<string, AvailableAddon | null>;
  variants?: ProviderVariant[];
  /** Sum-insured slider step. */
  moveSliderValue?: number;
  insuranceProviderLogos?: {
    logo?: string;
    privacy?: string;
    pds?: { car?: { en?: string; bm?: string }; motorcycle?: { en?: string; bm?: string } };
  };
}

export interface RoadTaxInfo { inclusiveRoadTax?: boolean; isSupported?: boolean; finalAmount?: string }

export interface QuoteResult {
  quotationId: string;
  vehRegNo?: string;
  make?: string;
  model?: string;
  variant?: { nvic?: string; vehVariantDesc?: string } | string | null;
  manufacturingYear?: string | number;
  vehicleType?: string;
  ncdPercentage?: string;
  postcode?: number | string;
  state?: string;
  city?: string;
  roadtax?: RoadTaxInfo;
  providers: QuoteProvider[];
  insuranceNotProviders?: { provider: string }[];
}

export interface GenerateQuoteRequest {
  qarqal_id?: string;
  vehicle_no: string;
  full_name: string;
  id_type: number;
  id_number: string;
  dob: string;
  postcode: number;
  email: string;
  vehicle_convert_type: number;
  marital_status: number;
}

/** Same shape the app sends: nric or passport, no idType. */
export interface AdditionalDriver { fullName: string; nric: string | null; passport: string | null; dob: string; nationality: string }

export interface AddonSelection {
  windshield: number | null;
  iosp: boolean; llop: boolean; pche: boolean; srcc: boolean; lltp: boolean; sprc: boolean;
  all_riders: boolean; all_drivers: boolean;
  twcd: string | null; paPlus: string | null; cart: string | null; bantuanIkhlasSupreme: string | null;
  lspa: boolean; pabp: boolean;
  additionalDrivers: AdditionalDriver[] | null;
}

export interface UpdateQuoteRequest {
  id: string;
  vehicleCoverTypeID: string;
  inclusiveRoadTax: boolean;
  nvic: string;
  vehmakeminor: string;
  postcode: string;
  marketValue: boolean;
  agreedValue: boolean;
  sumInsured: number;
  provider: string;
  addOn: AddonSelection;
  [key: string]: unknown;
}

export interface PolicyHolderRequest {
  full_name: string;
  id_type: number;
  id_number: string;
  email: string;
  mobile_no: string;
  dob: string;
  gender: number;
  marital_status: number;
  nationality: string;
  address_line1: string;
  address_line2: string;
  address_line3: string;
  state: string;
  city: string;
  pincode: number;
  quotation_id: string;
  vehicle_reg_no: string;
  inclusiveRoadTax: boolean;
}
