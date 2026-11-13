import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { I18nService } from '../core/i18n.service';
import { Phone } from './phone/phone';
import { QuoteScreen } from './phone/quote-screen';

// The old way (problem) and the three steps (answer) in one section.
// The steps and the phone stay in sync: the phone reports its screen (stepChange), and a step
// tap moves the phone (goto). Phones show the steps as a one-row stepper with only the
// active step's text; wider screens show the full list with the active step highlighted.
@Component({
  selector: 'app-insurance',
  imports: [Phone, QuoteScreen],
  template: `
    @let t = i18n.t();
    <section class="ins section" id="insurance" aria-labelledby="ins-title">
      <div class="wrap ins__grid">
        <div class="ins__copy">
          <h2 id="ins-title">{{ t.oldWay.title }}</h2>
          <p class="ins__lede">{{ t.oldWay.body }}</p>
          <h3 class="ins__steps-title">{{ t.insurance.title }}</h3>
          <ol class="steps">
            @for (s of t.insurance.steps; track $index; let i = $index) {
              <li [attr.aria-current]="step() === i + 1 ? 'step' : null">
                <button type="button" class="steps__head" (click)="goto(i + 1)" [attr.aria-describedby]="'step-body-' + (i + 1)">
                  <span class="steps__n" aria-hidden="true">{{ i + 1 }}</span>
                  <span class="steps__title">{{ s.title }}</span>
                </button>
                <p class="steps__body" [id]="'step-body-' + (i + 1)">{{ s.body }}</p>
              </li>
            }
          </ol>
        </div>
        <app-phone label="QarQal app: comparing insurance quotes" [caption]="t.screens.tryIt + ' ' + t.screens.sample" [interactive]="true">
          <app-quote-screen (stepChange)="step.set($event)" />
        </app-phone>
      </div>
    </section>`,
  styles: `
    .ins__grid { display: grid; gap: 3rem; align-items: center; }
    @media (min-width: 900px) { .ins__grid { grid-template-columns: 1.1fr 0.9fr; gap: 5rem; } }
    .ins h2 { max-width: 16ch; color: var(--navy); }
    .ins__lede { margin-top: 1.25rem; font-size: 1.125rem; line-height: 1.6; color: var(--ink-2); max-width: 48ch; }
    .ins__steps-title { margin-top: 2.25rem; font-size: 1.25rem; font-weight: 900; }

    .steps { list-style: none; margin: 1rem 0 0; padding: 0; display: grid; }
    .steps__head {
      display: flex; align-items: center; gap: 16px; width: 100%; padding: 0; border: 0; background: none;
      font: inherit; color: inherit; text-align: left; cursor: pointer;
    }
    .steps__n {
      width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; flex: none;
      background: var(--brand-gradient); color: #fff; font-weight: 900; font-size: 1.125rem;
      transition: transform 0.25s var(--ease-out), box-shadow 0.25s;
    }
    .steps__title { font-size: var(--fs-h3); font-weight: 700; line-height: 1.3; }
    .steps__body { color: var(--ink-2); max-width: 46ch; }
    .steps li[aria-current] .steps__n { box-shadow: 0 0 0 4px rgb(0 158 225 / 0.25); }

    /* Tablet and desktop: the full list, active step tinted. */
    @media (min-width: 640px) {
      .steps li { padding: 1.25rem 1rem; border-top: 1px solid var(--line); border-radius: 0; transition: background-color 0.25s; }
      .steps li:last-child { border-bottom: 1px solid var(--line); }
      .steps li[aria-current] { background: var(--bg-soft); }
      .steps__body { margin: 0.35rem 0 0 60px; }
    }

    /* Phones: compact type, and the steps as one row with only the active step's text below. */
    @media (max-width: 639px) {
      .ins__grid { gap: 1.5rem; }
      .ins h2 { font-size: 1.5rem; }
      .ins__lede { margin-top: 0.75rem; font-size: 1rem; line-height: 1.55; }
      .ins__steps-title { margin-top: 1.5rem; font-size: 1rem; }
      .steps { grid-template-columns: repeat(3, 1fr); column-gap: 8px; margin-top: 0.75rem; position: relative; }
      /* The connecting line behind the numbers */
      .steps::before { content: ''; position: absolute; top: 17px; left: 16.6%; right: 16.6%; height: 2px; background: var(--line); }
      .steps li { display: contents; }
      .steps__head { position: relative; grid-row: 1; flex-direction: column; gap: 6px; text-align: center; min-height: 44px; }
      .steps li:nth-child(1) .steps__head { grid-column: 1; }
      .steps li:nth-child(2) .steps__head { grid-column: 2; }
      .steps li:nth-child(3) .steps__head { grid-column: 3; }
      .steps__n { width: 36px; height: 36px; font-size: 1rem; background: #fff; color: var(--ink-3); border: 2px solid var(--line); }
      .steps li[aria-current] .steps__n { background: var(--brand-gradient); color: #fff; border-color: transparent; transform: scale(1.08); }
      .steps__title { font-size: 0.8125rem; color: var(--ink-3); }
      .steps li[aria-current] .steps__title { color: var(--navy); }
      .steps__body { grid-row: 2; grid-column: 1 / -1; display: none; margin-top: 12px; padding: 12px 14px; border-radius: 12px; background: var(--bg-soft); font-size: 0.9375rem; line-height: 1.5; }
      .steps li[aria-current] .steps__body { display: block; }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Insurance {
  protected readonly i18n = inject(I18nService);
  protected readonly step = signal(1);
  private readonly screen = viewChild.required(QuoteScreen);

  protected goto(step: number): void {
    this.step.set(step);
    this.screen().goto(step);
  }
}
