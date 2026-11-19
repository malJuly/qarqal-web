import { ChangeDetectionStrategy, Component, afterNextRender, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { useAgentPage } from '../agent/agent-page';
import { AgentSession } from '../agent/agent-session.service';
import { Footer } from '../components/footer';
import { Header } from '../components/header';
import { Alert } from '../shared/ui/alert';
import { Badge } from '../shared/ui/badge';

// /agent/select-company — for accounts in more than one company (same as qarqalAngular's /auth/select-role).
// Stands outside the agent layout: there is no menu until a company is chosen. Picking one calls
// POST /me/active-assignment, which returns a new token for that company.

@Component({
  selector: 'app-agent-select-company-page',
  imports: [Header, Footer, Alert, Badge],
  template: `
    @let c = i18n.t().agent.company;
    <a class="skip-link" href="#main">{{ i18n.t().nav.skip }}</a>
    <app-header page="agent" subpath="agent/select-company/" />
    <main id="main" class="sc">
      <div class="wrap sc__inner">
        <div class="sc__card">
          <h1>{{ c.title }}</h1>
          <p class="sc__lede">{{ c.lede }}</p>
          @if (error()) { <app-alert tone="error">{{ error() }}</app-alert> }
          @if (ready()) {
            <ul class="sc__list">
              @for (m of session.memberships(); track m.upr_id) {
                <li>
                  <button type="button" class="sc__item" [disabled]="busyId() !== null" (click)="choose(m.upr_id)"
                    [attr.aria-current]="m.upr_id === session.active()?.upr_id ? 'true' : null">
                    <span class="sc__name">{{ m.partner_name }}</span>
                    <span class="sc__meta">
                      @if (m.upr_is_root_admin) { <app-badge tone="brand">{{ c.rootAdmin }}</app-badge> }
                      @for (r of m.roles; track r) { <app-badge>{{ r }}</app-badge> }
                      @if (m.upr_id === session.active()?.upr_id) { <app-badge tone="success">{{ c.current }}</app-badge> }
                    </span>
                  </button>
                </li>
              }
            </ul>
          }
        </div>
      </div>
    </main>
    <app-footer />`,
  styles: `
    .sc { background: var(--bg-soft); min-height: 70vh; padding-block: clamp(2rem, 1.5rem + 3vw, 4rem); }
    .sc__inner { display: grid; justify-items: center; }
    .sc__card {
      width: 100%; max-width: 520px; display: grid; gap: 14px; padding: clamp(20px, 4vw, 28px);
      background: #fff; border: 1px solid var(--line); border-radius: var(--radius); box-shadow: 0 12px 32px rgb(4 11 36 / 0.08);
    }
    h1 { font-size: clamp(1.375rem, 1.2rem + 0.8vw, 1.75rem); font-weight: 900; letter-spacing: var(--track-display); color: var(--ink); }
    .sc__lede { margin-top: -6px; color: var(--ink-2); }
    .sc__list { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
    .sc__item {
      width: 100%; display: grid; gap: 6px; padding: 14px 16px; text-align: left; cursor: pointer;
      background: #fff; border: 1px solid var(--line); border-radius: var(--radius); font: inherit; color: var(--ink);
    }
    .sc__item:hover:not(:disabled) { border-color: var(--navy); }
    .sc__item:disabled { opacity: 0.6; cursor: progress; }
    .sc__item[aria-current] { border-color: var(--navy); box-shadow: 0 0 0 2px rgb(0 160 230 / 0.2); }
    .sc__name { font-weight: 800; font-size: 1.0625rem; }
    .sc__meta { display: flex; flex-wrap: wrap; gap: 6px; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentSelectCompanyPage {
  protected readonly i18n = useAgentPage((t) => `${t.agent.company.title} | QarQal`);
  protected readonly session = inject(AgentSession);
  private readonly router = inject(Router);
  /** The companies come from localStorage, which only the browser has. */
  protected readonly ready = signal(false);
  protected readonly busyId = signal<number | null>(null);
  protected readonly error = signal('');

  constructor() {
    afterNextRender(() => this.ready.set(true));
  }

  protected async choose(uprId: number): Promise<void> {
    this.busyId.set(uprId);
    this.error.set('');
    try {
      if (uprId !== this.session.active()?.upr_id) await this.session.selectCompany(uprId);
      await this.router.navigateByUrl(this.session.path());
    } catch {
      if (this.session.isLoggedIn()) this.error.set(this.i18n.t().agent.company.failed);
    } finally {
      this.busyId.set(null);
    }
  }
}
