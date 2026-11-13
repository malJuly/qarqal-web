import en from './en.json';
import ms from './ms.json';
import zh from './zh.json';
import ta from './ta.json';

export type Dict = typeof en;
export type Lang = 'en' | 'ms' | 'zh' | 'ta';
export const LANGS: Lang[] = ['en', 'ms', 'zh', 'ta'];

const dicts: Record<Lang, unknown> = { en, ms, zh, ta };

/** Returns the dictionary for a language. Missing keys fall back to English. */
export function getDict(lang: Lang): Dict {
  return deepMerge(en, dicts[lang] ?? en) as Dict;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function deepMerge(base: unknown, over: unknown): unknown {
  if (Array.isArray(base)) return Array.isArray(over) && over.length ? over : base;
  if (isObject(base)) {
    const out: Record<string, unknown> = { ...base };
    if (isObject(over)) for (const k of Object.keys(over)) out[k] = deepMerge(base[k], over[k]);
    return out;
  }
  return over ?? base;
}
