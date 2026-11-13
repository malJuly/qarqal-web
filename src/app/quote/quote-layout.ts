import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { I18nService } from '../core/i18n.service';
import { Footer } from '../components/footer';
import { Header } from '../components/header';
import { Icon } from '../components/icon';
import { Stepper } from '../shared/ui/stepper';

/**
 * Page shell for the quote and purchase steps: header, a blue band with the back link, title and
 * progress steps, then the step's content. With [hasAside], content sits beside a sticky side column
 * (the order summary, or the insurer list) on wide screens; on phones the side column moves under the
 * content, or above it with [asideFirst].
 *
 *   <app-quote-layout [title]="t.title" [step]="2" [hasAside]="true" [backHref]="…" [backLabel]="…">
 *     …main…
 *     <app-order-summary aside … />
 *   </app-quote-layout>
 */
@Component({
  selector: 'app-quote-layout',
  imports: [Header, Footer, Icon, Stepper],
  template: `
    @let p = i18n.t().quoteFlow.page;
    <a class="skip-link" href="#main">{{ i18n.t().nav.skip }}</a>
    <app-header page="quote" [subpath]="langSubpath()" />
    <main id="main" class="ql">
      <div class="ql__band">
        <div class="wrap ql__inner" [class.ql__inner--wide]="hasAside()">
          @if (backHref()) {
            <a class="ql__back" [href]="backHref()"><app-icon name="arrowLeft" [size]="16" /> {{ backLabel() }}</a>
          }
          <h1>{{ title() }}</h1>
          @if (lede()) { <p class="ql__lede">{{ lede() }}</p> }
          @if (step()) { <app-stepper class="ql__steps" [steps]="p.steps" [current]="step()" [ariaLabel]="p.progress" /> }
        </div>
      </div>
      <div class="wrap ql__inner ql__body" [class.ql__inner--wide]="hasAside()" [class.ql__grid]="hasAside()" [class.ql__grid--aside-first]="asideFirst()">
        <div class="ql__main"><ng-content /></div>
        @if (hasAside()) { <aside class="ql__aside" [class.ql__aside--sticky]="stickyAside()"><ng-content select="[aside]" /></aside> }
      </div>
    </main>
    <app-footer />`,
  styles: `
    .ql { background: var(--bg-soft); min-height: 70vh; }
    .ql__band {
      color: var(--night-ink); padding: clamp(1.25rem, 1rem + 1.5vw, 2rem) 0 clamp(1.25rem, 1rem + 1.5vw, 1.75rem);
      background:
        radial-gradient(80% 120% at 50% 0%, rgb(0 158 225 / 0.35), rgb(0 158 225 / 0) 70%),
        linear-gradient(180deg, var(--night-1), var(--night-0));
    }
    .ql__inner { max-width: 720px; }
    .ql__inner--wide { max-width: 1080px; }
    .ql__back { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; color: var(--night-ink-2); font-weight: 700; font-size: var(--fs-small); text-decoration: none; }
    .ql__back:hover { color: #fff; }
    .ql__band h1 { color: #fff; font-size: clamp(1.5rem, 1.2rem + 1.4vw, 2rem); font-weight: 900; letter-spacing: var(--track-display); }
    .ql__lede { margin-top: 4px; color: var(--night-ink-2); max-width: 56ch; }
    .ql__steps { display: block; margin-top: 20px; }
    .ql__body { padding-block: clamp(1.25rem, 1rem + 1.5vw, 2rem) 0; }
    .ql__main { display: grid; gap: 16px; align-content: start; min-width: 0; padding-bottom: clamp(1.5rem, 1rem + 2vw, 3rem); }
    .ql__aside { padding-bottom: clamp(1.5rem, 1rem + 2vw, 3rem); }
    /* Phones: the side column comes first when the step starts there (e.g. picking an insurer). */
    .ql__grid--aside-first { display: flex; flex-direction: column; }
    .ql__grid--aside-first .ql__aside { order: -1; padding-bottom: 16px; }
    @media (min-width: 960px) {
      .ql__grid { display: grid; grid-template-columns: minmax(0, 1fr) var(--aside-w, 360px); gap: 28px; align-items: start; }
      .ql__grid--aside-first .ql__aside { order: 0; }
      .ql__aside--sticky { position: sticky; top: calc(var(--top-h) + 16px); max-height: calc(100vh - var(--top-h) - 32px); overflow-y: auto; }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuoteLayout {
  protected readonly i18n = inject(I18nService);
  private readonly query = toSignal(inject(ActivatedRoute).queryParamMap);
  /**
   * Path for the header's language links, with the page's query string kept (?quotation_id=…, ?status=…),
   * so switching language continues the same quote instead of landing on an empty page.
   */
  protected readonly langSubpath = computed(() => {
    const q = this.query();
    const pairs = (q?.keys ?? []).flatMap((k) => q!.getAll(k).map((v) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`));
    return this.subpath() + (pairs.length ? `?${pairs.join('&')}` : '');
  });
  readonly title = input.required<string>();
  /** One line under the title. */
  readonly lede = input('');
  /** Path after the language root, for the header's language switcher, e.g. "insurance/quote/". */
  readonly subpath = input('');
  /** Current step, 1-based; 0 hides the progress steps (result page). */
  readonly step = input(0);
  /** True when the page projects an [aside] (the order summary). */
  readonly hasAside = input(false);
  /** Wide screens: keep the side column in view while the content scrolls. Turn off when it's tall. */
  readonly stickyAside = input(true);
  /** On phones, show the side column above the content instead of below it. */
  readonly asideFirst = input(false);
  readonly backHref = input('');
  readonly backLabel = input('');
}
