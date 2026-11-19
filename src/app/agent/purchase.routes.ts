import { Routes } from '@angular/router';
import type { Lang } from '../i18n';
import type { AgentTitle } from './agent-layout';

// /agent/insurance-purchase/* (lazy, inside the agent layout; its canActivateChild guard checks module access).
export const purchaseRoutes = (lang: Lang): Routes => [
  {
    path: '', pathMatch: 'full',
    data: { lang, agentModule: 'insurance-purchase', agentAction: 'create', agentTitle: ((t) => t.agent.purchase.title) satisfies AgentTitle },
    loadComponent: () => import('../pages/agent-insurance-purchase.page').then((m) => m.AgentInsurancePurchasePage),
  },
  {
    // Bulk quote: many vehicles at once (backend POST generate-quotes).
    path: 'bulk',
    data: { lang, agentModule: 'insurance-purchase', agentAction: 'create', agentTitle: ((t) => t.agent.bulk.title) satisfies AgentTitle },
    loadComponent: () => import('../pages/agent-insurance-bulk.page').then((m) => m.AgentInsuranceBulkPage),
  },
  {
    // Billplz return page. Keep in step with the backend's allowed list (validateAgentRedirectURL).
    path: 'result',
    data: { lang, agentModule: 'insurance-purchase', agentTitle: ((t) => t.agent.purchase.title) satisfies AgentTitle },
    loadComponent: () => import('../pages/agent-purchase-result.page').then((m) => m.AgentPurchaseResultPage),
  },
  {
    path: 'sales',
    data: { lang, agentModule: 'insurance-purchase', agentTitle: ((t) => t.agent.sales.title) satisfies AgentTitle },
    loadComponent: () => import('../pages/agent-sales.page').then((m) => m.AgentSalesPage),
  },
];
