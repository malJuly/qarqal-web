import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18nService } from '../core/i18n.service';
import { QuoteForm } from './quote-form';
import { Speedometer } from './speedometer';
import { StoreBadges } from './store-badges';

@Component({
  selector: 'app-hero',
  imports: [QuoteForm, Speedometer, StoreBadges],
  template: `
    @let t = i18n.t();
    <section class="hero" aria-labelledby="hero-title">
      <!-- Full-width backdrop, in front of the dial and behind everything else. Its top fades out. -->
      <img src="/assets/app/skyline.png" width="1584" height="535" alt="" class="hero__skyline" aria-hidden="true" />

      <!-- Wide desktop: headline | dial with the car in front | form. Narrower: headline and form, stage below.
           Phones: stacked, stage last. -->
      <div class="wrap hero__layout">
        <p class="hero__tagline">{{ t.brand.tagline }}</p>
        <div class="hero__copy">
          <h1 id="hero-title">{{ t.hero.title }}</h1>
          <p class="hero__sub">{{ t.hero.subtitle }}</p>
        </div>

        <div class="hero__side">
          <app-quote-form />
          <div class="hero__stores">
            <app-store-badges />
            <p class="hero__note">{{ t.hero.note }}</p>
          </div>
        </div>

        <div class="stage" aria-hidden="true">
          <div class="stage__dial"><app-speedometer /></div>
          <!-- Phones and tablets: the skyline follows the stage, which sits near the top there. -->
          <img src="/assets/app/skyline.png" width="1584" height="535" alt="" class="stage__skyline" />
          <svg class="stage__road" viewBox="0 0 1200 160" preserveAspectRatio="none">
            <path d="M600 0 L-200 160 M600 0 L1400 160 M600 0 L250 160 M600 0 L950 160" />
          </svg>
          <div class="stage__car">
            <img src="/assets/app/illustration_sedan.png" width="1652" height="1145" alt="" fetchpriority="high" />
            <span class="beam beam--l"></span>
            <span class="beam beam--r"></span>
          </div>
        </div>
      </div>
    </section>`,
  styles: `
    .hero {
      position: relative; overflow: hidden; isolation: isolate;
      color: var(--night-ink);
      background:
        radial-gradient(120% 70% at 50% 0%, rgb(0 158 225 / 0.45) 0%, rgb(0 158 225 / 0) 60%),
        linear-gradient(180deg, var(--night-1) 0%, var(--night-0) 78%);
      padding-top: var(--top-h); /* room for the sticky header that overlaps the hero */
      padding-bottom: 28px;
    }
    /* Layers inside the hero: dial (1) < skyline (2) < everything else (3).
       .hero__layout and .stage get no z-index, so the dial can sit under the hero-level skyline. */
    .hero__layout {
      position: relative;
      display: grid; justify-items: center; padding-top: clamp(8px, 2vw, 24px);
    }
    .hero__tagline, .hero__copy, .hero__side { position: relative; z-index: 3; }
    .hero__copy { text-align: center; display: grid; justify-items: center; }
    .hero__side { width: 100%; max-width: 520px; margin-top: 28px; }
    .hero__stores { margin-top: 20px; text-align: center; }

    /* Phones and tablets: brand line, the dial and car, the form, then the headline. */
    @media (max-width: 1023px) {
      .hero__layout { grid-template-areas: 'tag' 'stage' 'side' 'copy'; }
      .hero__side { margin-top: 20px; }
      .hero__copy { margin-top: 12px; }
      .hero__tagline { grid-area: tag; }
      .stage { grid-area: stage; margin-top: 16px; }
      .hero__copy { grid-area: copy; }
      .hero__side { grid-area: side; }
      .hero__skyline { display: none; }
    }

    /* Desktop: headline and form side by side, the stage under the headline. */
    @media (min-width: 1024px) {
      .hero__layout {
        grid-template-columns: minmax(0, 1.1fr) minmax(380px, 0.9fr);
        grid-template-areas: 'tag tag' 'copy side' 'stage side';
        column-gap: clamp(32px, 4vw, 64px); align-items: start;
        padding-top: 24px;
      }
      .hero__tagline { grid-area: tag; }
      .hero__copy { grid-area: copy; text-align: left; justify-items: start; }
      .hero__side { grid-area: side; margin-top: clamp(20px, 3vw, 32px); max-width: 460px; justify-self: end; } /* top lines up with the h1 */
      .hero__stores ::ng-deep .badges { justify-content: flex-start; --badge-h: 44px; } /* fits the 460px column */
      .hero__stores { text-align: left; }
      .stage { grid-area: stage; align-self: end; }
    }
    /* Wide desktop: three zones. Headline | dial with the car in front | form. */
    @media (min-width: 1200px) {
      .hero__layout {
        max-width: 1320px;
        grid-template-columns: minmax(0, 1fr) 340px 400px;
        grid-template-areas: 'tag tag tag' 'copy stage side';
        column-gap: 32px; align-items: center;
      }
      .hero__copy { align-self: center; }
      .hero__side { max-width: none; margin-top: 24px; }
      .stage { align-self: end; }
    }
    .hero h1 {
      margin-top: clamp(20px, 3vw, 32px);
      max-width: 30ch; font-weight: 900; /* phones: use the full width so it stays at 2-3 lines */
      font-size: clamp(1.75rem, 1.3rem + 1.6vw, 2.5rem); /* hero only: 28px on phones, 40px on desktop */
    }
    /* The Astro original had letter-spacing and colour inside this media block by mistake (invalid CSS, ignored);
       kept as it renders there: only max-width applies. */
    @media (min-width: 900px) { .hero h1 { max-width: 21ch; } }
    :host-context(html[lang^='ta']) .hero h1 { max-width: 24ch; font-size: clamp(1.5rem, 1.1rem + 1.4vw, 2.15rem); }
    /* Phones: small enough that the English headline fits on two lines from 360px up. */
    @media (max-width: 767px) {
      .hero h1 { max-width: none; font-size: 1.3125rem; line-height: 1.2; }
      :host-context(html[lang^='ta']) .hero h1 { max-width: none; font-size: 1.25rem; }
    }
    .hero__sub { margin: 14px auto 0; max-width: 52ch; color: var(--night-ink-2); font-size: 1rem; }
    @media (min-width: 768px) { .hero__sub { font-size: 1.0625rem; } }
    @media (min-width: 1024px) { .hero__sub { margin-inline: 0; } }
    .hero__note { margin-top: 12px; font-size: var(--fs-small); color: var(--night-ink-2); }

    /* Edge to edge: full viewport width, never narrower than 900px so phones keep the towers readable
       (the hero clips the overflow). It sits on the road's horizon, in front of the dial; its top fades out. */
    .hero__skyline {
      position: absolute; z-index: 2; left: 50%; translate: -50% 0;
      bottom: calc(28px + 64px);
      width: max(100vw, 900px); height: auto; max-width: none; opacity: 0.2;
      -webkit-mask-image: linear-gradient(to top, #000 45%, transparent 90%);
      mask-image: linear-gradient(to top, #000 45%, transparent 90%);
    }

    /* Stage: the Q dial at full strength with the car in front, its Q and wordmark showing above the roof.
       The dial's inner logo is sized in px, so it is scaled with zoom. */
    .stage { --dial: 220px; --car: 180px; position: relative; width: 100%; margin-top: 28px; height: calc(var(--dial) * 0.78 + var(--car) * 0.69 + 8px); }
    @media (min-width: 1200px) { .stage { --dial: 340px; --car: 270px; margin-top: 0; } }
    .stage__dial { position: absolute; z-index: 1; top: 0; left: 50%; translate: -50% 0; }
    /* The dial's own width is fluid; pin it to 200px so --dial is exact (200px x zoom). */
    .stage__dial ::ng-deep .dial { width: 200px; zoom: 1.1; }
    @media (min-width: 1200px) { .stage__dial ::ng-deep .dial { zoom: 1.7; } }
    .stage__skyline {
      position: absolute; z-index: 2; left: 50%; bottom: 22%; translate: -50% 0;
      width: max(100vw, 900px); height: auto; max-width: none; opacity: 0.2;
      -webkit-mask-image: linear-gradient(to top, #000 45%, transparent 90%);
      mask-image: linear-gradient(to top, #000 45%, transparent 90%);
    }
    @media (min-width: 1024px) { .stage__skyline { display: none; } }
    .stage__road { position: absolute; z-index: 3; left: -50%; width: 200%; bottom: 0; height: 26%; }
    .stage__road path { fill: none; stroke: rgb(185 196 230 / 0.22); stroke-width: 1; vector-effect: non-scaling-stroke; }
    .stage::after {
      content: ''; position: absolute; left: 50%; bottom: 0; translate: -50% 0;
      width: calc(var(--car) * 2); height: 30%;
      background: radial-gradient(50% 50% at 50% 50%, rgb(0 160 230 / 0.22), rgb(0 160 230 / 0));
      z-index: -1;
    }
    .stage__car { position: absolute; z-index: 3; left: 50%; bottom: 8px; translate: -50% 0; width: var(--car); }
    .stage__car img { width: 100%; filter: brightness(0.92); }
    .beam {
      position: absolute; top: 44%; width: 30%; aspect-ratio: 2 / 1; border-radius: 50%;
      background: radial-gradient(closest-side, rgb(255 255 255 / 0.95), rgb(190 230 255 / 0.55) 35%, rgb(0 160 230 / 0) 100%);
      mix-blend-mode: screen; pointer-events: none;
    }
    .beam--l { left: 9%; }
    .beam--r { right: 9%; }

    /* Brand line, first thing in the hero, as on qarqal.com and the app splash. */
    .hero__tagline {
      margin-top: 8px; text-align: center; color: #fff;
      font-size: clamp(1.25rem, 1rem + 1.2vw, 1.75rem); font-weight: 900; letter-spacing: -0.01em; line-height: 1.2;
    }

    @media (prefers-reduced-motion: no-preference) {
      .beam { animation: lights-on 1.1s var(--ease-out) 1.5s both; }
      .stage__car img { animation: car-in 1.2s var(--ease-out) 0.2s both; }
    }
    @keyframes lights-on { 0% { opacity: 0; } 30% { opacity: 1; } 45% { opacity: 0.35; } 100% { opacity: 1; } }
    @keyframes car-in { from { opacity: 0; transform: translateY(10px) scale(0.98); filter: brightness(0.5); } to { opacity: 1; transform: none; filter: brightness(0.92); } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Hero {
  protected readonly i18n = inject(I18nService);
}
