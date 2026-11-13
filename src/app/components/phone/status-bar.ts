import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-status-bar',
  template: `
    <div class="sb" [class.sb--dark]="dark()" aria-hidden="true">
      <span>9:41</span>
      <span class="sb__icons">
        <svg width="16" height="10" viewBox="0 0 16 10"><rect x="0" y="6" width="3" height="4" rx="1"/><rect x="4.3" y="4" width="3" height="6" rx="1"/><rect x="8.6" y="2" width="3" height="8" rx="1"/><rect x="12.9" y="0" width="3" height="10" rx="1"/></svg>
        <svg width="22" height="10" viewBox="0 0 22 10"><rect x="0.5" y="0.5" width="18" height="9" rx="2.5" fill="none" stroke="currentColor"/><rect x="2" y="2" width="13" height="6" rx="1.5"/><rect x="19.5" y="3.5" width="1.6" height="3" rx="0.8"/></svg>
      </span>
    </div>`,
  styles: `
    .sb { display: flex; justify-content: space-between; align-items: center; padding: 14px 22px 6px 26px; font-weight: 700; font-size: 12px; color: #111; }
    .sb--dark { color: #fff; }
    .sb__icons { display: flex; gap: 5px; align-items: center; }
    .sb svg { fill: currentColor; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBar {
  readonly dark = input(false);
}
