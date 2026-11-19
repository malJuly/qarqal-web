import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AgentApi } from '../agent/agent-api';
import { useAgentPage } from '../agent/agent-page';
import { AgentSession } from '../agent/agent-session.service';
import { Footer } from '../components/footer';
import { Header } from '../components/header';
import { ApiError } from '../core/qarqal-api';
import { Alert } from '../shared/ui/alert';
import { TextField } from '../shared/ui/text-field';

// /agent/login — email + password for partner staff (POST /auth/partner-login).
// Internal QarQal accounts get the same "Invalid email or password" as a wrong password (backend decides).

@Component({
  selector: 'app-agent-login-page',
  imports: [Header, Footer, TextField, Alert],
  template: `
    @let l = i18n.t().agent.login;
    <a class="skip-link" href="#main">{{ i18n.t().nav.skip }}</a>
    <app-header page="agent" subpath="agent/login/" />
    <main id="main" class="al">
      <div class="wrap al__inner">
        <form class="al__card" (submit)="submit($event)" novalidate>
          <h1>{{ l.title }}</h1>
          <p class="al__lede">{{ l.lede }}</p>

          @if (!enabled) {
            <app-alert tone="info">{{ l.unavailable }}</app-alert>
          } @else {
            @if (notice()) { <app-alert tone="info">{{ notice() }}</app-alert> }
            @if (error()) { <app-alert tone="error">{{ error() }}</app-alert> }

            <app-text-field inputId="agent-email" [label]="l.email" type="email" autocomplete="username"
              [maxLength]="254" [(value)]="email" />
            <app-text-field inputId="agent-password" [label]="l.password" type="password" autocomplete="current-password"
              [maxLength]="128" [(value)]="password" />

            <button class="btn btn--primary al__submit" type="submit" [disabled]="busy()">
              {{ busy() ? l.submitting : l.submit }}
            </button>
          }
        </form>
      </div>
    </main>
    <app-footer />`,
  styles: `
    .al { background: var(--bg-soft); min-height: 70vh; padding-block: clamp(2rem, 1.5rem + 3vw, 4rem); }
    .al__inner { display: grid; justify-items: center; }
    .al__card {
      width: 100%; max-width: 420px; display: grid; gap: 16px; padding: clamp(20px, 4vw, 32px);
      background: #fff; border: 1px solid var(--line); border-radius: var(--radius);
      box-shadow: 0 12px 32px rgb(4 11 36 / 0.08);
    }
    h1 { font-size: clamp(1.5rem, 1.25rem + 1vw, 1.875rem); font-weight: 900; letter-spacing: var(--track-display); color: var(--ink); }
    .al__lede { margin-top: -8px; color: var(--ink-2); }
    .al__submit { width: 100%; min-height: 50px; font-size: 1rem; }
    .al__submit:disabled { opacity: 0.7; cursor: progress; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentLoginPage {
  protected readonly i18n = useAgentPage((t) => t.agent.meta.title);
  private readonly session = inject(AgentSession);
  private readonly router = inject(Router);
  protected readonly enabled = inject(AgentApi).enabled;

  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  /** "Your session has ended" after an expired token sent the agent here. */
  protected readonly notice = signal(
    inject(ActivatedRoute).snapshot.queryParamMap.get('reason') === 'expired' ? this.i18n.t().agent.login.expired : '',
  );

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.busy()) return;
    const l = this.i18n.t().agent.login;
    const email = this.email().trim();
    const password = this.password();
    if (!email || !password) {
      this.error.set(l.required);
      return;
    }

    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      await this.session.login(email, password);
      this.password.set('');
      await this.router.navigateByUrl(this.session.path(this.session.hasCompany() ? '' : 'select-company'));
    } catch (err) {
      this.error.set(this.messageFor(err));
    } finally {
      this.busy.set(false);
    }
  }

  private messageFor(err: unknown): string {
    const l = this.i18n.t().agent.login;
    if (!(err instanceof ApiError)) {
      // Not an API answer: a bug or a failed page load. Keep the details for whoever opens the console.
      console.error('[agent-login]', err);
      return l.failed;
    }
    switch (err.code) {
      case 'INVALID_CREDENTIALS':
      case 'VALIDATION_ERROR':
        return l.invalid;
      case 'ACCOUNT_DEACTIVATED':
        return l.deactivated;
      case 'RATE_LIMITED':
        return l.rateLimited;
      default:
        return err.httpStatus === 401 ? l.invalid : l.failed;
    }
  }
}
