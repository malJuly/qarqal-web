import { ChangeDetectionStrategy, Component, ElementRef, input, model, viewChild } from '@angular/core';

/**
 * One-time code field: digits only, fixed length, autofills from SMS on phones (autocomplete="one-time-code").
 *   <app-otp-input inputId="otp" [label]="t.code" [length]="6" [(value)]="code" [error]="otpErr()" />
 */
@Component({
  selector: 'app-otp-input',
  template: `
    <div class="otp">
      <label class="otp__label" [for]="inputId()">{{ label() }}</label>
      <input #el type="text" inputmode="numeric" autocomplete="one-time-code"
        [id]="inputId()" [value]="value()" [attr.maxlength]="length()"
        [attr.aria-describedby]="inputId() + '-err'" [attr.aria-invalid]="error() ? 'true' : null"
        (input)="onInput(el)" />
      <p class="otp__err" [id]="inputId() + '-err'" aria-live="polite">{{ error() }}</p>
    </div>`,
  styles: `
    .otp { display: grid; gap: 6px; }
    .otp__label { font-size: 0.8125rem; font-weight: 700; color: var(--ink-2); }
    input {
      height: 56px; padding: 0 14px; border: 1px solid #c9d1e4; border-radius: 10px; background: #fff;
      font: 700 1.5rem var(--font); letter-spacing: 0.4em; text-align: center; color: var(--ink);
    }
    input:focus { outline: none; border-color: var(--navy); box-shadow: 0 0 0 3px rgb(0 160 230 / 0.28); }
    input[aria-invalid='true'] { border-color: #d92d20; }
    .otp__err { font-size: 0.8125rem; color: #b42318; }
    .otp__err:empty { display: none; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OtpInput {
  readonly inputId = input.required<string>();
  readonly label = input.required<string>();
  readonly value = model('');
  readonly length = input(6);
  /** Error message; empty or undefined means valid. */
  readonly error = input<string | undefined>('');

  private readonly el = viewChild.required<ElementRef<HTMLInputElement>>('el');

  /** True when the value has exactly `length` digits. */
  isComplete(): boolean {
    return new RegExp(`^\\d{${this.length()}}$`).test(this.value());
  }

  focus(): void {
    this.el().nativeElement.focus();
  }

  /** Selects the whole code so the visitor can retype it after a wrong attempt. */
  select(): void {
    this.el().nativeElement.select();
  }

  protected onInput(el: HTMLInputElement): void {
    el.value = el.value.replace(/\D/g, '').slice(0, this.length());
    this.value.set(el.value);
  }
}
