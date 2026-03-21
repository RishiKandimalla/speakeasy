import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RecordingRow } from '../components/RecordingRow';
import { VideoPreview } from '../components/VideoPreview';
import { savedVideoToRecordingCardItem } from '../lib/recordingCard';
import {
  deleteSavedVideo,
  listSavedVideos,
  type SavedVideo,
} from '../lib/savedVideos';
import { colors, radius, spacing, typography } from '../theme';

export function SavedVideosScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<SavedVideo[]>([]);
  const [playingUri, setPlayingUri] = useState<string | null>(null);
  const [playbackPlaying, setPlaybackPlaying] = useState(false);

  const reload = useCallback(async () => {
    if (Platform.OS === 'web') {
      setItems([]);
      return;
    }
    try {
      const list = await listSavedVideos();
      setItems(list);
    } catch (e) {
      Alert.alert('Could not load saved videos', String(e));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const onDelete = useCallback(
    (item: SavedVideo) => {
      const label = savedVideoToRecordingCardItem(item).title;
      Alert.alert('Delete video', `Remove "${label}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteSavedVideo(item.uri);
                if (playingUri === item.uri) {
                  setPlayingUri(null);
                  setPlaybackPlaying(false);
                }
                await reload();
              } catch (e) {
                Alert.alert('Delete failed', String(e));
              }
            })();
          },
        },
      ]);
    },
    [playingUri, reload],
  );

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.title} numberOfLines={1}>
          Saved
        </Text>
        <Text style={styles.hint} numberOfLines={3}>
          In-app saved videos are not available on web.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.md }]}>
      <Text style={styles.title} numberOfLines={1}>
        Saved in app
      </Text>
      <Text style={styles.hint} numberOfLines={3}>
        Stored in app documents. Persists until you delete or uninstall.
      </Text>

      <FlatList
        data={items}
        keyExtractor={(item) => item.uri}
        ListEmptyComponent={
          <Text style={styles.empty}>No saved videos yet.</Text>
        }
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => {
          const cardItem = savedVideoToRecordingCardItem(item);
          return (
            <View style={styles.listItem}>
              <RecordingRow item={cardItem} index={index} />
              <View style={styles.rowActions}>
                <Pressable
                  style={styles.btnSecondary}
                  onPress={() => {
                    if (playingUri === item.uri) {
                      setPlayingUri(null);
                      setPlaybackPlaying(false);
                    } else {
                      setPlayingUri(item.uri);
                      setPlaybackPlaying(true);
                    }
                  }}
                >
                  <Text style={styles.btnSecondaryText} numberOfLines={1}>
                    {playingUri === item.uri ? 'Hide' : 'Play'}
                  </Text>
                </Pressable>
                <Pressable style={styles.btnDanger} onPress={() => onDelete(item)}>
                  <Text style={styles.btnDangerText} numberOfLines={1}>
                    Delete
                  </Text>
                </Pressable>
              </View>
              {playingUri === item.uri && (
                <View style={styles.previewBlock}>
                  <VideoPreview uri={item.uri} isPlaying={playbackPlaying} />
                  <Pressable
                    style={styles.btnSecondary}
                    onPress={() => setPlaybackPlaying((p) => !p)}
                  >
                    <Text style={styles.btnSecondaryText} numberOfLines={1}>
                      {playbackPlaying ? 'Pause' : 'Play'}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.background,
  },
  title: {
    ...typography.title,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  listItem: {
    marginBottom: spacing.lg,
  },
  empty: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xxl,
    textAlign: 'center',
  },
  rowActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  previewBlock: {
    marginTop: spacing.md,
  },
  btnSecondary: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
  btnSecondaryText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  btnDanger: {
    backgroundColor: 'rgba(229, 115, 115, 0.2)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
  btnDangerText: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: '600',
  },
});
