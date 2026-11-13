import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Icon } from '../components/icon';
import { vehicleLabel } from './offer.util';
import type { Vehicle } from './quote.types';

/**
 * One line that says which vehicle the quotes are for: plate, make/model/year, NCD.
 *   <app-vehicle-bar [vehicle]="v" [editLabel]="t.edit" (edit)="askToLeave()" />
 */
@Component({
  selector: 'app-vehicle-bar',
  imports: [Icon],
  template: `
    @let v = vehicle();
    <div class="bar">
      <span class="icon" aria-hidden="true"><app-icon name="car" [size]="20" /></span>
      <div class="text">
        <strong>{{ v.plateNo }}</strong>
        <span class="sub">
          @if (label()) { <span>{{ label() }}</span> }
          @if (v.ncdPercentage) { <span class="ncd" title="No-claim discount">NCD {{ v.ncdPercentage }}%</span> }
        </span>
      </div>
      @if (editLabel()) { <button type="button" class="edit" (click)="edit.emit()">{{ editLabel() }}</button> }
    </div>`,
  styles: `
    .bar { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border: 1px solid var(--line); border-radius: 12px; background: #fff; }
    .icon { flex: none; display: grid; place-items: center; width: 36px; height: 36px; border-radius: 999px; background: var(--bg-soft); color: var(--navy); }
    .text { flex: 1; min-width: 0; display: grid; gap: 2px; }
    .text strong { font-size: 1.0625rem; font-weight: 900; letter-spacing: 0.04em; }
    .sub { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; font-size: 0.8125rem; color: var(--ink-3); }
    .ncd { padding: 2px 8px; border-radius: 999px; background: var(--bg-soft); font-size: 0.75rem; font-weight: 700; color: var(--ink-2); white-space: nowrap; }
    .edit { flex: none; min-height: 44px; padding: 0 4px; border: 0; background: none; cursor: pointer; font: 700 0.875rem var(--font); color: var(--navy); text-decoration: underline; text-underline-offset: 0.2em; }
    .edit:focus-visible { outline: 3px solid rgb(0 160 230 / 0.5); outline-offset: 2px; border-radius: 6px; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehicleBar {
  readonly vehicle = input.required<Vehicle>();
  /** Shows the edit button when set. */
  readonly editLabel = input('');
  /** The visitor asked to change the vehicle; the parent decides what happens (e.g. confirm, then leave). */
  readonly edit = output<void>();
  protected readonly label = computed(() => {
    const v = this.vehicle();
    return vehicleLabel(v.make, v.model, v.year);
  });
}
