import { Image } from 'expo-image';
import type { ReactElement } from 'react';
import { Dimensions, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import type { GalleryPhoto } from '../lib/photoList';
import { colors } from '../theme';

const COLUMNS = 3;
const GAP = 2;

type Props = {
  photos: GalleryPhoto[];
  urls: Record<string, string>;
  refreshing: boolean;
  onRefresh: () => void;
  onEndReached: () => void;
  onOpen: (photo: GalleryPhoto) => void;
  onImageError: () => void;
  header?: ReactElement | null;
  empty?: ReactElement | null;
  /** Let iOS inset the grid below a native stack header (screens that show one). */
  insetForHeader?: boolean;
};

/** Square thumbnail grid, newest first, with pull-to-refresh and infinite scroll (SPEC 4.1). */
export function PhotoGrid({
  photos,
  urls,
  refreshing,
  onRefresh,
  onEndReached,
  onOpen,
  onImageError,
  header,
  empty,
  insetForHeader = false,
}: Props) {
  const size = (Dimensions.get('window').width - GAP * (COLUMNS - 1)) / COLUMNS;
  return (
    <FlatList
      data={photos}
      keyExtractor={(p) => p.id}
      numColumns={COLUMNS}
      contentInsetAdjustmentBehavior={insetForHeader ? 'automatic' : 'never'}
      columnWrapperStyle={{ gap: GAP }}
      contentContainerStyle={{ gap: GAP, flexGrow: 1 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
      }
      style={{ backgroundColor: colors.background }}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={header ?? undefined}
      ListEmptyComponent={empty ?? undefined}
      renderItem={({ item }) => (
        <Pressable onPress={() => onOpen(item)} accessibilityLabel="Open photo">
          <View style={{ width: size, height: size, backgroundColor: colors.border }}>
            {urls[item.thumb_path] ? (
              <Image
                source={{ uri: urls[item.thumb_path], cacheKey: item.thumb_path }}
                style={styles.image}
                contentFit="cover"
                onError={onImageError}
              />
            ) : null}
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', height: '100%' },
});
