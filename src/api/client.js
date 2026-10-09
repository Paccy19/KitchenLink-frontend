/**
 * Thin HTTP client for the Online Food Kitchen API.
 *
 * - Reads the base URL from `VITE_API_BASE_URL`
 * - Applies request timeouts and normalises errors into `ApiError`
 * - Sends requests to the backend and surfaces API and network errors.
 *
 * @module api/client
 */

const RAW_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
const BASE_URL = String(RAW_BASE).replace(/\/+$/, '');
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

async function http(path, params = {}, { method = 'GET', body, headers = {} } = {}) {
  const url = buildUrl(path, params);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    const requestHeaders = {
      Accept: 'application/json',
      ...headers,
    };
    const token = localStorage.getItem('ofk_access_token');
    if (token) requestHeaders.Authorization = `Bearer ${token}`;
    if (body !== undefined) requestHeaders['Content-Type'] = 'application/json';

    response = await fetch(url, {
      method,
      headers: requestHeaders,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
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
    if (response.status === 401) {
      localStorage.removeItem('ofk_access_token');
      window.dispatchEvent(new Event('ofk:unauthorized'));
    }
    let detail = '';
    try {
      const body = await response.json();
      detail =
        body?.message ||
        body?.error?.message ||
        (typeof body?.error === 'string' ? body.error : '');
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
 * Request an API endpoint.
 *
 * @template T
 * @param {string} path    Endpoint path, e.g. `/home/feed`
 * @param {Record<string, any>} params Query parameters
 * @returns {Promise<T>} Parsed JSON payload (raw contract shape)
 */
export function apiRequest(path, params = {}) {
  return http(path, params);
}

/** Make an authenticated JSON request. */
export function apiJson(method, path, body) {
  return http(path, {}, { method, body });
}
