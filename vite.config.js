import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/** The origin of an absolute URL ("https://api.x.rw/api/v1" -> "https://api.x.rw"), or '' for a path. */
const originOf = (url) => {
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
};

/**
 * Content Security Policy for the built website, as a <meta> tag so it works
 * on any host. Only in production builds: Vite's dev server needs inline
 * scripts for live reload. It lists everything the site legitimately loads;
 * anything else (e.g. an injected script) is blocked by the browser.
 *  - scripts: only our own files (no inline scripts, no eval)
 *  - styles: our own + Google Fonts ('unsafe-inline' for React/map styles)
 *  - images: our own, the API's uploads, kitchens' https image links, previews
 *  - connections: our API and the CARTO map tiles
 *  - workers: the map library runs its workers from blob: URLs
 * (frame-ancestors can't be set in a meta tag: send it as a header from the host.)
 */
function contentSecurityPolicy(env) {
  const api = originOf(env.VITE_API_BASE_URL || '');
  // Where uploaded photos are served from (the API's PUBLIC_BASE_URL); locally
  // the backend behind the dev proxy. Live https addresses are covered by https:.
  const uploads = originOf(env.VITE_UPLOADS_ORIGIN || env.VITE_API_PROXY || 'http://localhost:4000');
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    `img-src 'self' data: blob: https: ${api} ${uploads}`.replace(/\s+/g, ' ').trim(),
    `connect-src 'self' ${api} https://*.cartocdn.com`.replace(/\s+/g, ' '),
    "worker-src 'self' blob:",
    'child-src blob:',
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  return {
    name: 'kitchenlink-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_API_PROXY || 'http://localhost:4000';

  return {
    plugins: [react(), contentSecurityPolicy(env)],
    // No source maps in production builds: visitors get minified code, not
    // the original source. (The dev server on your PC still has them.)
    build: { sourcemap: false },
    server: {
      port: 3000,
      open: true,
      proxy: { '/api': { target: proxyTarget, changeOrigin: true } },
    },
  };
});
