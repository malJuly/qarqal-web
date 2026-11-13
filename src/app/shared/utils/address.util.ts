// Malaysian address helpers. Pure functions.

// Insurers and lookups name the same state differently ("PULAU PINANG" / "Penang",
// "WILAYAH PERSEKUTUAN KUALA LUMPUR" / "Kuala Lumpur"). Both sides are reduced to one key to compare.
const ALIASES: Record<string, string> = {
  'pulau pinang': 'penang',
  malacca: 'melaka',
  'n sembilan': 'negeri sembilan',
  'n9': 'negeri sembilan',
  kl: 'kuala lumpur',
};
const stateKey = (name: string): string => {
  const k = name
    .toLowerCase()
    .replace(/wilayah persekutuan|w\.?\s?p\.?(?=\s|$)|federal territory( of)?/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return ALIASES[k] ?? k;
};

/**
 * Finds a state from `options` that means the same as `name` ("PULAU PINANG" → "Penang").
 * Returns the option exactly as listed, or null when none matches.
 */
export function matchState(name: string, options: string[]): string | null {
  const key = stateKey(name);
  return key ? options.find((o) => stateKey(o) === key) ?? null : null;
}
