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

async function request<T>(path: string, options: RequestInit & { auth?: boolean } = {}): Promise<T> {
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
  get: <T>(path: string, options?: RequestInit & { auth?: boolean }) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, data?: unknown, options?: RequestInit & { auth?: boolean }) =>
    request<T>(path, { ...options, method: 'POST', body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown, options?: RequestInit & { auth?: boolean }) =>
    request<T>(path, { ...options, method: 'PATCH', body: data ? JSON.stringify(data) : undefined }),
  put: <T>(path: string, data?: unknown, options?: RequestInit & { auth?: boolean }) =>
    request<T>(path, { ...options, method: 'PUT', body: data ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string, options?: RequestInit & { auth?: boolean }) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};
