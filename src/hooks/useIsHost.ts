import { isHostOf, type EventSummary } from '../lib/myEvents';
import { useSession } from './useSession';

/** True when the signed-in device created the given event. */
export function useIsHost(event: Pick<EventSummary, 'host_id'> | null): boolean {
  const { session } = useSession();
  return event !== null && isHostOf(event, session?.user.id);
}
