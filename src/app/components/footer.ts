import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import site from '../config/site.json';
import { I18nService } from '../core/i18n.service';

@Component({
  selector: 'app-footer',
  template: `
    @let t = i18n.t();
    <footer class="foot">
      <div class="wrap foot__grid">
        <div>
          <img src="/assets/app/logo.png" alt="QarQal" width="122" height="40" loading="lazy" />
          <p class="foot__tag">{{ t.brand.tagline }}</p>
        </div>
        <nav aria-label="Footer">
          <ul>
            <li><a [href]="i18n.home() + 'privacy-policy/'">{{ t.footer.privacy }}</a></li>
            <li><a [href]="i18n.home() + 'terms-and-conditions/'">{{ t.footer.terms }}</a></li>
            <li><a [href]="'mailto:' + site.contact.email">{{ t.footer.contact }}</a></li>
          </ul>
        </nav>
      </div>
      <div class="wrap foot__legal">
        <p>{{ t.footer.operatedBy }}{{ site.company.registrationNo ? ' (' + site.company.registrationNo + ')' : '' }}</p>
        <p>© {{ year }} {{ site.company.name }} {{ t.footer.rights }}</p>
      </div>
    </footer>`,
  styles: `
    .foot { background: var(--night-0); color: var(--night-ink-2); padding: 3.5rem 0 calc(2rem + env(safe-area-inset-bottom)); font-size: var(--fs-small); }
    .foot__grid { display: grid; gap: 2rem; }
    @media (min-width: 768px) { .foot__grid { grid-template-columns: 1fr auto; align-items: start; } }
    .foot img { width: 122px; }
    .foot__tag { margin-top: 0.75rem; }
    .foot ul { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0.75rem 1.75rem; }
    .foot a { color: var(--night-ink); text-decoration: none; font-weight: 700; }
    .foot a:hover { text-decoration: underline; }
    .foot__legal { margin-top: 2.5rem; padding-top: 1.5rem; border-top: 1px solid var(--night-line); display: grid; gap: 0.35rem; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Footer {
  protected readonly i18n = inject(I18nService);
  protected readonly site = site;
  protected readonly year = new Date().getFullYear();
}
