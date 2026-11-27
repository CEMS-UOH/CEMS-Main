'use client';

// Approve / reject / delete an event, shared by the admin overview and the events screen so
// both report progress and failures identically.
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ApiResult } from '@/lib/api';
import type { AdminEvent } from '../../_dashboard/lib/types';
import { useDashboardError } from '../../_dashboard/lib/useDashboardError';
import type { EventAction } from '../_ui/AdminEventCard';
import { approveEvent, deleteEvent, rejectEvent } from './admin-api';

export type Notice = { kind: 'success' | 'error'; text: string };

const requestFor: Record<EventAction, (id: string) => Promise<ApiResult<unknown>>> = {
  approve: approveEvent,
  reject: rejectEvent,
  delete: deleteEvent,
};

/** `onChanged` runs after anything that may have changed the list, so the caller can reload. */
export function useEventModeration(onChanged: () => void) {
  const t = useTranslations('Admin.events');
  const errorMessage = useDashboardError();
  const [busy, setBusy] = useState<{ id: string; action: EventAction } | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  async function run(event: AdminEvent, action: EventAction) {
    setNotice(null);
    setBusy({ id: event.id, action });
    const result = await requestFor[action](event.id);
    setBusy(null);

    if (!result.ok) {
      const { code } = result;
      setNotice({ kind: 'error', text: errorMessage(code) });
      // Someone else already handled or removed it - show the current truth.
      if (code === 'EVENT_NOT_PENDING' || code === 'EVENT_NOT_FOUND') onChanged();
      return;
    }
    setNotice({ kind: 'success', text: t(`done.${action}`) });
    onChanged();
  }

  return {
    notice,
    run,
    /** The action running for this event id, or null. */
    busyFor: (id: string): EventAction | null => (busy?.id === id ? busy.action : null),
  };
}
