// The single place the browser talks to our Express API.
// Reuse this - do not call fetch directly from a page (CLAUDE.md rule 1 and rule 9).
//
// Every backend response uses the same envelope (backend/src/lib/response.js):
//   success: { success: true,  data: ... }
//   failure: { success: false, error: { message, code } }

export type PublicUser = {
  id: string;
  email: string;
  fullName: string;
  role: 'ATTENDEE' | 'ORGANIZER' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
};

/** Narrowed result so callers never have to touch the raw envelope. */
export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; code: string; message: string };

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  let res: Response;

  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      // Required so the httpOnly session cookie is sent to the API on another origin
      // (frontend :3000 -> API :5000). The API sets CORS credentials:true to match.
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    });
  } catch {
    // Server down, DNS failure, CORS rejection - the request never completed.
    return { ok: false, status: 0, code: 'NETWORK', message: 'Cannot reach the server' };
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // A non-JSON response (proxy error page, 502, empty body).
    return { ok: false, status: res.status, code: 'UNKNOWN', message: 'Unexpected response' };
  }

  const envelope = body as {
    success?: boolean;
    data?: T;
    error?: { message?: string; code?: string };
  };

  if (res.ok && envelope?.success) {
    return { ok: true, status: res.status, data: envelope.data as T };
  }

  return {
    ok: false,
    status: res.status,
    code: envelope?.error?.code ?? 'UNKNOWN',
    message: envelope?.error?.message ?? 'Unexpected error',
  };
}

// --- Auth calls (FR-01, FR-02) ---

export const register = (input: { email: string; password: string; fullName: string }) =>
  apiFetch<{ user: PublicUser }>('/api/attendee/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const login = (input: { email: string; password: string }) =>
  apiFetch<{ user: PublicUser }>('/api/attendee/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const logout = () =>
  apiFetch<{ loggedOut: boolean }>('/api/attendee/auth/logout', { method: 'POST' });

export const getMe = () => apiFetch<{ user: PublicUser }>('/api/attendee/auth/me');
