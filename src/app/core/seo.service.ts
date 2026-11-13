import { DOCUMENT, Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import site from '../config/site.json';
import { environment } from '../../environments/environment';
import type { Dict } from '../i18n';

interface SeoInput {
  t: Dict;
  /** A page under each language's root, e.g. 'privacy-policy/'. Empty for the landing page. */
  subpath?: string;
  title?: string;
  description?: string;
  /** Extra JSON-LD blocks (the FAQ adds its own). */
  jsonLd?: object[];
}

/** Writes the <head>: title, description, canonical, hreflang links, Open Graph, JSON-LD and the per-language font. */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly doc = inject(DOCUMENT);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  apply({ t, subpath = '', title = t.meta.title, description = t.meta.description, jsonLd = [] }: SeoInput): void {
    const origin = environment.site;
    const current = site.languages.find((l) => l.code === t.meta.lang) ?? site.languages[0];
    const canonical = new URL(current.path + subpath, origin).href;

    this.doc.documentElement.lang = t.meta.htmlLang;
    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: 'QarQal' });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: canonical });
    this.meta.updateTag({ property: 'og:image', content: new URL('/og.png', origin).href });
    this.meta.updateTag({ property: 'og:locale', content: t.meta.ogLocale });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });

    // Links and scripts this service added before (a client-side page change) are replaced, not duplicated.
    this.doc.head.querySelectorAll('[data-seo]').forEach((el) => el.remove());
    this.link({ rel: 'canonical', href: canonical });
    for (const l of site.languages) {
      this.link({ rel: 'alternate', hreflang: l.code === 'zh' ? 'zh-Hans' : l.code, href: new URL(l.path + subpath, origin).href });
    }
    this.link({ rel: 'alternate', hreflang: 'x-default', href: new URL('/' + subpath, origin).href });

    // Chinese and Tamil glyphs load only on their own pages (bundles from angular.json "styles").
    if (t.meta.lang === 'zh' || t.meta.lang === 'ta') this.link({ rel: 'stylesheet', href: `/font-${t.meta.lang}.css` });

    const blocks = subpath ? jsonLd : [this.appSchema(t), ...jsonLd];
    for (const block of blocks) {
      const script = this.doc.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-seo', '');
      script.textContent = JSON.stringify(block);
      this.doc.head.appendChild(script);
    }
  }

  private link(attrs: Record<string, string>): void {
    const el = this.doc.createElement('link');
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    el.setAttribute('data-seo', '');
    this.doc.head.appendChild(el);
  }

  private appSchema(t: Dict): object {
    return {
      '@context': 'https://schema.org',
      '@type': 'MobileApplication',
      name: 'QarQal',
      operatingSystem: 'iOS, Android, HarmonyOS',
      applicationCategory: 'FinanceApplication',
      description: t.meta.description,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'MYR' },
      publisher: { '@type': 'Organization', name: site.company.name },
      downloadUrl: [site.stores.appStore, site.stores.googlePlay, site.stores.appGallery],
    };
  }
}
