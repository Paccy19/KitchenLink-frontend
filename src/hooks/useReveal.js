import { useEffect, useRef } from 'react';

/**
 * Fades sections up as they scroll into view: every `.kl-reveal` inside the
 * returned ref gets `.kl-in` once it is on screen (once, then left alone).
 * People who ask their device for less motion see everything at once (CSS).
 */
export default function useReveal(deps = []) {
  const ref = useRef(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    const targets = [...root.querySelectorAll('.kl-reveal:not(.kl-in)')];
    if (!('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('kl-in'));
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('kl-in');
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}
