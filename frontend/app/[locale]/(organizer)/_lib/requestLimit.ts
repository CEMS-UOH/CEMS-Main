// The new-organizer request limit, as the screens see it.
//
// The rule lives in the API (backend/src/modules/organizer/events.service.js, see
// organizer/API.md): an Organizer with no approved event yet may have only one request
// waiting for an admin. The API enforces it - a second POST is refused with
// PENDING_LIMIT_REACHED. This file only lets a screen say so *before* someone fills in the
// whole form, using the same per-status totals the dashboard already shows.
import type { ApiResult } from '@/lib/api';
import { listMyEvents } from './organizer-api';

export const isRequestLimited = (totals: { approved: number; pending: number }) =>
  totals.approved === 0 && totals.pending >= 1;

/** Two tiny requests: how many of this organizer's events are approved, and how many wait. */
export async function loadRequestLimit(): Promise<ApiResult<{ limited: boolean }>> {
  const [approved, pending] = await Promise.all([
    listMyEvents({ status: 'APPROVED', limit: 1 }),
    listMyEvents({ status: 'PENDING', limit: 1 }),
  ]);
  if (!approved.ok) return approved;
  if (!pending.ok) return pending;
  return {
    ok: true,
    status: 200,
    data: {
      limited: isRequestLimited({
        approved: approved.data.pagination.total,
        pending: pending.data.pagination.total,
      }),
    },
  };
}
