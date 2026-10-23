import { useEffect } from 'react';
import { createPortal } from 'react-dom';

const THEME_SCOPES = ['app-theme', 'app-theme-driver', 'app-theme-admin'];

/**
 * Renders a popup at the top of the page (above the sticky header and any
 * animated page wrapper that would otherwise trap it underneath), inside the
 * current area's theme scope so dark mode still applies, and stops the page
 * behind it from scrolling while it is open.
 */
export default function ModalPortal({ children }) {
  useEffect(() => {
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  const scopeEl = document.querySelector(THEME_SCOPES.map((scope) => `.${scope}`).join(','));
  const scope = THEME_SCOPES.find((name) => scopeEl?.classList.contains(name)) || 'app-theme';

  return createPortal(<div className={scope}>{children}</div>, document.body);
}
