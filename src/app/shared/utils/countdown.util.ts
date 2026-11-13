import { DestroyRef, inject, signal, type Signal } from '@angular/core';

export interface Countdown {
  /** Seconds left; 0 when idle. */
  readonly remaining: Signal<number>;
  start(seconds: number): void;
  stop(): void;
}

/**
 * A seconds countdown as a signal, e.g. for "Resend code in 30s".
 * Call it in an injection context (a field initialiser or constructor): the timer is cleared when the owner is destroyed.
 */
export function createCountdown(): Countdown {
  const remaining = signal(0);
  let timer: ReturnType<typeof setInterval> | null = null;

  const stop = (): void => {
    if (timer) clearInterval(timer);
    timer = null;
    remaining.set(0);
  };

  const start = (seconds: number): void => {
    stop();
    remaining.set(seconds);
    timer = setInterval(() => {
      remaining.update((s) => s - 1);
      if (remaining() <= 0) stop();
    }, 1000);
  };

  inject(DestroyRef).onDestroy(stop);
  return { remaining: remaining.asReadonly(), start, stop };
}
