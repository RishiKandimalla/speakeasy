import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, ListRenderItemInfo, StyleSheet, Text, View, ViewToken, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';

import { getCachedClipUri, prefetchClip } from '../lib/clipCache';
import { ClipResponse, FeedPostResponse, listClips, listPublicFeed } from '../lib/api';
import { colors, radius, spacing, typography } from '../theme';

type FeedItem = FeedPostResponse & {
  backgroundClip: ClipResponse | null;
  instanceKey: string;
};

const BATCH_SIZE = 20;

function shuffleItems<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function FeedBackgroundVideo({
  clip,
  shouldPlay,
}: {
  clip: ClipResponse;
  shouldPlay: boolean;
}) {
  const [sourceUri, setSourceUri] = useState(clip.video_url);
  const player = useVideoPlayer(sourceUri, (p) => {
    p.loop = true;
    p.volume = 0;
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

  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" />;
}

function FeedVideoItem({
  item,
  shouldPlay,
  height,
}: {
  item: FeedItem;
  shouldPlay: boolean;
  height: number;
}) {
  const audioPlayer = useVideoPlayer(item.audio_url, (p) => {
    p.loop = true;
  });

  useEffect(() => {
    if (shouldPlay) {
      audioPlayer.play();
    } else {
      audioPlayer.pause();
    }
  }, [audioPlayer, shouldPlay]);

  return (
    <View style={[styles.page, { height }]}>
      {item.backgroundClip ? <FeedBackgroundVideo clip={item.backgroundClip} shouldPlay={shouldPlay} /> : null}
      <View style={styles.videoOverlay}>
        <Text style={styles.chipText}>@{item.username}</Text>
      </View>
    </View>
  );
}

export function FeedScreen() {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const pageHeight = useMemo(() => Math.max(windowHeight - insets.bottom, 1), [windowHeight, insets.bottom]);

  const [sourcePosts, setSourcePosts] = useState<FeedPostResponse[]>([]);
  const [sourceClips, setSourceClips] = useState<ClipResponse[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [visibleIndex, setVisibleIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const instanceCounterRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const viewabilityConfigRef = useRef({ itemVisiblePercentThreshold: 70 });

  const createBatch = useCallback(
    (posts: FeedPostResponse[], clips: ClipResponse[], previousLastPostId?: string): FeedItem[] => {
      const shuffledPosts = shuffleItems(posts);
      if (previousLastPostId && shuffledPosts.length > 1 && shuffledPosts[0].post_id === previousLastPostId) {
        [shuffledPosts[0], shuffledPosts[1]] = [shuffledPosts[1], shuffledPosts[0]];
      }
      const shuffledClips = clips.length ? shuffleItems(clips) : [];
      return shuffledPosts.map((post, index) => {
        const backgroundClip = shuffledClips.length ? shuffledClips[index % shuffledClips.length] : null;
        instanceCounterRef.current += 1;
        return { ...post, backgroundClip, instanceKey: `${post.post_id}:${instanceCounterRef.current}` };
      });
    },
    [],
  );

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [posts, clips] = await Promise.all([listPublicFeed(BATCH_SIZE), listClips('both')]);
      setSourcePosts(posts);
      setSourceClips(clips);
      instanceCounterRef.current = 0;
      if (!posts.length) {
        setFeed([]);
        setVisibleIndex(0);
        return;
      }
      const firstBatch = createBatch(posts, clips);
      const secondBatch = createBatch(posts, clips, firstBatch[firstBatch.length - 1]?.post_id);
      setFeed([...firstBatch, ...secondBatch]);
      setVisibleIndex(0);
    } catch (e) {
      setError(String(e));
      setSourcePosts([]);
      setSourceClips([]);
      setFeed([]);
      setVisibleIndex(0);
    } finally {
      setLoading(false);
    }
  }, [createBatch]);

  useFocusEffect(
    useCallback(() => {
      void loadInitial();
    }, [loadInitial]),
  );

  useEffect(() => {
    if (!feed.length) return;
    const next = feed[visibleIndex + 1];
    const afterNext = feed[visibleIndex + 2];
    if (next?.backgroundClip) void prefetchClip(next.backgroundClip.id, next.backgroundClip.video_url);
    if (afterNext?.backgroundClip) void prefetchClip(afterNext.backgroundClip.id, afterNext.backgroundClip.video_url);
  }, [feed, visibleIndex]);

  const appendBatch = useCallback(() => {
    if (loadingMoreRef.current || !sourcePosts.length) return;
    loadingMoreRef.current = true;
    setFeed((prev) => {
      const previousLastPostId = prev[prev.length - 1]?.post_id;
      const batch = createBatch(sourcePosts, sourceClips, previousLastPostId);
      return [...prev, ...batch];
    });
    loadingMoreRef.current = false;
  }, [createBatch, sourceClips, sourcePosts]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first?.index != null) {
        setVisibleIndex(first.index);
      }
    },
  );

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<FeedItem>) => (
      <FeedVideoItem item={item} shouldPlay={index === visibleIndex} height={pageHeight} />
    ),
    [pageHeight, visibleIndex],
  );

  return (
    <View style={styles.root}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.centerText}>Loading feed posts...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.centerText}>Could not load feed.</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : !feed.length ? (
        <View style={styles.center}>
          <Text style={styles.centerText}>No public posts are available yet.</Text>
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
