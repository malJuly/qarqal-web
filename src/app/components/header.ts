import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, computed, inject, input, signal, viewChild } from '@angular/core';
import site from '../config/site.json';
import { environment } from '../../environments/environment';
import { I18nService } from '../core/i18n.service';
import { Icon } from './icon';

type NavId = 'insurance' | 'calculator' | 'services' | 'assist' | 'faq' | 'about';

@Component({
  selector: 'app-header',
  imports: [Icon],
  template: `
    @let t = i18n.t();
    <header class="top" [class.top--solid]="page() !== 'home'" [class.is-stuck]="stuck()">
      <div class="wrap top__row">
        <a [href]="i18n.home()" class="top__brand" aria-label="QarQal">
          <img src="/assets/app/logo.png" alt="" width="122" height="40" />
        </a>
        <nav class="top__nav" [attr.aria-label]="t.nav.menu">
          <ul>
            @for (l of links(); track l.id) {
              <li><a [href]="i18n.home() + '#' + l.id" (click)="closeMenu()" [attr.aria-current]="active() === l.id ? 'true' : null">{{ l.label }}</a></li>
            }
            <li><a [href]="privacyPath()" [attr.aria-current]="page() === 'privacy' ? 'page' : null">{{ t.nav.links.privacy }}</a></li>
          </ul>
        </nav>
        <div class="top__actions">
          <details class="lang">
            <summary>
              <app-icon name="world" [size]="18" cls="lang__world" />
              <span>{{ i18n.current().label }}</span>
              <span class="sr-only">{{ t.nav.language }}</span>
              <app-icon name="chevronDown" [size]="16" cls="lang__chev" />
            </summary>
            <ul>
              @for (l of languages; track l.code) {
                <li>
                  <a [href]="l.path + subpath()" [attr.lang]="l.code" [attr.hreflang]="l.code" [attr.aria-current]="l.code === i18n.lang() ? 'true' : null">{{ l.name }}</a>
                </li>
              }
            </ul>
          </details>
          <a class="btn btn--light top__cta" [href]="i18n.home() + '#download'" data-smart-download>
            <app-icon name="download" [size]="20" cls="top__cta-icon" />
            <span class="top__cta-text">{{ t.nav.download }}</span>
          </a>
          <details class="menu" #menu>
            <summary [attr.aria-label]="t.nav.menu"><app-icon name="menu" [size]="22" /></summary>
            <ul>
              @for (l of links(); track l.id) {
                <li><a [href]="i18n.home() + '#' + l.id" (click)="closeMenu()" [attr.aria-current]="active() === l.id ? 'true' : null">{{ l.label }}</a></li>
              }
              <li><a [href]="privacyPath()" [attr.aria-current]="page() === 'privacy' ? 'page' : null">{{ t.nav.links.privacy }}</a></li>
            </ul>
          </details>
        </div>
      </div>
    </header>`,
  styles: `
    /* Sticky across the page. Transparent over the hero; turns solid night once the page scrolls.
       The hero reserves --top-h of space for it (see hero.ts). */
    :host { display: contents; }
    .top {
      position: sticky; top: 0; z-index: 30;
      height: var(--top-h); margin-bottom: calc(-1 * var(--top-h));
      display: flex; align-items: center; color: var(--night-ink);
      border-bottom: 1px solid transparent;
      transition: background-color 0.25s, border-color 0.25s, box-shadow 0.25s;
    }
    /* Pages without the blue hero: solid from the start, and no overlap. */
    .top.top--solid { margin-bottom: 0; }
    .top.top--solid, .top.is-stuck {
      background: rgb(30 60 150 / 0.96); border-bottom-color: var(--night-line);
      box-shadow: 0 6px 20px rgb(4 11 36 / 0.25);
    }
    .top__row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    /* Same width as the hero's three-zone layout, so seven links fit (Tamil is the longest). */
    @media (min-width: 1200px) { .top__row { max-width: 1320px; } }
    .top__brand img { width: 110px; }
    @media (min-width: 768px) { .top__brand img { width: 122px; } }
    .top__brand { flex: none; }
    .top__actions { display: flex; align-items: center; gap: 8px; }
    .top__cta ::ng-deep .top__cta-icon { display: none; }
    /* Small phones: icon-only download so the logo keeps its size (long labels in Tamil and BM). */
    @media (max-width: 400px) {
      .top__cta { width: 44px; min-height: 44px; padding: 0; }
      .top__cta ::ng-deep .top__cta-icon { display: block; }
      .top__cta-text { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
    }
    .top__cta { min-height: 40px; padding-inline: 1rem; font-size: 0.9375rem; white-space: nowrap; }
    .lang summary { flex: none; white-space: nowrap; }
    @media (max-width: 420px) { .lang summary ::ng-deep .lang__world { display: none; } .top__brand img { width: 96px; } }

    /* Desktop links */
    .top__nav { display: none; }
    @media (min-width: 1200px) {
      .top__nav { display: block; }
      .top__nav ul { display: flex; gap: 4px; margin: 0; padding: 0; list-style: none; }
      .top__nav a {
        display: inline-flex; align-items: center; min-height: 40px; padding: 0 10px; border-radius: 999px;
        color: var(--night-ink); text-decoration: none; font-weight: 700; font-size: 0.9375rem; white-space: nowrap;
        transition: background-color 0.2s;
      }
      .top__nav a:hover { background: rgb(255 255 255 / 0.1); }
      :host-context(html[lang^='ta']) .top__nav a { font-size: 0.8125rem; padding: 0 8px; }
      .top__nav a[aria-current] { background: rgb(255 255 255 / 0.16); color: #fff; }
    }

    /* Phone menu */
    .menu { position: relative; color: var(--night-ink); }
    @media (min-width: 1200px) { .menu { display: none; } }
    /* Tamil labels run longest: keep the menu button until there is room for every link inline. */
    @media (min-width: 1200px) and (max-width: 1319px) {
      :host-context(html[lang^='ta']) .top__nav { display: none; }
      :host-context(html[lang^='ta']) .menu { display: block; }
    }
    .menu summary {
      list-style: none; display: grid; place-items: center; width: 44px; height: 44px; border-radius: 999px;
      cursor: pointer; border: 1px solid var(--night-line);
    }
    .menu summary::-webkit-details-marker { display: none; }
    .menu ul {
      position: absolute; right: 0; top: calc(100% + 8px); margin: 0; padding: 6px; list-style: none;
      min-width: 200px; background: #fff; border-radius: 12px;
      box-shadow: 0 12px 32px rgb(4 11 36 / 0.28), 0 2px 6px rgb(4 11 36 / 0.16);
    }
    .menu a { display: flex; align-items: center; min-height: 44px; padding: 0 12px; border-radius: 8px; color: var(--ink); text-decoration: none; font-weight: 700; }
    .menu a:hover, .menu a[aria-current] { background: var(--bg-soft); color: var(--navy); }

    .lang { position: relative; color: var(--night-ink); }
    .lang summary {
      list-style: none; display: inline-flex; align-items: center; gap: 6px;
      min-height: 40px; padding: 0 10px; border-radius: 999px; cursor: pointer;
      font-weight: 700; font-size: 0.9375rem; border: 1px solid var(--night-line);
    }
    .lang summary::-webkit-details-marker { display: none; }
    .lang summary:hover { border-color: rgb(234 237 247 / 0.5); }
    .lang[open] ::ng-deep .lang__chev { transform: rotate(180deg); }
    .lang ul {
      position: absolute; right: 0; top: calc(100% + 8px); margin: 0; padding: 6px; list-style: none;
      min-width: 180px; background: #fff; border-radius: 12px;
      box-shadow: 0 12px 32px rgb(4 11 36 / 0.28), 0 2px 6px rgb(4 11 36 / 0.16);
    }
    .lang a { display: block; padding: 10px 12px; border-radius: 8px; color: var(--ink); text-decoration: none; font-weight: 700; }
    .lang a:hover { background: var(--bg-soft); }
    .lang a[aria-current] { color: var(--navy); background: var(--bg-soft); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
  protected readonly i18n = inject(I18nService);
  /** A legal page (no blue hero) gets a solid header; its links point back to the home sections. */
  readonly page = input<'home' | 'privacy' | 'terms' | 'quote'>('home');
  /** That page's path under each language root, so the language switcher stays on the same page. */
  readonly subpath = input('');

  protected readonly languages = site.languages;
  protected readonly stuck = signal(false);
  protected readonly active = signal<NavId | null>(null);
  private readonly menu = viewChild.required<ElementRef<HTMLDetailsElement>>('menu');

  // "Calculator" only when that section is on the page (it needs environment.apiBaseUrl, or `ng serve`; see calculator.ts).
  private readonly hasCalculator = Boolean(environment.apiBaseUrl) || !environment.production;
  protected readonly privacyPath = computed(() => `${this.i18n.home()}privacy-policy/`);
  protected readonly links = computed(() => {
    const ids: NavId[] = ['insurance', ...(this.hasCalculator ? ['calculator' as const] : []), 'services', 'assist', 'faq', 'about'];
    const labels = this.i18n.t().nav.links;
    return ids.map((id) => ({ id, label: labels[id] }));
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const sync = () => this.stuck.set(window.scrollY > 8);
      sync();
      window.addEventListener('scroll', sync, { passive: true });
      destroyRef.onDestroy(() => window.removeEventListener('scroll', sync));

      // Mark the link of the section being read.
      if (!('IntersectionObserver' in window)) return;
      const io = new IntersectionObserver((entries) => {
        for (const e of entries) if (e.isIntersecting) this.active.set(e.target.id as NavId);
      }, { rootMargin: '-45% 0px -50% 0px' });
      this.links().forEach((l) => {
        const el = document.getElementById(l.id);
        if (el) io.observe(el);
      });
      destroyRef.onDestroy(() => io.disconnect());
    });
  }

  /** Close the phone menu after a tap. */
  protected closeMenu(): void {
    this.menu().nativeElement.removeAttribute('open');
  }
}
