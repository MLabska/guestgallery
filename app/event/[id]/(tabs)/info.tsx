import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { AppButton } from '../../../../src/components/AppButton';
import { Banner } from '../../../../src/components/Banner';
import { Card } from '../../../../src/components/Card';
import { EmptyState } from '../../../../src/components/EmptyState';
import { ChallengeManager } from '../../../../src/components/ChallengeManager';
import { GuestList } from '../../../../src/components/GuestList';
import { getEvent, listParticipants } from '../../../../src/api/events';
import { useEventId } from '../../../../src/hooks/useEventId';
import { useIsHost } from '../../../../src/hooks/useIsHost';
import type { EventSummary } from '../../../../src/lib/myEvents';
import type { Participant } from '../../../../src/lib/participants';
import { buildJoinUrl } from '../../../../src/lib/qr';
import { buildShareText } from '../../../../src/lib/shareText';
import { colors, spacing } from '../../../../src/theme';

// Event info: QR code, event code and share for the host (SPEC 1.2, 1.3).
export default function EventInfoTab() {
  const id = useEventId();
  const [event, setEvent] = useState<EventSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isHost = useIsHost(event);

  const [attempt, setAttempt] = useState(0);
  const [guests, setGuests] = useState<Participant[] | null>(null);
  const [guestsError, setGuestsError] = useState(false);
  const eventId = event?.id;
  const hostId = event?.host_id;

  // Who joined (SPEC 1.5): host only, reloaded every time the tab is opened.
  const loadGuests = useCallback(() => {
    if (!isHost || !eventId || !hostId) return;
    listParticipants(eventId, hostId)
      .then((list) => {
        setGuests(list);
        setGuestsError(false);
      })
      .catch(() => setGuestsError(true));
  }, [isHost, eventId, hostId]);

  useFocusEffect(loadGuests);

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
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  if (error) {
    return (
      <EmptyState icon="cloud-offline-outline" title={error}>
        <AppButton title="Try again" variant="secondary" onPress={retry} />
      </EmptyState>
    );
  }
  if (!event) {
    return (
      <EmptyState icon="search-outline" title="Event not found" />
    );
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.container}>
      <Text style={styles.name}>{event.name}</Text>
      <Text style={styles.date}>{event.event_date}</Text>
      {isHost ? (
        <>
          <Card style={styles.qrCard}>
            <QRCode value={buildJoinUrl(event.code)} size={220} />
            <Text style={styles.codeLabel}>Event code</Text>
            <Text style={styles.code} selectable>
              {event.code}
            </Text>
          </Card>
          <AppButton
            title="Share"
            icon="share-outline"
            style={styles.share}
            onPress={() => {
              void Share.share({ message: buildShareText(event.name, event.code) });
            }}
          />
          {guests ? (
            <GuestList participants={guests} hostId={event.host_id} />
          ) : guestsError ? (
            <Banner kind="error" style={styles.stretch} text="Could not load the guest list. Reopen this tab to retry." />
          ) : null}
          <ChallengeManager eventId={event.id} />
        </>
      ) : (
        <Text style={styles.note}>Only the host can show the QR code of this event.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  container: { alignItems: 'center', padding: spacing.xl, gap: spacing.lg },
  name: { fontSize: 28, fontWeight: '800', textAlign: 'center', color: colors.text },
  date: { color: colors.secondaryText, fontSize: 16 },
  qrCard: { alignItems: 'center', padding: spacing.xl, gap: spacing.md, alignSelf: 'stretch' },
  codeLabel: { color: colors.secondaryText, fontSize: 13, fontWeight: '600', textTransform: 'uppercase' },
  code: { fontSize: 44, fontWeight: '800', letterSpacing: 6, color: colors.accent },
  share: { alignSelf: 'stretch' },
  stretch: { alignSelf: 'stretch' },
  note: { color: colors.secondaryText, textAlign: 'center', fontSize: 16 },
});
