import { ChangeDetectionStrategy, Component, input, output, viewChild } from '@angular/core';
import { Modal } from './modal';

/**
 * Asks before doing something the visitor might not expect (leaving a page, discarding choices).
 *   <app-confirm-dialog #c modalId="leave" [heading]="t.title" [message]="t.body"
 *     [confirmLabel]="t.yes" [cancelLabel]="t.no" [closeLabel]="t.close" (confirmed)="leave()" />
 *   c.open()
 * Cancel, the X and Esc all just close it. The safe choice (cancel) is the primary button.
 */
@Component({
  selector: 'app-confirm-dialog',
  imports: [Modal],
  template: `
    <app-modal [modalId]="modalId()" [heading]="heading()" [closeLabel]="closeLabel()">
      <p class="msg">{{ message() }}</p>
      <div class="actions">
        <button type="button" class="btn btn--primary" (click)="modal().close()">{{ cancelLabel() }}</button>
        <button type="button" class="link" (click)="confirm()">{{ confirmLabel() }}</button>
      </div>
    </app-modal>`,
  styles: `
    .msg { color: var(--ink-2); }
    .actions { margin-top: 20px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; }
    .actions .btn { flex: 1 1 180px; }
    .link { min-height: 44px; padding: 0 4px; background: none; border: 0; cursor: pointer; font: 700 1rem var(--font); color: var(--navy); text-decoration: underline; text-underline-offset: 0.2em; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialog {
  readonly modalId = input('confirm');
  readonly heading = input.required<string>();
  readonly message = input('');
  readonly confirmLabel = input.required<string>();
  readonly cancelLabel = input.required<string>();
  readonly closeLabel = input('Close');
  readonly confirmed = output<void>();

  protected readonly modal = viewChild.required(Modal);

  open(): void {
    this.modal().open();
  }

  protected confirm(): void {
    this.modal().close();
    this.confirmed.emit();
  }
}
