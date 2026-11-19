import { Stack, useLocalSearchParams } from 'expo-router';

import { EventIdContext } from '../../../src/hooks/useEventId';

// Event routes. Later steps add camera, upload, photo and challenge screens here.
// The [id] param is read once here and shared with all nested screens.
export default function EventLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <EventIdContext.Provider value={typeof id === 'string' ? id : null}>
      <Stack screenOptions={{ headerShown: false }} />
    </EventIdContext.Provider>
  );
}
