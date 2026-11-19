import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { SessionProvider, useSession } from '../src/hooks/useSession';
import { supabase } from '../src/lib/supabase';

jest.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      signInAnonymously: jest.fn(),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
  },
}));

const auth = supabase.auth as unknown as {
  getSession: jest.Mock;
  signInAnonymously: jest.Mock;
  onAuthStateChange: jest.Mock;
};

const fakeSession = { user: { id: 'user-1' } };
const wrapper = ({ children }: { children: ReactNode }) => (
  <SessionProvider>{children}</SessionProvider>
);

beforeEach(() => {
  auth.getSession.mockReset();
  auth.signInAnonymously.mockReset();
  auth.onAuthStateChange.mockClear();
});

describe('useSession', () => {
  it('reuses a stored session without signing in again', async () => {
    auth.getSession.mockResolvedValue({ data: { session: fakeSession }, error: null });
    const { result } = await renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session).toBe(fakeSession);
    expect(auth.signInAnonymously).not.toHaveBeenCalled();
  });

  it('signs in anonymously when there is no session', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    auth.signInAnonymously.mockResolvedValue({ data: { session: fakeSession }, error: null });
    const { result } = await renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(auth.signInAnonymously).toHaveBeenCalledTimes(1);
    expect(result.current.session).toBe(fakeSession);
  });

  it('reports a sign-in error', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    auth.signInAnonymously.mockResolvedValue({
      data: { session: null },
      error: { message: 'Anonymous sign-ins are disabled' },
    });
    const { result } = await renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session).toBeNull();
    expect(result.current.error).toBe('Anonymous sign-ins are disabled');
  });

  it('signs in once for several consumers of the same provider', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    auth.signInAnonymously.mockResolvedValue({ data: { session: fakeSession }, error: null });
    const { result } = await renderHook(
      () => ({ a: useSession(), b: useSession() }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.a.loading).toBe(false));
    expect(auth.signInAnonymously).toHaveBeenCalledTimes(1);
    expect(result.current.b.session).toBe(fakeSession);
  });

  it('signs in again when the session is lost', async () => {
    const secondSession = { user: { id: 'user-2' } };
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    auth.signInAnonymously
      .mockResolvedValueOnce({ data: { session: fakeSession }, error: null })
      .mockResolvedValueOnce({ data: { session: secondSession }, error: null });
    const { result } = await renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(result.current.session).toBe(fakeSession));

    const listener = auth.onAuthStateChange.mock.calls[0][0] as (
      event: string,
      session: unknown,
    ) => void;
    await act(async () => {
      listener('SIGNED_OUT', null);
    });

    await waitFor(() => expect(result.current.session).toBe(secondSession));
    expect(auth.signInAnonymously).toHaveBeenCalledTimes(2);
  });

  it('throws when used outside the provider', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(renderHook(() => useSession())).rejects.toThrow(/SessionProvider/);
    spy.mockRestore();
  });
});
