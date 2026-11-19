import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, computed, inject, input, model, signal } from '@angular/core';
import { Icon } from '../../components/icon';
import type { SelectOption } from './select-field';

/**
 * Labelled dropdown with checkboxes, for picking several values. Same look as a compact SelectField.
 * The button shows the "all" text when nothing is picked, the label when one is, "N selected" otherwise.
 *   <app-multi-select inputId="status" [label]="t.status" [options]="opts" [allLabel]="t.all"
 *     [selectedLabel]="t.nSelected" [clearLabel]="t.clear" [(value)]="statuses" />
 */
@Component({
  selector: 'app-multi-select',
  imports: [Icon],
  template: `
    <div class="ms">
      <span class="ms__label" [id]="inputId() + '-label'">{{ label() }}</span>
      <button type="button" class="ms__btn" [id]="inputId()" [attr.aria-labelledby]="inputId() + '-label ' + inputId()"
        aria-haspopup="listbox" [attr.aria-expanded]="open()" (click)="open.set(!open())">
        <span class="ms__text">{{ summary() }}</span>
        <app-icon name="chevronDown" [size]="16" />
      </button>
      @if (open()) {
        <div class="ms__panel" role="listbox" aria-multiselectable="true" [attr.aria-labelledby]="inputId() + '-label'">
          @for (o of options(); track o.value) {
            <label class="ms__opt">
              <input type="checkbox" [checked]="value().includes(o.value)" (change)="toggle(o.value)" />
              <span>{{ o.label }}</span>
            </label>
          }
          @if (value().length) {
            <button type="button" class="ms__clear" (click)="value.set([])">{{ clearLabel() }}</button>
          }
        </div>
      }
    </div>`,
  styles: `
    :host { display: block; }
    .ms { position: relative; display: grid; gap: 4px; min-width: 0; }
    .ms__label { font-size: 0.75rem; font-weight: 700; color: var(--ink-2); }
    .ms__btn {
      display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; height: 40px; padding: 0 10px;
      font: 400 0.9375rem var(--font); color: var(--ink); text-align: left; cursor: pointer;
      background: #fff; border: 1px solid #c9d1e4; border-radius: 10px;
    }
    .ms__btn:focus-visible { outline: none; border-color: var(--navy); box-shadow: 0 0 0 3px rgb(0 160 230 / 0.28); }
    .ms__btn ::ng-deep svg { color: var(--navy); flex: none; }
    .ms__text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ms__panel {
      position: absolute; top: calc(100% + 4px); left: 0; z-index: 30; min-width: 100%; width: max-content; max-width: 320px;
      max-height: 320px; overflow-y: auto; padding: 6px; background: #fff; border: 1px solid var(--line); border-radius: 10px;
      box-shadow: 0 12px 32px rgb(4 11 36 / 0.16);
    }
    .ms__opt { display: flex; align-items: center; gap: 8px; min-height: 36px; padding: 0 8px; border-radius: 6px; font-size: 0.875rem; cursor: pointer; }
    .ms__opt:hover { background: var(--bg-soft); }
    .ms__opt input { width: 16px; height: 16px; accent-color: var(--navy); }
    .ms__clear { width: 100%; margin-top: 4px; min-height: 32px; border: 0; border-top: 1px solid var(--line); background: none; color: var(--navy); font: 700 0.8125rem var(--font); cursor: pointer; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MultiSelect {
  readonly inputId = input.required<string>();
  readonly label = input.required<string>();
  readonly options = input.required<SelectOption[]>();
  readonly value = model<string[]>([]);
  readonly allLabel = input('All');
  /** "{n} selected" */
  readonly selectedLabel = input('{n} selected');
  readonly clearLabel = input('Clear');

  protected readonly open = signal(false);
  protected readonly summary = computed(() => {
    const picked = this.value();
    if (picked.length === 0) return this.allLabel();
    if (picked.length === 1) return this.options().find((o) => o.value === picked[0])?.label ?? picked[0];
    return this.selectedLabel().replace('{n}', String(picked.length));
  });

  constructor() {
    const host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
    const onDoc = (e: Event): void => {
      if (!this.open()) return;
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !host.contains(e.target as Node)) this.open.set(false);
    };
    afterNextRender(() => {
      document.addEventListener('pointerdown', onDoc);
      document.addEventListener('keydown', onDoc);
    });
    inject(DestroyRef).onDestroy(() => {
      if (typeof document === 'undefined') return;
      document.removeEventListener('pointerdown', onDoc);
      document.removeEventListener('keydown', onDoc);
    });
  }

  protected toggle(v: string): void {
    const cur = this.value();
    this.value.set(cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]);
  }
}
