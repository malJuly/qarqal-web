/**
 * Adds "is-in" to an element the first time it scrolls into view (used to draw the connector lines).
 * Browser-only: call it from afterNextRender.
 */
export function revealOnView(el: HTMLElement, threshold: number): () => void {
  if (!('IntersectionObserver' in window)) {
    el.classList.add('is-in');
    return () => {};
  }
  const io = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) {
      el.classList.add('is-in');
      io.disconnect();
    }
  }, { threshold });
  io.observe(el);
  return () => io.disconnect();
}
