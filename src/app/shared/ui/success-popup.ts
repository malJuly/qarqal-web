import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal, viewChild } from '@angular/core';
import { createCountdown } from '../utils/countdown.util';
import { fill } from '../utils/format.util';
import { CountdownDial } from './countdown-dial';
import { Modal } from './modal';

/**
 * A short "it worked" popup: heading, one line, and a speedometer dial counting down the seconds until
 * it closes itself. It doesn't block the page: the visitor can keep using what's behind it, and can
 * close it sooner with the X, Esc or by clicking anywhere outside it.
 *   <app-success-popup #ok modalId="points" [heading]="t.title" [message]="t.body" [closeLabel]="t.close" [seconds]="7"
 *     closingText="Closes in {s} seconds">
 *     …optional extra content under the dial, e.g. app store badges…
 *   </app-success-popup>
 *   ok.show()
 */
@Component({
  selector: 'app-success-popup',
  imports: [Modal, CountdownDial],
  template: `
    <app-modal [modalId]="modalId()" [heading]="heading()" [closeLabel]="closeLabel()" [blocking]="false" (closed)="onClosed()">
      @if (showing()) {
        <div class="success" role="status">
          <p>{{ message() }}</p>
          <app-countdown-dial [max]="seconds()" [value]="needle()" [label]="countdown.remaining()" />
          @if (closingText()) { <p class="closing" aria-hidden="true">{{ closing() }}</p> }
          <ng-content />
        </div>
      }
    </app-modal>`,
  styles: `
    .success { display: grid; justify-items: center; gap: 10px; padding: 4px 0; text-align: center; --dial-size: 132px; }
    .success p { color: var(--ink-2); max-width: 32ch; }
    .success .closing { margin-top: -4px; font-size: 0.8125rem; color: var(--ink-3); font-variant-numeric: tabular-nums; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuccessPopup {
  readonly modalId = input('success');
  readonly heading = input.required<string>();
  readonly message = input('');
  readonly closeLabel = input('Close');
  /** How long it stays open, in whole seconds. */
  readonly seconds = input(7);
  /** Line under the dial saying it closes by itself, with {s} for the seconds left, e.g. "Closes in {s} seconds". */
  readonly closingText = input('');
  /** Fired once when it closes, by itself or by the visitor. */
  readonly closed = output<void>();

  protected readonly countdown = createCountdown();
  /** The body is rendered per showing, so the dial starts fresh each time. */
  protected readonly showing = signal(false);
  /** False for the first frame, so the needle starts at the top and then glides. */
  private readonly moving = signal(false);
  /** The needle heads for the next second while the current one is shown. */
  protected readonly needle = computed(() => (this.moving() ? Math.max(this.countdown.remaining() - 1, 0) : this.seconds()));

  protected readonly closing = computed(() => fill(this.closingText(), { s: this.countdown.remaining() }));

  private readonly modal = viewChild.required(Modal);

  constructor() {
    // Time's up: close. (remaining is 0 before show() too, hence the showing check.)
    effect(() => {
      if (this.showing() && this.moving() && this.countdown.remaining() <= 0) this.modal().close();
    });
  }

  show(): void {
    this.moving.set(false);
    this.showing.set(true);
    this.countdown.start(this.seconds());
    this.modal().open();
    // Next frame: let the dial paint at the top before it starts to fall.
    requestAnimationFrame(() => requestAnimationFrame(() => this.moving.set(true)));
  }

  protected onClosed(): void {
    if (!this.showing()) return;
    this.countdown.stop();
    this.showing.set(false);
    this.closed.emit();
  }
}
