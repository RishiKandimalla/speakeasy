import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { VideoPreview } from '../components/VideoPreview';
import { listUploads, type UploadResponse } from '../lib/api';
import { colors, radius, spacing, typography } from '../theme';

function pathLabel(path: string): string {
  const parts = path.split('/').filter(Boolean);
  return parts[parts.length - 1] || path;
}

export function CloudVideosScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<UploadResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playbackPlaying, setPlaybackPlaying] = useState(false);

  const reload = useCallback(async () => {
    try {
      const list = await listUploads();
      setItems(list);
    } catch (e) {
      Alert.alert('Could not load cloud videos', String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void reload();
  }, [reload]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.md }]}>
      <Text style={styles.eyebrow} numberOfLines={1}>
        Storage
      </Text>
      <Text style={styles.title} numberOfLines={1}>
        Cloud videos
      </Text>
      <Text style={styles.hint} numberOfLines={3}>
        Videos uploaded to the server. Pull down to refresh the list.
      </Text>

      <FlatList
        data={items}
        keyExtractor={(item) => item.upload_id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          loading ? (
            <Text style={styles.empty}>Loading…</Text>
          ) : (
            <Text style={styles.empty}>No cloud videos yet.</Text>
          )
        }
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => {
          const label = pathLabel(item.path);
          const shortId = `${item.upload_id.slice(0, 8)}…`;
          const canPlay = Boolean(item.video_url);
          return (
            <View style={styles.listItem}>
              <View style={styles.card}>
                <View style={styles.rowTop}>
                  <View style={styles.thumb}>
                    <Text style={styles.thumbText} numberOfLines={1}>
                      {String(index + 1)}
                    </Text>
                  </View>
                  <View style={styles.mainCol}>
                    <Text style={styles.cardTitle} numberOfLines={2} ellipsizeMode="middle">
                      {label}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {shortId} · {item.status}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.rowActions}>
                <Pressable
                  style={[styles.btnSecondary, !canPlay && styles.btnDisabled]}
                  onPress={() => {
                    if (!canPlay) return;
                    if (playingId === item.upload_id) {
                      setPlayingId(null);
                      setPlaybackPlaying(false);
                    } else {
                      setPlayingId(item.upload_id);
                      setPlaybackPlaying(true);
                    }
                  }}
                  disabled={!canPlay}
                >
                  <Text style={styles.btnSecondaryText} numberOfLines={1}>
                    {playingId === item.upload_id ? 'Hide' : 'Play'}
                  </Text>
                </Pressable>
              </View>
              {playingId === item.upload_id && item.video_url && (
                <View style={styles.previewBlock}>
                  <VideoPreview uri={item.video_url} isPlaying={playbackPlaying} />
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
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.background,
  },
  eyebrow: {
    ...typography.caption,
    color: colors.primaryMuted,
    marginBottom: spacing.xs,
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
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbText: {
    ...typography.headline,
    color: colors.primary,
  },
  mainCol: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  meta: {
    ...typography.caption,
    color: colors.textSecondary,
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
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  btnSecondaryText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
