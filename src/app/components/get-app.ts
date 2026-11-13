import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { I18nService } from '../core/i18n.service';
import { Icon } from './icon';
import { StoreBadges } from './store-badges';

/**
 * "Get the QarQal app" promo: a short line and the three store badges (App Store, Google Play, AppGallery),
 * which open each store in a new tab exactly as on the landing page. The badges pop in one after another,
 * then hop and glow in a wave with a light sweeping across them; a download arrow bounces by the caption.
 *   <app-get-app [badgeHeight]="32" />
 * Made to drop into popups and loading states.
 */
@Component({
  selector: 'app-get-app',
  imports: [StoreBadges, Icon],
  template: `
    <div class="getapp" [style.--store-badge-h]="'min(' + badgeHeight() + 'px, calc((100vw - ' + gutter() + 'px) / 9.6))'">
      <p><span class="arrow" aria-hidden="true"><app-icon name="download" [size]="16" /></span>{{ text() || i18n.t().quoteFlow.success.app }}</p>
      <app-store-badges [animated]="true" />
    </div>`,
  styles: `
    .getapp { display: grid; justify-items: center; gap: 10px; width: 100%; padding-top: 12px; border-top: 1px solid var(--line); }
    p { display: inline-flex; align-items: center; gap: 8px; font-size: var(--fs-small); font-weight: 700; color: var(--navy); text-align: center; }
    /* A download arrow that keeps dropping into its tray. */
    .arrow { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 999px; background: linear-gradient(120deg, var(--navy-deep), var(--cyan)); color: #fff; animation: drop 1.3s cubic-bezier(0.3, 0, 0.3, 1) infinite; }
    @keyframes drop { 0%, 100% { transform: translateY(-3px); } 55% { transform: translateY(3px); } 70% { transform: translateY(1px); } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GetApp {
  protected readonly i18n = inject(I18nService);
  /** The line above the badges; defaults to "Get the QarQal app". */
  readonly text = input('');
  /** Badge height in px; it shrinks on narrow screens so the three stay on one row. */
  readonly badgeHeight = input(32);
  /** Space taken by everything beside the badges (page and popup padding), used to fit them on phones. */
  readonly gutter = input(56);
}
