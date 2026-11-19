import { ChangeDetectionStrategy, Component, DestroyRef, afterNextRender, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { Icon } from '../components/icon';
import { I18nService } from '../core/i18n.service';
import type { Dict } from '../i18n';
import { Badge } from '../shared/ui/badge';
import { Spinner } from '../shared/ui/spinner';
import { AGENT_MENU } from './agent-menu';
import { AgentSession } from './agent-session.service';

/** Route data for a page inside the layout: the heading shown in the top bar. */
export type AgentTitle = (t: Dict, username: string) => string;

/**
 * Master page for the logged-in agent portal (route /agent with the pages as children, see app.routes.ts):
 * a dark-blue sidebar with the menu (filtered by module access), a top bar with the page heading, company
 * and log out, and the page in <router-outlet>. Built once; only the page inside changes on navigation.
 * On phones the sidebar is a drawer opened from the top bar.
 *
 * Pages are prerendered as empty shells; the outlet renders only in the browser once the session is known,
 * so no agent data is ever in the static HTML.
 */
@Component({
  selector: 'app-agent-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon, Spinner, Badge],
  template: `
    @let s = i18n.t().agent.shell;
    <a class="skip-link" href="#main">{{ i18n.t().nav.skip }}</a>
    <div class="al" [class.al--drawer-open]="drawerOpen()">
      <aside class="al-side" [attr.aria-label]="s.menu">
        <div class="al-side__head">
          <a class="al-side__brand" [routerLink]="session.path()" aria-label="QarQal">
            <img src="/assets/app/logo.png" alt="" width="110" height="36" />
          </a>
          <button type="button" class="al-icon-btn al-side__close" [attr.aria-label]="s.closeMenu" (click)="drawerOpen.set(false)">
            <app-icon name="x" [size]="20" />
          </button>
        </div>
        @if (ready() && session.isLoggedIn()) {
          <nav class="al-nav">
            @for (item of menu(); track item.id) {
              <a [routerLink]="session.path(item.path)" routerLinkActive="is-active" [routerLinkActiveOptions]="activeOptions">
                <app-icon [name]="item.icon" [size]="20" /> <span>{{ item.label(i18n.t()) }}</span>
              </a>
            }
          </nav>
          <div class="al-side__foot">
            @if (session.canSwitchCompany()) {
              <a class="al-nav__plain" [routerLink]="session.path('select-company')">
                <app-icon name="switchCompany" [size]="20" /> <span>{{ s.switchCompany }}</span>
              </a>
            }
          </div>
        }
      </aside>
      <div class="al-backdrop" (click)="drawerOpen.set(false)"></div>

      <div class="al-main">
        <header class="al-top">
          <button type="button" class="al-icon-btn al-top__menu" [attr.aria-label]="s.openMenu" [attr.aria-expanded]="drawerOpen()" (click)="drawerOpen.set(true)">
            <app-icon name="menu" [size]="22" />
          </button>
          <h1 class="al-top__title">{{ ready() && session.isLoggedIn() ? title() : '' }}</h1>
          @if (ready() && session.isLoggedIn()) {
            <div class="al-top__who">
              <span class="al-top__company">{{ session.active()?.partner_name }}</span>
              <span class="al-top__user">{{ session.user()?.username }}</span>
            </div>
            <div class="al-top__roles" [attr.aria-label]="s.roles">
              @if (session.active()?.upr_is_root_admin) { <app-badge tone="brand">{{ i18n.t().agent.company.rootAdmin }}</app-badge> }
              @for (r of session.active()?.roles ?? []; track r) { <app-badge>{{ r }}</app-badge> }
            </div>
            <button type="button" class="al-logout" (click)="session.logout()">
              <app-icon name="logout" [size]="18" /> <span>{{ s.logout }}</span>
            </button>
          }
        </header>
        <main id="main" class="al-content">
          @if (ready() && session.isLoggedIn()) {
            <router-outlet />
          } @else {
            <app-spinner [label]="s.loading" />
          }
        </main>
      </div>
    </div>`,
  styles: `
    :host { display: block; }
    .al { display: grid; min-height: 100vh; background: var(--bg-soft); }
    @media (min-width: 1024px) { .al { grid-template-columns: 240px minmax(0, 1fr); } }

    /* Sidebar: fixed column on desktop, a drawer from the left on smaller screens. */
    .al-side {
      display: flex; flex-direction: column; gap: 8px; padding: 14px 12px;
      background: linear-gradient(180deg, var(--night-1), var(--night-0)); color: var(--night-ink);
    }
    @media (min-width: 1024px) { .al-side { position: sticky; top: 0; height: 100vh; overflow-y: auto; } }
    @media (max-width: 1023px) {
      .al-side { position: fixed; inset: 0 auto 0 0; z-index: 50; width: min(280px, 85vw); transform: translateX(-100%); transition: transform 0.25s var(--ease-out); }
      .al--drawer-open .al-side { transform: none; box-shadow: 0 0 40px rgb(4 11 36 / 0.4); }
    }
    .al-backdrop { display: none; }
    @media (max-width: 1023px) {
      .al--drawer-open .al-backdrop { display: block; position: fixed; inset: 0; z-index: 40; background: rgb(4 11 36 / 0.5); }
    }
    .al-side__head { display: flex; align-items: center; justify-content: space-between; padding: 4px 6px 10px; }
    .al-side__brand img { width: 104px; height: auto; display: block; }
    .al-side__close { display: none; }
    @media (max-width: 1023px) { .al-side__close { display: inline-grid; } }

    .al-nav { display: grid; gap: 2px; }
    .al-nav a, .al-nav__plain {
      display: flex; align-items: center; gap: 10px; min-height: 42px; padding: 0 12px; border-radius: 10px;
      color: var(--night-ink-2); font-weight: 700; font-size: 0.9375rem; text-decoration: none;
    }
    .al-nav a:hover, .al-nav__plain:hover { background: rgb(255 255 255 / 0.08); color: #fff; }
    .al-nav a.is-active { background: rgb(255 255 255 / 0.14); color: #fff; box-shadow: inset 3px 0 0 var(--cyan-bright); }
    .al-side__foot { margin-top: auto; padding-top: 8px; border-top: 1px solid var(--night-line); }

    .al-icon-btn {
      display: inline-grid; place-items: center; width: 40px; height: 40px; border-radius: 10px; cursor: pointer;
      border: 1px solid var(--night-line); background: none; color: inherit;
    }

    /* Top bar */
    .al-main { min-width: 0; display: flex; flex-direction: column; }
    .al-top {
      position: sticky; top: 0; z-index: 20; display: flex; align-items: center; gap: 12px;
      min-height: 60px; padding: 8px clamp(12px, 2vw, 24px); background: #fff; border-bottom: 1px solid var(--line);
    }
    .al-top__menu { color: var(--navy); border-color: var(--line); }
    @media (min-width: 1024px) { .al-top__menu { display: none; } }
    .al-top__title { flex: 1; min-width: 0; font-size: clamp(1.0625rem, 1rem + 0.4vw, 1.25rem); font-weight: 900; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .al-top__who { display: grid; text-align: right; line-height: 1.2; min-width: 0; }
    .al-top__company { font-weight: 800; font-size: 0.875rem; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 28ch; }
    .al-top__user { font-size: 0.75rem; color: var(--ink-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 28ch; }
    @media (max-width: 640px) { .al-top__who { display: none; } }
    .al-top__roles { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 4px; max-width: 220px; }
    .al-top__roles:empty { display: none; }
    @media (max-width: 800px) { .al-top__roles { display: none; } }
    .al-logout {
      display: inline-flex; align-items: center; gap: 6px; min-height: 38px; padding: 0 12px; border-radius: 10px; cursor: pointer;
      border: 1px solid var(--line); background: #fff; color: var(--navy); font: 700 0.875rem var(--font); white-space: nowrap;
    }
    .al-logout:hover { border-color: var(--navy); }
    @media (max-width: 480px) { .al-logout span { display: none; } }

    .al-content { flex: 1; padding: clamp(12px, 2vw, 20px) clamp(12px, 2vw, 24px) 32px; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentLayout {
  protected readonly i18n = inject(I18nService);
  protected readonly session = inject(AgentSession);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** False during prerender and hydration; the session lives in localStorage, which only the browser has. */
  protected readonly ready = signal(false);
  protected readonly drawerOpen = signal(false);
  /** Exact path (query ignored): "Insurance purchase" isn't also lit on its child page "My sales". */
  protected readonly activeOptions = { paths: 'exact', queryParams: 'ignored', fragment: 'ignored', matrixParams: 'ignored' } as const;
  protected readonly menu = computed(() => AGENT_MENU.filter((m) => this.session.can(m.module, m.action)));

  /** Bumps on every navigation, so the heading follows the child page. */
  private readonly navigated = toSignal(
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd), map(() => Date.now())),
    { initialValue: 0 },
  );
  protected readonly title = computed(() => {
    this.navigated();
    let r = this.route.snapshot;
    while (r.firstChild) r = r.firstChild;
    const fn = r.data['agentTitle'] as AgentTitle | undefined;
    return fn ? fn(this.i18n.t(), this.session.user()?.username ?? '') : '';
  });

  constructor() {
    afterNextRender(() => this.ready.set(true));
    // Close the phone drawer after choosing a page, and with Esc.
    const sub = this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => this.drawerOpen.set(false));
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') this.drawerOpen.set(false); };
    afterNextRender(() => document.addEventListener('keydown', onKey));
    inject(DestroyRef).onDestroy(() => {
      sub.unsubscribe();
      if (typeof document !== 'undefined') document.removeEventListener('keydown', onKey);
    });
  }
}
