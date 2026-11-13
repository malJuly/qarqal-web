import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
// Outline icons from Tabler (one stroke weight across the page), imported as SVG text.
import home from '@tabler/icons/outline/home.svg';
import check from '@tabler/icons/outline/check.svg';
import chevronDown from '@tabler/icons/outline/chevron-down.svg';
import play from '@tabler/icons/outline/player-play.svg';
import shieldCheck from '@tabler/icons/outline/shield-check.svg';
import bell from '@tabler/icons/outline/bell.svg';
import carCrane from '@tabler/icons/outline/car-crane.svg';
import clock24 from '@tabler/icons/outline/clock-24.svg';
import arrowRight from '@tabler/icons/outline/arrow-right.svg';
import arrowLeft from '@tabler/icons/outline/arrow-left.svg';
import lock from '@tabler/icons/outline/lock.svg';
import world from '@tabler/icons/outline/world.svg';
import download from '@tabler/icons/outline/download.svg';
import user from '@tabler/icons/outline/user.svg';
import compass from '@tabler/icons/outline/compass.svg';
import message from '@tabler/icons/outline/message-chatbot.svg';
import menu from '@tabler/icons/outline/menu-2.svg';
import car from '@tabler/icons/outline/car.svg';
import x from '@tabler/icons/outline/x.svg';
import search from '@tabler/icons/outline/search.svg';

const icons = { home, check, chevronDown, play, shieldCheck, bell, carCrane, clock24, arrowRight, arrowLeft, lock, world, download, user, compass, message, menu, car, x, search };
export type IconName = keyof typeof icons;

/**
 * <app-icon name="check" /> renders the SVG inline. The host uses display: contents, so the <svg> is the
 * element that takes part in layout. A parent styling it by class needs ::ng-deep (the SVG is this component's DOM).
 */
@Component({
  selector: 'app-icon',
  template: '',
  host: { '[innerHTML]': 'svg()', style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Icon {
  private readonly sanitizer = inject(DomSanitizer);
  readonly name = input.required<IconName>();
  readonly size = input(24);
  readonly stroke = input(1.75);
  readonly cls = input<string>();

  protected readonly svg = computed<SafeHtml>(() => {
    const cls = this.cls();
    const markup = icons[this.name()]
      .replace(/width="24"/, `width="${this.size()}"`)
      .replace(/height="24"/, `height="${this.size()}"`)
      .replace(/stroke-width="2"/, `stroke-width="${this.stroke()}"`)
      .replace('<svg', `<svg aria-hidden="true" focusable="false"${cls ? ` class="${cls}"` : ''}`)
      .replace(/<!--[\s\S]*?-->/g, '');
    // Trusted: the markup comes from the bundled Tabler files above, never from user input.
    return this.sanitizer.bypassSecurityTrustHtml(markup);
  });
}
