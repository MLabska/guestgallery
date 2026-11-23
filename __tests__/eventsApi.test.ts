import { createEvent, joinEvent, listMyEvents, listParticipants } from '../src/api/events';
import { supabase } from '../src/lib/supabase';

jest.mock('../src/lib/supabase', () => ({
  supabase: { rpc: jest.fn(), from: jest.fn() },
}));

const client = supabase as unknown as { rpc: jest.Mock; from: jest.Mock };

beforeEach(() => {
  client.rpc.mockReset();
  client.from.mockReset();
});

describe('createEvent', () => {
  it('calls the create_event RPC and returns id and code', async () => {
    client.rpc.mockResolvedValue({ data: { id: 'e1', code: 'K7P4QX' }, error: null });
    await expect(createEvent('Party', '2026-12-31', 'Host')).resolves.toEqual({
      id: 'e1',
      code: 'K7P4QX',
    });
    expect(client.rpc).toHaveBeenCalledWith('create_event', {
      name: 'Party',
      event_date: '2026-12-31',
      host_nickname: 'Host',
    });
  });

  it('turns an RPC error into a readable message', async () => {
    client.rpc.mockResolvedValue({ data: null, error: { message: 'INVALID_NAME' } });
    await expect(createEvent('', '2026-12-31', 'Host')).rejects.toThrow(
      'Event name must be 1 to 60 characters',
    );
  });
});

describe('listMyEvents', () => {
  it('labels and sorts the joined rows', async () => {
    const order = jest.fn().mockResolvedValue({
      data: [
        {
          joined_at: '2026-01-01T00:00:00Z',
          nickname: 'a',
          events: { id: 'old', code: 'AAAAAA', name: 'Old', event_date: '2026-01-01', host_id: 'x', uploads_close_at: '' },
        },
        {
          joined_at: '2026-02-01T00:00:00Z',
          nickname: 'b',
          events: { id: 'new', code: 'BBBBBB', name: 'New', event_date: '2026-02-01', host_id: 'me', uploads_close_at: '' },
        },
      ],
      error: null,
    });
    const eq = jest.fn(() => ({ order }));
    client.from.mockReturnValue({ select: jest.fn(() => ({ eq })) });

    const items = await listMyEvents('me');
    expect(client.from).toHaveBeenCalledWith('participants');
    expect(eq).toHaveBeenCalledWith('user_id', 'me');
    expect(items.map((i) => [i.id, i.role])).toEqual([
      ['new', 'Host'],
      ['old', 'Guest'],
    ]);
  });
});

describe('joinEvent', () => {
  it('calls the join_event RPC and returns the event id', async () => {
    client.rpc.mockResolvedValue({ data: { id: 'e1', code: 'K7P4QX' }, error: null });
    await expect(joinEvent('k7p 4qx', 'Anna')).resolves.toEqual({ id: 'e1' });
    expect(client.rpc).toHaveBeenCalledWith('join_event', { code: 'k7p 4qx', nickname: 'Anna' });
  });

  it('maps NICKNAME_TAKEN and EVENT_NOT_FOUND', async () => {
    client.rpc.mockResolvedValue({ data: null, error: { message: 'NICKNAME_TAKEN' } });
    await expect(joinEvent('K7P4QX', 'Anna')).rejects.toThrow(
      'This nickname is already taken in this event',
    );
    client.rpc.mockResolvedValue({ data: null, error: { message: 'EVENT_NOT_FOUND' } });
    await expect(joinEvent('AAAAAA', 'Anna')).rejects.toThrow('Event not found');
  });
});

describe('listParticipants', () => {
  function participantsQuery(result: { data: unknown; error: unknown }) {
    const order = jest.fn().mockResolvedValue(result);
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    client.from.mockReturnValue({ select });
    return { select, eq, order };
  }

  it('reads the participants of the event and puts the host first', async () => {
    const q = participantsQuery({
      data: [
        { user_id: 'g1', nickname: 'Anna', joined_at: '2026-01-01T10:00:00Z' },
        { user_id: 'h', nickname: 'Host', joined_at: '2026-01-01T12:00:00Z' },
      ],
      error: null,
    });
    const list = await listParticipants('e1', 'h');
    expect(client.from).toHaveBeenCalledWith('participants');
    expect(q.select).toHaveBeenCalledWith('user_id, nickname, joined_at');
    expect(q.eq).toHaveBeenCalledWith('event_id', 'e1');
    expect(q.order).toHaveBeenCalledWith('joined_at', { ascending: true });
    expect(list.map((p) => p.nickname)).toEqual(['Host', 'Anna']);
  });

  it('throws a readable error on failure', async () => {
    participantsQuery({ data: null, error: { message: 'boom' } });
    await expect(listParticipants('e1', 'h')).rejects.toThrow('Could not load the guest list');
  });
});
