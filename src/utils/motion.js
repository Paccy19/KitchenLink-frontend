/** True when the device asks for less motion (accessibility setting). */
export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Scroll `behavior` for code-driven scrolls: glide normally, jump under reduced motion. */
export const scrollBehavior = () => (prefersReducedMotion() ? 'auto' : 'smooth');
