import { renderHook, waitFor } from '@testing-library/react-native';

import { useSession } from '../src/hooks/useSession';
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
};

const fakeSession = { user: { id: 'user-1' } };

beforeEach(() => {
  auth.getSession.mockReset();
  auth.signInAnonymously.mockReset();
});

describe('useSession', () => {
  it('reuses a stored session without signing in again', async () => {
    auth.getSession.mockResolvedValue({ data: { session: fakeSession }, error: null });
    const { result } = await renderHook(() => useSession());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session).toBe(fakeSession);
    expect(auth.signInAnonymously).not.toHaveBeenCalled();
  });

  it('signs in anonymously when there is no session', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    auth.signInAnonymously.mockResolvedValue({ data: { session: fakeSession }, error: null });
    const { result } = await renderHook(() => useSession());
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
    const { result } = await renderHook(() => useSession());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session).toBeNull();
    expect(result.current.error).toBe('Anonymous sign-ins are disabled');
  });
});
