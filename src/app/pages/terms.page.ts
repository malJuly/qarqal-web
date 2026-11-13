import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { heading, sections } from '../content/terms';
import { usePageLang } from '../core/page-lang';
import { SeoService } from '../core/seo.service';
import { LegalLayout } from './legal-layout';

// Section titles are in capitals on the source page; the contents list reads easier in sentence case.
const sentence = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

// The Terms & Conditions page, one per language (layout in legal-layout.ts).
// The terms stay in their official English (src/app/content/terms.ts), with their own clause numbers (7, 7.1, a) …).
@Component({
  selector: 'app-terms-page',
  imports: [LegalLayout, NgTemplateOutlet],
  template: `
    @let t = i18n.t().terms;
    <!-- One level of numbered clauses, rendering its own sub-clauses recursively. -->
    <ng-template #clauses let-items>
      @for (c of items; track c.n) {
        <li>
          <span class="n">{{ c.n }}</span>
          <span>{{ c.text }}@if (c.sub) {<ol><ng-container [ngTemplateOutlet]="clauses" [ngTemplateOutletContext]="{ $implicit: c.sub }" /></ol>}</span>
        </li>
      }
    </ng-template>
    <app-legal-layout page="terms" subpath="terms-and-conditions/" [title]="t.title" [englishOnly]="t.englishOnly" [tocItems]="toc">
      <p class="pp__eyebrow">{{ heading }}</p>
      @for (s of sections; track s.id) {
        <section [id]="s.id" [attr.aria-labelledby]="s.id + '-h'">
          <h2 [id]="s.id + '-h'">{{ sentence(s.title) }}</h2>
          <ol class="clauses">
            <ng-container [ngTemplateOutlet]="clauses" [ngTemplateOutletContext]="{ $implicit: s.clauses }" />
          </ol>
        </section>
      }
    </app-legal-layout>`,
  styles: `
    /* Clauses keep their printed numbers, so the list's own markers are switched off. */
    .clauses, .clauses ol { list-style: none; margin: 0; padding: 0; }
    .clauses { margin-top: 0.75rem; display: grid; gap: 0.75rem; }
    .clauses li { display: grid; grid-template-columns: 2.4em minmax(0, 1fr); column-gap: 0.25em; }
    .clauses .n { font-weight: 700; color: var(--ink); font-variant-numeric: tabular-nums; }
    .clauses ol { margin-top: 0.5rem; display: grid; gap: 0.5rem; }
    .clauses ol li { grid-template-columns: 3em minmax(0, 1fr); }
    .clauses ol ol li { grid-template-columns: 1.8em minmax(0, 1fr); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TermsPage {
  protected readonly i18n = usePageLang();
  protected readonly heading = heading;
  protected readonly sections = sections;
  protected readonly sentence = sentence;
  protected readonly toc = sections.map((s) => ({ id: s.id, label: sentence(s.title) }));

  constructor() {
    const t = this.i18n.t();
    inject(SeoService).apply({ t, subpath: 'terms-and-conditions/', title: `${t.terms.title} | QarQal`, description: sections[0].clauses[0].text });
  }
}
