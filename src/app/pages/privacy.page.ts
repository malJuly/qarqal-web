import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { contactEmail, heading, intro, sections } from '../content/privacyPolicy';
import { usePageLang } from '../core/page-lang';
import { SeoService } from '../core/seo.service';
import { NgTemplateOutlet } from '@angular/common';
import { LegalLayout } from './legal-layout';

type Part = { text: string } | { email: true };

// The Privacy Policy page, one per language (layout in legal-layout.ts).
// The policy itself stays in its official English (src/app/content/privacyPolicy.ts).
@Component({
  selector: 'app-privacy-page',
  imports: [LegalLayout, NgTemplateOutlet],
  template: `
    @let p = i18n.t().privacy;
    <ng-template #withEmail let-text>
      @for (x of split(text); track $index) {
        @if ('email' in x) { <a [href]="'mailto:' + contactEmail">{{ contactEmail }}</a> } @else { {{ x.text }} }
      }
    </ng-template>
    <app-legal-layout page="privacy" subpath="privacy-policy/" [title]="p.title" [englishOnly]="p.englishOnly" [tocItems]="toc">
      <p class="pp__eyebrow">{{ heading }}</p>
      @for (para of intro; track $index) { <p>{{ para }}</p> }
      @for (s of sections; track s.id) {
        <section [id]="s.id" [attr.aria-labelledby]="s.id + '-h'">
          <h2 [id]="s.id + '-h'">{{ s.title }}</h2>
          @for (b of s.blocks; track $index) {
            @if ('p' in b) {
              <p><ng-container [ngTemplateOutlet]="withEmail" [ngTemplateOutletContext]="{ $implicit: b.p }" /></p>
            } @else {
              <ul>
                @for (item of b.ul; track $index) { <li><ng-container [ngTemplateOutlet]="withEmail" [ngTemplateOutletContext]="{ $implicit: item }" /></li> }
              </ul>
            }
          }
        </section>
      }
    </app-legal-layout>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyPage {
  protected readonly i18n = usePageLang();
  protected readonly heading = heading;
  protected readonly intro = intro;
  protected readonly sections = sections;
  protected readonly contactEmail = contactEmail;
  protected readonly toc = sections.map((s) => ({ id: s.id, label: s.title.replace(/^\d+\.\s*/, '') }));

  constructor() {
    const t = this.i18n.t();
    inject(SeoService).apply({ t, subpath: 'privacy-policy/', title: `${t.privacy.title} | QarQal`, description: intro[0] });
  }

  /** Shows the contact email as a link wherever the policy mentions it. */
  protected split(text: string): Part[] {
    return text.split(contactEmail).flatMap((part, i): Part[] => (i ? [{ email: true }, { text: part }] : [{ text: part }]));
  }
}
