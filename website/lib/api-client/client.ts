const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api';

// The API's exception filter wraps Nest's error body, so `message` may be a string, an array
// of validation messages, or another `{ message }` object — unwrap to something readable.
function extractMessage(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(extractMessage).filter(Boolean).join(' ') || null;
  if (value && typeof value === 'object' && 'message' in value) return extractMessage((value as { message: unknown }).message);
  return null;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(extractMessage(body) ?? 'Request failed');
  }
}

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('accessToken');
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('refreshToken');
}

// The access token is short-lived (15m) — without this, any request made after it expires
// fails with a generic 401 that looked, in the UI, indistinguishable from "the server is
// down". Concurrent 401s while a refresh is already in flight share the same promise
// instead of each firing their own /auth/refresh call.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('refresh failed');
        const data = await res.json();
        window.localStorage.setItem('accessToken', data.accessToken);
        window.localStorage.setItem('refreshToken', data.refreshToken);
        return data.accessToken as string;
      })
      .catch(() => {
        // Refresh token is also invalid/expired — the session is genuinely over, not just
        // the access token. Clear it and tell the rest of the app so it can show a proper
        // "please sign in again" state instead of a generic error.
        window.localStorage.removeItem('accessToken');
        window.localStorage.removeItem('refreshToken');
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
  _isRetry = false,
): Promise<T> {
  const { auth = true, headers, ...rest } = options;
  const token = auth ? getAccessToken() : null;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (response.status === 401 && auth && !_isRetry && getRefreshToken()) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return apiFetch<T>(path, options, true);
    }
  }

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      // no JSON body
    }
    throw new ApiError(response.status, body);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, options?: RequestInit & { auth?: boolean }) =>
    apiFetch<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, data?: unknown, options?: RequestInit & { auth?: boolean }) =>
    apiFetch<T>(path, { ...options, method: 'POST', body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown, options?: RequestInit & { auth?: boolean }) =>
    apiFetch<T>(path, { ...options, method: 'PATCH', body: data ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string, options?: RequestInit & { auth?: boolean }) =>
    apiFetch<T>(path, { ...options, method: 'DELETE' }),
};
