'use client';

// Who is looking at the attendee screens: a guest, an Attendee, or another role. The session is an
// httpOnly cookie on the API's origin, so it cannot be read here - we ask GET /auth/me once for
// the whole (attendee) area and share the answer. The browse pages are public (FR-03, FR-09), so
// a failed check just means "guest"; the API still enforces requireAuth on every booking route.
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getMe, type PublicUser } from '@/lib/api';
import type { Session } from './rules';

type SessionValue = {
  session: Session;
  user: PublicUser | null;
  /** Ask the API again, e.g. after a 401 says the session has ended. */
  refresh: () => void;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [checked, setChecked] = useState(false);
  const [checkCount, setCheckCount] = useState(0);

  useEffect(() => {
    let active = true;
    getMe().then((result) => {
      if (!active) return;
      setUser(result.ok ? result.data.user : null);
      setChecked(true);
    });
    return () => {
      active = false;
    };
  }, [checkCount]);

  const refresh = useCallback(() => setCheckCount((n) => n + 1), []);

  const session: Session = !checked
    ? { status: 'loading' }
    : user
      ? { status: 'user', role: user.role }
      : { status: 'guest' };

  return (
    <SessionContext.Provider value={{ session, user, refresh }}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
}
