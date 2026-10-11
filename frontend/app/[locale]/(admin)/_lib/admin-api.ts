// Every admin call, through the shared apiFetch (never a bare fetch - CLAUDE.md rule 9).
// Contract: backend/src/modules/admin/API.md.
import { apiFetch, type PublicUser } from '@/lib/api';
import { toQuery } from '../../_dashboard/lib/query';
import type {
  AdminCategory,
  AdminEvent,
  EventStatus,
  Pagination,
  UserRole,
} from '../../_dashboard/lib/types';

const BASE = '/api/admin';
const path = (id: string) => encodeURIComponent(id);

// --- Events (FR-17, FR-22) ---

/** GET /api/admin/events */
export const listEvents = (params: { status?: EventStatus | ''; page?: number; limit?: number }) =>
  apiFetch<{ events: AdminEvent[]; pagination: Pagination }>(`${BASE}/events${toQuery(params)}`);

/** POST /api/admin/events/:id/approve */
export const approveEvent = (id: string) =>
  apiFetch<{ event: AdminEvent }>(`${BASE}/events/${path(id)}/approve`, { method: 'POST' });

/** POST /api/admin/events/:id/reject */
export const rejectEvent = (id: string) =>
  apiFetch<{ event: AdminEvent }>(`${BASE}/events/${path(id)}/reject`, { method: 'POST' });

/** DELETE /api/admin/events/:id */
export const deleteEvent = (id: string) =>
  apiFetch<{ deleted: boolean }>(`${BASE}/events/${path(id)}`, { method: 'DELETE' });

// --- Users (FR-18, FR-22) ---

/** GET /api/admin/users */
export const listUsers = (params: {
  role?: UserRole | '';
  q?: string;
  page?: number;
  limit?: number;
}) => apiFetch<{ users: PublicUser[]; pagination: Pagination }>(`${BASE}/users${toQuery(params)}`);

/** POST /api/admin/users - Organizer or Admin accounts only (Attendees self-register). */
export const createUser = (input: {
  email: string;
  password: string;
  fullName: string;
  role: 'ORGANIZER' | 'ADMIN';
}) =>
  apiFetch<{ user: PublicUser }>(`${BASE}/users`, { method: 'POST', body: JSON.stringify(input) });

/** POST /api/admin/users/:id/activate | /deactivate */
export const setUserActive = (id: string, active: boolean) =>
  apiFetch<{ user: PublicUser }>(
    `${BASE}/users/${path(id)}/${active ? 'activate' : 'deactivate'}`,
    { method: 'POST' }
  );

/** POST /api/admin/users/:id/role */
export const changeUserRole = (id: string, role: UserRole) =>
  apiFetch<{ user: PublicUser }>(`${BASE}/users/${path(id)}/role`, {
    method: 'POST',
    body: JSON.stringify({ role }),
  });

/** DELETE /api/admin/users/:id */
export const deleteUser = (id: string) =>
  apiFetch<{ deleted: boolean }>(`${BASE}/users/${path(id)}`, { method: 'DELETE' });

// --- Categories (FR-19) ---

/** GET /api/admin/categories */
export const listCategories = () =>
  apiFetch<{ categories: AdminCategory[] }>(`${BASE}/categories`);

/** POST /api/admin/categories */
export const createCategory = (input: { name: string; description?: string }) =>
  apiFetch<{ category: AdminCategory }>(`${BASE}/categories`, {
    method: 'POST',
    body: JSON.stringify(input),
  });

/** PATCH /api/admin/categories/:id */
export const updateCategory = (id: string, input: { name: string; description: string | null }) =>
  apiFetch<{ category: AdminCategory }>(`${BASE}/categories/${path(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });

/** DELETE /api/admin/categories/:id */
export const deleteCategory = (id: string) =>
  apiFetch<{ deleted: boolean }>(`${BASE}/categories/${path(id)}`, { method: 'DELETE' });

// --- Broadcast (FR-21) ---

/** POST /api/admin/broadcast */
export const sendBroadcast = (input: { title: string; body: string }) =>
  apiFetch<{ notified: number }>(`${BASE}/broadcast`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
