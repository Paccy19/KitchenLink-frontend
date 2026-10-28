/**
 * Demo mode: the website runs on built-in demo data instead of a backend.
 *
 * Turned on with `VITE_DEMO_MODE=true` (`npm run demo`). Every `fetch` to the
 * API base URL is answered in the browser by `server.js`; nothing leaves the
 * page. A small badge shows the demo sign-in details and resets the data.
 *
 * @module demo
 */

import { handle, resetDemoState } from './server';
import { DEMO_OTP } from './seed';
import { clearStoredSession } from '../api/session';

const RAW_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
const BASE_PATH = new URL(String(RAW_BASE).replace(/\/+$/, ''), window.location.origin).pathname;
const LATENCY_MS = [120, 320];

const delay = () =>
  new Promise((resolve) => setTimeout(resolve, LATENCY_MS[0] + Math.random() * (LATENCY_MS[1] - LATENCY_MS[0])));

/** The API path of a request URL, or null when it is not an API call. */
function apiPath(url) {
  const parsed = new URL(url, window.location.origin);
  if (parsed.origin !== window.location.origin && !String(RAW_BASE).startsWith(parsed.origin)) return null;
  if (!parsed.pathname.startsWith(BASE_PATH)) return null;
  return { path: parsed.pathname.slice(BASE_PATH.length) || '/', query: parsed.searchParams };
}

function headersObject(headers) {
  if (!headers) return {};
  if (headers instanceof Headers) return Object.fromEntries(headers.entries());
  return { ...headers };
}

function parseBody(body) {
  if (body == null) return undefined;
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }
  // FormData (menu items, kitchen sign-up) is handed over as is.
  return body;
}

function installFetch() {
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    const target = apiPath(url);
    if (!target) return realFetch(input, init);

    await delay();
    const { status, body } = handle({
      method: init.method || (typeof input === 'string' ? 'GET' : input.method) || 'GET',
      path: target.path,
      query: target.query,
      headers: headersObject(init.headers),
      body: parseBody(init.body),
    });
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  };
}

function installBadge() {
  const badge = document.createElement('div');
  badge.setAttribute('role', 'note');
  badge.style.cssText = [
    'position:fixed', 'left:12px', 'bottom:12px', 'z-index:2147483000',
    'font:600 12px/1.4 system-ui,sans-serif', 'color:#fff', 'background:#542813',
    'border-radius:12px', 'box-shadow:0 6px 20px rgba(0,0,0,.25)', 'max-width:calc(100vw - 24px)',
  ].join(';');
  badge.innerHTML = `
    <button type="button" data-toggle style="all:unset;cursor:pointer;display:block;padding:7px 12px">
      Demo data ▾
    </button>
    <div data-panel hidden style="padding:0 12px 10px;font-weight:500;width:250px;max-width:100%">
      <p style="margin:0 0 6px">Nothing here is real and no backend is used.</p>
      <p style="margin:0 0 6px">Sign in with any phone number and the code <b>${DEMO_OTP}</b>
        (kitchen, delivery worker and customer). Admin: any email and password.
        Any SMS code asked for is also <b>${DEMO_OTP}</b>.</p>
      <button type="button" data-reset style="all:unset;cursor:pointer;text-decoration:underline">
        Reset demo data
      </button>
    </div>`;
  const panel = badge.querySelector('[data-panel]');
  badge.querySelector('[data-toggle]').addEventListener('click', () => {
    panel.hidden = !panel.hidden;
  });
  badge.querySelector('[data-reset]').addEventListener('click', () => {
    resetDemoState();
    clearStoredSession();
    ['ofk_cart', 'ofk_cart_vendor', 'ofk_wishlist'].forEach((key) => localStorage.removeItem(key));
    window.location.href = '/';
  });
  document.body.appendChild(badge);
}

export function installDemoMode() {
  installFetch();
  installBadge();
  // eslint-disable-next-line no-console
  console.info(`[KitchenLink] Demo mode: API calls are answered with demo data. Sign-in code: ${DEMO_OTP}`);
}
