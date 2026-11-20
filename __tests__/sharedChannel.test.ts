import { acquirePhotoChannel } from '../src/lib/sharedChannel';
import type { PhotoChangeHandlers } from '../src/lib/sharedChannel';
import { supabase } from '../src/lib/supabase';

jest.mock('../src/lib/supabase', () => ({
  supabase: { channel: jest.fn(), removeChannel: jest.fn() },
}));

const client = supabase as unknown as { channel: jest.Mock; removeChannel: jest.Mock };

let channels = new Map<string, unknown>();
let callbacks: Record<string, (p: unknown) => void>;
let onStatus: (s: string) => void;

// Mimics realtime-js: channel() returns the same object per topic and on() throws once subscribed.
function setup() {
  channels = new Map<string, unknown>();
  callbacks = {};
  client.channel.mockImplementation((topic: string) => {
    if (channels.has(topic)) return channels.get(topic);
    let subscribed = false;
    const ch: Record<string, jest.Mock> = {
      on: jest.fn((_t: string, f: { event: string }, cb: (p: unknown) => void) => {
        if (subscribed) throw new Error('cannot add `postgres_changes` callbacks after `subscribe()`');
        callbacks[f.event] = cb;
        return ch;
      }),
      subscribe: jest.fn((cb: (s: string) => void) => {
        subscribed = true;
        onStatus = cb;
        return ch;
      }),
    };
    channels.set(topic, ch);
    return ch;
  });
  client.removeChannel.mockImplementation(() => Promise.resolve('ok'));
}

function handlers(): jest.Mocked<PhotoChangeHandlers> {
  return { onInsert: jest.fn(), onDelete: jest.fn(), onUpdate: jest.fn(), onSubscribed: jest.fn() };
}

beforeEach(() => {
  client.channel.mockReset();
  client.removeChannel.mockReset();
  setup();
});

describe('acquirePhotoChannel', () => {
  it('creates one channel for two users of the same topic and does not throw', () => {
    const a = handlers();
    const b = handlers();
    const releaseA = acquirePhotoChannel('t1', 'challenge_id=eq.c', a);
    expect(() => acquirePhotoChannel('t1', 'challenge_id=eq.c', b)).not.toThrow();
    expect(client.channel).toHaveBeenCalledTimes(1);

    callbacks.INSERT({ new: { id: 'p1' } });
    expect(a.onInsert).toHaveBeenCalledWith({ id: 'p1' });
    expect(b.onInsert).toHaveBeenCalledWith({ id: 'p1' });
    releaseA();
  });

  it('keeps the channel alive until the last user releases it', () => {
    const a = handlers();
    const b = handlers();
    const releaseA = acquirePhotoChannel('t2', 'f', a);
    const releaseB = acquirePhotoChannel('t2', 'f', b);
    releaseB(); // viewer closes
    expect(client.removeChannel).not.toHaveBeenCalled();
    callbacks.DELETE({ old: { id: 'p9' } });
    expect(a.onDelete).toHaveBeenCalledWith({ id: 'p9' });
    expect(b.onDelete).not.toHaveBeenCalled();
    releaseA();
    expect(client.removeChannel).toHaveBeenCalledTimes(1);
  });

  it('notifies every user on SUBSCRIBED', () => {
    const a = handlers();
    const b = handlers();
    const ra = acquirePhotoChannel('t3', 'f', a);
    const rb = acquirePhotoChannel('t3', 'f', b);
    onStatus('SUBSCRIBED');
    expect(a.onSubscribed).toHaveBeenCalledTimes(1);
    expect(a.onSubscribed).toHaveBeenCalledWith(false); // no wait, no forced catch-up
    expect(b.onSubscribed).toHaveBeenCalledTimes(1);
    ra();
    rb();
  });

  it('uses separate channels for different topics', () => {
    const ra = acquirePhotoChannel('event:e', 'event_id=eq.e', handlers());
    const rb = acquirePhotoChannel('event:e:challenge:c', 'challenge_id=eq.c', handlers());
    expect(client.channel).toHaveBeenCalledTimes(2);
    ra();
    rb();
  });
});

describe('acquirePhotoChannel while the old channel is leaving', () => {
  it('opens the new channel only after the removal finished, and it gets events', async () => {
    let finishRemoval: () => void = () => undefined;
    client.removeChannel.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishRemoval = () => {
            channels.delete('t-leave'); // like realtime-js: gone from the client after removal
            resolve('ok');
          };
        }),
    );
    const first = acquirePhotoChannel('t-leave', 'f', handlers());
    expect(client.channel).toHaveBeenCalledTimes(1);
    first(); // screen closes, removal is slow

    const again = handlers();
    const release = acquirePhotoChannel('t-leave', 'f', again);
    expect(client.channel).toHaveBeenCalledTimes(1); // must not reuse the dying channel

    finishRemoval();
    await new Promise((r) => setTimeout(r, 0));
    expect(client.channel).toHaveBeenCalledTimes(2);
    callbacks.INSERT({ new: { id: 'p1' } });
    expect(again.onInsert).toHaveBeenCalledWith({ id: 'p1' });
    onStatus('SUBSCRIBED');
    expect(again.onSubscribed).toHaveBeenLastCalledWith(true); // catch up on missed events
    onStatus('SUBSCRIBED');
    expect(again.onSubscribed).toHaveBeenLastCalledWith(false); // later reconnects: hook decides
    release();
  });

  it('does not open a channel nobody wants any more', async () => {
    let finishRemoval: () => void = () => undefined;
    client.removeChannel.mockImplementation(
      () => new Promise((resolve) => (finishRemoval = () => resolve('ok'))),
    );
    acquirePhotoChannel('t-gone', 'f', handlers())();
    acquirePhotoChannel('t-gone', 'f', handlers())();
    finishRemoval();
    await new Promise((r) => setTimeout(r, 0));
    expect(client.channel).toHaveBeenCalledTimes(1);
  });
});
