import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { likeCountLabel } from '../lib/likes';
import { colors, spacing } from '../theme';

type Props = {
  count: number;
  liked: boolean;
  /** False for my own photos: they only show the count (SPEC 5.4). */
  canLike: boolean;
  onToggle: () => void;
  /** Marks the Top photo of the challenge. */
  top?: boolean;
};

/** Heart + like count in the corner of a challenge thumbnail (SPEC 5.4). */
export function LikeBadge({ count, liked, canLike, onToggle, top = false }: Props) {
  const content = (
    <>
      <Ionicons
        name={liked ? 'heart' : 'heart-outline'}
        size={18}
        color={liked ? colors.mediaDanger : colors.onMedia}
      />
      <Text style={styles.count}>{count}</Text>
    </>
  );
  return (
    <>
      {top ? (
        <View style={styles.top} accessibilityLabel="Top photo">
          <Ionicons name="trophy" size={12} color={colors.onMedia} />
          <Text style={styles.topText}>Top</Text>
        </View>
      ) : null}
      {canLike ? (
        <Pressable
          onPress={onToggle}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={liked ? `Remove like, ${likeCountLabel(count)}` : `Like, ${likeCountLabel(count)}`}
          style={styles.badge}
        >
          {content}
        </Pressable>
      ) : (
        <View style={styles.badge} accessibilityLabel={likeCountLabel(count)}>
          {content}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    right: spacing.xs,
    bottom: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 14,
    backgroundColor: colors.mediaOverlay,
  },
  count: { color: colors.onMedia, fontSize: 13, fontWeight: '700' },
  top: {
    position: 'absolute',
    left: spacing.xs,
    top: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: colors.accent,
  },
  topText: { color: colors.onMedia, fontSize: 11, fontWeight: '700' },
});
