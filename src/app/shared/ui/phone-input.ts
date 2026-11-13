import { ChangeDetectionStrategy, Component, ElementRef, input, model, viewChild } from '@angular/core';
import { MY_COUNTRY_CODE } from '../utils/phone.util';

/**
 * Mobile number field with a fixed country code prefix. Keeps digits only.
 *   <app-phone-input inputId="holder-mobile" [label]="t.mobile" [(value)]="mobile" [error]="mobileErr()" />
 */
@Component({
  selector: 'app-phone-input',
  template: `
    <div class="phone">
      <label class="phone__label" [for]="inputId()">{{ label() }}</label>
      <div class="phone__box" [class.phone__box--invalid]="!!error()">
        <span class="phone__cc" aria-hidden="true">{{ countryCode() }}</span>
        <input #el type="tel" inputmode="numeric" autocomplete="tel-national"
          [id]="inputId()" [value]="value()" [placeholder]="placeholder()" [attr.maxlength]="maxLength()"
          [attr.aria-describedby]="inputId() + '-err'" [attr.aria-invalid]="error() ? 'true' : null"
          (input)="onInput(el)" />
      </div>
      <p class="phone__err" [id]="inputId() + '-err'" aria-live="polite">{{ error() }}</p>
    </div>`,
  styles: `
    .phone { display: grid; gap: 6px; }
    .phone__label { font-size: 0.8125rem; font-weight: 700; color: var(--ink-2); }
    .phone__box { display: flex; align-items: stretch; border: 1px solid #c9d1e4; border-radius: 10px; overflow: hidden; background: #fff; }
    .phone__box:focus-within { border-color: var(--navy); box-shadow: 0 0 0 3px rgb(0 160 230 / 0.28); }
    .phone__box--invalid { border-color: #d92d20; }
    .phone__cc { display: grid; place-items: center; padding: 0 12px; background: var(--bg-soft); font-weight: 700; color: var(--ink-2); }
    input { flex: 1; min-width: 0; height: 48px; padding: 0 14px; border: 0; font: 400 1rem var(--font); color: var(--ink); background: none; }
    input:focus { outline: none; }
    input::placeholder { color: #8895a6; }
    .phone__err { font-size: 0.8125rem; color: #b42318; }
    .phone__err:empty { display: none; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhoneInput {
  readonly inputId = input.required<string>();
  readonly label = input.required<string>();
  readonly value = model('');
  readonly countryCode = input(MY_COUNTRY_CODE);
  readonly placeholder = input('');
  /** Error message; empty or undefined means valid. */
  readonly error = input<string | undefined>('');
  readonly maxLength = input(12);

  private readonly el = viewChild.required<ElementRef<HTMLInputElement>>('el');

  focus(): void {
    this.el().nativeElement.focus();
  }

  protected onInput(el: HTMLInputElement): void {
    el.value = el.value.replace(/\D/g, '');
    this.value.set(el.value);
  }
}
