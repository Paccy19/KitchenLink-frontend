/**
 * Thin HTTP client for the Online Food Kitchen API.
 *
 * - Reads the base URL from `VITE_API_BASE_URL`
 * - Applies request timeouts and normalises errors into `ApiError`
 * - Falls back to the built-in mock server when the backend is unreachable
 *   (unless `VITE_USE_MOCK=false`), so the frontend is fully usable while the
 *   backend is still being built.
 *
 * Mock modes (VITE_USE_MOCK):
 *   - unset / "auto" → try the real API first, fall back to mocks on failure
 *   - "true"         → always use mocks (fast local development)
 *   - "false"        → never use mocks, surface network errors
 *
 * @module api/client
 */

const RAW_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
const BASE_URL = String(RAW_BASE).replace(/\/+$/, '');
const MOCK_MODE = (import.meta.env.VITE_USE_MOCK ?? 'auto').toLowerCase();
const TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT ?? 8000);

export class ApiError extends Error {
  constructor(message, { status = 0, path = '', cause = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.path = path;
    this.cause = cause;
  }
}

/** Build an absolute-ish request URL with query params (skips null/undefined/''). */
export function buildUrl(path, params = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    query.set(key, String(value));
  }
  const qs = query.toString();
  return `${BASE_URL}${path}${qs ? `?${qs}` : ''}`;
}

async function http(path, params) {
  const url = buildUrl(path, params);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
  } catch (error) {
    throw new ApiError(
      error?.name === 'AbortError'
        ? 'The request took too long. Check your connection.'
        : 'Cannot reach the Online Food Kitchen API.',
      { path, cause: error },
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    let detail = '';
    try {
      const body = await response.json();
      detail = body?.message || body?.error || '';
    } catch {
      /* ignore malformed error bodies */
    }
    throw new ApiError(detail || `Request failed (${response.status}).`, {
      status: response.status,
      path,
    });
  }

  const contentType = response.headers?.get?.('content-type') ?? '';
  if (contentType.includes('text/html')) {
    // e.g. an SPA dev server answering API paths with index.html
    throw new ApiError('The API returned an unexpected response.', { path });
  }

  try {
    return await response.json();
  } catch (error) {
    throw new ApiError('The API returned malformed JSON.', { path, cause: error });
  }
}

/**
 * Request an API endpoint with optional mock fallback.
 *
 * @template T
 * @param {string} path    Endpoint path, e.g. `/home/feed`
 * @param {Record<string, any>} params Query parameters
 * @param {(params: Record<string, any>) => T} [mockHandler] Mock server handler
 * @returns {Promise<T>} Parsed JSON payload (raw contract shape)
 */
export async function apiRequest(path, params = {}, mockHandler = null) {
  const forceMock = MOCK_MODE === 'true' && Boolean(mockHandler);

  if (!forceMock) {
    try {
      return await http(path, params);
    } catch (error) {
      const offline = !(error instanceof ApiError) || error.status === 0;
      const unreachable = error instanceof ApiError && error.status === 0;
      const serverError = error instanceof ApiError && error.status >= 500;
      const notImplemented = error instanceof ApiError && (error.status === 404 || error.status === 501);

      const canFallback =
        mockHandler &&
        MOCK_MODE !== 'false' &&
        (offline || unreachable || serverError || notImplemented);

      if (!canFallback) throw error;
      // eslint-disable-next-line no-console
      console.warn(`[api] ${path} unavailable (${error.message}) — serving mock response.`);
    }
  }

  if (!mockHandler) {
    throw new ApiError('Endpoint is not available yet.', { path });
  }

  await new Promise((resolve) => setTimeout(resolve, 260 + Math.random() * 240));
  return mockHandler(params);
}
