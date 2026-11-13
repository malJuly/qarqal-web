import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

/**
 * A selectable card: checkbox, title, description and a value on the right (e.g. a price).
 * Extra controls (a plan picker, an amount) go in <ng-content> and show only while checked.
 *   <app-check-card inputId="addon-srcc" [title]="a.title" [description]="a.desc" [meta]="'RM 20.00'" [(checked)]="on">
 *     …shown when checked…
 *   </app-check-card>
 */
@Component({
  selector: 'app-check-card',
  template: `
    <div class="cc" [class.cc--on]="checked()" [class.cc--disabled]="disabled()">
      <label class="cc__row" [for]="inputId()">
        <input type="checkbox" [id]="inputId()" [checked]="checked()" [disabled]="disabled()"
          (change)="onChange($event)" />
        <span class="cc__text">
          <span class="cc__title">{{ title() }}</span>
          @if (description()) { <span class="cc__desc">{{ description() }}</span> }
        </span>
        @if (meta()) { <span class="cc__meta">{{ meta() }}</span> }
      </label>
      @if (checked()) { <div class="cc__extra"><ng-content /></div> }
    </div>`,
  styles: `
    .cc { border: 1px solid var(--line); border-radius: 12px; background: #fff; transition: border-color 0.15s; }
    .cc--on { border-color: var(--navy); box-shadow: 0 0 0 1px var(--navy); }
    .cc--disabled { opacity: 0.6; }
    .cc__row { display: grid; grid-template-columns: auto 1fr auto; gap: 12px; align-items: start; padding: 14px 16px; cursor: pointer; }
    .cc--disabled .cc__row { cursor: default; }
    input { width: 20px; height: 20px; margin-top: 2px; accent-color: var(--navy); cursor: inherit; }
    .cc__text { display: grid; gap: 2px; min-width: 0; }
    .cc__title { font-weight: 700; color: var(--ink); }
    .cc__desc { font-size: 0.8125rem; line-height: 1.45; color: var(--ink-3); }
    .cc__meta { font-weight: 700; color: var(--ink-2); white-space: nowrap; }
    .cc__extra { padding: 0 16px 16px 48px; }
    .cc__extra:empty { display: none; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckCard {
  readonly inputId = input.required<string>();
  readonly title = input.required<string>();
  readonly description = input('');
  readonly meta = input('');
  readonly checked = model(false);
  readonly disabled = input(false);

  protected onChange(e: Event): void {
    this.checked.set((e.target as HTMLInputElement).checked);
  }
}
