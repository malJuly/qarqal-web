import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';

/**
 * The QarQal loading mark: the Q itself is the rev meter. Its ring is the dial — it starts at the Q's
 * tail and runs clockwise round to the gap — and fills with the brand blue as the needle is rammed up to
 * the redline, holds for a beat, then falls back smoothly as the gas is let go, on a loop. The tail is
 * always lit, so at the top of the rev the whole Q is blue. Drawn for light backgrounds.
 *   <app-q-loader [size]="88" />
 * Decorative: put the "what's happening" text next to it. With reduced motion the needle drifts slowly
 * instead of ramping, so it still reads as "working".
 *
 * The Q is drawn here as strokes, with the logo's proportions (ring, gap at the lower right, tail at 45°)
 * but a lighter line than the logo, so it reads as a gauge and leaves room for the needle.
 */
const CX = 62, CY = 62, R = 52;
/** Line weight of the ring and tail (the logo's ring is about twice this). */
const WEIGHT = 10;
/** Dial start (where the tail joins) and length, in degrees clockwise from 3 o'clock. It ends at the gap. */
const START = 66, SWEEP = 314;
/** Where the redline begins, as a share of the dial. */
const REDLINE = 0.85;
const point = (deg: number, rad: number): { x: number; y: number } => {
  const a = (deg * Math.PI) / 180;
  return { x: +(CX + rad * Math.cos(a)).toFixed(2), y: +(CY + rad * Math.sin(a)).toFixed(2) };
};
/** The tail: from the ring at the dial's start, down and to the right at 45°. */
const TAIL_FROM = point(START, R);
const TAIL = { x1: TAIL_FROM.x, y1: TAIL_FROM.y, x2: TAIL_FROM.x + 27, y2: TAIL_FROM.y + 27 };
/** Ticks just inside the ring. */
const TICKS = Array.from({ length: 13 }, (_, i) => {
  const share = i / 12;
  const deg = START + SWEEP * share;
  const major = i % 3 === 0;
  return { a: point(deg, R - 10), b: point(deg, R - (major ? 18 : 14)), major, red: share >= REDLINE };
});

@Component({
  selector: 'app-q-loader',
  template: `
    <span class="ql" [style.width.px]="size()" aria-hidden="true">
      <svg viewBox="0 0 124 146">
        <defs>
          <linearGradient id="ql-blue" gradientUnits="userSpaceOnUse" x1="0" y1="146" x2="124" y2="0">
            <stop offset="0" stop-color="#2b3494" /><stop offset="1" stop-color="#009ee1" />
          </linearGradient>
        </defs>

        <!-- pathLength makes the ring's dash units degrees; the turn puts its start at the tail. -->
        <circle [attr.cx]="cx" [attr.cy]="cy" [attr.r]="r" pathLength="360" [attr.transform]="turn" [attr.stroke-width]="weight"
          class="ring track" [attr.stroke-dasharray]="dialDash" />
        <circle [attr.cx]="cx" [attr.cy]="cy" [attr.r]="r" pathLength="360" [attr.transform]="turn" [attr.stroke-width]="weight"
          class="ring redline" [attr.stroke-dasharray]="redDash" [attr.stroke-dashoffset]="redOffset" />
        <circle [attr.cx]="cx" [attr.cy]="cy" [attr.r]="r" pathLength="360" [attr.transform]="turn" [attr.stroke-width]="weight"
          class="ring sweep" [attr.stroke-dasharray]="dialDash" />
        <line [attr.x1]="tail.x1" [attr.y1]="tail.y1" [attr.x2]="tail.x2" [attr.y2]="tail.y2" [attr.stroke-width]="weight" class="tail" />

        @for (t of ticks; track $index) {
          <line [attr.x1]="t.a.x" [attr.y1]="t.a.y" [attr.x2]="t.b.x" [attr.y2]="t.b.y" class="tick" [class.tick--major]="t.major" [class.tick--red]="t.red" />
        }
        <!-- Drawn pointing along +x; rotating the group sweeps it round the dial from the tail. -->
        <g class="needle"><polygon points="62,59.6 101,62 62,64.4 53,62" /></g>
        <circle [attr.cx]="cx" [attr.cy]="cy" r="6" class="hub" />
        <circle [attr.cx]="cx" [attr.cy]="cy" r="2.2" class="pin" />
      </svg>
    </span>`,
  styles: `
    .ql { display: block; }
    .ql svg { display: block; width: 100%; height: auto; overflow: visible; }
    .ql .ring { fill: none; stroke-linecap: round; }
    .ql .track { stroke: #e3e8f5; }
    .ql .redline { stroke: #ffd3bf; }
    /* One dash as long as the dial (314°). Offset 314 = empty, 0 = full. Rest (reduced motion): 55% round. */
    .ql .sweep { stroke: url(#ql-blue); stroke-dashoffset: 141.3; }
    .ql .tail { stroke: url(#ql-blue); stroke-linecap: round; }
    .ql .tick { stroke: #b9c4e6; stroke-width: 1.5; stroke-linecap: round; }
    .ql .tick--major { stroke: var(--navy); stroke-width: 2.2; }
    .ql .tick--red { stroke: #e65000; }
    .ql .needle { transform-origin: 62px 62px; transform: rotate(238.7deg); }
    .ql .needle polygon { fill: var(--navy); }
    .ql .hub { fill: #fff; stroke: var(--navy); stroke-width: 2.6; }
    .ql .pin { fill: var(--cyan); }

    @media (prefers-reduced-motion: no-preference) {
      .ql .needle { animation: ql-rev-needle 2.6s infinite; will-change: transform; }
      .ql .sweep { animation: ql-rev-sweep 2.6s infinite; }
    }
    /* Reduced motion: a loader must still show progress, so the needle drifts slowly back and forth
       (no ramp, no fall) instead of standing still. */
    @media (prefers-reduced-motion: reduce) {
      .ql .needle { animation: ql-rev-drift 4s ease-in-out infinite alternate; }
      .ql .sweep { animation: ql-rev-drift-sweep 4s ease-in-out infinite alternate; }
    }
    @keyframes ql-rev-drift {
      from { transform: rotate(91.1deg); }
      to   { transform: rotate(238.7deg); }
    }
    @keyframes ql-rev-drift-sweep {
      from { stroke-dashoffset: 288.9; }
      to   { stroke-dashoffset: 141.3; }
    }
    /* r = how far round the dial (0–1): needle angle = 66° + 314° × r, sweep offset = 314 × (1 − r).
       Three beats, each easing to a stop so the speed never jumps: ram the gas (idle 0.08 → redline 1,
       quick off the mark, easing into the top), hold, let go (a smooth fall back to idle). */
    @keyframes ql-rev-needle {
      0%   { transform: rotate(91.1deg); animation-timing-function: cubic-bezier(0.3, 0, 0.1, 1); }
      34%  { transform: rotate(380deg); animation-timing-function: linear; }
      44%  { transform: rotate(380deg); animation-timing-function: cubic-bezier(0.5, 0, 0.3, 1); }
      100% { transform: rotate(91.1deg); }
    }
    @keyframes ql-rev-sweep {
      0%   { stroke-dashoffset: 288.9; animation-timing-function: cubic-bezier(0.3, 0, 0.1, 1); }
      34%  { stroke-dashoffset: 0; animation-timing-function: linear; }
      44%  { stroke-dashoffset: 0; animation-timing-function: cubic-bezier(0.5, 0, 0.3, 1); }
      100% { stroke-dashoffset: 288.9; }
    }
  `,
  // No emulated scoping: Angular renames @keyframes per component but, in the prerendered HTML, left the
  // animation-name unrenamed, so nothing animated in production. Everything is under .ql / ql-* instead.
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QLoader {
  /** Width in px; the height follows the Q's proportions (about 1.18 × the width). */
  readonly size = input(64);
  protected readonly cx = CX;
  protected readonly cy = CY;
  protected readonly r = R;
  protected readonly weight = WEIGHT;
  protected readonly ticks = TICKS;
  protected readonly tail = TAIL;
  /** Turns the ring so its stroke starts at the tail. */
  protected readonly turn = `rotate(${START} ${CX} ${CY})`;
  /** The dial as one dash (then a gap longer than the rest of the circle, so nothing else is drawn). */
  protected readonly dialDash = `${SWEEP} 360`;
  /** The redline as one dash: starts REDLINE of the way round, runs to the end of the dial. */
  protected readonly redDash = `${(SWEEP * (1 - REDLINE)).toFixed(1)} 360`;
  protected readonly redOffset = (-SWEEP * REDLINE).toFixed(1);
}
