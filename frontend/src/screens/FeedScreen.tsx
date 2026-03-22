import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  ListRenderItemInfo,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewToken,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useIsFocused, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setStatusBarStyle } from 'expo-status-bar';
import { useVideoPlayer, VideoView } from 'expo-video';

import { getCachedClipUri, prefetchClip } from '../lib/clipCache';
import {
  addReaction,
  ClipResponse,
  EMOJI_DISPLAY,
  FeedPostResponse,
  getReactionSummary,
  listClips,
  listPublicFeed,
  REACTION_EMOJIS,
  type ReactionEmoji,
  type ReactionSummary,
} from '../lib/api';
import { colors, fontFamily, radius, spacing, typography } from '../theme';
import type { Word } from '../types/analysis';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FeedItem = FeedPostResponse & {
  backgroundClip: ClipResponse | null;
  instanceKey: string;
};

type TranscriptChunk = {
  words: Word[];
  text: string;
  start: number;
  end: number;
};

type ParsedTranscript = { text: string; words: Word[] } | null;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BATCH_SIZE = 20;
const MAX_WORDS_PER_CHUNK = 14;
const POLL_INTERVAL_MS = 100;
const CURSOR_BLINK_MS = 530;
const CAPTION_FONT_SIZE = 24;
const CAPTION_LINE_HEIGHT = 36;

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function shuffleItems<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function isSentenceEnd(word: string): boolean {
  return /[.!?]$/.test(word);
}

function buildChunks(words: Word[]): TranscriptChunk[] {
  if (!words.length) return [];
  const chunks: TranscriptChunk[] = [];
  let buf: Word[] = [];

  const flush = () => {
    if (!buf.length) return;
    chunks.push({
      words: buf,
      text: buf.map((w) => w.word).join(' '),
      start: buf[0].start,
      end: buf[buf.length - 1].end,
    });
    buf = [];
  };

  for (const w of words) {
    buf.push(w);
    if (isSentenceEnd(w.word)) {
      if (buf.length > MAX_WORDS_PER_CHUNK) {
        // Split oversized sentence at midpoint
        const mid = Math.ceil(buf.length / 2);
        const first = buf.slice(0, mid);
        const second = buf.slice(mid);
        chunks.push({
          words: first,
          text: first.map((x) => x.word).join(' '),
          start: first[0].start,
          end: first[first.length - 1].end,
        });
        chunks.push({
          words: second,
          text: second.map((x) => x.word).join(' '),
          start: second[0].start,
          end: second[second.length - 1].end,
        });
        buf = [];
      } else {
        flush();
      }
    } else if (buf.length >= MAX_WORDS_PER_CHUNK) {
      flush();
    }
  }
  flush();
  return chunks;
}

function parseTranscript(json: Record<string, unknown>): ParsedTranscript {
  if (!json || typeof json !== 'object') return null;
  const words = json.words;
  if (!Array.isArray(words) || !words.length) return null;
  return json as unknown as { text: string; words: Word[] };
}

// ---------------------------------------------------------------------------
// BlinkingCursor
// ---------------------------------------------------------------------------

function BlinkingCursor() {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0,
          duration: CURSOR_BLINK_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: CURSOR_BLINK_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.Text style={[styles.cursor, { opacity }]}>|</Animated.Text>
  );
}

// ---------------------------------------------------------------------------
// CaptionOverlay
// ---------------------------------------------------------------------------

const FADE_RATIO = 0.5;

function PastChunk({ chunk, containerRef, containerH }: {
  chunk: TranscriptChunk;
  containerRef: React.RefObject<View | null>;
  containerH: number;
}) {
  const rowRef = useRef<View>(null);
  const [opacity, setOpacity] = useState(0.55);

  useEffect(() => {
    if (!containerH || !rowRef.current || !containerRef.current) return;
    rowRef.current.measureLayout(containerRef.current as any, (_x, y) => {
      const fadeZone = containerH * FADE_RATIO;
      if (y >= fadeZone) {
        setOpacity(0.55);
      } else if (y <= 0) {
        setOpacity(0);
      } else {
        setOpacity(0.55 * (y / fadeZone));
      }
    }, () => {});
  });

  return (
    <View ref={rowRef} style={[styles.chunkRow, { opacity }]}>
      <View style={styles.chunkBg}>
        <Text style={[styles.chunkText, styles.pastChunkText]}>
          {chunk.text}
        </Text>
      </View>
    </View>
  );
}

function CaptionOverlay({
  transcript,
  currentTime,
}: {
  transcript: ParsedTranscript;
  currentTime: number;
}) {
  const chunks = useMemo(
    () => (transcript ? buildChunks(transcript.words) : []),
    [transcript],
  );
  const containerRef = useRef<View>(null);
  const [containerH, setContainerH] = useState(0);

  if (!chunks.length) return null;

  let activeIdx = chunks.findIndex(
    (c) => currentTime >= c.start && currentTime < c.end,
  );
  if (activeIdx < 0) {
    for (let i = chunks.length - 1; i >= 0; i -= 1) {
      if (currentTime >= chunks[i].start) {
        activeIdx = i;
        break;
      }
    }
  }
  if (activeIdx < 0) return null;

  const activeChunk = chunks[activeIdx];

  const visibleWordCount = activeChunk.words.filter(
    (w) => w.start <= currentTime,
  ).length;

  const pastChunks = chunks.slice(0, activeIdx);

  return (
    <View
      ref={containerRef}
      style={styles.captionContainer}
      pointerEvents="none"
      onLayout={(e) => setContainerH(e.nativeEvent.layout.height)}
    >
      <View style={styles.captionInner}>
        {pastChunks.map((chunk) => (
          <PastChunk
            key={chunk.start}
            chunk={chunk}
            containerRef={containerRef}
            containerH={containerH}
          />
        ))}

        <View style={styles.chunkRow}>
          <View style={styles.chunkBg}>
            <Text style={styles.chunkText}>
              {activeChunk.words.slice(0, visibleWordCount).map((w) => w.word).join(' ')}
              {visibleWordCount > 0 && visibleWordCount < activeChunk.words.length ? ' ' : ''}
              {visibleWordCount > 0 && <BlinkingCursor />}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// ReactionBar
// ---------------------------------------------------------------------------

function ReactionButton({
  emoji,
  onPress,
}: {
  emoji: ReactionEmoji;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.45,
        duration: 120,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 180,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
  };

  return (
    <Pressable onPress={handlePress} hitSlop={6}>
      <Animated.View style={[styles.reactionBtn, { transform: [{ scale }] }]}>
        <Text style={styles.reactionEmoji}>{EMOJI_DISPLAY[emoji]}</Text>
      </Animated.View>
    </Pressable>
  );
}

function ReactionBar({
  postId,
  currentTime,
  onReacted,
}: {
  postId: string;
  currentTime: number;
  onReacted?: () => void;
}) {
  const handleReaction = useCallback(
    (emoji: ReactionEmoji) => {
      void addReaction(postId, emoji, currentTime)
        .then(() => {
          onReacted?.();
        })
        .catch(() => {});
    },
    [postId, currentTime, onReacted],
  );

  return (
    <View style={styles.reactionBar}>
      {REACTION_EMOJIS.map((emoji) => (
        <ReactionButton
          key={emoji}
          emoji={emoji}
          onPress={() => handleReaction(emoji)}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// FeedBackgroundVideo
// ---------------------------------------------------------------------------

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
      .catch(() => {});
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

  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />;
}

// ---------------------------------------------------------------------------
// FeedVideoItem
// ---------------------------------------------------------------------------

function ReactionSummaryBar({
  postId,
  shouldPlay,
  refreshKey,
}: {
  postId: string;
  shouldPlay: boolean;
  refreshKey: number;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<any>();
  const [summary, setSummary] = useState<ReactionSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!shouldPlay) return;
    let cancelled = false;
    setLoading(true);
    void getReactionSummary(postId)
      .then((s) => {
        if (!cancelled) setSummary(s);
      })
      .catch(() => {
        if (!cancelled) setSummary(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [postId, shouldPlay, refreshKey]);

  if (!shouldPlay) return null;

  const topEmojis = summary
    ? Object.entries(summary.emoji_counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([key]) => EMOJI_DISPLAY[key as ReactionEmoji] ?? key)
        .join('')
    : '';

  const countLabel = loading
    ? '…'
    : summary
      ? `${summary.total_reactions} reaction${summary.total_reactions !== 1 ? 's' : ''}`
      : 'View reactions';

  return (
    <Pressable
      style={styles.summaryBar}
      onPress={() =>
        navigation.navigate('Home', {
          screen: 'PostReactions',
          params: { postId },
        })
      }
    >
      {topEmojis ? <Text style={styles.summaryEmojis}>{topEmojis}</Text> : null}
      <Text style={styles.summaryCount}>{countLabel}</Text>
    </Pressable>
  );
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

  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    if (shouldPlay) {
      audioPlayer.play();
    } else {
      audioPlayer.pause();
      setCurrentTime(0);
    }
  }, [audioPlayer, shouldPlay]);

  // Poll audio position for caption sync
  useEffect(() => {
    if (!shouldPlay) return;
    const id = setInterval(() => {
      setCurrentTime(audioPlayer.currentTime ?? 0);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [audioPlayer, shouldPlay]);

  const transcript = useMemo(
    () => parseTranscript(item.transcript_json),
    [item.transcript_json],
  );

  const initial = item.username ? item.username.charAt(0).toUpperCase() : '?';

  const [summaryRefresh, setSummaryRefresh] = useState(0);
  const bumpSummary = useCallback(() => {
    setSummaryRefresh((n) => n + 1);
  }, []);

  return (
    <View style={[styles.page, { height }]}>
      {item.backgroundClip ? (
        <FeedBackgroundVideo clip={item.backgroundClip} shouldPlay={shouldPlay} />
      ) : null}

      {/* Username header – top-left */}
      <View style={styles.userHeader}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarLetter}>{initial}</Text>
        </View>
        <View>
          <Text style={styles.displayName}>{item.username}</Text>
          <Text style={styles.handleText}>@{item.username}</Text>
        </View>
      </View>

      {/* Reaction bar – right side */}
      <ReactionBar postId={item.post_id} currentTime={currentTime} onReacted={bumpSummary} />

      {/* Tappable reaction summary */}
      <ReactionSummaryBar
        postId={item.post_id}
        shouldPlay={shouldPlay}
        refreshKey={summaryRefresh}
      />

      {/* Live captions */}
      <CaptionOverlay transcript={transcript} currentTime={currentTime} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// FeedScreen
// ---------------------------------------------------------------------------

export function FeedScreen() {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const pageHeight = useMemo(
    () => Math.max(windowHeight - insets.bottom, 1),
    [windowHeight, insets.bottom],
  );

  const isFocused = useIsFocused();

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

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, []),
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
      <FeedVideoItem item={item} shouldPlay={isFocused && index === visibleIndex} height={pageHeight} />
    ),
    [isFocused, pageHeight, visibleIndex],
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

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  page: {
    width: '100%',
    backgroundColor: '#000',
  },

  // User header (top-left)
  userHeader: {
    position: 'absolute',
    top: 66,
    left: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 3,
    gap: spacing.md,
  },
  avatarCircle: {
    width: 45,
    height: 45,
    borderRadius: 9999,
    backgroundColor: 'rgba(72,72,72,0.34)',
    borderWidth: 1.27,
    borderColor: '#a8a8a8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 22,
    color: '#fff',
    fontFamily: fontFamily.display,
  },
  displayName: {
    fontSize: 20,
    color: '#fff',
    fontFamily: fontFamily.display,
    lineHeight: 26,
  },
  handleText: {
    fontSize: 13,
    color: '#fff',
    fontFamily: fontFamily.body,
    lineHeight: 18,
  },

  // Caption overlay
  captionContainer: {
    position: 'absolute',
    left: spacing.xxl,
    right: spacing.xxl,
    top: 130,
    bottom: 160,
    zIndex: 2,
    overflow: 'hidden',
  },
  captionInner: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  chunkRow: {
    marginBottom: spacing.lg,
  },
  chunkBg: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: radius.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
  },
  chunkText: {
    fontSize: CAPTION_FONT_SIZE,
    fontWeight: '700',
    fontFamily: fontFamily.display,
    color: '#fff',
    lineHeight: CAPTION_LINE_HEIGHT,
  },
  pastChunkText: {
    color: 'rgba(255,255,255,0.55)',
  },
  cursor: {
    fontSize: CAPTION_FONT_SIZE,
    fontWeight: '200',
    fontFamily: fontFamily.body,
    color: '#fff',
    lineHeight: CAPTION_LINE_HEIGHT,
  },

  // Reaction bar (right side)
  reactionBar: {
    position: 'absolute',
    right: spacing.lg,
    bottom: 170,
    zIndex: 4,
    alignItems: 'center',
    gap: spacing.md,
  },
  reactionBtn: {
    width: 48,
    height: 48,
    borderRadius: 9999,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionEmoji: {
    fontSize: 24,
  },

  // Reaction summary bar (bottom-left, above captions)
  summaryBar: {
    position: 'absolute',
    left: spacing.xl,
    bottom: 120,
    zIndex: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  summaryEmojis: {
    fontSize: 18,
  },
  summaryCount: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: '#fff',
  },

  // Loading / error / empty states
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
