import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

export interface PillTab<T extends string = string> {
  id: T;
  label: string;
  /** Optional badge, e.g. number of offers. */
  count?: number;
}

/**
 * Horizontal pill tabs; on phones they share the width equally and wrap long labels. Generic over the tab id.
 *   <app-pill-tabs [tabs]="tabs()" [(selected)]="cover" [ariaLabel]="t.coverLabel" />
 * Put role="tabpanel" on the content it controls.
 */
@Component({
  selector: 'app-pill-tabs',
  template: `
    <div class="tabs" [class.tabs--compact]="compact()" role="tablist" [attr.aria-label]="ariaLabel()">
      @for (tab of tabs(); track tab.id) {
        <button type="button" role="tab" class="tab" [attr.aria-selected]="selected() === tab.id" (click)="selected.set(tab.id)">
          {{ tab.label }}
          @if (tab.count !== undefined) { <span class="tab__count">{{ tab.count }}</span> }
        </button>
      }
    </div>`,
  styles: `
    .tabs { display: flex; gap: 8px; overflow-x: auto; }
    .tab {
      flex: 1 0 auto; min-height: 44px; padding: 0 14px; border: 1px solid var(--line); border-radius: 999px;
      background: #fff; font: 700 0.9375rem var(--font); color: var(--ink-2); cursor: pointer;
    }
    .tab:hover { border-color: var(--navy); }
    .tab[aria-selected='true'] { background: var(--navy); border-color: var(--navy); color: #fff; }
    .tab__count { margin-left: 4px; font-weight: 400; opacity: 0.8; }
    .tab:focus-visible { outline: 3px solid rgb(0 160 230 / 0.5); outline-offset: 2px; }
    /* Compact (always on phones): every tab stays on screen; long labels wrap inside their column. */
    .tabs--compact { gap: 6px; overflow: visible; }
    .tabs--compact .tab { flex: 1 1 0; min-width: 0; padding: 6px 8px; border-radius: 14px; font-size: 0.8125rem; line-height: 1.25; }
    @media (max-width: 639px) {
      .tabs { gap: 6px; overflow: visible; }
      .tab { flex: 1 1 0; min-width: 0; padding: 6px 8px; border-radius: 14px; font-size: 0.8125rem; line-height: 1.25; }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PillTabs<T extends string = string> {
  readonly tabs = input.required<PillTab<T>[]>();
  readonly selected = model.required<T>();
  readonly ariaLabel = input('');
  /** Equal-width tabs with wrapping labels at every screen size, for narrow columns. */
  readonly compact = input(false);
}
