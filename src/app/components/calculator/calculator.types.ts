// Request and response shapes of the public /calculator/* and /car-catalog/* endpoints (same as the app's).

export interface Line { label: string; amount: string; type?: string; basis?: string }
export interface Usage { remaining: number; limit: number }
export interface WithUsage { usage?: { remaining: number | string; limit: number | string } }

export interface CodeLabel { code: string; label: string }
export interface AddonParam { key: string; type: string; required: boolean; min: string; max: string }
export interface Addon {
  code: string; label: string; description?: string; pricingText?: string; allowedCoverTypes: string[];
  params: AddonParam[];
}
export interface InsConfig {
  coverTypes: CodeLabel[]; regions: CodeLabel[];
  engineCc: { min: number; max: number }; ncdOptions: { value: string; label: string }[];
  sumInsured: { min: number; max: number; requiredFor: string[] };
  defaults: { coverType: string; region: string; ncdPercent: string }; disclaimer: string;
  addons?: Addon[];
}
export interface AddonRequest { code: string; params?: Record<string, string> }
export interface InsRequest {
  coverType: string; region: string; engineCc: number; sumInsured?: string; ncdPercent: string; addons: AddonRequest[];
}
export interface InsResult extends WithUsage {
  summary: { subtotalBeforeTax?: string; estimatedTotal: string };
  breakdown: Line[];
  disclaimer?: string;
}

export interface RoadTaxRequest {
  vehicleType: string; powertrain: string; region: string; engineCc?: number; motorKw?: number;
  vehicleClass?: string; ownership?: string;
}
export interface RoadTaxResult extends WithUsage { estimatedAnnualRoadTax: number | string }

export interface LoanConfig {
  vehicleTypes: { code: string; maxTenureMonths: number; maxMarginPercent: string }[];
  tenure: { minMonths: number; stepMonths: number };
  vehiclePrice: { min: number; max: number };
  defaults: { vehicleType: string; rateType: string; tenureMonths: number; rates: { vehicleType: string; condition: string; rateType: string; rate: string }[] };
  disclaimer: string;
}
export interface LoanRequest {
  vehicleType: string; vehiclePrice: string; downPayment: string; tenureMonths: number; rate: string; rateType: string;
}
export interface LoanResult extends WithUsage {
  summary: { loanAmount: string; totalInterest: string; totalPayable: string; monthlyInstalment: string };
  disclaimer?: string;
}

export interface CatalogItem { id: number; name: string; price?: number | null }
export interface MarketValueRequest { variantId: number; manufactureYear: number }
export interface MarketValueResult { estimated_value: number; range_low: number; range_high: number }

/** Error from the API (or the sample data), with the fields the page reacts to. */
export class ApiError extends Error {
  constructor(message: string, public field?: string, public status?: number, public code?: string) { super(message); }
}
