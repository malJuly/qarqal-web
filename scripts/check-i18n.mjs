// Lists keys that exist in en.json but are missing from another language file.
import { readFileSync } from 'node:fs';

const load = (l) => JSON.parse(readFileSync(new URL(`../src/app/i18n/${l}.json`, import.meta.url)));
const flat = (o, p = '') =>
  Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v) ? flat(v, `${p}${k}.`) : [`${p}${k}`]
  );

const base = new Set(flat(load('en')));
let missing = 0;
for (const lang of ['ms', 'zh', 'ta']) {
  const keys = new Set(flat(load(lang)));
  const gaps = [...base].filter((k) => !keys.has(k));
  if (gaps.length) {
    missing += gaps.length;
    console.log(`${lang}: missing ${gaps.length} key(s)\n  ${gaps.join('\n  ')}`);
  } else console.log(`${lang}: complete`);
}
process.exit(missing ? 1 : 0);
