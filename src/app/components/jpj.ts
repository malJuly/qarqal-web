import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, computed, inject, viewChild } from '@angular/core';
import { I18nService } from '../core/i18n.service';
import { revealOnView } from '../core/in-view';
import { QMark } from './qmark';

// Government services: QarQal's JPJ Rakan Niaga appointment, with the three agencies behind it.
// Crests: JPJ's own crest and the Malaysian coat of arms (Jata Negara) used by both ministries,
// from Wikimedia Commons (Jabatan_Pengangkutan_Jalan.svg, Coat_of_arms_of_Malaysia.svg), as PNGs.
// The names on the ministry cards are part of their logo lockups, so they stay in English, as on the crests.
@Component({
  selector: 'app-jpj',
  imports: [QMark],
  template: `
    @let j = i18n.t().jpj;
    <section class="gov" id="jpj" aria-labelledby="jpj-title" #section>
      <div class="wrap gov__inner">
        <h2 id="jpj-title">{{ j.title }}</h2>
        <p class="gov__lead"><strong>{{ j.lead }}</strong>{{ j.leadRest }}</p>

        <ul class="gov__cards">
          @for (a of agencies(); track a.key) {
            <li>
              <div class="gov__card" [class]="'gov__card--' + a.key">
                <img [src]="a.crest" [attr.width]="a.w" height="320" alt="" class="gov__crest" loading="lazy" />
                @if (a.lockup) { <span class="gov__lockup" aria-hidden="true">{{ a.lockup }}</span> }
              </div>
              <p class="gov__short">{{ a.short }}</p>
              <p class="gov__name">{{ a.name }}</p>
            </li>
          }
        </ul>

        <!-- MOT, JPJ and MOF lines meeting at QarQal. Drawn in when the section comes into view. -->
        <div class="gov__link" aria-hidden="true">
          <svg viewBox="0 0 1000 140" preserveAspectRatio="none">
            <path d="M167 0 C167 80 500 50 500 132" pathLength="1" />
            <path d="M500 0 L500 132" pathLength="1" />
            <path d="M833 0 C833 80 500 50 500 132" pathLength="1" />
          </svg>
          <span class="gov__node"><app-qmark [size]="30" /></span>
        </div>

        <p class="gov__soon"><span class="gov__badge">{{ j.badge }}</span> {{ j.body }}</p>
      </div>
    </section>`,
  styles: `
    .gov {
      color: var(--night-ink); padding-block: clamp(4rem, 3rem + 4vw, 6.5rem);
      background:
        radial-gradient(80% 60% at 50% 0%, rgb(0 158 225 / 0.35), rgb(0 158 225 / 0) 70%),
        linear-gradient(180deg, var(--night-1), var(--night-0));
      overflow: hidden;
    }
    .gov__inner { text-align: center; }

    /* Heading set wide, with a short cyan rule under it. */
    .gov h2 {
      color: #fff; text-transform: uppercase; letter-spacing: 0.32em; font-size: clamp(1.25rem, 1rem + 1.4vw, 2.1rem);
      padding-left: 0.32em; /* balance the trailing letter-space so it centres */
    }
    :host-context(html[lang^='zh']) .gov h2, :host-context(html[lang^='ta']) .gov h2 { letter-spacing: 0.08em; padding-left: 0.08em; }
    .gov h2::after { content: ''; display: block; width: 56px; height: 3px; margin: 18px auto 0; border-radius: 2px; background: var(--cyan-bright); }

    .gov__lead { margin: 1.75rem auto 0; max-width: 56ch; font-size: clamp(1.0625rem, 0.95rem + 0.6vw, 1.375rem); line-height: 1.5; color: var(--night-ink); }
    .gov__lead strong { color: #7fd3f7; font-weight: 900; }

    .gov__cards {
      list-style: none; margin: clamp(2.5rem, 2rem + 2vw, 3.5rem) auto 0; padding: 0; max-width: 1000px;
      display: grid; gap: 28px;
    }
    @media (min-width: 720px) { .gov__cards { grid-template-columns: repeat(3, 1fr); gap: clamp(20px, 3vw, 48px); } }
    /* Phones: three small cards in one row, names below. */
    @media (max-width: 719px) { .gov__cards { grid-template-columns: repeat(3, 1fr); gap: 10px; } }

    .gov__card {
      aspect-ratio: 16 / 10; border-radius: 16px; background: #fff;
      display: grid; place-content: center; justify-items: center; gap: 8px; padding: 14px;
      box-shadow: 0 18px 40px -18px rgb(0 0 0 / 0.45), 0 0 0 1px rgb(255 255 255 / 0.5);
      transition: transform 0.3s var(--ease-out);
    }
    .gov__card:hover { transform: translateY(-4px); }
    .gov__crest { height: clamp(52px, 9vw, 112px); width: auto; }
    .gov__card--jpj .gov__crest { height: clamp(64px, 11vw, 136px); }
    .gov__lockup { font-size: clamp(0.45rem, 0.3rem + 0.6vw, 0.8125rem); font-weight: 900; line-height: 1.2; color: #111; letter-spacing: 0.02em; max-width: 22ch; }
    .gov__short { margin-top: 18px; font-size: clamp(1.25rem, 1rem + 1.4vw, 2.25rem); font-weight: 900; letter-spacing: 0.08em; color: #fff; }
    .gov__name { margin-top: 4px; font-size: clamp(0.75rem, 0.65rem + 0.45vw, 1.0625rem); color: var(--night-ink-2); line-height: 1.35; }
    @media (max-width: 719px) {
      /* Same height for all three so MOT / JPJ / MOF line up. */
      .gov__card { aspect-ratio: auto; height: 84px; border-radius: 10px; padding: 6px; gap: 3px; }
      .gov__crest { height: 44px; }
      .gov__card--jpj .gov__crest { height: 60px; }
      .gov__short { margin-top: 10px; }
      .gov h2 { letter-spacing: 0.16em; padding-left: 0.16em; font-size: 1.125rem; }
    }

    /* Connector: three lines from under the cards, meeting at the Q. */
    .gov__link { position: relative; max-width: 1000px; margin: 14px auto 0; height: clamp(90px, 10vw, 140px); }
    .gov__link svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
    .gov__link path {
      fill: none; stroke: rgb(127 211 247 / 0.75); stroke-width: 2; vector-effect: non-scaling-stroke;
      stroke-dasharray: 1; stroke-dashoffset: 0;
    }
    .gov__node {
      position: absolute; left: 50%; bottom: 0; translate: -50% 50%;
      width: 64px; height: 64px; border-radius: 50%; display: grid; place-items: center;
      background: #fff; color: var(--navy);
      box-shadow: 0 0 0 6px rgb(127 211 247 / 0.18), 0 12px 30px -10px rgb(0 0 0 / 0.45);
    }
    @media (prefers-reduced-motion: no-preference) {
      .gov__link path { stroke-dasharray: 1; stroke-dashoffset: 1; transition: stroke-dashoffset 1.2s var(--ease-out); }
      .gov.is-in .gov__link path { stroke-dashoffset: 0; }
      .gov__node { opacity: 0; scale: 0.6; transition: opacity 0.4s 1s, scale 0.5s 1s var(--ease-out); }
      .gov.is-in .gov__node { opacity: 1; scale: 1; }
    }

    @media (max-width: 719px) {
      .gov { padding-block: 3rem; }
      .gov__lead { margin-top: 1.25rem; }
      .gov__cards { margin-top: 1.75rem; }
      .gov__link { height: 64px; margin-top: 8px; }
    }
    .gov__soon { margin: calc(32px + clamp(1.25rem, 1rem + 1vw, 2rem)) auto 0; max-width: 60ch; color: var(--night-ink-2); font-size: var(--fs-small); }
    .gov__badge {
      display: inline-block; margin-right: 6px; padding: 3px 10px; border-radius: 999px;
      border: 1px solid var(--cyan-bright); color: #7fd3f7; font-weight: 700;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Jpj {
  protected readonly i18n = inject(I18nService);
  private readonly section = viewChild.required<ElementRef<HTMLElement>>('section');
  protected readonly agencies = computed(() => {
    const names = this.i18n.t().jpj.agencies;
    return [
      { key: 'mot', short: 'MOT', crest: '/assets/gov/jata.png', w: 427, lockup: 'MINISTRY OF TRANSPORT MALAYSIA', name: names.mot },
      { key: 'jpj', short: 'JPJ', crest: '/assets/gov/jpj.png', w: 306, lockup: '', name: names.jpj },
      { key: 'mof', short: 'MOF', crest: '/assets/gov/jata.png', w: 427, lockup: 'MINISTRY OF FINANCE', name: names.mof },
    ];
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => destroyRef.onDestroy(revealOnView(this.section().nativeElement, 0.35)));
  }
}
