// Small formatting helpers shared across features. Pure functions, no Angular.

/** null/undefined → fallback, anything else → String(v). For loosely typed API fields. */
export const toStr = (v: unknown, fallback = ''): string => (v === null || v === undefined ? fallback : String(v));

/** "1234.5" → "1,234.50". A missing value (null/undefined/'') shows as a dash, never as the word "undefined". */
export const formatMoney = (v: string | number | null | undefined): string => {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(v);
};

/** Replaces {key} placeholders in an i18n string: fill('Resend in {s}s', { s: 30 }). */
export const fill = (text: string, values: Record<string, string | number>): string =>
  text.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
