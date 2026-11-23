import { Image } from 'expo-image';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getChallenge } from '../../../../src/api/challenges';
import { AppButton } from '../../../../src/components/AppButton';
import { Banner } from '../../../../src/components/Banner';
import { EmptyState } from '../../../../src/components/EmptyState';
import { LikeBadge } from '../../../../src/components/LikeBadge';
import { PhotoGrid } from '../../../../src/components/PhotoGrid';
import { useEvent } from '../../../../src/hooks/useEvent';
import { useEventId } from '../../../../src/hooks/useEventId';
import { useEventPhotosState } from '../../../../src/hooks/useEventPhotos';
import { useLikes } from '../../../../src/hooks/useLikes';
import { useSession } from '../../../../src/hooks/useSession';
import type { Challenge } from '../../../../src/lib/challenges';
import { canLike, likeCountLabel, topPhoto } from '../../../../src/lib/likes';
import { UPLOADS_CLOSED_MESSAGE } from '../../../../src/lib/uploadErrors';
import { uploadsOpen } from '../../../../src/lib/uploadWindow';
import { colors, radii, spacing } from '../../../../src/theme';

const CHALLENGE_RECHECK_MS = 15000;

// Challenge gallery (SPEC 5.3, 5.2): live grid of one challenge's photos and a button that opens
// the camera with the challenge pre-selected.
export default function ChallengeGallery() {
  const id = useEventId();
  const router = useRouter();
  const { challengeId } = useLocalSearchParams<{ challengeId: string }>();
  const gallery = useEventPhotosState(id, challengeId);
  const insets = useSafeAreaInsets();
  const { event, refresh } = useEvent(id);
  const { session } = useSession();
  const userId = session?.user.id;
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  // Likes (SPEC 5.4): loaded on open, on pull-to-refresh and every 15 s while this screen is focused.
  const likes = useLikes(id, userId, focused);
  const top = useMemo(() => topPhoto(gallery.photos, likes.counts), [gallery.photos, likes.counts]);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [gone, setGone] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const loadChallenge = useCallback(() => {
    getChallenge(challengeId)
      .then((c) => {
        setChallenge(c);
        setGone(c === null);
        setLoadError(false);
      })
      .catch(() => setLoadError(true));
  }, [challengeId]);

  useEffect(() => {
    loadChallenge();
  }, [loadChallenge]);

  // Photos leaving the list (deleted, or detached because the challenge was deleted): re-check it.
  const photoCount = gallery.photos.length;
  const previousCount = useRef(photoCount);
  useEffect(() => {
    if (photoCount < previousCount.current) loadChallenge();
    previousCount.current = photoCount;
  }, [photoCount, loadChallenge]);

  // Re-read the upload window when coming back from the camera / upload screens. While the screen
  // is focused the challenge is also re-checked now and then: a challenge deleted by the host has
  // no photo to leave the list, so an empty challenge gets no realtime signal.
  useFocusEffect(
    useCallback(() => {
      refresh();
      if (gone) return; // the challenge is known to be gone: stop re-checking
      const timer = setInterval(loadChallenge, CHALLENGE_RECHECK_MS);
      return () => clearInterval(timer);
    }, [refresh, loadChallenge, gone]),
  );

  if (gone) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ headerShown: true, title: 'Challenge' }} />
        <EmptyState icon="trophy-outline" title="This challenge no longer exists.">
          <AppButton title="Back" variant="secondary" onPress={() => router.back()} />
        </EmptyState>
      </View>
    );
  }

  const open = event ? uploadsOpen(event.uploads_close_at) : false;
  const takePhoto = () =>
    router.push({ pathname: '/event/[id]/camera', params: { id, challengeId } });

  const openPhoto = (photoId: string) =>
    router.push({
      pathname: '/event/[id]/photo/[photoId]',
      params: { id, photoId, challengeId },
    });

  const header = (
    <View style={styles.header}>
      {challenge?.description ? <Text style={styles.muted}>{challenge.description}</Text> : null}
      {loadError && !challenge ? (
        <AppButton
          title="Could not load the challenge. Try again"
          variant="secondary"
          onPress={loadChallenge}
        />
      ) : null}
      {top ? (
        <Pressable
          onPress={() => openPhoto(top.id)}
          accessibilityRole="button"
          accessibilityLabel="Open the top photo"
          style={styles.topCard}
        >
          {gallery.urls[top.thumb_path] ? (
            <Image
              source={{ uri: gallery.urls[top.thumb_path], cacheKey: top.thumb_path }}
              style={styles.topImage}
              contentFit="cover"
            />
          ) : (
            <View style={styles.topImage} />
          )}
          <View style={styles.topText}>
            <Text style={styles.topTitle}>Top photo</Text>
            <Text style={styles.muted}>
              {top.author_nickname ?? 'Unknown'} · {likeCountLabel(likes.counts[top.id] ?? 0)}
            </Text>
          </View>
        </Pressable>
      ) : null}
      {likes.error ? <Banner kind="warning" text={likes.error} /> : null}
      {event && !open ? <Banner kind="error" text={UPLOADS_CLOSED_MESSAGE} /> : null}
      {gallery.error && gallery.photos.length > 0 ? (
        <Banner
          kind="warning"
          text="No connection – showing the last loaded photos. Pull down to retry."
        />
      ) : null}
    </View>
  );

  const empty = gallery.loading ? (
    <View style={styles.center}>
      <ActivityIndicator color={colors.accent} />
    </View>
  ) : (
    <EmptyState
      icon={gallery.error ? 'cloud-offline-outline' : 'camera-outline'}
      title={
        gallery.error
          ? 'Could not load photos. Pull down to retry.'
          : 'No photos for this challenge yet.'
      }
    />
  );

  return (
    <View style={styles.flex}>
      <Stack.Screen options={{ headerShown: true, title: challenge?.title ?? 'Challenge' }} />
      <PhotoGrid
        photos={gallery.photos}
        urls={gallery.urls}
        refreshing={gallery.refreshing}
        onRefresh={() => {
          refresh();
          loadChallenge();
          void likes.reload();
          void gallery.refresh();
        }}
        onEndReached={() => void gallery.loadMore()}
        onOpen={(photo) => openPhoto(photo.id)}
        extraData={[likes.counts, top?.id, userId]}
        renderOverlay={(photo) => (
          <LikeBadge
            count={likes.counts[photo.id] ?? 0}
            liked={likes.isLiked(photo.id)}
            canLike={canLike(photo, userId)}
            onToggle={() => void likes.toggle(photo)}
            top={top?.id === photo.id}
          />
        )}
        onImageError={gallery.reportImageError}
        header={header}
        empty={empty}
        insetForHeader
      />
      {/* Primary action in a bottom bar, clear of the header and the home indicator. */}
      {open ? (
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <AppButton title="Take photo for this challenge" icon="camera" onPress={takePhoto} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  header: { padding: spacing.md, gap: spacing.sm },
  bottomBar: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  topCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.accentSoft,
  },
  topImage: { width: 56, height: 56, borderRadius: radii.sm, backgroundColor: colors.border },
  topText: { flex: 1, gap: 2 },
  topTitle: { fontSize: 16, fontWeight: '700', color: colors.accent },
  muted: { color: colors.secondaryText, textAlign: 'center', fontSize: 16 },
});
