import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, inject, viewChild } from '@angular/core';
import { I18nService } from '../core/i18n.service';
import { Icon } from './icon';
import { INSURERS } from './insurers';
import { QMark } from './qmark';

@Component({
  selector: 'app-trust-strip',
  imports: [Icon, QMark],
  template: `
    @let t = i18n.t().trust;
    <section class="trust" aria-labelledby="trust-title">
      <div class="wrap">
        <h2 id="trust-title" class="trust__title">{{ t.insurersTitle }}</h2>
        <!-- Every insurer visible at once, each joined by a line to QarQal below (the lines run behind the tiles).
             Lines are measured from the real tile positions, so they follow the grid as it reflows. -->
        <div class="net" #net>
          <svg class="net__lines" aria-hidden="true" #lines></svg>
          <ul class="logos">
            @for (i of insurers; track i.name) {
              <li [class.logo--wide]="i.wide" data-net-tile>
                <img [src]="i.logo" [alt]="i.name" width="140" height="48" loading="lazy" />
              </li>
            }
          </ul>
          <span class="net__node" aria-hidden="true" #node><app-qmark [size]="26" /></span>
        </div>
        <p class="trust__note">{{ t.disclaimer }}</p>

        <!-- Government services are separate from insurance, so they get their own heading under a divider. -->
        <div class="gov-strip">
          <h3 class="gov-strip__title">{{ t.govTitle }}</h3>
          <ul class="marks">
            <li><img src="/assets/partners/jpj.png" alt="JPJ" width="38" height="40" /><span>{{ t.rakanNiaga }}</span></li>
            <li><img src="/assets/partners/mof.png" alt="MOF" width="53" height="40" /><span>{{ t.mof }}</span></li>
          </ul>
          <a class="gov-strip__more" href="#jpj">{{ t.govMore }} <app-icon name="arrowRight" [size]="16" /></a>
        </div>
      </div>
    </section>`,
  styles: `
    .trust { padding-block: clamp(3rem, 2rem + 4vw, 5rem); border-bottom: 1px solid var(--line); }
    .trust__title { font-size: 1.25rem; font-weight: 900; letter-spacing: 0; color: var(--ink); text-align: center; }
    /* Tiles in centred rows, so a short last row (11 insurers: 6 + 5, or 4 + 4 + 3) stays balanced. */
    .logos {
      --cols: 4; --gap: 8px;
      list-style: none; margin: 1.75rem 0 0; padding: 0;
      display: flex; flex-wrap: wrap; justify-content: center; gap: var(--gap);
    }
    @media (min-width: 640px) { .logos { --cols: 6; --gap: 12px; } }
    .logos li {
      flex: 0 0 calc((100% - (var(--cols) - 1) * var(--gap)) / var(--cols));
      display: grid; place-items: center; height: 88px; padding: 16px 18px;
      border: 1px solid var(--line); border-radius: 12px; background: #fff;
      transition: transform 0.25s var(--ease-out), box-shadow 0.25s, border-color 0.25s;
    }
    .logos li:hover { transform: translateY(-3px); border-color: #c9d1e4; box-shadow: 0 10px 22px -12px rgb(4 11 36 / 0.3); }
    .logos img { max-height: 40px; width: auto; max-width: 100%; object-fit: contain; }
    @media (max-width: 639px) { .logos li { height: 60px; padding: 8px 6px; border-radius: 10px; } .logos img { max-height: 28px; } }
    /* Very wide wordmarks (about 7:1 and up) get the tile's full width. */
    .logos li.logo--wide { padding-inline: 8px; }
    @media (max-width: 639px) { .logos li.logo--wide { padding-inline: 4px; } }
    /* Lines from every insurer meeting at QarQal (the paths are drawn by the script, hence ::ng-deep) */
    .net { position: relative; margin-top: 1.75rem; }
    .net .logos { position: relative; z-index: 1; margin-top: 0; }
    .net__lines { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; z-index: 0; pointer-events: none; }
    .net__lines ::ng-deep path {
      fill: none; stroke: rgb(30 60 150 / 0.22); stroke-width: 1.5; vector-effect: non-scaling-stroke;
      transition: stroke 0.2s, stroke-width 0.2s;
    }
    .net__lines ::ng-deep path.on { stroke: var(--cyan); stroke-width: 2.5; }
    .net__node {
      position: relative; z-index: 1; margin: clamp(36px, 5vw, 56px) auto 0; width: 56px; height: 56px; border-radius: 50%;
      display: grid; place-items: center; background: var(--brand-gradient); color: #fff;
      box-shadow: 0 0 0 6px rgb(0 158 225 / 0.12), 0 10px 24px -10px rgb(30 60 150 / 0.5);
    }
    @media (prefers-reduced-motion: no-preference) {
      .net__lines ::ng-deep path { stroke-dasharray: 1; stroke-dashoffset: 1; }
      .net.is-in .net__lines ::ng-deep path { stroke-dashoffset: 0; transition: stroke-dashoffset 1.1s var(--ease-out), stroke 0.2s, stroke-width 0.2s; }
      .net__node { opacity: 0; scale: 0.6; transition: opacity 0.4s 0.9s, scale 0.5s 0.9s var(--ease-out); }
      .net.is-in .net__node { opacity: 1; scale: 1; }
    }
    .trust__note { margin-top: 1rem; text-align: center; font-size: var(--fs-small); color: var(--ink-3); }

    @media (max-width: 639px) {
      .logos li { height: 52px; }
      .net__node { margin-top: 28px; width: 46px; height: 46px; }
      .trust__note { margin-top: 0.75rem; }
    }
    .gov-strip { margin-top: clamp(1.75rem, 1.25rem + 2vw, 2.5rem); padding-top: clamp(1.5rem, 1.25rem + 1vw, 2rem); border-top: 1px solid var(--line); text-align: center; }
    .gov-strip__title { font-size: 1.25rem; font-weight: 900; color: var(--ink); }
    .gov-strip__more { display: inline-flex; align-items: center; gap: 4px; min-height: 44px; margin-top: 0.75rem; font-weight: 700; font-size: var(--fs-small); color: var(--navy); }
    .marks {
      list-style: none; margin: 1.25rem 0 0; padding: 0;
      display: flex; flex-wrap: wrap; justify-content: center; gap: 10px 36px;
    }
    .marks li { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 0.9375rem; color: var(--ink); }
    .marks img { height: 40px; width: auto; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrustStrip {
  protected readonly i18n = inject(I18nService);
  protected readonly insurers = INSURERS;
  private readonly net = viewChild.required<ElementRef<HTMLElement>>('net');
  private readonly lines = viewChild.required<ElementRef<SVGSVGElement>>('lines');
  private readonly node = viewChild.required<ElementRef<HTMLElement>>('node');

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const net = this.net().nativeElement;
      const svg = this.lines().nativeElement;
      const node = this.node().nativeElement;
      const tiles = [...net.querySelectorAll<HTMLElement>('[data-net-tile]')];
      const draw = () => {
        const box = net.getBoundingClientRect();
        const n = node.getBoundingClientRect();
        const nx = n.left + n.width / 2 - box.left, ny = n.top + n.height / 2 - box.top;
        svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
        svg.innerHTML = tiles.map((tile, i) => {
          const r = tile.getBoundingClientRect();
          const x = r.left + r.width / 2 - box.left, y = r.top + r.height / 2 - box.top, my = (y + ny) / 2;
          return `<path d="M${x} ${y} C${x} ${my} ${nx} ${my} ${nx} ${ny}" pathLength="1" data-i="${i}" />`;
        }).join('');
      };
      draw();
      const ro = new ResizeObserver(draw);
      ro.observe(net);
      destroyRef.onDestroy(() => ro.disconnect());
      // Hovering a logo brightens its line.
      tiles.forEach((tile, i) => {
        tile.addEventListener('pointerenter', () => svg.querySelector(`[data-i="${i}"]`)?.classList.add('on'));
        tile.addEventListener('pointerleave', () => svg.querySelector(`[data-i="${i}"]`)?.classList.remove('on'));
      });
      if (!('IntersectionObserver' in window)) { net.classList.add('is-in'); return; }
      const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { net.classList.add('is-in'); io.disconnect(); } }, { threshold: 0.3 });
      io.observe(net);
      destroyRef.onDestroy(() => io.disconnect());
    });
  }
}
