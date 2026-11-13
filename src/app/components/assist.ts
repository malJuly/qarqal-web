import { ChangeDetectionStrategy, Component, ElementRef, Injector, afterNextRender, computed, inject, signal, viewChildren } from '@angular/core';
import { I18nService } from '../core/i18n.service';
import { Icon } from './icon';

type PlanKey = 'basic' | 'premium';

// Qarqal Assist: pick Basic or Premium to see what each plan includes.
// Plan facts and colours come from the app: lib/pages/assist/basic_details_bottom_sheet.dart,
// premium_details_bottom_sheet.dart, buy_assist_package.dart and fragments/auto_assist_fragment.dart
// (100 km / up to 3 times a year; 300 km / unlimited, plus the premium extras).
// The cards are tabs (role="tab"); the details beside them are the tab panels.
@Component({
  selector: 'app-assist',
  imports: [Icon],
  template: `
    @let a = i18n.t().assist;
    <section class="assist section" id="assist" aria-labelledby="assist-title">
      <div class="wrap">
        <div class="assist__head">
          <h2 id="assist-title">{{ a.title }}</h2>
          <p class="lede">{{ a.body }}</p>
        </div>

        <div class="assist__body">
          <div>
            <div class="plans" role="tablist" [attr.aria-label]="a.title">
              @for (p of plans(); track p.key; let i = $index) {
                <button type="button" role="tab" #tab [id]="'plan-' + p.key" [attr.aria-controls]="'plan-' + p.key + '-panel'"
                  [attr.aria-selected]="selected() === p.key ? 'true' : 'false'" [tabIndex]="selected() === p.key ? 0 : -1"
                  class="plan" [class]="'plan--' + p.key" (click)="show(p.key)" (keydown)="onKey($event, i)">
                  <span class="plan__name">{{ p.name }}</span>
                  <span class="plan__tick" aria-hidden="true"><app-icon name="check" [size]="16" [stroke]="3" /></span>
                  <span class="plan__km"><span aria-hidden="true">{{ p.km }}</span><span aria-hidden="true">km</span><span class="sr-only">{{ p.towing }}</span></span>
                  <span class="plan__uses">{{ p.uses }}</span>
                </button>
              }
            </div>
            <p class="plans__hint">{{ a.hint }}</p>
          </div>

          <div class="assist__side">
            <div class="vehicles" aria-hidden="true">
              <img src="/assets/app/illustration_suv.png" width="2133" height="1200" alt="" loading="lazy" />
              <img src="/assets/app/illustration_bike.png" width="1047" height="1475" alt="" loading="lazy" />
            </div>

            <!-- Basic -->
            <div class="detail detail--basic" role="tabpanel" id="plan-basic-panel" aria-labelledby="plan-basic" [hidden]="selected() !== 'basic'">
              <h3 class="detail__name">{{ a.basic.name }}</h3>
              <p class="detail__desc">{{ a.basic.desc }}</p>
              <ul class="detail__points">
                @for (pt of a.basic.points; track $index) { <li><app-icon name="check" [size]="18" [stroke]="2.5" /><span>{{ pt }}</span></li> }
              </ul>
              <p class="detail__upsell">
                <span>{{ a.basic.upsell }}</span>
                <button type="button" class="detail__switch" (click)="show('premium', true)">{{ a.basic.upsellCta }} <app-icon name="arrowRight" [size]="16" /></button>
              </p>
            </div>

            <!-- Premium -->
            <div class="detail detail--premium" role="tabpanel" id="plan-premium-panel" aria-labelledby="plan-premium" [hidden]="selected() !== 'premium'">
              <h3 class="detail__name">{{ a.premium.name }}</h3>
              <p class="detail__desc">{{ a.premium.desc }}</p>
              <ul class="detail__points">
                @for (pt of a.premium.points; track $index) { <li><app-icon name="check" [size]="18" [stroke]="2.5" /><span>{{ pt }}</span></li> }
              </ul>
              <p class="detail__sub">{{ a.premium.extrasTitle }}</p>
              <ul class="extras">
                @for (x of a.premium.extras; track $index) { <li><app-icon name="check" [size]="16" [stroke]="2.5" cls="extras__tick" /><strong>{{ x.title }}</strong><span>{{ x.body }}</span></li> }
              </ul>
            </div>

            <p class="assist__terms">{{ a.terms }}</p>
            <a class="assist__link" href="#download" data-smart-download>{{ a.link }}<app-icon name="arrowRight" [size]="18" /></a>
          </div>
        </div>
      </div>
    </section>`,
  styles: `
    .assist__head { display: grid; gap: 1.25rem; }
    .assist h2 { max-width: 20ch; }
    .assist__body { display: grid; gap: 2.5rem; margin-top: 3rem; }
    @media (min-width: 900px) {
      .assist__head { grid-template-columns: 1.2fr 0.8fr; align-items: end; gap: 4rem; }
      .assist__body { grid-template-columns: 1.1fr 0.9fr; gap: 4rem; align-items: start; }
    }

    /* Plan cards (tabs). Colours as in the app: Basic blue, Premium green. */
    .plans { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .plan {
      position: relative; overflow: hidden; color: #fff; border: 0; border-radius: var(--radius); cursor: pointer;
      padding: clamp(16px, 3vw, 32px); min-height: clamp(200px, 30vw, 320px);
      display: flex; flex-direction: column; align-items: flex-start; text-align: left; font: inherit;
      transition: transform 0.25s var(--ease-out), box-shadow 0.25s, opacity 0.25s, filter 0.25s;
    }
    .plan--basic { background: linear-gradient(140deg, #009ee1, #2b3494); }
    .plan--premium { background: linear-gradient(140deg, #1ecea2, #0f6852); }
    .plan[aria-selected='false'] { opacity: 0.6; filter: saturate(0.7); }
    .plan[aria-selected='false']:hover { opacity: 0.85; }
    .plan[aria-selected='true'] { transform: translateY(-4px); box-shadow: 0 18px 36px -16px rgb(4 11 36 / 0.45), inset 0 0 0 3px rgb(255 255 255 / 0.85); }
    /* The light end of the gradients is pale, so give the white text a soft shadow for contrast. */
    .plan__name, .plan__km, .plan__uses { text-shadow: 0 1px 2px rgb(4 11 36 / 0.28); }
    .plan__name { font-size: 1rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; }
    .plan__tick {
      position: absolute; top: clamp(14px, 2.5vw, 26px); right: clamp(14px, 2.5vw, 26px);
      width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center;
      background: #fff; color: var(--navy); opacity: 0; scale: 0.6; transition: opacity 0.2s, scale 0.25s var(--ease-out);
    }
    .plan--premium .plan__tick { color: #0f6852; }
    .plan[aria-selected='true'] .plan__tick { opacity: 1; scale: 1; }
    .plan__km { margin-top: auto; font-weight: 900; font-size: clamp(1.25rem, 1rem + 1vw, 1.75rem); line-height: 1; }
    .plan__km span:first-child { font-size: clamp(3.25rem, 2.4rem + 5vw, 6.5rem); letter-spacing: -0.04em; }
    .plan__uses { margin-top: 0.6rem; font-weight: 700; font-size: var(--fs-small); }
    .plans__hint { margin-top: 0.75rem; font-size: var(--fs-small); color: var(--ink-3); text-align: center; }

    .vehicles { display: flex; align-items: flex-end; gap: 12px; margin-bottom: 1.25rem; }
    .vehicles img:first-child { width: 200px; }
    .vehicles img:last-child { width: 84px; }

    /* Plan details (tab panels) */
    .detail { --c: #0391e1; animation: detail-in 0.35s var(--ease-out); }
    .detail--premium { --c: #0f8766; }
    .detail[hidden] { display: none; }
    @keyframes detail-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
    .detail__name { font-size: 1.25rem; font-weight: 900; color: var(--c); text-transform: uppercase; letter-spacing: 0.08em; }
    .detail__desc { margin-top: 0.4rem; color: var(--ink-2); }
    .detail__points { list-style: none; margin: 1rem 0 0; padding: 0; display: grid; gap: 0.55rem; }
    .detail__points li { display: grid; grid-template-columns: 22px 1fr; gap: 8px; font-weight: 700; }
    .detail__points ::ng-deep svg { margin-top: 3px; color: var(--c); }
    .detail__sub { margin-top: 1.25rem; font-size: 0.8125rem; font-weight: 900; letter-spacing: 0.04em; color: var(--c); text-transform: uppercase; }
    .extras { list-style: none; margin: 0.6rem 0 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .extras li { display: grid; gap: 2px; padding: 10px 12px; border-radius: 10px; background: #effaf6; border: 1px solid #cfeee2; }
    .extras ::ng-deep .extras__tick { display: none; }
    .extras strong { font-size: 0.875rem; color: var(--ink); }
    .extras span { font-size: 0.8125rem; line-height: 1.4; color: var(--ink-3); }
    .detail__upsell {
      margin-top: 1.25rem; padding: 12px 14px; border-radius: 12px; background: #effaf6; border: 1px solid #cfeee2;
      display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px 12px; font-size: 0.9375rem; color: var(--ink-2);
    }
    .detail__switch {
      display: inline-flex; align-items: center; gap: 4px; min-height: 40px; padding: 0 14px; border: 0; border-radius: 999px; cursor: pointer;
      background: linear-gradient(140deg, #1ecea2, #0f6852); color: #fff; font: 700 0.875rem var(--font);
    }
    .assist__terms { margin-top: 1rem; font-size: var(--fs-small); color: var(--ink-3); }
    .assist__link { margin-top: 1rem; display: inline-flex; align-items: center; gap: 6px; font-weight: 700; color: var(--navy); }
    @media (prefers-reduced-motion: reduce) { .detail { animation: none; } }

    /* Phones: the details sit right under the cards (no pictures in between), shorter cards, compact extras. */
    @media (max-width: 899px) {
      .assist__body { gap: 1.5rem; margin-top: 2rem; }
      .vehicles { display: none; }
      .assist__head { gap: 0.75rem; }
      .assist__head .lede { font-size: 1rem; }
      .plan { min-height: 128px; padding: 14px; }
      .plan__name { font-size: 0.875rem; }
      .plan__km span:first-child { font-size: 2.75rem; }
      .plan__km { font-size: 1.125rem; }
      .plan__uses { margin-top: 0.4rem; font-size: 0.8125rem; }
      .plan__tick { width: 22px; height: 22px; top: 12px; right: 12px; }
      .plans__hint { margin-top: 0.5rem; }
      .detail__points { margin-top: 0.75rem; gap: 0.4rem; }
      /* Extras: a compact two-column tick list (titles only); "T&C apply" stays below. */
      .detail__sub { margin-top: 1rem; }
      .extras { gap: 6px 12px; }
      .extras li { display: grid; grid-template-columns: 18px 1fr; align-items: start; padding: 0; border: 0; background: none; }
      .extras ::ng-deep .extras__tick { display: block; margin-top: 2px; color: var(--c); }
      .extras strong { font-size: 0.875rem; font-weight: 700; line-height: 1.35; }
      .extras span { display: none; }
      .detail__upsell { margin-top: 1rem; padding: 10px 12px; }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Assist {
  protected readonly i18n = inject(I18nService);
  private readonly injector = inject(Injector);
  protected readonly selected = signal<PlanKey>('basic');
  private readonly tabs = viewChildren<ElementRef<HTMLButtonElement>>('tab');
  protected readonly plans = computed(() => {
    const a = this.i18n.t().assist;
    return [
      { key: 'basic' as const, km: '100', ...a.basic },
      { key: 'premium' as const, km: '300', ...a.premium },
    ];
  });

  protected show(key: PlanKey, focus = false): void {
    this.selected.set(key);
    if (focus) {
      const i = key === 'basic' ? 0 : 1;
      afterNextRender(() => this.tabs()[i]?.nativeElement.focus(), { injector: this.injector });
    }
  }

  protected onKey(e: KeyboardEvent, i: number): void {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const plans = this.plans();
    this.show(plans[(i + step + plans.length) % plans.length].key, true);
  }
}
