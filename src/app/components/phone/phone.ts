import { ChangeDetectionStrategy, Component, input } from '@angular/core';

// A plain device frame. Screens inside are rebuilt from the Flutter widgets, in the app's own English.
// interactive: the screen has real controls (see QuoteScreen), so it is a labelled group, not an image.
@Component({
  selector: 'app-phone',
  template: `
    <figure class="phone-fig">
      <div class="phone" [attr.role]="interactive() ? 'group' : 'img'" [attr.aria-label]="label()">
        <div class="phone__screen" lang="en"><ng-content /></div>
      </div>
      @if (caption()) { <figcaption>{{ caption() }}</figcaption> }
    </figure>`,
  styles: `
    .phone-fig { margin: 0; display: grid; justify-items: center; gap: 14px; }
    .phone {
      width: 292px; height: 612px; padding: 9px; border-radius: 46px;
      background: #0b1020;
      box-shadow:
        0 0 0 1px rgb(255 255 255 / 0.06) inset,
        0 30px 60px -18px rgb(4 11 36 / 0.45),
        0 14px 24px -12px rgb(4 11 36 / 0.3);
    }
    .phone__screen {
      position: relative; width: 100%; height: 100%; overflow: hidden; border-radius: 38px;
      background: #fff; font-family: 'Lato', system-ui, sans-serif; color: #111;
      font-size: 11px; line-height: 1.35; letter-spacing: 0;
    }
    /* Phones: show the mockup at 75% (inner UI is sized in px, so zoom rather than resize). */
    @media (max-width: 639px) { .phone { zoom: 0.75; } }
    figcaption { font-size: 0.8125rem; color: var(--ink-3); text-align: center; max-width: 34ch; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Phone {
  readonly label = input.required<string>();
  readonly caption = input<string>();
  readonly interactive = input(false);
}
