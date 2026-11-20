import { useCallback, useEffect, useState } from 'react';

import { getEvent } from '../api/events';
import type { EventSummary } from '../lib/myEvents';

/** Loads one event (including uploads_close_at); `reload` fetches it again. */
export function useEvent(id: string) {
  const [event, setEvent] = useState<EventSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getEvent(id)
      .then((found) => {
        if (cancelled) return;
        setEvent(found);
        setError(null);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Could not load the event');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, attempt]);

  const reload = useCallback(() => {
    setLoading(true);
    setAttempt((n) => n + 1);
  }, []);

  /** Fetches the event again without showing the loading state. */
  const refresh = useCallback(() => {
    setAttempt((n) => n + 1);
  }, []);

  return { event, loading, error, reload, refresh };
}
