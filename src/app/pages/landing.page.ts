import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { usePageLang } from '../core/page-lang';
import { SeoService } from '../core/seo.service';
import { Assist } from '../components/assist';
import { Calculator } from '../components/calculator/calculator';
import { Faq, faqSchema } from '../components/faq';
import { FinalCta } from '../components/final-cta';
import { Footer } from '../components/footer';
import { Header } from '../components/header';
import { Hero } from '../components/hero';
import { Insurance } from '../components/insurance';
import { Jpj } from '../components/jpj';
import { MobileBar } from '../components/mobile-bar';
import { More } from '../components/more';
import { TrustStrip } from '../components/trust-strip';
import { Video } from '../components/video';

/** The landing page, one per language ("/", "/ms/", "/zh/", "/ta/"). */
@Component({
  selector: 'app-landing-page',
  imports: [Header, Hero, TrustStrip, Insurance, Calculator, Assist, More, Video, Jpj, Faq, FinalCta, Footer, MobileBar],
  template: `
    <a class="skip-link" href="#main">{{ i18n.t().nav.skip }}</a>
    <app-header />
    <app-hero />
    <main id="main">
      <app-trust-strip />
      <app-insurance />
      <app-calculator />
      <app-assist />
      <app-more />
      <app-video />
      <app-jpj />
      <app-faq />
      <app-final-cta />
    </main>
    <app-footer />
    <app-mobile-bar />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingPage {
  protected readonly i18n = usePageLang();

  constructor() {
    const t = this.i18n.t();
    inject(SeoService).apply({ t, jsonLd: [faqSchema(t.faq.items)] });
  }
}
