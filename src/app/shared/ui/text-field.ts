import { ChangeDetectionStrategy, Component, ElementRef, input, model, viewChild } from '@angular/core';

/**
 * Labelled text input with an inline error.
 *   <app-text-field inputId="email" [label]="t.email" type="email" autocomplete="email" [(value)]="email" [error]="errs().email" />
 */
@Component({
  selector: 'app-text-field',
  template: `
    <div class="tf">
      <label [for]="inputId()">{{ label() }}@if (optional()) { <span class="tf__opt"> ({{ optional() }})</span> }</label>
      <input #el [id]="inputId()" [type]="type()" [value]="value()" [placeholder]="placeholder()"
        [attr.autocomplete]="autocomplete() || null" [attr.inputmode]="inputmode() || null" [attr.maxlength]="maxLength() || null"
        [attr.max]="max() || null" [readOnly]="readonly()"
        [attr.aria-describedby]="inputId() + '-err'" [attr.aria-invalid]="error() ? 'true' : null"
        (input)="value.set(el.value)" />
      <p class="tf__err" [id]="inputId() + '-err'" aria-live="polite">{{ error() }}</p>
    </div>`,
  styles: `
    .tf { display: grid; gap: 6px; min-width: 0; }
    label { font-size: 0.8125rem; font-weight: 700; color: var(--ink-2); }
    .tf__opt { font-weight: 400; color: var(--ink-3); }
    input {
      width: 100%; height: 48px; padding: 0 14px; font: 400 1rem var(--font); color: var(--ink);
      background: #fff; border: 1px solid #c9d1e4; border-radius: 10px;
    }
    input::placeholder { color: #8895a6; }
    input:focus { outline: none; border-color: var(--navy); box-shadow: 0 0 0 3px rgb(0 160 230 / 0.28); }
    input[readonly] { background: var(--bg-soft); color: var(--ink-2); }
    input[aria-invalid='true'] { border-color: #d92d20; }
    .tf__err { font-size: 0.8125rem; color: #b42318; }
    .tf__err:empty { display: none; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextField {
  readonly inputId = input.required<string>();
  readonly label = input.required<string>();
  readonly value = model('');
  readonly type = input<'text' | 'email' | 'tel' | 'date'>('text');
  readonly placeholder = input('');
  readonly autocomplete = input('');
  readonly inputmode = input('');
  readonly maxLength = input<number | null>(null);
  /** For type="date": latest allowed day, yyyy-mm-dd. */
  readonly max = input('');
  readonly readonly = input(false);
  /** Text shown after the label, e.g. "optional". */
  readonly optional = input('');
  /** Error message; empty or undefined means valid. */
  readonly error = input<string | undefined>('');

  private readonly el = viewChild.required<ElementRef<HTMLInputElement>>('el');

  focus(): void {
    this.el().nativeElement.focus();
  }
}
