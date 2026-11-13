import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { siHuawei } from 'simple-icons';
import site from '../config/site.json';
import { I18nService } from '../core/i18n.service';

// Official store badges. Apple: toolbox.marketingtools.apple.com. Google: play.google.com/intl/en_us/badges (transparent padding trimmed).
// AppGallery's official badge is only issued from AppGallery Connect (Grow > AppGallery Download > Badge);
// until it is added to public/assets/stores/, a look-alike drawn to the same height and border stands in.
@Component({
  selector: 'app-store-badges',
  template: `
    @let s = i18n.t().stores;
    <ul class="badges" [class]="'badges--' + align()" [class.badges--animated]="animated()">
      <li>
        <a class="badge" [href]="stores.appStore" target="_blank" rel="noopener" data-store="appStore">
          <img src="/assets/stores/app-store.svg" [alt]="s.appStore.pre + ' ' + s.appStore.name" width="144" height="48" />
        </a>
      </li>
      <li>
        <a class="badge" [href]="stores.googlePlay" target="_blank" rel="noopener" data-store="googlePlay">
          <img src="/assets/stores/google-play.png" [alt]="s.googlePlay.pre + ' ' + s.googlePlay.name" width="161" height="48" />
        </a>
      </li>
      <li>
        <a class="badge badge--drawn" [href]="stores.appGallery" target="_blank" rel="noopener" data-store="appGallery">
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path [attr.d]="huawei" fill="#c7000b" /></svg>
          <span class="badge__text"><span class="badge__pre">{{ s.appGallery.pre }}</span><span class="badge__name">{{ s.appGallery.name }}</span></span>
        </a>
      </li>
    </ul>`,
  styles: `
    /* Always one row. Every badge is sized from --badge-h; on narrow phones it shrinks so the row fits
       (the three badges together are about 9.6 heights wide, plus two 8px gaps). */
    :host { display: contents; }
    .badges {
      --badge-h: var(--store-badge-h, 48px); /* a parent can set --store-badge-h for a tighter space */
      list-style: none; margin: 0; padding: 0;
      display: flex; flex-wrap: nowrap; gap: 8px;
    }
    @media (max-width: 520px) { .badges { --badge-h: var(--store-badge-h, calc((100vw - 2 * var(--gutter) - 16px) / 9.6)); } }
    .badges--center { justify-content: center; }
    .badges--start { justify-content: flex-start; }
    .badge {
      display: block; border-radius: calc(var(--badge-h) / 6);
      transition: transform 0.25s var(--ease-out);
    }
    .badge:hover { transform: translateY(-2px); }
    .badge img { height: var(--badge-h); width: auto; max-width: none; }
    .badge--drawn {
      font-size: calc(var(--badge-h) / 3); /* 16px at 48px tall */
      display: inline-flex; align-items: center; gap: 0.5em;
      height: var(--badge-h); padding: 0 0.875em 0 0.7em; border-radius: 0.5em;
      background: #000; color: #fff; border: 1px solid #a6a6a6; text-decoration: none; white-space: nowrap;
    }
    .badge--drawn svg { width: 1.5em; height: 1.5em; flex: none; }
    .badge__text { display: flex; flex-direction: column; line-height: 1.1; text-align: left; }
    .badge__pre { font-size: 0.625em; letter-spacing: 0.02em; }
    .badge__name { font-size: 1.125em; font-weight: 700; letter-spacing: -0.01em; }

    /* Animated (promo popups). Off under reduced motion (global rule in styles.css).
       1. Pop in one after another with a springy overshoot.
       2. Then a wave on a loop: each badge in turn hops, tilts and lands with a small bounce,
          while a QarQal-blue glow flares around it.
       3. A light sweeps across each badge between hops. */
    .badges--animated { --wave: 2.6s; padding-block: 10px 4px; }
    .badges--animated li { animation: badge-in 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both, badge-hop var(--wave) cubic-bezier(0.3, 0, 0.3, 1) 0.9s infinite; }
    .badges--animated li:nth-child(2) { animation-delay: 0.14s, 1.2s; }
    .badges--animated li:nth-child(3) { animation-delay: 0.28s, 1.5s; }
    .badges--animated .badge { position: relative; overflow: hidden; animation: badge-glow var(--wave) ease-out 0.9s infinite; }
    .badges--animated li:nth-child(2) .badge { animation-delay: 1.2s; }
    .badges--animated li:nth-child(3) .badge { animation-delay: 1.5s; }
    .badges--animated .badge::after {
      content: ''; position: absolute; top: 0; bottom: 0; left: -70%; width: 50%; pointer-events: none;
      background: linear-gradient(100deg, rgb(255 255 255 / 0) 0%, rgb(255 255 255 / 0.7) 50%, rgb(255 255 255 / 0) 100%);
      transform: skewX(-18deg); animation: badge-shine var(--wave) ease-in-out 1.35s infinite;
    }
    .badges--animated li:nth-child(2) .badge::after { animation-delay: 1.65s; }
    .badges--animated li:nth-child(3) .badge::after { animation-delay: 1.95s; }
    @keyframes badge-in {
      from { opacity: 0; transform: translateY(22px) scale(0.6) rotate(-6deg); }
      to { opacity: 1; transform: none; }
    }
    @keyframes badge-hop {
      0%, 46%, 100% { transform: none; }
      12% { transform: translateY(-10px) scale(1.09) rotate(-3deg); }
      24% { transform: translateY(0) scale(0.97, 1.02) rotate(1deg); }
      32% { transform: translateY(-4px) scale(1.02) rotate(0deg); }
      40% { transform: translateY(0); }
    }
    @keyframes badge-glow {
      0%, 46%, 100% { box-shadow: 0 0 0 0 rgb(0 158 225 / 0); }
      12% { box-shadow: 0 0 0 3px rgb(0 158 225 / 0.55), 0 8px 22px 2px rgb(0 158 225 / 0.6); }
      30% { box-shadow: 0 0 0 7px rgb(0 158 225 / 0), 0 4px 14px rgb(0 158 225 / 0.25); }
    }
    @keyframes badge-shine { 0% { left: -70%; } 30%, 100% { left: 140%; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StoreBadges {
  protected readonly i18n = inject(I18nService);
  readonly align = input<'center' | 'start'>('center');
  /** Pop-in, a looping hop-and-glow wave and a light sweep, for promo spots. */
  readonly animated = input(false);
  protected readonly stores = site.stores;
  protected readonly huawei = siHuawei.path;
}
