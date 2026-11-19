import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiError } from '../core/qarqal-api';
import { I18nService } from '../core/i18n.service';
import { AgentApi } from './agent-api';
import type {
  ActiveAssignmentData,
  AgentAction,
  AgentSessionState,
  Envelope,
  MeData,
  PartnerLoginData,
  PartnerMembership,
} from './agent.types';

// The logged-in agent: token, companies, active company and module access. Behaves like qarqalAngular's
// sign-in + RbacService: one company is picked automatically, several go to the company picker, and the
// menu and route guards read module_access.
//
// Kept in localStorage so the agent stays logged in across tabs (other tabs follow changes via the
// `storage` event).
//
// Sliding session: a token lasts 1 hour, and while the agent is active (clicks, typing, scrolling, page
// changes, API calls) the portal swaps it for a fresh one shortly before it runs out
// (POST /auth/partner-refresh). So the session ends about 1 hour after the last activity, not after login.

const STORAGE_KEY = 'qq.agent.session';
/** Refresh once the token has less than this left... */
const REFRESH_WINDOW_MS = 15 * 60 * 1000;
/** ...and only if the agent did something within this long. */
const ACTIVE_WITHIN_MS = 15 * 60 * 1000;
const CHECK_EVERY_MS = 60 * 1000;
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const;

const readStored = (): AgentSessionState | null => {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AgentSessionState) : null;
  } catch {
    return null;
  }
};

const writeStored = (state: AgentSessionState | null): void => {
  try {
    if (typeof localStorage === 'undefined') return;
    if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage blocked: the session lives in memory for this page only */
  }
};

/** The JWT's payload (not verified here: the backend verifies it on every request). */
const tokenPayload = (token: string): Record<string, unknown> => {
  try {
    const part = token.split('.')[1];
    if (!part) return {};
    return JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/'))) as Record<string, unknown>;
  } catch {
    return {};
  }
};

/** Seconds since epoch when the JWT expires, or null if it can't be read. */
const tokenExpiry = (token: string): number | null => {
  const exp = tokenPayload(token)['exp'];
  return typeof exp === 'number' ? exp : null;
};

const isExpired = (token: string): boolean => {
  const exp = tokenExpiry(token);
  return exp === null || exp * 1000 <= Date.now();
};

@Injectable({ providedIn: 'root' })
export class AgentSession {
  private readonly api = inject(AgentApi);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);

  private readonly state = signal<AgentSessionState | null>(this.loadValid());
  /** GET /me has run since this page load (module access re-read from the server). */
  private refreshed = false;
  /** Last time the agent did something on the page (ms). */
  private lastActivity = Date.now();
  private extending: Promise<void> | null = null;

  constructor() {
    // Browser only: prerendering has no window, and nothing to keep alive.
    if (typeof window === 'undefined') return;
    const markActive = (): void => { this.lastActivity = Date.now(); };
    for (const type of ACTIVITY_EVENTS) window.addEventListener(type, markActive, { passive: true, capture: true });
    window.setInterval(() => void this.keepAlive(), CHECK_EVERY_MS);
    // Another tab logged in, refreshed the token or logged out.
    window.addEventListener('storage', (e) => {
      if (e.key !== STORAGE_KEY) return;
      const wasLoggedIn = this.state() !== null;
      this.state.set(this.loadValid());
      if (wasLoggedIn && !this.state() && this.router.url.includes('/agent') && !this.router.url.includes('/agent/login')) {
        void this.router.navigateByUrl(this.path('login'));
      }
    });
  }

  readonly user = computed(() => this.state()?.user ?? null);
  readonly memberships = computed(() => this.state()?.memberships ?? []);
  readonly active = computed(() => this.state()?.active ?? null);
  readonly isLoggedIn = computed(() => this.state() !== null);
  readonly hasCompany = computed(() => this.active() !== null);
  readonly canSwitchCompany = computed(() => this.memberships().length > 1);
  /**
   * Legacy account type from the token: 3 = Merchant (sells), 4 = Provider (owns the product).
   * Some older endpoints still decide on this (e.g. only a Provider may update an assist order).
   */
  readonly userType = computed(() => {
    const token = this.state()?.token;
    const value = token ? tokenPayload(token)['user_type'] : null;
    return typeof value === 'number' ? value : null;
  });

  // ── Paths (under the current language, e.g. /ms/agent/orders) ──
  /** No trailing slash: the router can't match "agent/" (only full page loads strip it). */
  path(sub = ''): string {
    return `${this.i18n.home()}agent${sub ? `/${sub}` : ''}`;
  }

  // ── Login / company / logout ──

  async login(email: string, password: string): Promise<void> {
    const res = await this.api.request<Envelope<PartnerLoginData>>('POST', 'auth/partner-login', { body: { email, password } });
    const d = res.data;
    this.set({ token: d.access_token, user: d.user, memberships: d.memberships, active: d.active_partner_role, moduleAccess: d.module_access ?? {} });
    this.refreshed = true;
    // Same as qarqalAngular: exactly one company and none active yet → activate it without asking.
    if (!d.active_partner_role && d.memberships.length === 1) await this.selectCompany(d.memberships[0].upr_id);
  }

  async selectCompany(uprId: number): Promise<void> {
    const current = this.requireState();
    const res = await this.authed<Envelope<ActiveAssignmentData>>('POST', 'me/active-assignment', { upr_id: uprId });
    const d = res.data;
    const memberships = current.memberships.map((m): PartnerMembership => ({ ...m, upr_is_active: m.upr_id === uprId }));
    this.set({ ...current, token: d.access_token, active: d.active_partner_role, moduleAccess: d.module_access ?? {}, memberships });
  }

  logout(reason?: 'expired'): void {
    this.set(null);
    this.refreshed = false;
    void this.router.navigateByUrl(this.path('login') + (reason ? `?reason=${reason}` : ''));
  }

  // ── Access (same rules as qarqalAngular's RbacService.checkAccessByName) ──

  can(moduleName: string, action: AgentAction = 'read'): boolean {
    return this.state()?.moduleAccess[moduleName]?.[action] === true;
  }

  /**
   * Re-reads module access once per page load, so a role changed by the company admin applies on the
   * next visit. Logs out if the account turns out not to be a partner user any more.
   */
  async ensureFresh(): Promise<void> {
    if (this.refreshed || !this.state()) return;
    const res = await this.authed<Envelope<MeData>>('GET', 'me');
    const d = res.data;
    this.refreshed = true;
    if (d.is_superadmin || d.is_internal_staff) {
      this.logout();
      return;
    }
    const current = this.requireState();
    this.set({ ...current, active: d.active_partner_role, moduleAccess: d.module_access ?? {} });
  }

  // ── Authenticated requests for the portal pages ──

  /** Calls the API with the agent's token. An expired or rejected token logs the agent out. */
  async authed<T>(method: 'GET' | 'POST' | 'PATCH' | 'PUT', path: string, body?: unknown): Promise<T> {
    const token = this.validToken();
    this.lastActivity = Date.now();
    try {
      return await this.api.request<T>(method, path, { body, token });
    } catch (err) {
      if (err instanceof ApiError && err.httpStatus === 401) this.logout('expired');
      throw err;
    }
  }

  /** Like authed(), for a POST answered line by line (NDJSON). See AgentApi.stream. */
  async authedStream(path: string, body: unknown, onLine: (line: unknown) => void, signal?: AbortSignal): Promise<void> {
    const token = this.validToken();
    this.lastActivity = Date.now();
    try {
      await this.api.stream(path, body, token, onLine, signal);
    } catch (err) {
      if (err instanceof ApiError && err.httpStatus === 401) this.logout('expired');
      throw err;
    }
  }

  private validToken(): string {
    const token = this.state()?.token;
    if (!token || isExpired(token)) {
      this.logout('expired');
      throw new ApiError(401, 'Session expired', 'TOKEN_EXPIRED');
    }
    return token;
  }

  // ── Sliding session ──

  /**
   * Runs every minute: logs out once the token has run out, and swaps it for a fresh one when it is about
   * to run out and the agent has been active recently.
   */
  private async keepAlive(): Promise<void> {
    const token = this.state()?.token;
    if (!token) return;
    const exp = tokenExpiry(token);
    const left = exp === null ? 0 : exp * 1000 - Date.now();
    if (left <= 0) {
      this.logout('expired');
      return;
    }
    if (left < REFRESH_WINDOW_MS && Date.now() - this.lastActivity < ACTIVE_WITHIN_MS) await this.extend();
  }

  /** POST /auth/partner-refresh. One call at a time; a refused refresh logs the agent out. */
  private extend(): Promise<void> {
    this.extending ??= (async () => {
      const current = this.state();
      if (!current) return;
      try {
        const res = await this.api.request<Envelope<PartnerLoginData>>('POST', 'auth/partner-refresh', { token: current.token });
        const d = res.data;
        // Keep any state changed meanwhile (another tab may have switched company), take the new token and access.
        const latest = this.state() ?? current;
        this.set({ ...latest, token: d.access_token, memberships: d.memberships, active: d.active_partner_role, moduleAccess: d.module_access ?? {} });
      } catch (err) {
        // 401/403: no longer allowed (removed, deactivated) or the token already expired. Network errors: try next minute.
        if (err instanceof ApiError && (err.httpStatus === 401 || err.httpStatus === 403)) this.logout('expired');
      } finally {
        this.extending = null;
      }
    })();
    return this.extending;
  }

  // ── internals ──

  private loadValid(): AgentSessionState | null {
    const stored = readStored();
    if (stored && !isExpired(stored.token)) return stored;
    if (stored) writeStored(null);
    return null;
  }

  private requireState(): AgentSessionState {
    const s = this.state();
    if (!s) throw new ApiError(401, 'Not logged in', 'AUTH_REQUIRED');
    return s;
  }

  private set(state: AgentSessionState | null): void {
    this.state.set(state);
    writeStored(state);
  }
}
