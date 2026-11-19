import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'brand';

/**
 * Small rounded status label.
 *   <app-badge tone="success">Live</app-badge>
 */
@Component({
  selector: 'app-badge',
  template: `<span class="badge" [class]="'badge badge--' + tone()"><ng-content /></span>`,
  styles: `
    .badge { display: inline-flex; align-items: center; padding: 2px 10px; border-radius: 999px; font-size: 0.75rem; font-weight: 700; white-space: nowrap; }
    .badge--neutral { background: var(--bg-soft); color: var(--ink-2); }
    .badge--info { background: #e6f6fd; color: #00669a; }
    .badge--success { background: #eaf1ff; color: var(--navy); }
    .badge--warning { background: #fffaeb; color: #b54708; }
    .badge--danger { background: #fef3f2; color: #b42318; }
    .badge--brand { background: var(--navy); color: #fff; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Badge {
  readonly tone = input<BadgeTone>('neutral');
}
