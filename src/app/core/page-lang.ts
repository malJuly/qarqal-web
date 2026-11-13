import { inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import type { Lang } from '../i18n';
import { I18nService } from './i18n.service';

/**
 * Sets the page language from its route data (app.routes.ts). Call it in a page component's constructor,
 * so the language is set before any child component renders.
 */
export function usePageLang(): I18nService {
  const i18n = inject(I18nService);
  const lang = inject(ActivatedRoute).snapshot.data['lang'] as Lang | undefined;
  i18n.lang.set(lang ?? 'en');
  return i18n;
}
