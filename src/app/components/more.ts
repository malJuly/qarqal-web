import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, computed, inject, viewChild } from '@angular/core';
import { I18nService } from '../core/i18n.service';
import { revealOnView } from '../core/in-view';
import { Icon } from './icon';
import { QMark } from './qmark';

// JPJ services coming to the app: road tax, driving licence and JPJ summons, joined at QarQal
// ("online, in one app"), in the same connector style as the Government services section.
// Wide screens: three cards, lines meeting at the Q below. Phones: stacked cards on a vertical line ending at the Q.
// A card with live: true shows a green "available" tag instead of "coming soon".
@Component({
  selector: 'app-more',
  imports: [Icon, QMark],
  template: `
    @let t = i18n.t();
    <section class="more section" id="services" aria-labelledby="more-title" #section>
      <div class="wrap">
        <h2 id="more-title">{{ t.more.title }}</h2>
        <p class="lede more__lede">{{ t.more.lede }}</p>

        <div class="svc">
          <ul class="svc__cards">
            @for (c of cards(); track c.key) {
              <li class="svc__card" [attr.aria-labelledby]="'svc-' + c.key">
                <div class="svc__top">
                  <span class="svc__ic"><img [src]="c.icon" alt="" width="30" height="30" /></span>
                  <h3 [id]="'svc-' + c.key">{{ c.title }}</h3>
                  <span class="svc__status" [class.svc__status--live]="c.live" [class.svc__status--soon]="!c.live">{{ c.status }}</span>
                </div>
                <ul class="svc__points">
                  @for (p of c.points; track $index) { <li><app-icon name="check" [size]="18" [stroke]="2.25" /><span>{{ p }}</span></li> }
                </ul>
              </li>
            }
          </ul>

          <!-- Wide screens: three lines from under the cards to the Q. -->
          <svg class="svc__lines" viewBox="0 0 1000 120" preserveAspectRatio="none" aria-hidden="true">
            <path d="M167 0 C167 70 500 45 500 112" pathLength="1" />
            <path d="M500 0 L500 112" pathLength="1" />
            <path d="M833 0 C833 70 500 45 500 112" pathLength="1" />
          </svg>
          <div class="svc__hub" aria-hidden="true">
            <span class="svc__node"><app-qmark [size]="28" /></span>
            <span class="svc__hub-label">{{ t.more.hub }}</span>
          </div>
        </div>

        <p class="more__cta"><a class="btn btn--primary" href="#download" data-smart-download>{{ t.nav.download }} QarQal</a></p>
      </div>
    </section>`,
  styles: `
    .more { background: var(--bg-soft); }
    .more h2 { text-align: center; max-width: 24ch; margin-inline: auto; }
    .more__lede { margin: 0.75rem auto 0; text-align: center; }

    .svc { position: relative; margin: clamp(2rem, 1.5rem + 2vw, 3rem) auto 0; max-width: 1000px; }
    .svc__cards { list-style: none; margin: 0; padding: 0; display: grid; gap: 20px; position: relative; }
    /* Phones: one vertical line behind the stacked cards, running down to the Q. */
    .svc__cards::before {
      content: ''; position: absolute; left: 50%; top: 0; bottom: -28px; width: 2px; translate: -50% 0;
      background: linear-gradient(var(--cyan), var(--navy-deep));
    }
    .svc__lines { display: none; }
    @media (min-width: 820px) {
      .svc__cards { grid-template-columns: repeat(3, 1fr); gap: clamp(16px, 2.5vw, 28px); }
      .svc__cards::before { display: none; }
      .svc__lines { display: block; width: 100%; height: clamp(70px, 9vw, 110px); overflow: visible; }
    }
    .svc__lines path { fill: none; stroke: rgb(0 158 225 / 0.6); stroke-width: 2; vector-effect: non-scaling-stroke; }

    .svc__card {
      position: relative; z-index: 1; padding: 22px; border-radius: 18px; background: #fff;
      border: 1px solid var(--line); box-shadow: 0 18px 40px -26px rgb(4 11 36 / 0.35);
      transition: transform 0.3s var(--ease-out), box-shadow 0.3s;
    }
    .svc__card:hover { transform: translateY(-4px); box-shadow: 0 24px 46px -24px rgb(4 11 36 / 0.4); }
    /* Wide screens: icon and status on top, title below. Phones: all three in one row (see below). */
    .svc__top { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 12px; }
    .svc__top h3 { grid-row: 2; grid-column: 1 / -1; }
    .svc__status { grid-column: 3; }
    .svc__ic {
      width: 52px; height: 52px; border-radius: 50%; display: grid; place-items: center;
      background: linear-gradient(135deg, var(--cyan), var(--navy-deep));
    }
    .svc__status { padding: 4px 11px; border-radius: 999px; font-size: 0.8125rem; font-weight: 700; white-space: nowrap; }
    .svc__status--live { background: #e3f6ec; color: #0b6b3a; }
    .svc__status--live::before { content: ''; display: inline-block; width: 7px; height: 7px; margin-right: 6px; border-radius: 50%; background: #12a150; vertical-align: 1px; }
    .svc__status--soon { background: #e6f6fd; color: #0a6c9a; }
    .svc__card h3 { margin-top: 4px; font-size: 1.1875rem; font-weight: 900; }
    /* Phones: one card holding the three services as rows (icon, name, status, one-line summary).
       The repeated points are left out here; desktop keeps them. The phone connector is at the end of this block. */
    @media (max-width: 819px) {
      .more h2 { font-size: 1.5rem; }
      .more__lede { font-size: 0.9375rem; }
      .svc { margin-top: 1.5rem; }
      .svc__cards {
        gap: 0; background: #fff; border: 1px solid var(--line); border-radius: 16px;
        box-shadow: 0 18px 40px -26px rgb(4 11 36 / 0.35);
      }
      .svc__card { padding: 14px 14px 14px 12px; border: 0; border-radius: 0; box-shadow: none; }
      .svc__card + .svc__card { border-top: 1px solid var(--line); }
      .svc__card:hover { transform: none; box-shadow: none; }
      .svc__top { gap: 10px; }
      .svc__top h3 { grid-row: 1; grid-column: 2; margin: 0; font-size: 1rem; line-height: 1.25; }
      .svc__ic { width: 40px; height: 40px; }
      .svc__ic img { width: 24px; height: 24px; }
      .svc__status { font-size: 0.75rem; padding: 3px 9px; }
      .svc__card .svc__points { margin: 2px 0 0 50px; }
      .svc__card .svc__points li { display: block; font-size: 0.875rem; line-height: 1.4; color: var(--ink-3); }
      .svc__card .svc__points li + li, .svc__card .svc__points ::ng-deep svg { display: none; }
      .more__cta { margin-top: 1.25rem; }
    }
    .svc__points { list-style: none; margin: 12px 0 0; padding: 0; display: grid; gap: 8px; }
    .svc__points li { display: grid; grid-template-columns: 22px 1fr; gap: 8px; align-items: start; color: var(--ink-2); }
    .svc__points ::ng-deep svg { margin-top: 3px; color: var(--cyan); }

    /* The QarQal node where all three meet */
    .svc__hub { position: relative; z-index: 1; display: grid; justify-items: center; gap: 8px; margin-top: 28px; }
    @media (min-width: 820px) { .svc__hub { margin-top: -32px; } }
    .svc__node {
      width: 64px; height: 64px; border-radius: 50%; display: grid; place-items: center;
      background: var(--brand-gradient); color: #fff;
      box-shadow: 0 0 0 7px var(--bg-soft), 0 0 0 9px rgb(0 158 225 / 0.25), 0 12px 26px -10px rgb(30 60 150 / 0.55);
    }
    .svc__hub-label { font-size: 0.875rem; font-weight: 900; color: var(--navy); text-align: center; }

    @media (prefers-reduced-motion: no-preference) {
      .svc__lines path { stroke-dasharray: 1; stroke-dashoffset: 1; transition: stroke-dashoffset 1.2s var(--ease-out); }
      .more.is-in .svc__lines path { stroke-dashoffset: 0; }
    }

    .more__cta { margin-top: 1.75rem; text-align: center; }

    /* Phones: a timeline connector. One line runs down through the three service icons and on out of the
       card into the QarQal Q below, labelled "Online, in one app". (Last in the file so it wins over the rules above.)
       Geometry: card border 1px + row padding 12px/14px + icon 40px, so icon centres sit 33px in and 35px down. */
    @media (max-width: 819px) {
      .svc .svc__cards::before {
        display: block; left: 33px; top: 35px; bottom: -41px; width: 2px; translate: -50% 0; z-index: 0;
      }
      .svc .svc__card { background: transparent; } /* the card behind is white; transparent rows let the line show */
      .svc .svc__ic { position: relative; z-index: 1; box-shadow: 0 0 0 4px #fff; }
      .svc .svc__hub { display: flex; align-items: center; gap: 10px; margin-top: 20px; padding-left: 13px; }
      .svc .svc__node { width: 40px; height: 40px; box-shadow: 0 0 0 5px var(--bg-soft), 0 8px 18px -8px rgb(30 60 150 / 0.55); }
      .svc .svc__node ::ng-deep svg { width: 20px; height: auto; }
      .svc .svc__hub-label { text-align: left; }
    }
    @media (max-width: 819px) and (prefers-reduced-motion: no-preference) {
      .svc .svc__cards::before { transform-origin: top; scale: 1 0; transition: scale 1.2s var(--ease-out); }
      .more.is-in .svc .svc__cards::before { scale: 1 1; }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class More {
  protected readonly i18n = inject(I18nService);
  private readonly section = viewChild.required<ElementRef<HTMLElement>>('section');
  protected readonly cards = computed(() => {
    const m = this.i18n.t().more;
    return [
      { key: 'roadtax', icon: '/assets/app/ic_service_road_tax.png', live: false, ...m.roadtax },
      { key: 'licence', icon: '/assets/app/ic_service_license.png', live: false, ...m.licence },
      { key: 'summons', icon: '/assets/app/ic_service_jpj_summons.png', live: false, ...m.summons },
    ];
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => destroyRef.onDestroy(revealOnView(this.section().nativeElement, 0.3)));
  }
}
