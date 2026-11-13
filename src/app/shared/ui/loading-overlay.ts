import { ChangeDetectionStrategy, Component, ElementRef, effect, input, viewChild } from '@angular/core';
import { QLoader } from './q-loader';

/**
 * Blocking "please wait" popup: the QarQal loader and a message over a dimmed page. Nothing behind it can
 * be clicked and Esc doesn't close it; it goes away when [open] turns false. Anything projected into it
 * shows under the message and stays clickable (e.g. links that open in a new tab).
 *   <app-loading-overlay [open]="updating()" [message]="t.updatingQuote"><app-get-app /></app-loading-overlay>
 * Use it for short waits where the visitor must not change anything meanwhile.
 */
@Component({
  selector: 'app-loading-overlay',
  imports: [QLoader],
  template: `
    <dialog #dialog class="lo" aria-live="assertive" (cancel)="$event.preventDefault()">
      <app-q-loader [size]="84" />
      <p>{{ message() }}</p>
      <ng-content />
    </dialog>`,
  styles: `
    .lo {
      width: min(400px, calc(100% - 32px)); height: fit-content; margin: auto; padding: 28px 24px; border: 0;
      border-radius: var(--radius); background: #fff; color: var(--ink); font-family: var(--font); text-align: center;
      box-shadow: 0 24px 60px rgb(4 11 36 / 0.35);
    }
    .lo:focus { outline: none; } /* it takes focus only to block the page; there's nothing to act on */
    .lo[open] { display: grid; justify-items: center; gap: 16px; }
    .lo::backdrop { background: rgb(4 11 36 / 0.55); }
    .lo p { font-weight: 700; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingOverlay {
  readonly open = input(false);
  readonly message = input('');

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const el = this.dialog().nativeElement;
      // No showModal during prerender.
      if (typeof el.showModal !== 'function') return;
      if (this.open() && !el.open) el.showModal();
      else if (!this.open() && el.open) el.close();
    });
  }
}
