import { useEffect, useState } from 'react';
import { ActivityIndicator, Button, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { getEvent } from '../../../../src/api/events';
import { useEventId } from '../../../../src/hooks/useEventId';
import { useIsHost } from '../../../../src/hooks/useIsHost';
import type { EventSummary } from '../../../../src/lib/myEvents';
import { buildJoinUrl } from '../../../../src/lib/qr';
import { buildShareText } from '../../../../src/lib/shareText';

// Event info: QR code, event code and share for the host (SPEC 1.2, 1.3).
export default function EventInfoTab() {
  const id = useEventId();
  const [event, setEvent] = useState<EventSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isHost = useIsHost(event);

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

  function retry() {
    setLoading(true);
    setAttempt((n) => n + 1);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Button title="Try again" onPress={retry} />
      </View>
    );
  }
  if (!event) {
    return (
      <View style={styles.center}>
        <Text>Event not found</Text>
      </View>
    );
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.container}>
      <Text style={styles.name}>{event.name}</Text>
      <Text style={styles.date}>{event.event_date}</Text>
      {isHost ? (
        <>
          <QRCode value={buildJoinUrl(event.code)} size={220} />
          <Text style={styles.codeLabel}>Event code</Text>
          <Text style={styles.code} selectable>
            {event.code}
          </Text>
          <Button
            title="Share"
            onPress={() => {
              void Share.share({ message: buildShareText(event.name, event.code) });
            }}
          />
        </>
      ) : (
        <Text style={styles.note}>Only the host can show the QR code of this event.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  container: { alignItems: 'center', padding: 24, gap: 14 },
  name: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  date: { color: '#666' },
  codeLabel: { color: '#666', marginTop: 8 },
  code: { fontSize: 44, fontWeight: '800', letterSpacing: 6 },
  note: { color: '#666', textAlign: 'center' },
  error: { color: '#b00020', textAlign: 'center' },
});
