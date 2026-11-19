import { Routes } from '@angular/router';
import { LANGS } from './i18n';
import { agentCompanyPickerGuard, agentGuard, agentLoginGuard } from './agent/agent.guard';
import type { AgentTitle } from './agent/agent-layout';
import { fill } from './shared/utils/format.util';

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
    // Agent portal for partner staff. Prerendered as empty shells; guards and content run in the browser (agent/agent.guard.ts).
    // Login and the company picker stand alone; every other page sits inside the master layout (agent/agent-layout.ts).
    { path: sub('agent/login'), data: { lang }, canActivate: [agentLoginGuard], loadComponent: () => import('./pages/agent-login.page').then((m) => m.AgentLoginPage) },
    { path: sub('agent/select-company'), data: { lang }, canActivate: [agentCompanyPickerGuard], loadComponent: () => import('./pages/agent-select-company.page').then((m) => m.AgentSelectCompanyPage) },
    {
      path: sub('agent'),
      data: { lang },
      canActivateChild: [agentGuard],
      loadComponent: () => import('./agent/agent-layout').then((m) => m.AgentLayout),
      children: [
        { path: '', pathMatch: 'full' as const, data: { lang, agentTitle: ((t, name) => fill(t.agent.home.title, { name })) satisfies AgentTitle }, loadComponent: () => import('./pages/agent-home.page').then((m) => m.AgentHomePage) },
        { path: 'assist-orders', data: { lang, agentModule: 'partner-orders', agentTitle: ((t) => t.agent.assist.title) satisfies AgentTitle }, loadComponent: () => import('./pages/agent-assist-orders.page').then((m) => m.AgentAssistOrdersPage) },
        { path: 'insurance-orders', data: { lang, agentModule: 'insurance', agentTitle: ((t) => t.agent.insurance.title) satisfies AgentTitle }, loadComponent: () => import('./pages/agent-insurance-orders.page').then((m) => m.AgentInsuranceOrdersPage) },
        { path: 'insurance-purchase', loadChildren: () => import('./agent/purchase.routes').then((m) => m.purchaseRoutes(lang)) },
      ],
    },
  ];
});
