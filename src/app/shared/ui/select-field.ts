import { ChangeDetectionStrategy, Component, ElementRef, input, model, viewChild } from '@angular/core';

export interface SelectOption {
  value: string;
  label: string;
}

/**
 * Labelled native <select> with an inline error. Values are strings; convert at the edge (Number(v)).
 *   <app-select-field inputId="state" [label]="t.state" [options]="states()" [placeholder]="t.choose" [(value)]="state" />
 */
@Component({
  selector: 'app-select-field',
  template: `
    <div class="sf">
      <label [for]="inputId()">{{ label() }}</label>
      <select #el [id]="inputId()" [disabled]="disabled()" [attr.aria-describedby]="inputId() + '-err'" [attr.aria-invalid]="error() ? 'true' : null"
        (change)="value.set(el.value)">
        @if (placeholder()) { <option value="" [selected]="!value()" disabled>{{ placeholder() }}</option> }
        @for (o of options(); track o.value) {
          <option [value]="o.value" [selected]="o.value === value()">{{ o.label }}</option>
        }
      </select>
      <p class="sf__err" [id]="inputId() + '-err'" aria-live="polite">{{ error() }}</p>
    </div>`,
  styles: `
    .sf { display: grid; gap: 6px; min-width: 0; }
    label { font-size: 0.8125rem; font-weight: 700; color: var(--ink-2); }
    select {
      width: 100%; height: 48px; padding: 0 36px 0 14px; appearance: none; cursor: pointer;
      font: 400 1rem var(--font); color: var(--ink); border: 1px solid #c9d1e4; border-radius: 10px;
      background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%231e3c96' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6l6-6'/%3E%3C/svg%3E") no-repeat right 12px center;
    }
    select:disabled { background-color: var(--bg-soft); color: var(--ink-2); cursor: default; }
    select:focus { outline: none; border-color: var(--navy); box-shadow: 0 0 0 3px rgb(0 160 230 / 0.28); }
    select[aria-invalid='true'] { border-color: #d92d20; }
    .sf__err { font-size: 0.8125rem; color: #b42318; }
    .sf__err:empty { display: none; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectField {
  readonly inputId = input.required<string>();
  readonly label = input.required<string>();
  readonly options = input.required<SelectOption[]>();
  readonly value = model('');
  readonly placeholder = input('');
  readonly disabled = input(false);
  /** Error message; empty or undefined means valid. */
  readonly error = input<string | undefined>('');

  private readonly el = viewChild.required<ElementRef<HTMLSelectElement>>('el');

  focus(): void {
    this.el().nativeElement.focus();
  }
}
