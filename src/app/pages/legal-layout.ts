import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, inject, input, viewChild } from '@angular/core';
import { I18nService } from '../core/i18n.service';
import { Footer } from '../components/footer';
import { Header } from '../components/header';
import { Icon } from '../components/icon';
import { MobileBar } from '../components/mobile-bar';

export interface TocItem { id: string; label: string }

// Shared layout for the legal pages (Privacy Policy, Terms & Conditions): a title band, a contents list
// (sticky on wide screens, collapsible on phones) and the text. The page around the text follows the
// visitor's language; the legal text itself is projected in (<ng-content>) and stays in its official English.
@Component({
  selector: 'app-legal-layout',
  imports: [Header, Footer, MobileBar, Icon],
  template: `
    @let t = i18n.t();
    <a class="skip-link" href="#main">{{ t.nav.skip }}</a>
    <app-header [page]="page()" [subpath]="subpath()" />
    <main id="main" class="pp">
      <div class="pp__band">
        <div class="wrap">
          <a class="pp__back" [href]="i18n.home()"><app-icon name="arrowLeft" [size]="16" /> {{ t.privacy.back }}</a>
          <h1>{{ title() }}</h1>
          @if (englishOnly()) { <p class="pp__note">{{ englishOnly() }}</p> }
        </div>
      </div>

      <div class="wrap pp__grid">
        <nav class="pp__toc" aria-labelledby="pp-toc">
          <details open #toc>
            <summary id="pp-toc">{{ t.privacy.toc }}</summary>
            <ol>
              @for (s of tocItems(); track s.id) { <li><a [href]="'#' + s.id">{{ s.label }}</a></li> }
            </ol>
          </details>
        </nav>

        <article class="pp__body" lang="en">
          <ng-content />
        </article>
      </div>
    </main>
    <app-footer />
    <app-mobile-bar />`,
  styles: `
    .pp { background: var(--bg); }
    .pp__band {
      color: var(--night-ink); padding: clamp(2rem, 1.5rem + 2vw, 3.25rem) 0 clamp(2rem, 1.5rem + 2vw, 3rem);
      background:
        radial-gradient(80% 120% at 50% 0%, rgb(0 158 225 / 0.35), rgb(0 158 225 / 0) 70%),
        linear-gradient(180deg, var(--night-1), var(--night-0));
    }
    .pp__back { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; color: var(--night-ink-2); font-weight: 700; font-size: var(--fs-small); text-decoration: none; }
    .pp__back:hover { color: #fff; }
    .pp__band h1 { margin-top: 0.25rem; color: #fff; font-size: var(--fs-h2); font-weight: 900; letter-spacing: var(--track-display); }
    .pp__note { margin-top: 0.75rem; color: var(--night-ink-2); font-size: var(--fs-small); }

    .pp__grid { display: grid; gap: 1.5rem; padding-block: clamp(2rem, 1.5rem + 2vw, 3.5rem); }
    @media (min-width: 960px) { .pp__grid { grid-template-columns: 260px minmax(0, 1fr); gap: 3.5rem; align-items: start; } }

    .pp__toc details { border: 1px solid var(--line); border-radius: 12px; background: var(--bg-soft); }
    .pp__toc summary { cursor: pointer; padding: 12px 16px; font-weight: 900; color: var(--navy); list-style: none; }
    .pp__toc summary::-webkit-details-marker { display: none; }
    .pp__toc ol { margin: 0; padding: 0 16px 14px 34px; display: grid; gap: 6px; font-size: var(--fs-small); }
    .pp__toc a { color: var(--ink-2); text-decoration: none; }
    .pp__toc a:hover { color: var(--navy); text-decoration: underline; }
    @media (min-width: 960px) {
      .pp__toc { position: sticky; top: calc(var(--top-h) + 1.5rem); max-height: calc(100vh - var(--top-h) - 3rem); overflow-y: auto; }
    }

    /* The text is projected in from the page, so these reach into it with ::ng-deep. */
    .pp__body { max-width: 72ch; color: var(--ink-2); }
    .pp__body ::ng-deep > p { margin-top: 1rem; }
    .pp__body ::ng-deep > .pp__eyebrow { margin: 0; font-size: 0.8125rem; font-weight: 900; letter-spacing: 0.08em; color: var(--ink-3); }
    .pp__body ::ng-deep section { margin-top: 2.25rem; scroll-margin-top: calc(var(--top-h) + 1rem); }
    .pp__body ::ng-deep h2 { font-size: 1.25rem; font-weight: 900; color: var(--ink); letter-spacing: 0; }
    .pp__body ::ng-deep section p { margin-top: 0.75rem; }
    .pp__body ::ng-deep ul { margin: 0.75rem 0 0; padding-left: 1.25rem; display: grid; gap: 0.5rem; }
    .pp__body ::ng-deep a { color: var(--navy); font-weight: 700; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalLayout {
  protected readonly i18n = inject(I18nService);
  readonly page = input.required<'privacy' | 'terms'>();
  /** e.g. "privacy-policy/" */
  readonly subpath = input.required<string>();
  readonly title = input.required<string>();
  /** Note shown on non-English pages. */
  readonly englishOnly = input<string>();
  readonly tocItems = input.required<TocItem[]>();
  private readonly toc = viewChild.required<ElementRef<HTMLDetailsElement>>('toc');

  constructor() {
    // Phones: start with the contents collapsed so the text starts on the first screen.
    // (Open in the HTML, so it is open on wide screens and without JavaScript.)
    afterNextRender(() => {
      if (window.matchMedia('(max-width: 959px)').matches) this.toc().nativeElement.removeAttribute('open');
    });
  }
}
