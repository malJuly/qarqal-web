import { ChangeDetectionStrategy, Component, ElementRef, input, output, viewChild } from '@angular/core';
import { Icon } from '../../components/icon';

/**
 * Popup built on the native <dialog>. By default a modal (focus trap, Esc and backdrop for free); with
 * [blocking]="false" it floats over a page that stays usable.
 * A bottom sheet on phones, a centred card from 640px; as tall as its content. Content goes in the body via <ng-content>.
 *
 *   <app-modal #m [heading]="t.title" [closeLabel]="t.close" [showBack]="step() > 1" (back)="prev()">
 *     ...body...
 *   </app-modal>
 *   m.open() / m.close()
 */
@Component({
  selector: 'app-modal',
  imports: [Icon],
  template: `
    <dialog class="modal" [class.modal--floating]="!blocking()" #dialog [attr.aria-labelledby]="modalId() + '-title'" (close)="onClose()" (cancel)="onCancel($event)">
      <div class="modal__head">
        @if (showBack()) {
          <button type="button" class="modal__icon" [attr.aria-label]="backLabel()" (click)="back.emit()"><app-icon name="arrowLeft" [size]="20" /></button>
        }
        <h2 class="modal__title" [id]="modalId() + '-title'" tabindex="-1" #title>{{ heading() }}</h2>
        <button type="button" class="modal__icon" [attr.aria-label]="closeLabel()" (click)="close()"><app-icon name="x" [size]="20" /></button>
      </div>
      <div class="modal__body"><ng-content /></div>
    </dialog>`,
  styles: `
    /* height: fit-content, not auto: a <dialog> is pinned top and bottom, so "auto" stretches it to max-height. */
    .modal {
      width: 100%; max-width: 100%; height: fit-content; max-height: calc(100% - 24px);
      margin: auto 0 0; padding: 0; border: 0; overflow: auto;
      background: #fff; color: var(--ink); font-family: var(--font);
      border-radius: 20px 20px 0 0; box-shadow: 0 -8px 40px rgb(4 11 36 / 0.25);
    }
    .modal::backdrop { background: rgb(4 11 36 / 0.6); }
    /* Phones: a sheet from the bottom, as tall as its content. Wider: a centred card. */
    .modal[open] { animation: sheet-in 0.28s var(--ease-out); }
    @keyframes sheet-in { from { transform: translateY(24px); opacity: 0; } }
    @media (min-width: 640px) {
      .modal { width: min(var(--modal-width, 440px), calc(100% - 32px)); max-height: calc(100% - 48px); margin: auto; border-radius: var(--radius); box-shadow: 0 24px 60px rgb(4 11 36 / 0.35); }
    }
    /* Non-blocking: no backdrop, the page behind stays usable. A sheet at the bottom on phones, a card in
       the middle of the screen on wider ones, above the sticky header and bars. Clicking outside closes it. */
    .modal--floating { position: fixed; inset: 0; z-index: 90; box-shadow: 0 -8px 40px rgb(4 11 36 / 0.3), 0 0 0 1px var(--line); }
    @media (min-width: 640px) {
      .modal--floating { margin: auto; box-shadow: 0 24px 60px rgb(4 11 36 / 0.35), 0 0 0 1px var(--line); }
    }
    .modal__head { position: sticky; top: 0; z-index: 1; display: flex; align-items: center; gap: 4px; padding: 12px 8px 4px 20px; background: #fff; }
    .modal__title { flex: 1; font-size: 1.25rem; font-weight: 900; letter-spacing: -0.01em; color: var(--navy); outline: none; }
    .modal__icon { display: grid; place-items: center; width: 44px; height: 44px; border: 0; border-radius: 999px; background: none; color: var(--ink-2); cursor: pointer; }
    .modal__icon:hover { background: var(--bg-soft); }
    .modal__icon:focus-visible { outline: 2px solid var(--cyan); outline-offset: -2px; }
    .modal__body { padding: 4px 20px calc(20px + env(safe-area-inset-bottom)); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Modal {
  /** Prefix for element ids; give each modal on a page its own. */
  readonly modalId = input('modal');
  readonly heading = input.required<string>();
  readonly closeLabel = input('Close');
  readonly backLabel = input('Back');
  readonly showBack = input(false);
  /** While true, Esc does nothing (e.g. a request is in flight). The close button still works. */
  readonly locked = input(false);
  /**
   * True (default): a modal — the page behind is dimmed and can't be used until it closes.
   * False: it floats over the page, which stays usable; clicking outside it or pressing Esc closes it.
   * Use false for messages the visitor doesn't have to answer.
   */
  readonly blocking = input(true);

  readonly back = output<void>();
  readonly closed = output<void>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly title = viewChild.required<ElementRef<HTMLElement>>('title');

  open(): void {
    const el = this.dialog().nativeElement;
    if (el.open) return;
    if (this.blocking()) { el.showModal(); return; }
    el.show();
    // A non-modal <dialog> has no light dismiss or Esc of its own.
    document.addEventListener('pointerdown', this.onOutside, true);
    document.addEventListener('keydown', this.onKey);
  }

  close(): void {
    this.dialog().nativeElement.close();
  }

  private readonly onOutside = (e: Event): void => {
    if (!this.dialog().nativeElement.contains(e.target as Node)) this.close();
  };
  private readonly onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && !this.locked()) this.close();
  };

  protected onClose(): void {
    document.removeEventListener('pointerdown', this.onOutside, true);
    document.removeEventListener('keydown', this.onKey);
    this.closed.emit();
  }

  /** Moves focus to the heading, e.g. after the body changes step, so screen readers announce it. */
  focusHeading(): void {
    this.title().nativeElement.focus();
  }

  protected onCancel(e: Event): void {
    if (this.locked()) e.preventDefault();
  }
}
