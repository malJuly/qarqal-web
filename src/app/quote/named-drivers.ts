import { ChangeDetectionStrategy, Component, computed, inject, input, model, signal } from '@angular/core';
import { I18nService } from '../core/i18n.service';
import { SelectField, type SelectOption } from '../shared/ui/select-field';
import { TextField } from '../shared/ui/text-field';
import { fill, formatMoney } from '../shared/utils/format.util';
import { cleanNric, dobFromNric, isValidNric } from '../shared/utils/nric.util';
import type { DriverRules, NamedDriver } from './addons';

type Field = 'fullName' | 'idNumber' | 'dob';
const today = (): string => new Date().toISOString().slice(0, 10);

/**
 * Additional named drivers: the list, and an inline form to add one (up to rules.max).
 *   <app-named-drivers [rules]="rules()" [(drivers)]="drivers" />
 * For NRIC, the date of birth fills in from the number, as in the app.
 */
@Component({
  selector: 'app-named-drivers',
  imports: [TextField, SelectField],
  template: `
    @let n = i18n.t().quoteFlow.drivers;
    <section class="nd" aria-labelledby="nd-title">
      <div class="nd__head">
        <h3 id="nd-title">{{ n.title }}</h3>
        <span class="nd__price">{{ priceNote() }}</span>
      </div>

      @if (drivers().length) {
        <ul class="nd__list">
          @for (d of drivers(); track $index) {
            <li>
              <span><strong>{{ d.fullName }}</strong> · {{ d.idType === 'nric' ? n.nric : n.passport }} {{ d.idNumber }}</span>
              <button type="button" class="nd__link" (click)="remove($index)">{{ n.remove }}</button>
            </li>
          }
        </ul>
      }

      @if (adding()) {
        <form class="nd__form" (submit)="add($event)" novalidate>
          <app-text-field inputId="nd-name" [label]="n.fullName" autocomplete="off" [maxLength]="100" [(value)]="name" [error]="errs().fullName" />
          <div class="nd__row">
            <app-select-field inputId="nd-idtype" [label]="n.idType" [options]="idTypes()" [(value)]="idType" />
            <app-text-field inputId="nd-idnumber" [label]="n.idNumber" [maxLength]="20" [value]="idNumber()"
              (valueChange)="onIdNumber($event)" [error]="errs().idNumber" />
          </div>
          <app-text-field inputId="nd-dob" type="date" [label]="n.dob" [max]="maxDob" [(value)]="dob" [error]="errs().dob" />
          <div class="nd__actions">
            <button class="btn btn--primary" type="submit">{{ n.save }}</button>
            <button class="nd__link" type="button" (click)="adding.set(false)">{{ n.cancel }}</button>
          </div>
        </form>
      } @else if (drivers().length < rules().max) {
        <button type="button" class="nd__add" (click)="startAdd()">+ {{ n.add }}</button>
      }
    </section>`,
  styles: `
    .nd { display: grid; gap: 12px; padding: 14px 16px; border: 1px solid var(--line); border-radius: 12px; background: #fff; }
    .nd__head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 2px 12px; align-items: baseline; }
    .nd__head h3 { font-size: 1rem; font-weight: 700; }
    .nd__price { font-size: 0.8125rem; color: var(--ink-3); }
    .nd__list { list-style: none; padding: 0; display: grid; gap: 8px; }
    .nd__list li { display: flex; justify-content: space-between; gap: 12px; align-items: center; padding: 10px 12px; background: var(--bg-soft); border-radius: 8px; overflow-wrap: anywhere; }
    .nd__form { display: grid; gap: 12px; }
    .nd__row { display: grid; gap: 12px; }
    @media (min-width: 640px) { .nd__row { grid-template-columns: 1fr 1fr; } }
    .nd__actions { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; }
    .nd__link, .nd__add { min-height: 44px; padding: 0 4px; background: none; border: 0; cursor: pointer; font: 700 1rem var(--font); color: var(--navy); text-decoration: underline; text-underline-offset: 0.2em; }
    .nd__add { justify-self: start; text-decoration: none; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NamedDrivers {
  protected readonly i18n = inject(I18nService);
  protected readonly maxDob = today();

  readonly rules = input.required<DriverRules>();
  readonly drivers = model<NamedDriver[]>([]);

  protected readonly adding = signal(false);
  protected readonly name = signal('');
  protected readonly idType = signal('nric'); // string for the shared SelectField
  protected readonly idNumber = signal('');
  protected readonly dob = signal('');
  protected readonly errs = signal<Partial<Record<Field, string>>>({});

  protected readonly idTypes = computed<SelectOption[]>(() => {
    const n = this.i18n.t().quoteFlow.drivers;
    return [{ value: 'nric', label: n.nric }, { value: 'passport', label: n.passport }];
  });

  protected readonly priceNote = computed(() =>
    fill(this.i18n.t().quoteFlow.drivers.price, { max: this.rules().max, price: formatMoney(this.rules().extraPremium) }));

  protected startAdd(): void {
    this.name.set(''); this.idType.set('nric'); this.idNumber.set(''); this.dob.set(''); this.errs.set({});
    this.adding.set(true);
  }

  protected onIdNumber(v: string): void {
    this.idNumber.set(v);
    if (this.idType() === 'nric') {
      const dob = dobFromNric(v);
      if (dob && cleanNric(v).length === 12) this.dob.set(dob);
    }
  }

  protected add(e: Event): void {
    e.preventDefault();
    const n = this.i18n.t().quoteFlow.drivers;
    const req = this.i18n.t().quote.errors.required;
    const name = this.name().trim();
    const id = this.idNumber().trim();
    const errs: Partial<Record<Field, string>> = {};
    if (name.length < 3) errs.fullName = name ? n.errName : req;
    if (this.idType() === 'nric' ? !isValidNric(id) : !/^[A-Za-z0-9]{5,20}$/.test(id)) errs.idNumber = id ? n.errId : req;
    if (!this.dob() || this.dob() >= this.maxDob) errs.dob = req;
    this.errs.set(errs);
    if (Object.keys(errs).length) return;

    this.drivers.update((list) => [...list, { fullName: name, idType: this.idType() === 'passport' ? 'passport' : 'nric', idNumber: id, dob: this.dob() }]);
    this.adding.set(false);
  }

  protected remove(i: number): void {
    this.drivers.update((list) => list.filter((_, idx) => idx !== i));
  }
}
