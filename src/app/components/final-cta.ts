import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18nService } from '../core/i18n.service';
import { QMark } from './qmark';
import { StoreBadges } from './store-badges';

@Component({
  selector: 'app-final-cta',
  imports: [QMark, StoreBadges],
  template: `
    @let t = i18n.t();
    <section class="final" id="download" aria-labelledby="final-title">
      <img src="/assets/app/skyline.png" width="1584" height="535" alt="" class="final__sky" loading="lazy" />
      <div class="wrap final__inner">
        <app-qmark [size]="44" cls="final__q" />
        <h2 id="final-title">{{ t.cta.title }}</h2>
        <app-store-badges />
        <p class="final__tag">{{ t.brand.tagline }}</p>
      </div>
    </section>`,
  styles: `
    .final {
      position: relative; overflow: hidden; isolation: isolate; color: var(--night-ink);
      padding-block: clamp(4.5rem, 3rem + 6vw, 8rem) clamp(7rem, 5rem + 8vw, 11rem);
      background: linear-gradient(180deg, var(--night-1), var(--night-0));
      text-align: center;
    }
    .final__sky { position: absolute; left: 50%; bottom: 0; translate: -50% 0; height: 62%; width: auto; max-width: none; opacity: 0.18; z-index: -1; }
    .final__inner { display: grid; justify-items: center; }
    .final__inner ::ng-deep .final__q { color: var(--cyan-bright); }
    .final__tag { margin-top: 2.5rem; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; color: var(--night-ink-2); }
    .final h2 { margin: 1.25rem 0 2rem; color: #fff; max-width: 20ch; font-size: var(--fs-h2); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinalCta {
  protected readonly i18n = inject(I18nService);
}
