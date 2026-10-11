import { apiFetch, type ApiResult } from '@/lib/api';
import {
  ROLE5_ENDPOINTS,
  ROLE5_USE_MOCKS,
  mockCreateEvent,
  mockDeleteEvent,
  mockGetEvent,
  mockListAttendees,
  mockListCategories,
  mockListNotifications,
  mockListOrganizerEvents,
  mockListVenues,
  mockMarkNotificationRead,
  mockUpdateEvent,
  type Role5AttendeeRow,
  type Role5Category,
  type Role5Event,
  type Role5EventInput,
  type Role5FailCode,
  type Role5Notification,
  type Role5Venue,
} from '../../(admin)/lib/role5-contracts';

function ok<T>(data: T): ApiResult<T> {
  return { ok: true, status: 200, data };
}

function fail(code: Role5FailCode, status = 400): ApiResult<never> {
  return { ok: false, status, code, message: code };
}

export async function listOrganizerEvents(): Promise<ApiResult<{ events: Role5Event[] }>> {
  if (ROLE5_USE_MOCKS) return ok(mockListOrganizerEvents());
  return apiFetch(ROLE5_ENDPOINTS.organizerEvents);
}

export async function getOrganizerEvent(id: string): Promise<ApiResult<{ event: Role5Event }>> {
  if (ROLE5_USE_MOCKS) {
    const result = mockGetEvent(id);
    if ('code' in result) return fail(result.code, 404);
    return ok(result);
  }
  return apiFetch(ROLE5_ENDPOINTS.organizerEvent(id));
}

export async function createOrganizerEvent(
  input: Role5EventInput,
): Promise<ApiResult<{ event: Role5Event }>> {
  if (ROLE5_USE_MOCKS) {
    const result = mockCreateEvent(input);
    if ('code' in result) return fail(result.code);
    return ok(result);
  }
  return apiFetch(ROLE5_ENDPOINTS.organizerEvents, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateOrganizerEvent(
  id: string,
  input: Role5EventInput,
): Promise<ApiResult<{ event: Role5Event }>> {
  if (ROLE5_USE_MOCKS) {
    const result = mockUpdateEvent(id, input);
    if ('code' in result) return fail(result.code, result.code === 'NOT_FOUND' ? 404 : 400);
    return ok(result);
  }
  return apiFetch(ROLE5_ENDPOINTS.organizerEvent(id), {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function deleteOrganizerEvent(id: string): Promise<ApiResult<{ deleted: true }>> {
  if (ROLE5_USE_MOCKS) {
    const result = mockDeleteEvent(id);
    if ('code' in result) return fail(result.code, 404);
    return ok(result);
  }
  return apiFetch(ROLE5_ENDPOINTS.organizerEvent(id), { method: 'DELETE' });
}

export async function listEventAttendees(
  eventId: string,
): Promise<ApiResult<{ attendees: Role5AttendeeRow[] }>> {
  if (ROLE5_USE_MOCKS) {
    const result = mockListAttendees(eventId);
    if ('code' in result) return fail(result.code, 404);
    return ok(result);
  }
  return apiFetch(ROLE5_ENDPOINTS.organizerAttendees(eventId));
}

export async function listOrganizerVenues(): Promise<ApiResult<{ venues: Role5Venue[] }>> {
  if (ROLE5_USE_MOCKS) return ok(mockListVenues());
  return apiFetch(ROLE5_ENDPOINTS.organizerVenues);
}

export async function listOrganizerCategories(): Promise<ApiResult<{ categories: Role5Category[] }>> {
  if (ROLE5_USE_MOCKS) return ok(mockListCategories());
  return apiFetch(ROLE5_ENDPOINTS.organizerCategories);
}

export async function listOrganizerNotifications(): Promise<
  ApiResult<{ notifications: Role5Notification[] }>
> {
  if (ROLE5_USE_MOCKS) return ok(mockListNotifications());
  return apiFetch(ROLE5_ENDPOINTS.notifications);
}

export async function markOrganizerNotificationRead(
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
