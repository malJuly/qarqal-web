import { ChangeDetectionStrategy, Component, DestroyRef, afterNextRender, inject, signal } from '@angular/core';
import site from '../config/site.json';
import { I18nService } from '../core/i18n.service';

// A slim download bar on phones. It appears after the hero and hides near the final download section.
// It also points every [data-smart-download] link straight at the right store on phones (desktop scrolls to the badges).
@Component({
  selector: 'app-mobile-bar',
  template: `
    @let t = i18n.t();
    <div class="mbar" [hidden]="!ready()" [class.is-on]="on()">
      <span class="mbar__text">{{ t.hero.note }}</span>
      <a class="btn btn--primary" href="#download" data-smart-download>{{ t.nav.download }}</a>
    </div>`,
  styles: `
    .mbar {
      position: fixed; left: 12px; right: 12px; bottom: calc(12px + env(safe-area-inset-bottom)); z-index: 20;
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding: 8px 8px 8px 18px; border-radius: 999px; background: #fff;
      box-shadow: 0 10px 30px rgb(4 11 36 / 0.22), 0 2px 6px rgb(4 11 36 / 0.12);
      transform: translateY(140%); transition: transform 0.45s var(--ease-out);
    }
    .mbar[hidden] { display: none; }
    .mbar.is-on { transform: none; }
    .mbar__text { font-weight: 700; font-size: 0.9375rem; color: var(--ink); }
    @media (min-width: 900px) { .mbar { display: none; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileBar {
  protected readonly i18n = inject(I18nService);
  protected readonly ready = signal(false);
  protected readonly on = signal(false);

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const ua = navigator.userAgent;
      const target = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
        ? site.stores.appStore
        : /HUAWEI|HONOR|HMSCore|HarmonyOS/i.test(ua)
          ? site.stores.appGallery
          : /Android/.test(ua) ? site.stores.googlePlay : null;
      if (target) document.querySelectorAll<HTMLAnchorElement>('[data-smart-download]').forEach((a) => (a.href = target));

      const hero = document.querySelector('.hero');
      const final = document.getElementById('download');
      if (!hero || !final || !('IntersectionObserver' in window)) return;
      this.ready.set(true);
      let pastHero = false, atFinal = false;
      const sync = () => this.on.set(pastHero && !atFinal);
      const a = new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting; sync(); });
      const b = new IntersectionObserver(([e]) => { atFinal = e.isIntersecting; sync(); });
      a.observe(hero);
      b.observe(final);
      destroyRef.onDestroy(() => { a.disconnect(); b.disconnect(); });
    });
  }
}
