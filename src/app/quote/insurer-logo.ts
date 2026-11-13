import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { bundledLogo, insurerName } from './offer.util';

/**
 * Insurer logo in a white tile. Tries the API logo, then the bundled one, then shows the insurer's initial.
 *   <app-insurer-logo [code]="offer.provider" [apiLogo]="offer.imageUrl" />
 * Decorative: the insurer's name is always printed next to it.
 */
@Component({
  selector: 'app-insurer-logo',
  template: `
    <span class="tile" aria-hidden="true">
      @if (src(); as url) {
        <img [src]="url" alt="" loading="lazy" (error)="failed.update(add(url))" />
      } @else {
        <span class="initial">{{ initial() }}</span>
      }
    </span>`,
  styles: `
    .tile {
      display: grid; place-items: center; box-sizing: border-box; width: var(--logo-w, 72px); height: var(--logo-h, 48px); padding: 6px; overflow: hidden;
      border: 1px solid var(--line); border-radius: 10px; background: #fff;
    }
    /* A definite box: percentage max-height doesn't resolve inside an auto-sized grid cell. */
    img { display: block; width: 100%; height: 100%; min-width: 0; min-height: 0; object-fit: contain; }
    .initial { font-size: 1.25rem; font-weight: 900; color: var(--navy); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InsurerLogo {
  /** Insurer code, e.g. "allianz_car". */
  readonly code = input.required<string>();
  readonly apiLogo = input('');

  /** URLs that failed to load. */
  protected readonly failed = signal<ReadonlySet<string>>(new Set());
  protected readonly add = (url: string) => (s: ReadonlySet<string>) => new Set([...s, url]);

  protected readonly src = computed(() =>
    [this.apiLogo(), bundledLogo(this.code())].find((u): u is string => !!u && !this.failed().has(u)) ?? null);
  protected readonly initial = computed(() => insurerName(this.code()).charAt(0));
}
