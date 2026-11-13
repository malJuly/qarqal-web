// Malaysian NRIC (MyKad) helpers. Pure functions.

/** "900101-14-5678" → "900101145678". */
export const cleanNric = (v: string): string => v.replace(/\D/g, '');

export const isValidNric = (v: string): boolean => /^\d{12}$/.test(cleanNric(v));

/**
 * Date of birth from the first 6 digits (YYMMDD) → "yyyy-mm-dd", or null if they aren't a real date.
 * Two-digit years later than this year are taken as 1900s ("900101" → 1990, "050101" → 2005).
 */
export function dobFromNric(v: string): string | null {
  const d = cleanNric(v);
  if (d.length < 6) return null;
  const yy = Number(d.slice(0, 2));
  const mm = Number(d.slice(2, 4));
  const dd = Number(d.slice(4, 6));
  const thisYear = new Date().getFullYear() % 100;
  const year = (yy > thisYear ? 1900 : 2000) + yy;
  const date = new Date(Date.UTC(year, mm - 1, dd));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== mm - 1 || date.getUTCDate() !== dd) return null;
  return `${year}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

/**
 * Gender from the last digit of a 12-digit NRIC: odd = male, even = female. null if it isn't a full NRIC.
 */
export function genderFromNric(v: string): 'male' | 'female' | null {
  const d = cleanNric(v);
  if (d.length !== 12) return null;
  return Number(d[11]) % 2 === 1 ? 'male' : 'female';
}

/** "yyyy-mm-dd" → "dd/mm/yyyy" (the format the app sends for named drivers). */
export const toDmy = (iso: string): string => {
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
};
