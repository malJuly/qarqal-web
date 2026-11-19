import type { IconName } from '../components/icon';
import type { Dict } from '../i18n';
import type { AgentAction } from './agent.types';

// The portal's pages and the module each one needs. Same idea as qarqalAngular's navigation.ts +
// route-access.config.ts: the sidebar shows an item only when module_access grants it, and the route uses
// the same module in its data (app.routes.ts) so the guard checks the same thing.

export interface AgentMenuItem {
  id: string;
  /** Under /agent/, e.g. 'assist-orders'. */
  path: string;
  /** Backend module name (qarqal-backend src/db/seedModules.ts). */
  module: string;
  action: AgentAction;
  icon: IconName;
  label: (t: Dict) => string;
}

export const AGENT_MENU: AgentMenuItem[] = [
  // qarqalAngular: Partners > Assist Orders (/partner-orders)
  { id: 'assist-orders', path: 'assist-orders', module: 'partner-orders', action: 'read', icon: 'carCrane', label: (t) => t.agent.assist.menu },
  // qarqalAngular: Orders > Insurance Orders (/insurance)
  { id: 'insurance-orders', path: 'insurance-orders', module: 'insurance', action: 'read', icon: 'shieldCheck', label: (t) => t.agent.insurance.menu },
  // qarqalAngular: Purchase > Insurance (/purchase/insurance) and My Insurance Sales (/purchase/insurance/sales)
  { id: 'insurance-purchase', path: 'insurance-purchase', module: 'insurance-purchase', action: 'create', icon: 'cart', label: (t) => t.agent.purchase.menu },
  { id: 'my-sales', path: 'insurance-purchase/sales', module: 'insurance-purchase', action: 'read', icon: 'receipt', label: (t) => t.agent.sales.menu },
];
