// Development-only sample data: used by `ng serve` while environment.apiBaseUrl is empty,
// so the UI can be reviewed before the endpoint exists. Never used in a production build.
import {
  ApiError, type AddonRequest, type InsConfig, type InsRequest, type LoanConfig, type LoanRequest,
  type MarketValueRequest, type RoadTaxRequest,
} from './calculator.types';

const CALCULATE = ['calculator/car-insurance/calculate', 'calculator/road-tax/calculate', 'calculator/car-loan/calculate'];

export function createMockApi(serverError: string): (path: string, body?: unknown) => unknown {
  let used = 0;
  const r2 = (n: number) => n.toFixed(2);
  const withUsage = <T extends object>(data: T) => ({ ...data, usage: { remaining: 3 - used, limit: 3 } });

  return (path, body) => {
    // The three calculate endpoints use the daily quota, like the real backend.
    if (CALCULATE.includes(path)) {
      if (used >= 3) throw new ApiError('Daily limit reached', undefined, 429, 'DAILY_LIMIT');
      used++;
    }
    if (path === 'calculator/car-insurance/config') {
      const cfg: InsConfig = {
        coverTypes: [{ code: 'COMPREHENSIVE', label: 'Comprehensive' }, { code: 'TPFT', label: 'Third party, fire & theft' }, { code: 'THIRD_PARTY', label: 'Third party' }],
        regions: [{ code: 'PENINSULAR', label: 'Peninsular Malaysia' }, { code: 'EAST_MALAYSIA', label: 'Sabah, Sarawak & Labuan' }],
        engineCc: { min: 50, max: 10000 },
        ncdOptions: ['0', '25', '30', '38.33', '45', '55'].map((v) => ({ value: v, label: `${v}%` })),
        sumInsured: { min: 10000, max: 1000000, requiredFor: ['COMPREHENSIVE', 'TPFT'] },
        defaults: { coverType: 'COMPREHENSIVE', region: 'PENINSULAR', ncdPercent: '0' }, disclaimer: 'Sample numbers for development.',
        addons: [
          { code: 'SPECIAL_PERILS', label: 'Special perils (flood, landslide)', description: 'Covers flood, landslide and other natural perils.', pricingText: '0.2% of sum insured', allowedCoverTypes: ['COMPREHENSIVE'], params: [] },
          { code: 'WINDSCREEN', label: 'Windscreen cover', description: 'Covers windscreen and window glass.', pricingText: '15% of glassValue', allowedCoverTypes: ['COMPREHENSIVE'], params: [{ key: 'glassValue', type: 'MONEY', required: true, min: '500.00', max: '10000.00' }] },
          { code: 'LLP', label: 'Legal liability to passengers', description: 'Covers liability for injured passengers.', pricingText: 'Flat rate', allowedCoverTypes: ['COMPREHENSIVE', 'TPFT', 'THIRD_PARTY'], params: [] },
        ],
      };
      return cfg;
    }
    if (path === 'calculator/car-insurance/calculate') {
      const b = body as InsRequest;
      const basic = b.coverType === 'THIRD_PARTY' ? 120 : 340 + (Number(b.sumInsured) - 1000) / 1000 * 26;
      const ncd = basic * Number(b.ncdPercent) / 100;
      const addonLines = b.addons.map((a: AddonRequest) => ({
        label: a.code, type: 'ADDON', basis: 'Sample',
        amount: r2(a.code === 'WINDSCREEN' ? Number(a.params?.['glassValue'] ?? 0) * 0.15 : a.code === 'LLP' ? 7.5 : Number(b.sumInsured ?? 0) * 0.002),
      }));
      const net = basic - ncd + addonLines.reduce((t, l) => t + Number(l.amount), 0);
      const tax = net * 0.08;
      return withUsage({
        summary: { subtotalBeforeTax: r2(net), estimatedTotal: r2(net + tax + 10) }, disclaimer: 'Sample numbers for development.',
        breakdown: [
          { label: 'Basic premium', amount: r2(basic), type: 'CHARGE' }, { label: `No-claim discount (${b.ncdPercent}%)`, amount: r2(ncd), type: 'DISCOUNT' }, ...addonLines,
          { label: 'Service tax (8%)', amount: r2(tax), type: 'TAX' }, { label: 'Stamp duty', amount: '10.00', type: 'FEE' },
        ],
      });
    }
    if (path === 'calculator/road-tax/calculate') {
      const b = body as RoadTaxRequest;
      const cc = b.engineCc ?? (b.motorKw ?? 0) * 10;
      return withUsage({ estimatedAnnualRoadTax: cc <= 1000 ? 20 : cc <= 1600 ? 90 : 200 + (cc - 1600) * 0.4 });
    }
    if (path === 'calculator/car-loan/config') {
      const cfg: LoanConfig = {
        vehicleTypes: [{ code: 'CAR', maxTenureMonths: 108, maxMarginPercent: '90' }, { code: 'MOTORCYCLE', maxTenureMonths: 60, maxMarginPercent: '90' }],
        tenure: { minMonths: 12, stepMonths: 12 }, vehiclePrice: { min: 1000, max: 2000000 },
        defaults: { vehicleType: 'CAR', rateType: 'FLAT', tenureMonths: 108, rates: [{ vehicleType: 'CAR', condition: 'NEW', rateType: 'FLAT', rate: '2.80' }, { vehicleType: 'CAR', condition: 'NEW', rateType: 'EIR', rate: '5.20' }, { vehicleType: 'MOTORCYCLE', condition: 'NEW', rateType: 'FLAT', rate: '4.50' }] },
        disclaimer: 'Sample numbers for development.',
      };
      return cfg;
    }
    if (path === 'calculator/car-loan/calculate') {
      const b = body as LoanRequest;
      const loan = Number(b.vehiclePrice) - Number(b.downPayment);
      const interest = loan * Number(b.rate) / 100 * b.tenureMonths / 12;
      return withUsage({ summary: { loanAmount: r2(loan), totalInterest: r2(interest), totalPayable: r2(loan + interest), monthlyInstalment: r2((loan + interest) / b.tenureMonths) }, disclaimer: 'Sample numbers for development.' });
    }
    if (path === 'car-catalog/brands') return { brands: [{ id: 1, name: 'Perodua' }, { id: 2, name: 'Proton' }, { id: 3, name: 'Honda' }, { id: 4, name: 'Toyota' }] };
    const models: Record<string, string[]> = { 1: ['Myvi', 'Axia', 'Bezza', 'Ativa'], 2: ['Saga', 'X50', 'X70', 'S70'], 3: ['City', 'Civic', 'HR-V'], 4: ['Vios', 'Corolla Cross'] };
    const brandMatch = path.match(/^car-catalog\/brands\/(\d+)\/models$/);
    if (brandMatch) return { models: (models[brandMatch[1]] ?? []).map((name, i) => ({ id: Number(brandMatch[1]) * 10 + i, name })) };
    const modelMatch = path.match(/^car-catalog\/models\/(\d+)\/variants$/);
    if (modelMatch) return { variants: ['1.3 G (A)', '1.5 H (A)', '1.5 AV (A)'].map((name, i) => ({ id: Number(modelMatch[1]) * 10 + i, name, price: 48000 + i * 6500 })) };
    if (path === 'calculator/market-value/calculate') {
      const b = body as MarketValueRequest;
      const value = Math.round(60000 * 0.88 ** (new Date().getFullYear() - b.manufactureYear) / 100) * 100;
      return { estimated_value: value, range_low: Math.round(value * 0.9 / 100) * 100, range_high: Math.round(value * 1.1 / 100) * 100 };
    }
    throw new ApiError(serverError);
  };
}
