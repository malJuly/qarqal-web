import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Icon } from '../../components/icon';

/**
 * Page numbers with previous/next, showing up to five pages around the current one.
 *   <app-pagination [page]="page()" [totalPages]="totalPages()" [label]="t.pages" (pageChange)="goTo($event)" />
 */
@Component({
  selector: 'app-pagination',
  imports: [Icon],
  template: `
    @if (totalPages() > 1) {
      <nav class="pg" [attr.aria-label]="label()">
        <button type="button" class="pg__btn" [disabled]="page() <= 1" [attr.aria-label]="prevLabel()" (click)="pageChange.emit(page() - 1)">
          <app-icon name="arrowLeft" [size]="16" />
        </button>
        @for (p of pages(); track p) {
          <button type="button" class="pg__btn" [class.is-current]="p === page()" [attr.aria-current]="p === page() ? 'page' : null"
            (click)="p !== page() && pageChange.emit(p)">{{ p }}</button>
        }
        <button type="button" class="pg__btn" [disabled]="page() >= totalPages()" [attr.aria-label]="nextLabel()" (click)="pageChange.emit(page() + 1)">
          <app-icon name="arrowRight" [size]="16" />
        </button>
      </nav>
    }`,
  styles: `
    .pg { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; margin-top: 1rem; }
    .pg__btn {
      min-width: 40px; height: 40px; padding: 0 10px; display: inline-grid; place-items: center;
      border: 1px solid var(--line); border-radius: 10px; background: #fff; color: var(--ink);
      font: 700 0.9375rem var(--font); cursor: pointer;
    }
    .pg__btn:hover:not(:disabled):not(.is-current) { border-color: var(--navy); color: var(--navy); }
    .pg__btn.is-current { background: var(--navy); border-color: var(--navy); color: #fff; cursor: default; }
    .pg__btn:disabled { opacity: 0.4; cursor: default; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pagination {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly label = input('Pages');
  readonly prevLabel = input('Previous page');
  readonly nextLabel = input('Next page');
  readonly pageChange = output<number>();

  protected readonly pages = computed(() => {
    const total = Math.max(1, this.totalPages());
    const visible = Math.min(5, total);
    const start = Math.min(Math.max(1, this.page() - 2), total - visible + 1);
    return Array.from({ length: visible }, (_, i) => start + i);
  });
}
