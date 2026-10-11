'use client';

// One data-loading pattern for every dashboard screen: loading, error and reload are always
// handled the same way, so no page can forget one of them.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiResult } from '@/lib/api';
import { useRouter } from '@/i18n/navigation';

export type Query<T> = {
  data: T | null;
  /** API error code of the last failed load (translate it with useDashboardError). */
  errorCode: string | null;
  /** First load - there is nothing to show yet. */
  loading: boolean;
  /** Reloading while the previous data is still on screen. */
  refreshing: boolean;
  reload: () => void;
};

type State<T> = { data: T | null; errorCode: string | null; pending: boolean };

/**
 * Runs `fetcher` on mount, whenever `key` changes, and on reload().
 * `key` must encode every input the fetcher depends on (filters, page, id).
 * A 401 means the session ended, so it sends the user to /login instead of showing an error.
 */
export function useApiQuery<T>(key: string, fetcher: () => Promise<ApiResult<T>>): Query<T> {
  const router = useRouter();

  // Always call the latest fetcher without making it an effect dependency.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const [state, setState] = useState<State<T>>({ data: null, errorCode: null, pending: true });
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let active = true;
    setState((prev) => ({ ...prev, pending: true }));

    fetcherRef.current().then((result) => {
      if (!active) return;
      if (result.ok) {
        setState({ data: result.data, errorCode: null, pending: false });
        return;
      }
      if (result.status === 401) {
        router.replace('/login');
        return;
      }
      setState({ data: null, errorCode: result.code, pending: false });
    });

    return () => {
      active = false;
    };
  }, [key, reloadCount, router]);

  const reload = useCallback(() => setReloadCount((n) => n + 1), []);

  return {
    data: state.data,
    errorCode: state.pending ? null : state.errorCode,
    loading: state.pending && state.data === null,
    refreshing: state.pending && state.data !== null,
    reload,
  };
}

/** Merges two parallel API results into one, failing with the first error. */
export function bothOk<A, B>(a: ApiResult<A>, b: ApiResult<B>): ApiResult<[A, B]> {
  if (!a.ok) return a;
  if (!b.ok) return b;
  return { ok: true, status: 200, data: [a.data, b.data] };
}
