'use client';

// Which events the signed-in Attendee has saved, for the heart on every card. Loaded once for
// the whole attendee area (like the session) and updated optimistically: the heart fills the
// moment it is pressed and quietly goes back if the API refuses.
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { listSaved, saveEvent, unsaveEvent } from './attendee-api';
import { useSession } from './session';

type SavedValue = {
  isSaved: (eventId: string) => boolean;
  toggle: (eventId: string) => Promise<boolean>;
  /** Bumped on every change, so a list of saved events knows to reload. */
  version: number;
};

const SavedContext = createContext<SavedValue | null>(null);

export function SavedProvider({ children }: { children: React.ReactNode }) {
  const { session, user } = useSession();
  const isAttendee = session.status === 'user' && session.role === 'ATTENDEE';
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!isAttendee) {
      setIds(new Set());
      return;
    }
    let active = true;
    listSaved().then((result) => {
      if (active && result.ok) setIds(new Set(result.data.events.map((e) => e.id)));
    });
    return () => {
      active = false;
    };
  }, [isAttendee, user?.id]);

  const toggle = useCallback(
    async (eventId: string) => {
      const wasSaved = ids.has(eventId);
      const flip = (saved: boolean) =>
        setIds((current) => {
          const next = new Set(current);
          if (saved) next.add(eventId);
          else next.delete(eventId);
          return next;
        });
      flip(!wasSaved);
      const result = wasSaved ? await unsaveEvent(eventId) : await saveEvent(eventId);
      if (!result.ok) {
        flip(wasSaved);
        return false;
      }
      setVersion((v) => v + 1);
      return true;
    },
    [ids]
  );

  return (
    <SavedContext.Provider value={isAttendee ? { isSaved: (id) => ids.has(id), toggle, version } : null}>
      {children}
    </SavedContext.Provider>
  );
}

/** null outside the attendee area or for anyone who is not a signed-in Attendee: no hearts. */
export function useSaved(): SavedValue | null {
  return useContext(SavedContext);
}
