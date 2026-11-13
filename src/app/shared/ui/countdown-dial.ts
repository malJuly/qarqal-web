import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * A countdown drawn as a speedometer, in the QarQal blue: a 270° dial numbered 0…max, a needle and a
 * blue sweep that fall as time runs out, and the seconds left in the middle.
 *   <app-countdown-dial [max]="7" [value]="needle()" [label]="secondsLeft()" />
 *
 * Presentational: `value` is where the needle points (0…max, fractions allowed) and `label` the number
 * shown. The needle glides between values over one second, so set `value` to the *next* second as each
 * second starts and it stays in step with the label.
 */
const CX = 100, CY = 100, R = 84;
const START = 135, SWEEP = 270;
const point = (deg: number, rad: number): { x: string; y: string } => {
  const a = (deg * Math.PI) / 180;
  return { x: (CX + rad * Math.cos(a)).toFixed(2), y: (CY + rad * Math.sin(a)).toFixed(2) };
};

@Component({
  selector: 'app-countdown-dial',
  template: `
    <div class="dial" role="timer" [attr.aria-label]="ariaLabel()">
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <defs>
          <linearGradient id="cd-sweep" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stop-color="#2b3494" /><stop offset="1" stop-color="#009ee1" />
          </linearGradient>
        </defs>
        <path [attr.d]="arc" class="track" />
        <path [attr.d]="arc" class="sweep" [style.stroke-dasharray]="arcLength" [style.stroke-dashoffset]="offset()" />
        @for (t of ticks(); track t.n) {
          <line [attr.x1]="t.a.x" [attr.y1]="t.a.y" [attr.x2]="t.b.x" [attr.y2]="t.b.y" class="tick" [class.tick--major]="t.major" />
          @if (t.major) { <text [attr.x]="t.label.x" [attr.y]="t.label.y" class="num">{{ t.n }}</text> }
        }
        <g class="needle" [style.transform]="'rotate(' + angle() + 'deg)'">
          <line x1="100" y1="100" x2="166" y2="100" />
        </g>
        <circle cx="100" cy="100" r="7" class="hub" />
      </svg>
      <span class="label">{{ label() }}</span>
    </div>`,
  styles: `
    .dial { position: relative; width: var(--dial-size, 168px); aspect-ratio: 1; }
    svg { width: 100%; height: 100%; overflow: visible; }
    .track { fill: none; stroke: #e3e8f5; stroke-width: 8; stroke-linecap: round; }
    .sweep { fill: none; stroke: url(#cd-sweep); stroke-width: 8; stroke-linecap: round; transition: stroke-dashoffset 1s linear; }
    .tick { stroke: #b9c4e6; stroke-width: 1.5; stroke-linecap: round; }
    .tick--major { stroke: var(--navy); stroke-width: 2.5; }
    .num { font: 700 11px var(--font); fill: var(--ink-3); text-anchor: middle; dominant-baseline: central; }
    .needle { transform-origin: 100px 100px; transition: transform 1s linear; }
    .needle line { stroke: var(--navy); stroke-width: 4; stroke-linecap: round; }
    .hub { fill: var(--cyan); stroke: #fff; stroke-width: 3; }
    .label {
      position: absolute; left: 0; right: 0; bottom: 6%; text-align: center;
      font: 900 1.75rem/1 var(--font); color: var(--navy); font-variant-numeric: tabular-nums;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CountdownDial {
  /** Top of the scale, e.g. the countdown's total seconds. */
  readonly max = input.required<number>();
  /** Where the needle points, 0…max. */
  readonly value = input.required<number>();
  /** Number shown in the dial, e.g. whole seconds left. */
  readonly label = input<number | string>('');
  readonly ariaLabel = input('');

  protected readonly arc = (() => {
    const a = point(START, R), b = point(START + SWEEP, R);
    return `M ${a.x} ${a.y} A ${R} ${R} 0 1 1 ${b.x} ${b.y}`;
  })();
  protected readonly arcLength = (Math.PI * 2 * R * SWEEP) / 360;

  private readonly ratio = computed(() => (this.max() > 0 ? Math.min(Math.max(this.value() / this.max(), 0), 1) : 0));
  protected readonly angle = computed(() => START + SWEEP * this.ratio());
  protected readonly offset = computed(() => this.arcLength * (1 - this.ratio()));

  /** One numbered tick per unit, with a small tick between each. */
  protected readonly ticks = computed(() => {
    const max = Math.max(1, Math.round(this.max()));
    return Array.from({ length: max * 2 + 1 }, (_, i) => {
      const deg = START + (SWEEP / (max * 2)) * i;
      const major = i % 2 === 0;
      return { n: i / 2, major, a: point(deg, R - 8), b: point(deg, R - (major ? 18 : 13)), label: point(deg, R - 30) };
    });
  });
}
