import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import { formatMoney } from '../utils/format.util';

/**
 * A number chosen with a slider and/or typed exactly, e.g. a sum insured.
 *   <app-range-field inputId="sum" [label]="t.sumInsured" [min]="40000" [max]="52000" [step]="1000" prefix="RM"
 *     [(value)]="sum" [error]="sumErr()" (commit)="reprice()" />
 *
 * - The slider shows only when max > min. Dragging snaps to min + n × step, and its far end is always max.
 * - The thumb sits at the real value even when that isn't one of the stops (the track runs on 1000 fine positions).
 * - `value` changes while dragging or typing; `commit` fires when the visitor lets go, leaves the box or presses Enter.
 */
const RESOLUTION = 1000;

@Component({
  selector: 'app-range-field',
  template: `
    <div class="rf">
      <label [for]="inputId()">{{ label() }}@if (hint()) { <span class="rf__hint"> — {{ hint() }}</span> }</label>
      @if (hasRange()) {
        <input class="rf__slider" type="range" min="0" [max]="resolution" step="1" [value]="position()"
          [attr.aria-label]="label()" [attr.aria-valuetext]="prefix() + ' ' + money(value())"
          [style.--fill]="position() / resolution * 100 + '%'"
          (input)="onSlide($event)" (change)="commit.emit()" />
        <div class="rf__ends" aria-hidden="true"><span>{{ prefix() }} {{ money(min()) }}</span><span>{{ prefix() }} {{ money(max()) }}</span></div>
      }
      <div class="rf__box" [class.rf__box--invalid]="!!error()">
        @if (prefix()) { <span class="rf__prefix" aria-hidden="true">{{ prefix() }}</span> }
        <input #box type="number" inputmode="decimal" [id]="inputId()" [value]="value()"
          [attr.aria-describedby]="inputId() + '-err'" [attr.aria-invalid]="error() ? 'true' : null"
          (input)="value.set(toNumber(box.value))" (change)="commit.emit()" (keydown.enter)="$event.preventDefault(); commit.emit()" />
      </div>
      <p class="rf__err" [id]="inputId() + '-err'" aria-live="polite">{{ error() }}</p>
    </div>`,
  styles: `
    .rf { display: grid; gap: 6px; min-width: 0; }
    label { font-size: 0.8125rem; font-weight: 700; color: var(--ink-2); }
    .rf__hint { font-weight: 400; color: var(--ink-3); }
    .rf__slider {
      width: 100%; height: 28px; margin: 0; background: none; appearance: none; cursor: pointer;
      --track: linear-gradient(to right, var(--navy) var(--fill), #dfe5f3 var(--fill));
    }
    .rf__slider::-webkit-slider-runnable-track { height: 6px; border-radius: 999px; background: var(--track); }
    .rf__slider::-moz-range-track { height: 6px; border-radius: 999px; background: var(--track); }
    .rf__slider::-webkit-slider-thumb { appearance: none; width: 24px; height: 24px; margin-top: -9px; border-radius: 999px; border: 3px solid #fff; background: var(--navy); box-shadow: 0 1px 4px rgb(4 11 36 / 0.35); }
    .rf__slider::-moz-range-thumb { width: 18px; height: 18px; border-radius: 999px; border: 3px solid #fff; background: var(--navy); box-shadow: 0 1px 4px rgb(4 11 36 / 0.35); }
    .rf__slider:focus-visible { outline: 3px solid rgb(0 160 230 / 0.5); outline-offset: 2px; border-radius: 999px; }
    .rf__ends { display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--ink-3); }
    .rf__box { display: flex; align-items: stretch; margin-top: 4px; border: 1px solid #c9d1e4; border-radius: 10px; overflow: hidden; background: #fff; }
    .rf__box:focus-within { border-color: var(--navy); box-shadow: 0 0 0 3px rgb(0 160 230 / 0.28); }
    .rf__box--invalid { border-color: #d92d20; }
    .rf__prefix { display: grid; place-items: center; padding: 0 12px; background: var(--bg-soft); font-weight: 700; color: var(--ink-2); }
    .rf__box input { flex: 1; min-width: 0; height: 48px; padding: 0 14px; border: 0; background: none; font: 400 1rem var(--font); color: var(--ink); appearance: textfield; }
    .rf__box input::-webkit-outer-spin-button, .rf__box input::-webkit-inner-spin-button { appearance: none; margin: 0; }
    .rf__box input:focus { outline: none; }
    .rf__err { font-size: 0.8125rem; color: #b42318; }
    .rf__err:empty { display: none; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RangeField {
  readonly inputId = input.required<string>();
  readonly label = input.required<string>();
  readonly value = model(0);
  readonly min = input(0);
  readonly max = input(0);
  /** Distance between the slider's stops. */
  readonly step = input(1);
  /** Shown before the amounts, e.g. "RM". */
  readonly prefix = input('');
  readonly hint = input('');
  /** Error message; empty or undefined means valid. */
  readonly error = input<string | undefined>('');
  /** The visitor finished choosing (slider released, box left, or Enter). */
  readonly commit = output<void>();

  protected readonly resolution = RESOLUTION;
  protected readonly money = formatMoney;
  protected readonly hasRange = computed(() => this.max() > this.min());
  protected readonly position = computed(() => {
    if (!this.hasRange()) return 0;
    const clamped = Math.min(Math.max(this.value() || this.min(), this.min()), this.max());
    return Math.round(((clamped - this.min()) / (this.max() - this.min())) * RESOLUTION);
  });

  protected toNumber(v: string): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  protected onSlide(e: Event): void {
    const min = this.min();
    const max = this.max();
    const step = this.step() > 0 ? this.step() : 1;
    const raw = min + (Number((e.target as HTMLInputElement).value) / RESOLUTION) * (max - min);
    const snapped = Math.min(max, min + Math.round((raw - min) / step) * step);
    // The top of the track is always the max, even when it isn't a whole step from the min.
    this.value.set(Math.round(max - raw < step / 2 ? max : snapped));
  }
}
