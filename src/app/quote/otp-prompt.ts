import { ChangeDetectionStrategy, Component, Injector, afterNextRender, inject, output, signal, viewChild } from '@angular/core';
import { I18nService } from '../core/i18n.service';
import { ApiError } from '../core/qarqal-api';
import { Alert } from '../shared/ui/alert';
import { Modal } from '../shared/ui/modal';
import { OtpInput } from '../shared/ui/otp-input';
import { PhoneInput } from '../shared/ui/phone-input';
import { createCountdown } from '../shared/utils/countdown.util';
import { fill } from '../shared/utils/format.util';
import { formatMobile, isValidMobile, normaliseMobile } from '../shared/utils/phone.util';
import { AuthService } from './auth.service';

// "Earn points" popup shown before quotes: mobile number → Send code | Skip, then the 6-digit code.
// Emits `done` either way; the caller then goes to the quote page, which shows the "you'll earn points"
// popup to verified visitors while quotes load. A verified visitor keeps a Bearer token
// (core/qarqal-api.ts) so later calls can credit purchase points.

type Step = 'mobile' | 'code';
const RESEND_SECONDS = 30;

@Component({
  selector: 'app-otp-prompt',
  imports: [Modal, PhoneInput, OtpInput, Alert],
  template: `
    @let f = i18n.t().quoteFlow;
    <app-modal modalId="otp" [heading]="step() === 'mobile' ? f.points.title : f.otp.title"
      [closeLabel]="f.close" [backLabel]="f.back" [showBack]="step() === 'code'" [locked]="busy()"
      (back)="go('mobile')">
      @if (step() === 'mobile') {
        <p class="lede">{{ f.points.body }}</p>
        <form (submit)="send($event)" novalidate>
          <app-phone-input #phone inputId="otp-mobile" [label]="f.points.mobile" [placeholder]="f.points.mobileHint"
            [(value)]="mobile" [error]="mobileErr()" (valueChange)="mobileErr.set('')" />
          @if (serverErr()) { <app-alert class="gap" tone="error">{{ serverErr() }}</app-alert> }
          <div class="actions">
            <button class="btn btn--primary" type="submit" [disabled]="busy()">{{ busy() ? f.points.sending : f.points.send }}</button>
            <button class="link" type="button" [disabled]="busy()" (click)="finish()">{{ f.points.skip }}</button>
          </div>
        </form>
      } @else {
        <p class="lede">{{ f.otp.body }} <strong>{{ display(mobile()) }}</strong></p>
        <form (submit)="verify($event)" novalidate>
          <app-otp-input #otp inputId="otp-code" [label]="f.otp.code" [(value)]="code" [error]="codeErr()" (valueChange)="codeErr.set('')" />
          <div class="actions">
            <button class="btn btn--primary" type="submit" [disabled]="busy()">{{ busy() ? f.otp.verifying : f.otp.verify }}</button>
            <button class="link" type="button" [disabled]="busy() || countdown.remaining() > 0" (click)="resend()">
              {{ countdown.remaining() > 0 ? fill(f.otp.resendIn, { s: countdown.remaining() }) : f.otp.resend }}
            </button>
          </div>
          <button class="link link--quiet" type="button" [disabled]="busy()" (click)="finish()">{{ f.points.skip }}</button>
        </form>
      }
    </app-modal>`,
  styles: `
    .lede { color: var(--ink-2); margin-bottom: 16px; }
    .gap { display: block; margin-top: 12px; }
    .actions { margin-top: 20px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; }
    .actions .btn { flex: 1 1 200px; }
    .actions .btn:disabled { opacity: 0.7; cursor: progress; }
    .link { min-height: 44px; padding: 0 4px; background: none; border: 0; cursor: pointer; font: 700 1rem var(--font); color: var(--navy); text-decoration: underline; text-underline-offset: 0.2em; }
    .link:disabled { color: var(--ink-3); cursor: default; text-decoration: none; }
    .link--quiet { margin-top: 8px; font-weight: 400; color: var(--ink-3); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OtpPrompt {
  protected readonly i18n = inject(I18nService);
  private readonly auth = inject(AuthService);
  private readonly injector = inject(Injector);
  protected readonly countdown = createCountdown();
  protected readonly fill = fill;
  protected readonly display = formatMobile;

  /** Fired after verify or skip. */
  readonly done = output<void>();

  protected readonly step = signal<Step>('mobile');
  protected readonly busy = signal(false);
  protected readonly mobile = signal('');
  protected readonly code = signal('');
  protected readonly mobileErr = signal('');
  protected readonly codeErr = signal('');
  protected readonly serverErr = signal('');

  private readonly modal = viewChild.required(Modal);
  private readonly phone = viewChild(PhoneInput);
  private readonly otp = viewChild(OtpInput);

  open(): void {
    this.serverErr.set('');
    this.code.set('');
    this.modal().open();
    this.go('mobile');
  }

  protected go(step: Step): void {
    this.step.set(step);
    afterNextRender(() => (step === 'mobile' ? this.phone() : this.otp())?.focus(), { injector: this.injector });
  }

  protected async send(e: Event): Promise<void> {
    e.preventDefault();
    const f = this.i18n.t().quoteFlow;
    const digits = normaliseMobile(this.mobile());
    if (!isValidMobile(digits)) { this.mobileErr.set(f.points.invalid); this.phone()?.focus(); return; }

    this.mobile.set(digits);
    this.serverErr.set('');
    this.busy.set(true);
    try {
      await this.auth.sendOtp(digits);
      this.countdown.start(RESEND_SECONDS);
      this.code.set('');
      this.go('code');
    } catch (err) {
      this.serverErr.set(err instanceof ApiError && err.httpStatus === 403 ? f.points.blocked : f.points.failed);
    } finally {
      this.busy.set(false);
    }
  }

  protected async resend(): Promise<void> {
    this.busy.set(true);
    try {
      await this.auth.sendOtp(this.mobile());
      this.countdown.start(RESEND_SECONDS);
    } catch {
      this.codeErr.set(this.i18n.t().quoteFlow.points.failed);
    } finally {
      this.busy.set(false);
    }
  }

  protected async verify(e: Event): Promise<void> {
    e.preventDefault();
    const f = this.i18n.t().quoteFlow;
    if (!this.otp()?.isComplete()) { this.codeErr.set(f.otp.invalid); return; }

    this.busy.set(true);
    try {
      await this.auth.verifyOtp(this.mobile(), this.code());
      this.finish();
    } catch {
      this.codeErr.set(f.otp.wrong);
      this.otp()?.select();
    } finally {
      this.busy.set(false);
    }
  }

  protected finish(): void {
    this.countdown.stop();
    this.modal().close();
    this.done.emit();
  }
}
