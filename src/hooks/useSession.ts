import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import type { ReactNode } from 'react';

import { supabase } from '../lib/supabase';

export type SessionState = {
  session: Session | null;
  loading: boolean;
  error: string | null;
};

export type SessionContextValue = SessionState & {
  /** Tries to restore or create the session again (after an error). */
  retry: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * The one place that signs in (DESIGN.md §7). Restores the stored session, or signs in
 * anonymously on first launch, and signs in again when the session is lost.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ session: null, loading: true, error: null });
  // Bookkeeping lives in a closure created once, so it is stable across renders.
  const [ctl] = useState(() => {
    let inFlight: Promise<void> | null = null;
    let active = true;
    return {
      isActive: () => active,
      setActive: (value: boolean) => {
        active = value;
      },
      /** Runs `start` unless a sign-in is already in flight; then shares that one. */
      once: (start: () => Promise<void>): Promise<void> => {
        if (inFlight) return inFlight;
        const run = start().finally(() => {
          inFlight = null;
        });
        inFlight = run;
        return run;
      },
    };
  });

  const ensureSession = useCallback(
    // Never run two sign-ins in parallel: that would create two anonymous users.
    (): Promise<void> =>
      ctl.once(async () => {
        try {
          const { data, error } = await supabase.auth.getSession();
          if (error) {
            if (ctl.isActive()) setState({ session: null, loading: false, error: error.message });
            return;
          }
          let session = data.session;
          let errorMessage: string | null = null;
          if (!session) {
            const result = await supabase.auth.signInAnonymously();
            session = result.data.session;
            errorMessage = result.error ? result.error.message : null;
          }
          if (ctl.isActive()) setState({ session, loading: false, error: errorMessage });
        } catch (e: unknown) {
          if (ctl.isActive()) {
            setState({
              session: null,
              loading: false,
              error: e instanceof Error ? e.message : 'Sign-in failed',
            });
          }
        }
      }),
    [ctl],
  );

  useEffect(() => {
    ctl.setActive(true);
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!ctl.isActive()) return;
      if (session) {
        setState({ session, loading: false, error: null });
      } else if (event === 'SIGNED_OUT') {
        // Session lost (signed out or refresh failed): sign in again.
        setState({ session: null, loading: true, error: null });
        void ensureSession();
      }
    });
    void ensureSession();
    return () => {
      ctl.setActive(false);
      listener.subscription.unsubscribe();
    };
  }, [ensureSession, ctl]);

  const retry = useCallback(() => {
    setState({ session: null, loading: true, error: null });
    void ensureSession();
  }, [ensureSession]);

  return createElement(SessionContext.Provider, { value: { ...state, retry } }, children);
}

/** Reads the app-wide session. Screens never sign in themselves. */
export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
}
