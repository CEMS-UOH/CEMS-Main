// The new-organizer request limit, as the screens see it.
//
// The rule lives in the API (backend/src/modules/organizer/events.service.js, see
// organizer/API.md): an Organizer with no approved event yet may have only one request
// waiting for an admin. The API enforces it - a second POST is refused with
// PENDING_LIMIT_REACHED. This file only lets a screen say so *before* someone fills in the
// whole form, from the per-status totals the event list returns.
import type { ApiResult } from '@/lib/api';
import { listMyEvents } from './organizer-api';

export const isRequestLimited = (totals: { approved: number; pending: number }) =>
  totals.approved === 0 && totals.pending >= 1;

/** One small request: the list's totals say how many events are approved and how many wait. */
export async function loadRequestLimit(): Promise<ApiResult<{ limited: boolean }>> {
  const result = await listMyEvents({ limit: 1 });
  if (!result.ok) return result;
  return { ok: true, status: 200, data: { limited: isRequestLimited(result.data.totals) } };
}
