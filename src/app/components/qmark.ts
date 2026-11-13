import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** The Q mark from the app (assets/svg/qarqal_watermark.svg), as a crisp vector. */
@Component({
  selector: 'app-qmark',
  template: `
    <svg [attr.class]="cls() || null" [attr.width]="size()" [attr.height]="size() * 1.256" viewBox="0 0 125 157"
      [attr.role]="label() ? 'img' : null" [attr.aria-label]="label() || null" [attr.aria-hidden]="label() ? null : 'true'">
      <path fill="currentColor" d="M0 63.9411C0 99.2533 27.758 127.881 61.9994 127.881C68.6777 127.881 75.1037 126.777 81.1278 124.758L111.954 156V126.903L85.8419 99.9737L85.8368 99.9751L85.0563 99.1702C78.4755 103.759 70.5405 106.44 61.9994 106.44C39.2403 106.44 20.7896 87.4106 20.7896 63.9411C20.7896 40.4703 39.2403 21.4425 61.9994 21.4425C84.7597 21.4425 103.209 40.4703 103.209 63.9411C103.209 68.9154 102.338 73.6697 100.814 78.1046L116.557 94.3394C121.302 85.2978 124 74.9441 124 63.9411C124 28.6275 96.242 0 61.9994 0C27.758 0 0 28.6275 0 63.9411Z" />
    </svg>`,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QMark {
  readonly size = input(48);
  readonly cls = input<string>();
  readonly label = input<string>();
}
