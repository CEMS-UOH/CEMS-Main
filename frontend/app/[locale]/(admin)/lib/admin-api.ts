import { apiFetch, type ApiResult } from '@/lib/api';
import {
  ROLE5_ENDPOINTS,
  ROLE5_USE_MOCKS,
  analyticsQuery,
  mockAdminDashboard,
  mockGetAnalytics,
  mockListNotifications,
  mockListReviewEvents,
  mockListUsers,
  mockMarkNotificationRead,
  mockReviewEvent,
  mockSetUserActive,
  type Role5AdminDashboard,
  type Role5AdminUser,
  type Role5Analytics,
  type Role5AnalyticsFilters,
  type Role5Event,
  type Role5EventStatus,
  type Role5FailCode,
  type Role5Notification,
} from './role5-contracts';

function ok<T>(data: T): ApiResult<T> {
  return { ok: true, status: 200, data };
}

function fail(code: Role5FailCode | 'UNKNOWN', status = 400): ApiResult<never> {
  return { ok: false, status, code, message: code };
}

export async function getAdminDashboard(): Promise<ApiResult<{ dashboard: Role5AdminDashboard }>> {
  if (ROLE5_USE_MOCKS) return ok(mockAdminDashboard());
  return apiFetch(ROLE5_ENDPOINTS.adminDashboard);
}

export async function listAdminUsers(): Promise<ApiResult<{ users: Role5AdminUser[] }>> {
  if (ROLE5_USE_MOCKS) return ok(mockListUsers());
  return apiFetch(ROLE5_ENDPOINTS.adminUsers);
}

export async function setUserActive(
  id: string,
  isActive: boolean,
): Promise<ApiResult<{ user: Role5AdminUser }>> {
  if (ROLE5_USE_MOCKS) {
    const result = mockSetUserActive(id, isActive);
    if ('code' in result) return fail(result.code, 404);
    return ok(result);
  }
  return apiFetch(ROLE5_ENDPOINTS.adminUser(id), {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
}

export async function listReviewEvents(
  status: Role5EventStatus = 'PENDING',
): Promise<ApiResult<{ events: Role5Event[] }>> {
  if (ROLE5_USE_MOCKS) return ok(mockListReviewEvents(status));
  return apiFetch(`${ROLE5_ENDPOINTS.adminEvents}?status=${encodeURIComponent(status)}`);
}

export async function reviewEvent(
  id: string,
  status: Extract<Role5EventStatus, 'APPROVED' | 'REJECTED'>,
): Promise<ApiResult<{ event: Role5Event }>> {
  if (ROLE5_USE_MOCKS) {
    const result = mockReviewEvent(id, status);
    if ('code' in result) return fail(result.code, result.code === 'NOT_FOUND' ? 404 : 400);
    return ok(result);
  }
  return apiFetch(ROLE5_ENDPOINTS.adminEventReview(id), {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function getAnalytics(
  filters: Role5AnalyticsFilters = {},
): Promise<ApiResult<{ analytics: Role5Analytics }>> {
  if (ROLE5_USE_MOCKS) return ok(mockGetAnalytics(filters));
  return apiFetch(analyticsQuery(filters));
}

export async function listNotifications(): Promise<ApiResult<{ notifications: Role5Notification[] }>> {
  if (ROLE5_USE_MOCKS) return ok(mockListNotifications());
  return apiFetch(ROLE5_ENDPOINTS.notifications);
}

export async function markNotificationRead(
  id: string,
): Promise<ApiResult<{ notification: Role5Notification }>> {
  if (ROLE5_USE_MOCKS) {
    const result = mockMarkNotificationRead(id);
    if ('code' in result) return fail(result.code, 404);
    return ok(result);
  }
  return apiFetch(ROLE5_ENDPOINTS.notificationRead(id), {
    method: 'PATCH',
    body: JSON.stringify({ isRead: true }),
  });
}
