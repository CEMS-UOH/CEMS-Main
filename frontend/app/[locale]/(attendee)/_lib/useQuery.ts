'use client';

// One loading pattern for every attendee screen, so none forgets loading, error or reload.
// Unlike the dashboards, a 401 is not redirected here: the browse pages are public, and the
// pages that need a session decide for themselves what a 401 means.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiResult } from '@/lib/api';

export type Query<T> = {
  data: T | null;
  /** API error code of the last failed load, translated with useAttendeeError. */
  errorCode: string | null;
  /** HTTP status of the last failed load (0 when the request never completed). */
  errorStatus: number | null;
  /** First load: nothing to show yet. */
  loading: boolean;
  /** Reloading while the previous data stays on screen. */
  refreshing: boolean;
  reload: () => void;
  /** Replace the data locally after a mutation the API already confirmed. */
  setData: (update: (current: T | null) => T | null) => void;
};

type State<T> = { data: T | null; errorCode: string | null; errorStatus: number | null; pending: boolean };

/**
 * Runs `fetcher` on mount, whenever `key` changes, and on reload(). `key` must encode every
 * input the fetcher depends on. A null key means "not yet" (e.g. waiting for the session).
 */
export function useQuery<T>(key: string | null, fetcher: () => Promise<ApiResult<T>>): Query<T> {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const [state, setState] = useState<State<T>>({
    data: null,
    errorCode: null,
    errorStatus: null,
    pending: true,
  });
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    if (key === null) return;
    let active = true;
    setState((prev) => ({ ...prev, pending: true }));

    fetcherRef.current().then((result) => {
      if (!active) return;
      setState(
        result.ok
          ? { data: result.data, errorCode: null, errorStatus: null, pending: false }
          : { data: null, errorCode: result.code, errorStatus: result.status, pending: false }
      );
    });

    return () => {
      active = false;
    };
  }, [key, reloadCount]);

  const reload = useCallback(() => setReloadCount((n) => n + 1), []);
  const setData = useCallback(
    (update: (current: T | null) => T | null) => setState((prev) => ({ ...prev, data: update(prev.data) })),
    []
  );

  return {
    data: state.data,
    errorCode: state.pending ? null : state.errorCode,
    errorStatus: state.pending ? null : state.errorStatus,
    loading: state.pending && state.data === null,
    refreshing: state.pending && state.data !== null,
    reload,
    setData,
  };
}
