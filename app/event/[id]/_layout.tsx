import { Stack, useLocalSearchParams } from 'expo-router';

import { EventIdContext } from '../../../src/hooks/useEventId';
import { EventPhotosProvider } from '../../../src/hooks/useEventPhotos';

// Event routes. Later steps add challenge screens here.
// The [id] param is read once here and shared with all nested screens, together with one
// gallery state (so the Gallery tab and the photo viewer use the same list and realtime channel).
export default function EventLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = typeof id === 'string' ? id : null;
  return (
    <EventIdContext.Provider value={eventId}>
      {eventId ? (
        <EventPhotosProvider key={eventId} eventId={eventId}>
          <Stack screenOptions={{ headerShown: false }} />
        </EventPhotosProvider>
      ) : (
        <Stack screenOptions={{ headerShown: false }} />
      )}
    </EventIdContext.Provider>
  );
}
