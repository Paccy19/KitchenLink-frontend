import { useEffect, useState } from 'react';

/**
 * Full-screen state for a map panel shown as a fixed overlay (works on
 * iPhones too, unlike the element Fullscreen API). While open, the page
 * behind is frozen in place — `position: fixed` on the body, which also stops
 * iOS Safari from scrolling it — and Escape closes the overlay.
 */
export default function useFullScreenOverlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const { body } = document;
    const scrollY = window.scrollY;
    const saved = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    const onKey = (event) => event.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      Object.assign(body.style, saved);
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  return [open, setOpen];
}
