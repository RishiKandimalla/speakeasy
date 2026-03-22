import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItemInfo,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewToken,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';

import { getCachedClipUri, prefetchClip } from '../lib/clipCache';
import { ClipCategory, ClipResponse, listClips } from '../lib/api';
import { colors, radius, spacing, typography } from '../theme';

type FeedClip = ClipResponse & { instanceKey: string };

const CATEGORY_OPTIONS: ReadonlyArray<{ label: string; value: ClipCategory }> = [
  { label: 'Minecraft', value: 'minecraft' },
  { label: 'Drone', value: 'drone' },
  { label: 'Both', value: 'both' },
];

function shuffleClips(clips: ClipResponse[], previousLastClipId?: string): ClipResponse[] {
  const shuffled = [...clips];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  if (previousLastClipId && shuffled.length > 1 && shuffled[0].id === previousLastClipId) {
    [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
  }
  return shuffled;
}

function FeedVideoItem({
  clip,
  shouldPlay,
  height,
}: {
  clip: FeedClip;
  shouldPlay: boolean;
  height: number;
}) {
  const [sourceUri, setSourceUri] = useState(clip.video_url);
  const player = useVideoPlayer(sourceUri, (p) => {
    p.loop = true;
  });

  useEffect(() => {
    let cancelled = false;
    setSourceUri(clip.video_url);
    void getCachedClipUri(clip.id, clip.video_url)
      .then((localUri) => {
        if (!cancelled) {
          setSourceUri(localUri);
        }
      })
      .catch(() => {
        // Ignore cache errors and keep using remote URL.
      });
    return () => {
      cancelled = true;
    };
  }, [clip.id, clip.video_url]);

  useEffect(() => {
    if (shouldPlay) {
      player.play();
    } else {
      player.pause();
    }
  }, [player, shouldPlay]);

  return (
    <View style={[styles.page, { height }]}>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" />
      <View style={styles.videoOverlay}>
        <Text style={styles.chipText}>{clip.category === 'minecraft' ? 'Minecraft clip' : 'Drone clip'}</Text>
      </View>
    </View>
  );
}

export function FeedScreen() {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const pageHeight = useMemo(() => Math.max(windowHeight - insets.bottom, 1), [windowHeight, insets.bottom]);

  const [category, setCategory] = useState<ClipCategory>('both');
  const [sourceClips, setSourceClips] = useState<ClipResponse[]>([]);
  const [feed, setFeed] = useState<FeedClip[]>([]);
  const [visibleIndex, setVisibleIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const instanceCounterRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const viewabilityConfigRef = useRef({ itemVisiblePercentThreshold: 70 });

  const createBatch = useCallback((clips: ClipResponse[], previousLastClipId?: string): FeedClip[] => {
    const shuffled = shuffleClips(clips, previousLastClipId);
    return shuffled.map((clip) => {
      instanceCounterRef.current += 1;
      return { ...clip, instanceKey: `${clip.id}:${instanceCounterRef.current}` };
    });
  }, []);

  const loadInitial = useCallback(
    async (selectedCategory: ClipCategory) => {
      setLoading(true);
      setError(null);
      try {
        const clips = await listClips(selectedCategory);
        setSourceClips(clips);
        instanceCounterRef.current = 0;
        if (!clips.length) {
          setFeed([]);
          setVisibleIndex(0);
          return;
        }
        const firstBatch = createBatch(clips);
        const secondBatch = createBatch(clips, firstBatch[firstBatch.length - 1]?.id);
        setFeed([...firstBatch, ...secondBatch]);
        setVisibleIndex(0);
      } catch (e) {
        setError(String(e));
        setSourceClips([]);
        setFeed([]);
        setVisibleIndex(0);
      } finally {
        setLoading(false);
      }
    },
    [createBatch],
  );

  useFocusEffect(
    useCallback(() => {
      void loadInitial(category);
    }, [category, loadInitial]),
  );

  useEffect(() => {
    if (!feed.length) return;
    const next = feed[visibleIndex + 1];
    const afterNext = feed[visibleIndex + 2];
    if (next) void prefetchClip(next.id, next.video_url);
    if (afterNext) void prefetchClip(afterNext.id, afterNext.video_url);
  }, [feed, visibleIndex]);

  const appendBatch = useCallback(() => {
    if (loadingMoreRef.current || !sourceClips.length) return;
    loadingMoreRef.current = true;
    setFeed((prev) => {
      const previousLastClipId = prev[prev.length - 1]?.id;
      const batch = createBatch(sourceClips, previousLastClipId);
      return [...prev, ...batch];
    });
    loadingMoreRef.current = false;
  }, [createBatch, sourceClips]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first?.index != null) {
        setVisibleIndex(first.index);
      }
    },
  );

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<FeedClip>) => (
      <FeedVideoItem clip={item} shouldPlay={index === visibleIndex} height={pageHeight} />
    ),
    [pageHeight, visibleIndex],
  );

  return (
    <View style={styles.root}>
      <View style={[styles.toggleRow, { top: insets.top + spacing.md }]}>
        {CATEGORY_OPTIONS.map((option) => {
          const active = category === option.value;
          return (
            <Pressable
              key={option.value}
              style={[styles.toggleBtn, active && styles.toggleBtnActive]}
              onPress={() => setCategory(option.value)}
            >
              <Text style={[styles.toggleText, active && styles.toggleTextActive]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.centerText}>Loading clips…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.centerText}>Could not load feed.</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : !feed.length ? (
        <View style={styles.center}>
          <Text style={styles.centerText}>No clips available for this category yet.</Text>
        </View>
      ) : (
        <FlatList
          data={feed}
          keyExtractor={(item) => item.instanceKey}
          renderItem={renderItem}
          pagingEnabled
          snapToInterval={pageHeight}
          snapToAlignment="start"
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          onEndReachedThreshold={0.5}
          onEndReached={appendBatch}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          windowSize={3}
          removeClippedSubviews
          getItemLayout={(_, index) => ({
            length: pageHeight,
            offset: pageHeight * index,
            index,
          })}
          viewabilityConfig={viewabilityConfigRef.current}
          onViewableItemsChanged={onViewableItemsChanged.current}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  page: {
    width: '100%',
    backgroundColor: '#000',
  },
  videoOverlay: {
    position: 'absolute',
    left: spacing.xl,
    bottom: spacing.xxl * 2,
    backgroundColor: colors.overlay,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
  },
  toggleRow: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 2,
    flexDirection: 'row',
    backgroundColor: colors.overlay,
    borderRadius: radius.lg,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  toggleBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  toggleBtnActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  centerText: {
    ...typography.body,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  errorText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
