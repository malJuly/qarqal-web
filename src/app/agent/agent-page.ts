import { DOCUMENT, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { usePageLang } from '../core/page-lang';
import type { I18nService } from '../core/i18n.service';
import type { Dict } from '../i18n';

/**
 * Call in an agent page's constructor: sets the language from the route, the tab title, and
 * robots "noindex, nofollow" so search engines don't list the portal. No canonical, hreflang or
 * Open Graph tags (unlike SeoService), because these pages are not for search or sharing.
 */
export function useAgentPage(title: (t: Dict) => string): I18nService {
  const i18n = usePageLang();
  const t = i18n.t();
  inject(DOCUMENT).documentElement.lang = t.meta.htmlLang;
  inject(Title).setTitle(title(t));
  inject(Meta).updateTag({ name: 'robots', content: 'noindex, nofollow' });
  return i18n;
}
