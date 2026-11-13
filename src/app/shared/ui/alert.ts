import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type AlertTone = 'info' | 'success' | 'error';

/**
 * Coloured message box. Errors are announced (role="alert"), the rest are polite status messages.
 *   <app-alert tone="error">{{ t.failed }}</app-alert>
 */
@Component({
  selector: 'app-alert',
  template: `<div class="alert" [class]="'alert alert--' + tone()" [attr.role]="role()"><ng-content /></div>`,
  styles: `
    .alert { padding: 10px 12px; border-radius: 8px; font-size: var(--fs-small); line-height: 1.45; }
    .alert--info { background: var(--bg-soft); color: var(--ink-2); }
    .alert--success { background: #ecfdf3; color: #067647; font-weight: 700; }
    .alert--error { background: #fef3f2; color: #b42318; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Alert {
  readonly tone = input<AlertTone>('info');
  protected readonly role = computed(() => (this.tone() === 'error' ? 'alert' : 'status'));
}
