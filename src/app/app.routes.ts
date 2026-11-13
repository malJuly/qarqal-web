import { Routes } from '@angular/router';
import { LANGS } from './i18n';

// Same URLs as the Astro site: "/" is English, other languages live under "/ms/", "/zh/", "/ta/".
// Every route is prerendered to static HTML at build time (app.routes.server.ts).
// Pages load lazily, so the landing page does not ship the legal texts and vice versa.
export const routes: Routes = LANGS.flatMap((lang) => {
  const root = lang === 'en' ? '' : lang;
  const sub = (p: string) => (root ? `${root}/${p}` : p);
  return [
    { path: root, pathMatch: 'full' as const, data: { lang }, loadComponent: () => import('./pages/landing.page').then((m) => m.LandingPage) },
    { path: sub('privacy-policy'), data: { lang }, loadComponent: () => import('./pages/privacy.page').then((m) => m.PrivacyPage) },
    { path: sub('terms-and-conditions'), data: { lang }, loadComponent: () => import('./pages/terms.page').then((m) => m.TermsPage) },
    // Quote and purchase steps. ?quotation_id=<id>; prerendered as empty shells, filled in the browser.
    { path: sub('insurance/quote'), data: { lang }, loadComponent: () => import('./pages/insurance-quote.page').then((m) => m.InsuranceQuotePage) },
    { path: sub('insurance/quote/details'), data: { lang }, loadComponent: () => import('./pages/insurance-details.page').then((m) => m.InsuranceDetailsPage) },
    { path: sub('insurance/quote/payment'), data: { lang }, loadComponent: () => import('./pages/insurance-payment.page').then((m) => m.InsurancePaymentPage) },
    // Billplz return page: the backend redirects here with ?status=success|failed.
    { path: sub('insurance/quote/result'), data: { lang }, loadComponent: () => import('./pages/insurance-result.page').then((m) => m.InsuranceResultPage) },
  ];
});
