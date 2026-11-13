import { ChangeDetectionStrategy, Component, ElementRef, Injector, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import site from '../config/site.json';
import { I18nService } from '../core/i18n.service';
import { Icon } from './icon';

// Videos are listed in src/app/config/site.json under video.clips, in order: { "src", "title", "poster"? }.
// Put the files in public/assets/videos/ and use paths such as "/assets/videos/01-renew-road-tax.mp4".
// (The Astro site picked them up from a folder at build time; Angular has no build-time folder scan, so they are listed.)
// If clips is empty, "youtubeId" or "mp4" (+ optional "poster") is used instead, else a "coming soon" frame.
// The YouTube player only loads after a tap, so it costs nothing until someone presses play.
interface Clip { src: string; title: string; poster?: string }
interface VideoConfig { youtubeId: string; mp4: string; poster: string; clips?: Clip[] }

@Component({
  selector: 'app-video',
  imports: [Icon],
  template: `
    @let t = i18n.t().video;
    <section class="vid section" id="about" aria-labelledby="vid-title">
      <div class="wrap">
        <h2 id="vid-title">{{ t.title }}</h2>
        @if (clips.length) {
          @let c = active();
          <div class="reel">
            <div class="frame">
              <video controls preload="metadata" playsinline #player [attr.poster]="c.poster || null" [src]="c.poster ? c.src : c.src + '#t=0.1'"></video>
            </div>
            <p class="reel__title" aria-live="polite">{{ c.title }}</p>
            @if (clips.length > 1) {
              <ul class="reel__list">
                @for (clip of clips; track clip.src; let i = $index) {
                  <li>
                    <button class="reel__item" type="button" [attr.aria-pressed]="i === activeIndex() ? 'true' : 'false'" (click)="play(i)">
                      <span class="reel__thumb">
                        @if (clip.poster) {
                          <img [src]="clip.poster" alt="" loading="lazy" />
                        } @else {
                          <video [src]="clip.src + '#t=0.1'" preload="metadata" muted playsinline tabindex="-1" aria-hidden="true"></video>
                        }
                        <span class="reel__play"><app-icon name="play" [size]="18" [stroke]="2" /></span>
                      </span>
                      <span class="reel__name">{{ clip.title }}</span>
                    </button>
                  </li>
                }
              </ul>
            }
          </div>
        } @else {
          <div class="frame">
            @if (video.youtubeId) {
              @if (ytOn()) {
                <iframe [src]="ytEmbed()" [title]="t.play" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
              } @else {
                <button class="yt" type="button" [attr.aria-label]="t.play" (click)="ytOn.set(true)">
                  <img [src]="'https://i.ytimg.com/vi/' + video.youtubeId + '/maxresdefault.jpg'" alt="" loading="lazy" />
                  <span class="play"><app-icon name="play" [size]="30" [stroke]="2" /></span>
                </button>
              }
            } @else if (video.mp4) {
              <video controls preload="none" playsinline [attr.poster]="video.poster || null"><source [src]="video.mp4" type="video/mp4" /></video>
            } @else {
              <div class="pending">
                <img src="/assets/app/skyline.png" width="1584" height="535" alt="" class="pending__sky" loading="lazy" />
                <span class="play play--off"><app-icon name="play" [size]="30" [stroke]="2" /></span>
                <p>{{ t.pending }}</p>
              </div>
            }
          </div>
        }
      </div>
    </section>`,
  styles: `
    .vid h2 { text-align: center; }
    .frame {
      position: relative; margin: 2.5rem auto 0; max-width: 960px; aspect-ratio: 16 / 9;
      border-radius: var(--radius); overflow: hidden; background: var(--night-0);
      box-shadow: 0 30px 60px -24px rgb(4 11 36 / 0.45);
    }
    .frame iframe, .frame video, .yt, .yt img { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; object-fit: cover; }
    .yt { padding: 0; cursor: pointer; background: none; }
    .play {
      position: absolute; left: 50%; top: 50%; translate: -50% -50%;
      width: 76px; height: 76px; border-radius: 50%; display: grid; place-items: center;
      background: #fff; color: var(--navy); transition: transform 0.3s var(--ease-out);
    }
    .yt:hover .play { transform: scale(1.06); }
    .play--off { background: rgb(255 255 255 / 0.12); color: #fff; }
    .reel__title { margin: 14px auto 0; max-width: 960px; text-align: center; font-weight: 700; color: var(--ink); }
    /* Phones: one row that scrolls sideways. Wider: a wrapping grid. */
    .reel__list {
      list-style: none; margin: 18px auto 0; padding: 0 0 6px; max-width: 960px;
      display: grid; grid-auto-flow: column; grid-auto-columns: minmax(150px, 46%); gap: 12px;
      overflow-x: auto; scroll-snap-type: x mandatory; overscroll-behavior-x: contain;
    }
    @media (min-width: 768px) {
      .reel__list { grid-auto-flow: row; grid-template-columns: repeat(4, 1fr); overflow: visible; }
    }
    .reel__list li { scroll-snap-align: start; }
    .reel__item {
      width: 100%; padding: 0; border: 0; background: none; cursor: pointer; text-align: left;
      font: inherit; color: var(--ink-2);
    }
    .reel__thumb {
      position: relative; display: block; aspect-ratio: 16 / 9; border-radius: 10px; overflow: hidden;
      background: var(--night-0); outline: 2px solid transparent; outline-offset: 2px; transition: outline-color 0.2s;
    }
    .reel__thumb img, .reel__thumb video { width: 100%; height: 100%; object-fit: cover; pointer-events: none; }
    .reel__play {
      position: absolute; left: 50%; top: 50%; translate: -50% -50%;
      width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center;
      background: rgb(255 255 255 / 0.9); color: var(--navy);
    }
    .reel__item:hover .reel__thumb { outline-color: var(--line); }
    .reel__item[aria-pressed='true'] .reel__thumb { outline-color: var(--navy); }
    .reel__item[aria-pressed='true'] .reel__name { color: var(--navy); }
    .reel__name { display: block; margin-top: 8px; font-size: var(--fs-small); font-weight: 700; line-height: 1.35; }
    .pending { position: absolute; inset: 0; background: linear-gradient(180deg, var(--night-2), var(--night-0)); }
    .pending__sky { position: absolute; left: 0; right: 0; bottom: 0; width: 100%; opacity: 0.22; }
    .pending p { position: absolute; left: 0; right: 0; top: calc(50% + 56px); text-align: center; color: var(--night-ink-2); font-weight: 700; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Video {
  protected readonly i18n = inject(I18nService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly injector = inject(Injector);
  protected readonly video = site.video as VideoConfig;
  protected readonly clips: Clip[] = this.video.clips ?? [];
  protected readonly activeIndex = signal(0);
  protected readonly active = computed(() => this.clips[this.activeIndex()]);
  protected readonly ytOn = signal(false);
  private readonly player = viewChild<ElementRef<HTMLVideoElement>>('player');

  // Trusted: the ID comes from site.json, not from the visitor.
  protected readonly ytEmbed = computed<SafeResourceUrl>(() =>
    this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube-nocookie.com/embed/${encodeURIComponent(this.video.youtubeId)}?autoplay=1&rel=0`));

  /** A tap loads that clip into the main player and plays it. */
  protected play(i: number): void {
    this.activeIndex.set(i);
    afterNextRender(() => {
      const player = this.player()?.nativeElement;
      if (!player) return;
      player.load();
      player.play().catch(() => {}); // autoplay can be refused; the controls still work
      player.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, { injector: this.injector });
  }
}
