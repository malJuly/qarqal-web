import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRouteSnapshot, CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { I18nService } from '../core/i18n.service';
import type { Lang } from '../i18n';
import { AgentSession } from './agent-session.service';
import type { AgentAction } from './agent.types';

// Route guards for /agent/*. Pages are prerendered as empty shells, so on the server the guard lets the
// page through and the layout waits for the browser (see AgentLayout). In the browser:
//   not logged in            → /agent/login
//   no company chosen yet    → /agent/select-company
//   route needs a module the role doesn't have → /agent (home)
//
// A route says what it needs with data: { agentModule: 'partner-orders', agentAction: 'read' }.
// These checks are for the screen only: the backend checks the same module access on every request.

const isBrowser = (): boolean => isPlatformBrowser(inject(PLATFORM_ID));

/** Guards run before the page sets its language; set it now so redirects keep the /ms/, /zh/… prefix. */
const useRouteLang = (route: ActivatedRouteSnapshot): void => {
  inject(I18nService).lang.set((route.data['lang'] as Lang | undefined) ?? 'en');
};

/** Every page inside the agent layout (canActivateChild): a logged-in agent with a company chosen. */
export const agentGuard: CanActivateChildFn = async (route) => {
  if (!isBrowser()) return true;
  useRouteLang(route);
  const session = inject(AgentSession);
  const router = inject(Router);

  if (!session.isLoggedIn()) return router.parseUrl(session.path('login'));
  if (!session.hasCompany()) return router.parseUrl(session.path('select-company'));

  try {
    await session.ensureFresh();
  } catch {
    // 401 already logged out and redirected; anything else (network) keeps the stored access.
  }
  if (!session.isLoggedIn()) return false;

  const moduleName = route.data['agentModule'] as string | undefined;
  const action = (route.data['agentAction'] as AgentAction | undefined) ?? 'read';
  if (moduleName && !session.can(moduleName, action)) return router.parseUrl(session.path());
  return true;
};

/** The company picker: logged in, with more than one company to choose from. */
export const agentCompanyPickerGuard: CanActivateFn = (route) => {
  if (!isBrowser()) return true;
  useRouteLang(route);
  const session = inject(AgentSession);
  const router = inject(Router);
  if (!session.isLoggedIn()) return router.parseUrl(session.path('login'));
  return true;
};

/** The login page: an agent who is already logged in goes straight in. */
export const agentLoginGuard: CanActivateFn = (route) => {
  if (!isBrowser()) return true;
  useRouteLang(route);
  const session = inject(AgentSession);
  const router = inject(Router);
  if (!session.isLoggedIn()) return true;
  return router.parseUrl(session.path(session.hasCompany() ? '' : 'select-company'));
};
