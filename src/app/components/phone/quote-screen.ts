import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, inject, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { StatusBar } from './status-bar';

// A working miniature of the app's insurance flow, rebuilt from lib/pages/vehicle-insurance/:
// insurance_providers.dart (Select Insurance) -> customize_plan_screen.dart (Customize Plan)
// -> fianl_quotation.dart (Quotation). Lists scroll, cards and toggles respond, back arrows work.
// Sample data only: premiums are blurred because real prices depend on the vehicle.
// Add-ons are the backend's four (carInsurance.service.ts ADDONS). Paying sends people to the app.
//
// Auto-play: while on screen it demonstrates the flow with a tap marker. It stops for good the
// moment the visitor touches, scrolls, clicks or tabs into it, and never runs with reduced motion.
//
// The screen logic below is the Astro script, run in the browser after the first render (afterNextRender).
// The page talks to it through Angular instead of DOM events: (stepChange) out, goto(step) in.

const L = '/assets/logos/';
const quotes = [
  { name: 'ALLIANZ GENERAL', logo: `${L}allianz_logo.svg`, price: 'RM 1,0X8.40' },
  { name: 'GENERALI', logo: `${L}generali.png`, price: 'RM 1,1X2.15' },
  { name: 'ZURICH TAKAFUL', logo: `${L}zurich_logo.svg`, price: 'RM 1,0X9.90' },
  { name: 'TAKAFUL MALAYSIA', logo: `${L}takaful_malaysia_logo.svg`, price: 'RM 1,1X4.60' },
  { name: 'MSIG', logo: `${L}msig.svg`, price: 'RM 1,1X0.35' },
  { name: 'ZURICH GENERAL', logo: `${L}zurich_general.svg`, price: 'RM 1,0X5.70' },
  { name: 'BERJAYA SOMPO', logo: `${L}berjaya_sompo.png`, price: 'RM 1,1X8.20' },
  { name: 'CHUBB', logo: `${L}chubb.svg`, price: 'RM 1,2X1.05' },
  { name: 'TAKAFUL IKHLAS', logo: `${L}takaful_ikhlas_logo.svg`, price: 'RM 1,0X7.80' },
  { name: 'TUNE PROTECT', logo: `${L}tune_protect.png`, price: 'RM 1,1X3.90' },
  { name: 'PACIFIC INSURANCE', logo: `${L}pacific_insurance.png`, price: 'RM 1,1X6.45' },
];
const addons = [
  { code: 'WINDSCREEN', title: 'Windscreen', body: 'Covers repair or replacement of your windscreen and windows.' },
  { code: 'SPECIAL_PERILS', title: 'Special perils', body: 'Flood, landslide, storm and other natural disasters.' },
  { code: 'SRCC', title: 'Strike, riot & civil commotion', body: 'Damage caused during strikes, riots or civil commotion.' },
  { code: 'LLP', title: 'Legal liability to passengers', body: 'Covers your liability if a passenger is injured.' },
];

@Component({
  selector: 'app-quote-screen',
  imports: [StatusBar, NgTemplateOutlet],
  template: `
    <ng-template #back><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6l6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></ng-template>
    <div class="qs">
      <app-status-bar />
      <div class="qs__track" data-track>
        <!-- 1. Select Insurance -->
        <section class="qs__screen" data-screen="0" aria-label="Select Insurance">
          <div class="qs__bar"><span class="qs__back" aria-hidden="true"><ng-container [ngTemplateOutlet]="back" /></span><span>Select Insurance</span></div>
          <div class="qs__scroll" data-scroll>
            <div class="qs__vehicle">
              <div><strong>WXY 1234</strong><span>Perodua Myvi 1.5 AV</span></div>
              <span class="qs__pill">Comprehensive</span>
            </div>
            <p class="qs__count">{{ quotes.length }} insurance quotes available!</p>
            <div class="qs__list" role="radiogroup" aria-label="Insurers">
              @for (q of quotes; track q.name; let i = $index) {
                <button type="button" role="radio" [attr.aria-checked]="i === 0 ? 'true' : 'false'" [tabIndex]="i === 0 ? 0 : -1"
                  class="card" [class.card--r]="i % 2" [class.card--l]="!(i % 2)" [attr.data-insurer]="q.name" [attr.data-logo]="q.logo">
                  <span class="card__row">
                    <span class="card__logo"><img [src]="q.logo" alt="" width="22" height="22" /></span>
                    <span class="card__name">{{ q.name }}</span>
                    <span class="card__price" aria-hidden="true">{{ q.price }}*</span>
                    <span class="card__radio"></span>
                  </span>
                  <span class="card__box">
                    <span>• Sum Covered: 45,000</span><span>• Cover: Comprehensive</span>
                    <span>• Market Value: 45,000</span><span>• (NCD) 38.33%</span>
                  </span>
                </button>
              }
            </div>
          </div>
          <div class="qs__foot"><button type="button" class="qs__btn" data-go="1">Continue</button></div>
        </section>

        <!-- 2. Customize Plan -->
        <section class="qs__screen" data-screen="1" aria-label="Customize Plan" inert>
          <div class="qs__bar"><button type="button" class="qs__back" data-go="0" aria-label="Back"><ng-container [ngTemplateOutlet]="back" /></button><span>Customize Plan</span></div>
          <div class="qs__scroll" data-scroll>
            <div class="qs__chosen"><span class="card__logo"><img [src]="quotes[0].logo" alt="" width="22" height="22" data-chosen-logo /></span><strong data-chosen-name>{{ quotes[0].name }}</strong></div>
            <p class="qs__h">Additional Add-ons</p>
            <ul class="qs__addons">
              @for (a of addons; track a.code) {
                <li>
                  <span><strong>{{ a.title }}</strong><span>{{ a.body }}</span></span>
                  <button type="button" role="switch" aria-checked="false" class="qs__switch" [attr.data-addon]="a.title" [attr.aria-label]="a.title"></button>
                </li>
              }
            </ul>
            <!-- Insurers differ: some offer more add-ons than these four. -->
            <button type="button" class="qs__more" data-sheet-open
              data-title="More add-ons in the QarQal app"
              data-body="Some insurers offer more add-ons than these. Download QarQal to see every option for your car.">
              <span class="qs__more-plus" aria-hidden="true">+</span>
              <span><strong>More add-ons in the app</strong><span>Some insurers offer more cover options. See them all in QarQal.</span></span>
              <span class="qs__more-arrow" aria-hidden="true">›</span>
            </button>
          </div>
          <div class="qs__foot"><button type="button" class="qs__btn" data-go="2">Show Quotation</button></div>
        </section>

        <!-- 3. Quotation -->
        <section class="qs__screen" data-screen="2" aria-label="Quotation" inert>
          <div class="qs__bar"><button type="button" class="qs__back" data-go="1" aria-label="Back"><ng-container [ngTemplateOutlet]="back" /></button><span>Quotation</span></div>
          <div class="qs__scroll" data-scroll>
            <div class="qs__box"><p class="qs__h">Vehicle Details</p><p>WXY 1234 · Perodua Myvi 1.5 AV</p><p>Comprehensive · Sum Covered RM 45,000</p></div>
            <div class="qs__box"><p class="qs__h">Insurer Details</p><p class="qs__chosen qs__chosen--plain"><span class="card__logo"><img [src]="quotes[0].logo" alt="" width="22" height="22" data-chosen-logo /></span><strong data-chosen-name>{{ quotes[0].name }}</strong></p></div>
            <div class="qs__box"><p class="qs__h">Add Ons</p><ul class="qs__picked" data-picked><li>None</li></ul></div>
            <div class="qs__box"><p class="qs__h">Price Breakup</p>
              <dl class="qs__price">
                <dt>Basic premium</dt><dd>RM 1,3X7.40</dd>
                <dt>NCD (38.33%)</dt><dd>-RM 5X8.00</dd>
                <dt>Add Ons</dt><dd>RM X5.00</dd>
                <dt>Service tax (8%)</dt><dd>RM 7X.30</dd>
                <dt>Stamp duty</dt><dd>RM 10.00</dd>
                <dt class="qs__total">Total</dt><dd class="qs__total">RM 9X4.70</dd>
              </dl>
            </div>
          </div>
          <div class="qs__foot"><button type="button" class="qs__btn" data-sheet-open
            data-title="Continue in the QarQal app" data-body="Download QarQal to see your real price and pay for your cover.">Proceed For Payment</button></div>
        </section>
      </div>

      <!-- Paying happens in the real app. -->
      <div class="qs__sheet" data-sheet hidden>
        <div class="qs__sheet-card" role="dialog" aria-label="Continue in the QarQal app">
          <p class="qs__sheet-title" data-sheet-title>Continue in the QarQal app</p>
          <p data-sheet-body>Download QarQal to see your real price and pay for your cover.</p>
          <a class="qs__btn qs__btn--link" href="#download" data-smart-download>Download QarQal</a>
          <button type="button" class="qs__sheet-close" data-sheet-close>Not now</button>
        </div>
      </div>

      <span class="qs__tap" data-tap aria-hidden="true"></span>
    </div>`,
  styles: `
    :host { display: block; height: 100%; }
    .qs { position: relative; height: 100%; display: flex; flex-direction: column; background: #fff; overflow: hidden; }
    .qs__track { flex: 1; min-height: 0; display: flex; transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
    .qs__screen { flex: 0 0 100%; min-width: 0; display: flex; flex-direction: column; }
    .qs__scroll {
      flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: none;
      padding-bottom: 8px;
    }
    .qs__scroll::-webkit-scrollbar { display: none; }
    /* Zero-specificity reset so the component classes below win without. */
    :where(.qs button) { font: inherit; color: inherit; border: 0; background: none; padding: 0; cursor: pointer; text-align: left; }
    .qs button:focus-visible { outline: 2px solid #00a0e6; outline-offset: 2px; }

    .qs__bar { display: flex; align-items: center; gap: 10px; padding: 8px 16px 10px; font-size: 15px; font-weight: 700; color: #1e3c96; }
    .qs__back { display: grid; place-items: center; width: 24px; height: 24px; margin-left: -4px; color: #1e3c96; }
    .qs__vehicle { margin: 0 14px 8px; padding: 10px 12px; border-radius: 10px; background: #f2f5fc; display: flex; align-items: center; justify-content: space-between; }
    .qs__vehicle div { display: grid; }
    .qs__vehicle.flash { animation: qs-flash 1.2s ease-out; }
    @keyframes qs-flash { 0%, 40% { box-shadow: 0 0 0 3px #00a0e6; } 100% { box-shadow: 0 0 0 3px transparent; } }
    .qs__vehicle strong { font-size: 13px; letter-spacing: 0.06em; color: #111a33; }
    .qs__vehicle span { color: #48526b; font-size: 10.5px; }
    .qs__pill { background: #1e3c96; color: #fff !important; font-weight: 700; padding: 5px 9px; border-radius: 999px; font-size: 9.5px !important; }
    .qs__count { margin: 0 14px 10px; font-weight: 700; color: #39414b; font-size: 11px; }
    .qs__list { padding: 0 14px; display: grid; gap: 12px; }

    .card { display: block; width: 100%; border: 1.5px solid #fff; border-radius: 8px; padding: 12px 8px 10px; color: #fff; box-shadow: 0 2px 8px rgb(30 60 150 / 0.18); transition: transform 0.15s; }
    .card:active { transform: scale(0.98); }
    .card--l { background: linear-gradient(315deg, #2b3494, #009ee1); }
    .card--r { background: linear-gradient(315deg, #009ee1, #2b3494); }
    .card[aria-checked='true'] { box-shadow: 0 0 0 2px #1e3c96, 0 4px 12px rgb(30 60 150 / 0.3); }
    .card__row { display: flex; align-items: center; gap: 7px; }
    .card__logo { width: 26px; height: 26px; border-radius: 50%; background: #fff; display: grid; place-items: center; flex: none; overflow: hidden; }
    .card__logo img { width: 20px; height: 20px; object-fit: contain; }
    .card__name { flex: 1; font-weight: 700; font-size: 10.5px; letter-spacing: 0.03em; }
    .card__price { font-weight: 900; font-size: 12.5px; filter: blur(3.5px); user-select: none; }
    .card__radio { width: 16px; height: 16px; border-radius: 50%; border: 1.5px solid #fff; flex: none; }
    .card[aria-checked='true'] .card__radio { background: radial-gradient(circle, #fff 0 35%, transparent 40%); }
    .card__box { margin-top: 9px; padding: 8px; border: 2px solid rgb(255 255 255 / 0.12); border-radius: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 7px 6px; font-size: 9px; }
    .card__box span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .qs__chosen { margin: 0 14px 6px; display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 10px; background: linear-gradient(315deg, #2b3494, #009ee1); color: #fff; font-size: 11px; }
    .qs__chosen--plain { margin: 0; padding: 0; background: none; color: #111a33; }
    .qs__chosen--plain .card__logo { border: 1px solid #e1e6f2; }
    .qs__h { margin: 10px 14px 8px; font-weight: 700; font-size: 12px; color: #39414b; }
    .qs__addons { list-style: none; margin: 0; padding: 0 14px; display: grid; gap: 8px; }
    .qs__addons li { display: flex; align-items: center; gap: 10px; padding: 10px; border: 3px solid rgb(30 60 150 / 0.06); border-radius: 12px; }
    .qs__addons li > span { flex: 1; display: grid; gap: 2px; }
    .qs__addons strong { font-size: 11.5px; color: #111a33; }
    .qs__addons li > span > span { font-size: 9.5px; color: #59627a; }
    .qs__switch { position: relative; width: 34px; height: 20px; border-radius: 999px; background: #c9d1e4; flex: none; transition: background-color 0.2s; }
    .qs__switch::after { content: ''; position: absolute; left: 2px; top: 2px; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: transform 0.2s; box-shadow: 0 1px 2px rgb(0 0 0 / 0.2); }
    .qs__switch[aria-checked='true'] { background: #1e3c96; }
    .qs__switch[aria-checked='true']::after { transform: translateX(14px); }

    .qs__more {
      display: flex; align-items: center; gap: 10px; width: calc(100% - 28px); margin: 8px 14px 0; padding: 10px;
      border: 2px dashed rgb(30 60 150 / 0.25); border-radius: 12px; background: #f6f8fd;
    }
    .qs__more > span:nth-child(2) { flex: 1; display: grid; gap: 2px; }
    .qs__more strong { font-size: 11.5px; color: #1e3c96; }
    .qs__more > span:nth-child(2) > span { font-size: 9.5px; color: #59627a; }
    .qs__more-plus { width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; flex: none; background: #1e3c96; color: #fff; font-weight: 900; font-size: 16px; line-height: 1; }
    .qs__more-arrow { color: #1e3c96; font-size: 20px; font-weight: 700; }
    .qs__box { margin: 0 14px 10px; padding: 10px 12px; border: 3px solid rgb(30 60 150 / 0.06); border-radius: 16px; }
    .qs__box .qs__h { margin: 0 0 6px; }
    .qs__box p { font-size: 10.5px; color: #48526b; }
    .qs__picked { margin: 0; padding-left: 14px; font-size: 10.5px; color: #48526b; }
    .qs__price { margin: 0; display: grid; grid-template-columns: 1fr auto; gap: 5px 8px; font-size: 10.5px; color: #48526b; }
    .qs__price dd { margin: 0; filter: blur(3px); user-select: none; }
    .qs__price .qs__total { margin-top: 4px; padding-top: 6px; border-top: 1px solid #e1e6f2; font-weight: 900; color: #111a33; }

    .qs__foot { padding: 10px 14px 22px; }
    .qs__btn { display: block; width: 100%; text-align: center; background: #0088ff; color: #fff; font-weight: 700; font-size: 13px; padding: 11px; border-radius: 8px; text-decoration: none; }

    .qs__sheet { position: absolute; inset: 0; z-index: 2; display: flex; align-items: flex-end; background: rgb(4 11 36 / 0.45); }
    .qs__sheet[hidden] { display: none; }
    .qs__sheet-card { width: 100%; padding: 18px 16px 24px; border-radius: 18px 18px 0 0; background: #fff; display: grid; gap: 8px; text-align: center; }
    .qs__sheet-title { font-weight: 900; font-size: 14px; color: #1e3c96; }
    .qs__sheet-card p { font-size: 11px; color: #48526b; }
    .qs__sheet-close { justify-self: center; padding: 6px 10px; font-weight: 700; color: #1e3c96; font-size: 11.5px; }

    /* Tap marker used by the auto-play demo */
    .qs__tap {
      position: absolute; z-index: 3; width: 34px; height: 34px; margin: -17px 0 0 -17px; border-radius: 50%;
      background: rgb(30 60 150 / 0.25); border: 2px solid rgb(255 255 255 / 0.9); box-shadow: 0 2px 8px rgb(0 0 0 / 0.25);
      opacity: 0; transform: scale(1.3); transition: opacity 0.2s, transform 0.25s; pointer-events: none;
    }
    .qs__tap.on { opacity: 1; transform: scale(1); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuoteScreen {
  protected readonly quotes = quotes;
  protected readonly addons = addons;
  /** Which of the three steps is showing: 1 vehicle (top of the list screen), 2 compare (insurer list or add-ons), 3 pay (quotation). */
  readonly stepChange = output<number>();
  private gotoImpl: (step: number) => void = () => {};
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** A step tapped on the page: jump there (and end the demo, like touching the phone). */
  goto(step: number): void {
    this.gotoImpl(step);
  }

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const root = this.host.nativeElement.querySelector<HTMLElement>('.qs')!;
      const track = root.querySelector<HTMLElement>('[data-track]')!;
      const screens = [...root.querySelectorAll<HTMLElement>('[data-screen]')];
      const cards = [...root.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
      const switches = [...root.querySelectorAll<HTMLButtonElement>('[role="switch"]')];
      const picked = root.querySelector<HTMLElement>('[data-picked]')!;
      const sheet = root.querySelector<HTMLElement>('[data-sheet]')!;
      const tap = root.querySelector<HTMLElement>('[data-tap]')!;

      const list = root.querySelector<HTMLElement>('[data-screen="0"] [data-scroll]')!;
      const vehicle = root.querySelector<HTMLElement>('.qs__vehicle')!;
      let screen = 0;
      const emit = () => {
        const step = screen === 2 ? 3 : screen === 1 || list.scrollTop > 60 ? 2 : 1;
        this.stepChange.emit(step);
      };
      const go = (i: number) => {
        screen = i;
        track.style.transform = `translateX(${-i * 100}%)`;
        screens.forEach((s, n) => s.toggleAttribute('inert', n !== i));
        emit();
      };
      list.addEventListener('scroll', emit, { passive: true });
      const choose = (card: HTMLButtonElement) => {
        cards.forEach((c) => { const on = c === card; c.setAttribute('aria-checked', String(on)); c.tabIndex = on ? 0 : -1; });
        root.querySelectorAll<HTMLImageElement>('[data-chosen-logo]').forEach((img) => (img.src = card.dataset['logo']!));
        root.querySelectorAll<HTMLElement>('[data-chosen-name]').forEach((el) => (el.textContent = card.dataset['insurer']!));
      };
      const toggle = (sw: HTMLButtonElement, on = sw.getAttribute('aria-checked') !== 'true') => {
        sw.setAttribute('aria-checked', String(on));
        const names = switches.filter((s) => s.getAttribute('aria-checked') === 'true').map((s) => s.dataset['addon']!);
        picked.replaceChildren(...(names.length ? names : ['None']).map((n) => Object.assign(document.createElement('li'), { textContent: n })));
      };
      const reset = () => {
        choose(cards[0]); switches.forEach((s) => toggle(s, false)); sheet.hidden = true;
        root.querySelectorAll<HTMLElement>('[data-scroll]').forEach((s) => (s.scrollTop = 0));
        go(0);
      };

      // Visitor controls
      cards.forEach((card, i) => {
        card.addEventListener('click', () => choose(card));
        card.addEventListener('keydown', (e) => {
          const step = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
          if (!step) return;
          e.preventDefault();
          const next = cards[(i + step + cards.length) % cards.length];
          choose(next); next.focus();
        });
      });
      switches.forEach((sw) => sw.addEventListener('click', () => toggle(sw)));
      root.querySelectorAll<HTMLElement>('[data-go]').forEach((b) => b.addEventListener('click', () => go(Number(b.dataset['go']))));
      // "Proceed For Payment" and "More add-ons" both open the app prompt, each with its own wording.
      root.querySelectorAll<HTMLElement>('[data-sheet-open]').forEach((b) => b.addEventListener('click', () => {
        root.querySelector('[data-sheet-title]')!.textContent = b.dataset['title']!;
        root.querySelector('[data-sheet-body]')!.textContent = b.dataset['body']!;
        sheet.hidden = false;
      }));
      root.querySelector('[data-sheet-close]')!.addEventListener('click', () => { sheet.hidden = true; });

      let stopped = false;
      const stop = () => { stopped = true; tap.classList.remove('on'); };
      destroyRef.onDestroy(stop);
      this.gotoImpl = (step: number) => {
        stop();
        sheet.hidden = true;
        if (step === 3) { go(2); return; }
        go(0);
        list.scrollTo({ top: step === 1 ? 0 : 110, behavior: 'smooth' });
        if (step === 1) { vehicle.classList.remove('flash'); void vehicle.offsetWidth; vehicle.classList.add('flash'); }
      };

      // ---------- Auto-play demo ----------
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      let visible = false;
      // Any real interaction ends the demo for good.
      ['pointerdown', 'wheel', 'keydown', 'touchstart', 'focusin'].forEach((ev) =>
        root.addEventListener(ev, (e) => { if (e.isTrusted) stop(); }, { passive: true }));

      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
      // Waits while off screen; returns false once the visitor has taken over.
      const wait = async (ms: number) => {
        const end = Date.now() + ms;
        while (Date.now() < end || !visible) { if (stopped) return false; await sleep(100); }
        return !stopped;
      };
      const press = async (el: HTMLElement) => {
        const a = el.getBoundingClientRect(), b = root.getBoundingClientRect();
        const z = root.offsetWidth ? b.width / root.offsetWidth : 1; // the phone is zoomed on small screens
        tap.style.left = `${(a.left - b.left + a.width / 2) / z}px`;
        tap.style.top = `${(a.top - b.top + a.height / 2) / z}px`;
        tap.classList.add('on');
        if (!(await wait(450))) return false;
        tap.classList.remove('on');
        el.click();
        return wait(350);
      };
      const scrollTo = async (scroller: HTMLElement, top: number) => {
        scroller.scrollTo({ top, behavior: 'smooth' });
        return wait(900);
      };

      const demo = async () => {
        const [first, , quote] = [...root.querySelectorAll<HTMLElement>('[data-scroll]')];
        while (!stopped) {
          reset();
          if (!(await wait(1400))) return;
          if (!(await scrollTo(first, 260))) return;
          if (!(await press(cards[4]))) return;
          if (!(await scrollTo(first, 0))) return;
          if (!(await press(root.querySelector<HTMLElement>('[data-screen="0"] .qs__btn')!))) return;
          if (!(await wait(700))) return;
          if (!(await press(switches[0]))) return;
          if (!(await press(switches[1]))) return;
          if (!(await press(root.querySelector<HTMLElement>('[data-screen="1"] .qs__btn')!))) return;
          if (!(await wait(900))) return;
          if (!(await scrollTo(quote, 400))) return;
          if (!(await wait(1800))) return;
        }
      };
      const io = new IntersectionObserver(([e]) => { visible = e.intersectionRatio >= 0.6; }, { threshold: [0, 0.6] });
      io.observe(root);
      destroyRef.onDestroy(() => io.disconnect());
      demo();
    });
  }
}
