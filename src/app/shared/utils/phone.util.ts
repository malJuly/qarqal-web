// Malaysian mobile number helpers. Numbers are kept without the country code and without the leading 0,
// the way the app and the backend store them (mobile_no "123456789" + country_code "+60").

export const MY_COUNTRY_CODE = '+60';

/** "012-345 6789" → "123456789": digits only, leading zeros removed. */
export const normaliseMobile = (v: string): string => v.replace(/\D/g, '').replace(/^0+/, '');

/** Malaysian mobile without the leading 0: 1X followed by 7 or 8 digits. */
export const isValidMobile = (digits: string): boolean => /^1\d{8,9}$/.test(digits);

/** "123456789" → "+60 12-345 6789" for display. */
export const formatMobile = (digits: string, countryCode = MY_COUNTRY_CODE): string => {
  const d = normaliseMobile(digits);
  return `${countryCode} ${d.slice(0, 2)}-${d.slice(2, 5)} ${d.slice(5)}`.trim();
};

/**
 * "142155380" → "+60 *****380": only the last three digits show, for places where the number is on
 * screen just as a reminder. Always five stars, so the length of the number isn't given away either.
 */
export const maskMobile = (digits: string, countryCode = MY_COUNTRY_CODE): string => {
  const d = normaliseMobile(digits);
  return d.length > 3 ? `${countryCode} *****${d.slice(-3)}` : `${countryCode} *****`;
};
