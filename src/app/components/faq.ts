import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18nService } from '../core/i18n.service';
import { Icon } from './icon';

// The FAQPage JSON-LD for these questions is written into <head> by the landing page (see faqSchema below).
@Component({
  selector: 'app-faq',
  imports: [Icon],
  template: `
    @let f = i18n.t().faq;
    <section class="faq section" id="faq" aria-labelledby="faq-title">
      <div class="wrap faq__grid">
        <h2 id="faq-title">{{ f.title }}</h2>
        <div class="faq__list">
          @for (i of f.items; track $index) {
            <details>
              <summary><span>{{ i.q }}</span><app-icon name="chevronDown" [size]="22" cls="faq__chev" /></summary>
              <p>{{ i.a }}</p>
            </details>
          }
        </div>
      </div>
    </section>`,
  styles: `
    .faq__grid { display: grid; gap: 2rem; }
    @media (min-width: 900px) { .faq__grid { grid-template-columns: 0.8fr 1.2fr; gap: 4rem; align-items: start; } .faq h2 { position: sticky; top: 2rem; } }
    .faq h2 { max-width: 12ch; }
    .faq__list { border-top: 1px solid var(--line); }
    details { border-bottom: 1px solid var(--line); }
    summary {
      list-style: none; cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 1rem;
      padding: 1.25rem 0; font-weight: 700; font-size: 1.125rem;
    }
    summary::-webkit-details-marker { display: none; }
    summary:hover span { color: var(--navy); }
    summary ::ng-deep .faq__chev { flex: none; color: var(--navy); transition: transform 0.3s var(--ease-out); }
    details[open] ::ng-deep .faq__chev { transform: rotate(180deg); }
    details p { padding: 0 2.5rem 1.4rem 0; color: var(--ink-2); max-width: 60ch; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Faq {
  protected readonly i18n = inject(I18nService);
}

export function faqSchema(items: { q: string; a: string }[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((i) => ({ '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: i.a } })),
  };
}
