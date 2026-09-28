import { tokenStorage } from '../auth/token-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api';

// The API's exception filter wraps Nest's error body, so `message` may be a string, an array
// of validation messages, or another `{ message }` object — unwrap to something readable.
function extractMessage(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(extractMessage).filter(Boolean).join('\n') || null;
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

/** Best human-readable message for any thrown error. */
export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  if (error instanceof ApiError) return error.message;
  if (error instanceof TypeError) return 'Could not reach the server. Check your connection.';
  return fallback;
}

// Fired when the refresh token is also rejected, i.e. the session is genuinely over. The
// auth provider subscribes so it can drop to signed-out state and tell the user why
// (mirrors the website's `auth:session-expired` window event).
const sessionExpiredListeners = new Set<() => void>();
export function onSessionExpired(listener: () => void) {
  sessionExpiredListeners.add(listener);
  return () => {
    sessionExpiredListeners.delete(listener);
  };
}

/** Drops the stored session and tells the auth provider, which signs out and explains why. */
export async function endSession() {
  await tokenStorage.clear();
  sessionExpiredListeners.forEach((l) => l());
}

// The access token is short-lived (15m). Concurrent 401s while a refresh is already in
// flight share the same promise instead of each firing their own /auth/refresh call.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await tokenStorage.getRefreshToken();
  if (!refreshToken) return null;

  refreshPromise ??= fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'bypass-tunnel-reminder': 'true' },
    body: JSON.stringify({ refreshToken }),
  })
    .then(async (res) => {
      if (!res.ok) throw new Error('refresh failed');
      const data = await res.json();
      await tokenStorage.setTokens(data.accessToken, data.refreshToken);
      return data.accessToken as string;
    })
    .catch(async () => {
      await endSession();
      return null;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

type RequestOptions = RequestInit & { auth?: boolean };

async function request<T>(path: string, options: RequestOptions = {}, isRetry = false): Promise<T> {
  const { auth = true, headers, ...rest } = options;
  const token = auth ? await tokenStorage.getAccessToken() : null;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      'bypass-tunnel-reminder': 'true',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (response.status === 401 && auth && !isRetry && (await tokenStorage.getRefreshToken())) {
    const newToken = await refreshAccessToken();
    if (newToken) return request<T>(path, options, true);
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
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, data?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body: data ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'DELETE' }),
};
