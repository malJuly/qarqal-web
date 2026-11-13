import { ChangeDetectionStrategy, Component, ElementRef, Injector, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { I18nService } from '../core/i18n.service';
import { QarqalApi } from '../core/qarqal-api';
import { Router } from '@angular/router';
import { OtpPrompt } from '../quote/otp-prompt';
import { QuoteStore } from '../quote/quote.store';

// Hero quotation form. Fields mirror the app's Get Quotation screen (lib/utils/id_type_helper.dart):
// ID type 1 = NRIC, 2 = Passport, 3 = Company / Police / Army.
// A valid submit asks for a mobile number to earn points (quote/otp-prompt.ts, or skip), then opens
// /insurance/quote, which generates the quotes.
// When environment.quoteApi.root is empty, nothing leaves the browser: it shows the "continue in the app" panel.
// Never send these values in a URL.

type IdKey = 'nric' | 'passport' | 'company';
type FieldName = 'idNumber' | 'plateNo' | 'postcode';
const KEYS: Record<string, IdKey> = { '1': 'nric', '2': 'passport', '3': 'company' };

// Input clean-up, matching the app's formatters.
const formatNric = (v: string): string => {
  const d = v.replace(/\D/g, '').slice(0, 12);
  return [d.slice(0, 6), d.slice(6, 8), d.slice(8)].filter(Boolean).join('-');
};
const clean: Record<IdKey, (v: string) => string> = {
  nric: formatNric,
  passport: (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20),
  company: (v) => v.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20),
};

@Component({
  selector: 'app-quote-form',
  imports: [OtpPrompt],
  template: `
    @let q = i18n.t().quote;
    <div class="quote">
      <form class="quote__form" method="post" novalidate aria-labelledby="quote-title" [hidden]="done()" (submit)="submit($event)">
        <h2 id="quote-title" class="quote__title">{{ q.title }}</h2>
        <div class="quote__grid">
          <div class="field field--type">
            <label for="q-idtype">{{ q.idType }}</label>
            <select id="q-idtype" name="idType" #type (change)="applyType(type.value)">
              <option value="1">{{ q.idTypes.nric }}</option>
              <option value="2">{{ q.idTypes.passport }}</option>
              <option value="3">{{ q.idTypes.company }}</option>
            </select>
          </div>
          <div class="field field--id">
            <label for="q-idnumber">{{ q.idNumber[key()] }}</label>
            <input id="q-idnumber" name="idNumber" type="text" autocomplete="off" #idNumber
              [attr.inputmode]="key() === 'nric' ? 'numeric' : 'text'" [attr.maxlength]="key() === 'nric' ? 14 : 20"
              [placeholder]="q.idHint[key()]" aria-describedby="q-idnumber-err" required
              [attr.aria-invalid]="invalidAttr('idNumber')"
              (input)="idNumber.value = cleanId(idNumber.value); recheck('idNumber')" (blur)="onBlur('idNumber')" />
            <p class="field__err" id="q-idnumber-err" aria-live="polite">{{ errors().idNumber }}</p>
          </div>
          <div class="field field--plate">
            <label for="q-plate">{{ q.plate }}</label>
            <input id="q-plate" name="plateNo" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" #plate
              maxlength="12" [placeholder]="q.plateHint" aria-describedby="q-plate-err" required
              [attr.aria-invalid]="invalidAttr('plateNo')"
              (input)="plate.value = cleanPlate(plate.value); recheck('plateNo')" (blur)="onBlur('plateNo')" />
            <p class="field__err" id="q-plate-err" aria-live="polite">{{ errors().plateNo }}</p>
          </div>
          <div class="field field--postcode">
            <label for="q-postcode">{{ q.postcode }}</label>
            <input id="q-postcode" name="postcode" type="text" inputmode="numeric" autocomplete="postal-code" maxlength="5" #postcode
              [placeholder]="q.postcodeHint" aria-describedby="q-postcode-err" required
              [attr.aria-invalid]="invalidAttr('postcode')"
              (input)="postcode.value = postcode.value.replace(digitsOnly, '').slice(0, 5); recheck('postcode')" (blur)="onBlur('postcode')" />
            <p class="field__err" id="q-postcode-err" aria-live="polite">{{ errors().postcode }}</p>
          </div>
          <div class="field field--submit">
            <button class="btn btn--primary quote__btn" type="submit" [disabled]="busy()">{{ busy() ? q.sending : q.submit }}</button>
          </div>
        </div>
        <p class="quote__server-err" role="alert" [hidden]="!serverErr()">{{ q.errors.server }}</p>
        <p class="quote__consent">{{ q.consent }} <a [href]="i18n.home() + 'privacy-policy/'">{{ q.privacy }}</a></p>
      </form>

      <div class="quote__done" [hidden]="!done()" tabindex="-1" aria-live="polite" #doneEl>
        <h2 class="quote__title">{{ q.doneTitle }}</h2>
        <p>{{ q.doneBody }}</p>
        <div class="quote__done-actions">
          <a class="btn btn--primary" href="#download" data-smart-download>{{ q.doneCta }}</a>
          <button class="quote__edit" type="button" (click)="edit()">{{ q.edit }}</button>
        </div>
      </div>
      <app-otp-prompt (done)="goToQuotes()" />
    </div>`,
  styles: `
    .quote {
      width: 100%;
      background: #fff; color: var(--ink); text-align: left;
      border-radius: var(--radius); padding: 20px;
      box-shadow: 0 24px 60px rgb(4 11 36 / 0.45), 0 2px 8px rgb(4 11 36 / 0.2);
    }
    @media (min-width: 768px) { .quote { padding: 24px 28px; } }
    .quote__title { font-size: 1.1875rem; font-weight: 900; letter-spacing: -0.01em; color: var(--navy); margin-bottom: 14px; }

    /* Type and ID full width, plate and postcode side by side, button full width. Same on every screen. */
    .quote__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .field--type, .field--id, .field--submit { grid-column: 1 / -1; }

    .field { display: grid; gap: 6px; min-width: 0; }
    .field label { font-size: 0.8125rem; font-weight: 700; line-height: 20px; color: var(--ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .field input, .field select {
      width: 100%; height: 48px; padding: 0 14px;
      font: 400 1rem var(--font); color: var(--ink);
      background: #fff; border: 1px solid #c9d1e4; border-radius: 10px;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .field input::placeholder { color: #8895a6; }
    .field input:hover, .field select:hover { border-color: #8895a6; }
    .field input:focus, .field select:focus { outline: none; border-color: var(--navy); box-shadow: 0 0 0 3px rgb(0 160 230 / 0.28); }
    .field select {
      appearance: none; padding-right: 36px; cursor: pointer;
      background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%231e3c96' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6l6-6'/%3E%3C/svg%3E") no-repeat right 12px center;
    }
    #q-plate { text-transform: uppercase; letter-spacing: 0.04em; }
    #q-plate::placeholder { text-transform: none; letter-spacing: 0; }
    .field input[aria-invalid='true'] { border-color: #d92d20; }
    .field input[aria-invalid='true']:focus { box-shadow: 0 0 0 3px rgb(217 45 32 / 0.2); }
    .field__err { font-size: 0.8125rem; line-height: 1.35; color: #b42318; }
    .field__err:empty { display: none; }

    .quote__btn { width: 100%; height: 48px; white-space: nowrap; }
    .quote__btn:disabled { opacity: 0.7; cursor: progress; }

    .quote__server-err { margin-top: 12px; padding: 10px 12px; border-radius: 8px; background: #fef3f2; color: #b42318; font-size: var(--fs-small); }
    .quote__consent { margin-top: 12px; font-size: 0.8125rem; line-height: 1.5; color: var(--ink-3); }
    .quote__consent a { color: var(--navy); font-weight: 700; }

    .quote__done { outline: none; }
    .quote__done p { color: var(--ink-2); max-width: 56ch; }
    .quote__done-actions { margin-top: 16px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; }
    .quote__edit {
      min-height: 44px; padding: 0 4px; background: none; border: 0; cursor: pointer;
      font: 700 1rem var(--font); color: var(--navy); text-decoration: underline; text-underline-offset: 0.2em;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuoteForm {
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(QarqalApi);
  private readonly injector = inject(Injector);
  protected readonly digitsOnly = /\D/g;

  private readonly idType = signal('1');
  protected readonly key = computed<IdKey>(() => KEYS[this.idType()] ?? 'nric');
  protected readonly errors = signal<Record<FieldName, string>>({ idNumber: '', plateNo: '', postcode: '' });
  /** null until a field has been checked once, as in the original (no aria-invalid at first). */
  private readonly checked = signal<Record<FieldName, boolean>>({ idNumber: false, plateNo: false, postcode: false });
  protected readonly busy = signal(false);
  protected readonly done = signal(false);
  protected readonly serverErr = signal(false);

  private readonly idInput = viewChild.required<ElementRef<HTMLInputElement>>('idNumber');
  private readonly plateInput = viewChild.required<ElementRef<HTMLInputElement>>('plate');
  private readonly postcodeInput = viewChild.required<ElementRef<HTMLInputElement>>('postcode');
  private readonly doneEl = viewChild.required<ElementRef<HTMLElement>>('doneEl');
  private readonly prompt = viewChild.required(OtpPrompt);
  private readonly store = inject(QuoteStore);
  private readonly router = inject(Router);

  private input(name: FieldName): HTMLInputElement {
    const ref = name === 'idNumber' ? this.idInput() : name === 'plateNo' ? this.plateInput() : this.postcodeInput();
    return ref.nativeElement;
  }

  protected invalidAttr(name: FieldName): 'true' | 'false' | null {
    if (!this.checked()[name]) return null;
    return this.errors()[name] ? 'true' : 'false';
  }

  protected cleanId(v: string): string { return clean[this.key()](v); }
  protected cleanPlate(v: string): string { return v.toUpperCase().replace(/[^A-Z0-9 ]/g, '').replace(/ {2,}/g, ' '); }

  private check(name: FieldName): string {
    const q = this.i18n.t().quote;
    const v = this.input(name).value.trim();
    if (!v) return q.errors.required;
    if (name === 'idNumber') {
      if (this.key() === 'nric') return /^\d{6}-\d{2}-\d{4}$/.test(v) ? '' : q.errors.nric;
      if (this.key() === 'passport') return /^[A-Z0-9]{5,20}$/.test(v) ? '' : q.errors.passport;
      return /^[A-Z0-9-]{3,20}$/.test(v) ? '' : q.errors.company;
    }
    // Malaysian plates vary (WXY 1234, VBA 12 A, PUTRAJAYA 1): letters plus 1 to 4 digits, optional suffix.
    if (name === 'plateNo') return /^[A-Z]{1,9} ?\d{1,4} ?[A-Z]{0,2}$/.test(v) ? '' : q.errors.plate;
    return /^\d{5}$/.test(v) ? '' : q.errors.postcode;
  }

  private validate(name: FieldName): boolean {
    const msg = this.check(name);
    this.errors.update((e) => ({ ...e, [name]: msg }));
    this.checked.update((c) => ({ ...c, [name]: true }));
    return !msg;
  }

  protected applyType(value: string): void {
    this.idType.set(value);
    const id = this.input('idNumber');
    id.value = clean[this.key()](id.value);
    if (this.invalidAttr('idNumber') === 'true') this.validate('idNumber');
  }

  // Validate when leaving a field, then re-check live once it has shown an error.
  protected onBlur(name: FieldName): void {
    if (this.input(name).value.trim()) this.validate(name);
  }
  protected recheck(name: FieldName): void {
    if (this.invalidAttr(name) === 'true') this.validate(name);
  }

  protected submit(e: Event): void {
    e.preventDefault();
    this.serverErr.set(false);
    const fields: FieldName[] = ['idNumber', 'plateNo', 'postcode'];
    const ok = fields.map((f) => this.validate(f));
    const firstBad = fields[ok.indexOf(false)];
    if (firstBad) { this.input(firstBad).focus(); return; }

    if (!this.api.enabled) { this.showDone(); return; }

    this.store.start({
      idType: Number(this.idType()),
      idNumber: this.input('idNumber').value.replace(/-/g, ''),
      plateNo: this.input('plateNo').value.trim().replace(/ /g, ''),
      postcode: this.input('postcode').value,
    });
    // Already verified in this tab: no need to ask for the mobile number again.
    if (this.api.token()) this.goToQuotes();
    else this.prompt().open();
  }

  protected goToQuotes(): void {
    void this.router.navigateByUrl(this.i18n.home() + 'insurance/quote');
  }

  private showDone(): void {
    this.done.set(true);
    afterNextRender(() => this.doneEl().nativeElement.focus(), { injector: this.injector });
  }

  protected edit(): void {
    this.done.set(false);
    afterNextRender(() => this.input('idNumber').focus(), { injector: this.injector });
  }
}
