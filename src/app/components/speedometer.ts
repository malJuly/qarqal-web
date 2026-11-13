import { ChangeDetectionStrategy, Component } from '@angular/core';
import { QMark } from './qmark';

// The speedometer ring from the QarQal splash: 270° dial with ticks, a cyan sweep and an end dot.
const cx = 120, cy = 120, r = 104;
const start = 135, sweep = 270;
const pt = (deg: number, rad = r): [string, string] => {
  const a = (deg * Math.PI) / 180;
  return [(cx + rad * Math.cos(a)).toFixed(2), (cy + rad * Math.sin(a)).toFixed(2)];
};
const ticks = Array.from({ length: 55 }, (_, i) => {
  const a = ((start + (sweep / 54) * i) * Math.PI) / 180;
  const major = i % 9 === 0;
  const r1 = r - 6, r2 = r - (major ? 18 : 12);
  return {
    x1: (cx + r1 * Math.cos(a)).toFixed(2), y1: (cy + r1 * Math.sin(a)).toFixed(2),
    x2: (cx + r2 * Math.cos(a)).toFixed(2), y2: (cy + r2 * Math.sin(a)).toFixed(2), major,
  };
});

@Component({
  selector: 'app-speedometer',
  imports: [QMark],
  template: `
    <div class="dial" [style.--arc]="arcLength">
      <svg class="dial__svg" viewBox="0 0 240 240" aria-hidden="true">
        <path [attr.d]="arc" class="dial__track" />
        @for (t of ticks; track $index) {
          <line [attr.x1]="t.x1" [attr.y1]="t.y1" [attr.x2]="t.x2" [attr.y2]="t.y2" class="dial__tick" [class.dial__tick--major]="t.major" />
        }
        <path [attr.d]="arc" class="dial__sweep" />
        <g class="dial__needle"><circle [attr.cx]="dot[0]" [attr.cy]="dot[1]" r="4.5" class="dial__dot" /></g>
      </svg>
      <div class="dial__logo">
        <app-qmark [size]="58" cls="dial__q" />
        <img src="/assets/app/wordmark.png" alt="QarQal" width="118" height="23" class="dial__wordmark" />
      </div>
    </div>`,
  styles: `
    .dial { position: relative; width: clamp(160px, 30vw, 200px); aspect-ratio: 1; margin-inline: auto; }
    .dial__svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
    .dial__track { fill: none; stroke: rgb(234 237 247 / 0.12); stroke-width: 2; }
    .dial__tick { stroke: rgb(185 196 230 / 0.45); stroke-width: 1.2; stroke-linecap: round; }
    .dial__tick--major { stroke: rgb(234 237 247 / 0.8); stroke-width: 1.8; }
    .dial__sweep {
      fill: none; stroke: var(--cyan-bright); stroke-width: 3; stroke-linecap: round;
      stroke-dasharray: var(--arc); stroke-dashoffset: 0;
      filter: drop-shadow(0 0 6px rgb(0 160 230 / 0.75));
    }
    .dial__needle { transform-origin: 120px 120px; transform: rotate(270deg); }
    .dial__dot { fill: #fff; filter: drop-shadow(0 0 6px rgb(0 160 230 / 0.9)); }
    .dial__logo { position: absolute; inset: 0; display: grid; place-content: center; justify-items: center; gap: 8%; color: #fff; padding-bottom: 6%; }
    .dial__logo ::ng-deep .dial__q { width: 32%; height: auto; }
    .dial__wordmark { width: 52%; height: auto; }

    @media (prefers-reduced-motion: no-preference) {
      .dial__sweep { animation: sweep 1.8s var(--ease-out) 0.25s both; }
      .dial__needle { animation: needle 1.8s var(--ease-out) 0.25s both; }
      .dial__logo { animation: rise 0.9s var(--ease-out) 0.1s both; }
    }
    @keyframes sweep { from { stroke-dashoffset: var(--arc); } to { stroke-dashoffset: 0; } }
    @keyframes needle { from { transform: rotate(0deg); } to { transform: rotate(270deg); } }
    @keyframes rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Speedometer {
  protected readonly ticks = ticks;
  protected readonly arc = `M ${pt(start).join(' ')} A ${r} ${r} 0 1 1 ${pt(start + sweep).join(' ')}`;
  protected readonly arcLength = ((Math.PI * 2 * r * sweep) / 360).toFixed(1);
  protected readonly dot = pt(start);
}
