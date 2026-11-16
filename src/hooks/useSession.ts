import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';

export type SessionState = {
  session: Session | null;
  loading: boolean;
  error: string | null;
};

/** Restores the stored session, or signs in anonymously on first launch (DESIGN.md §1, §5). */
export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({ session: null, loading: true, error: null });

  useEffect(() => {
    let active = true;

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active && session) setState({ session, loading: false, error: null });
    });

    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!active) return;
      if (error) {
        setState({ session: null, loading: false, error: error.message });
        return;
      }
      if (data.session) {
        setState({ session: data.session, loading: false, error: null });
        return;
      }
      const result = await supabase.auth.signInAnonymously();
      if (!active) return;
      setState({
        session: result.data.session,
        loading: false,
        error: result.error ? result.error.message : null,
      });
    })().catch((e: unknown) => {
      if (active) {
        setState({
          session: null,
          loading: false,
          error: e instanceof Error ? e.message : 'Sign-in failed',
        });
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return state;
}
