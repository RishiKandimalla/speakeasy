import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { HomeStackScreenProps } from '../navigation/types';
import type { AnalysisResult, Sentence } from '../types/analysis';
import { colors, radius, spacing, typography } from '../theme';

// ── helpers ───────────────────────────────────────────────────────────────────

function fmt(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function FeedItem({
  timestamp,
  text,
  active,
}: {
  timestamp: string;
  text: string;
  active: boolean;
}) {
  return (
    <View style={[feed.row, active && feed.rowActive]}>
      <Text style={[feed.ts, active && feed.tsActive]}>{timestamp}</Text>
      <Text style={[feed.text, active && feed.textActive]} numberOfLines={3}>
        {text}
      </Text>
    </View>
  );
}

const feed = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowActive: {
    backgroundColor: 'rgba(69,227,164,0.07)',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingLeft: spacing.lg - 3,
  },
  ts: { ...typography.caption, color: colors.textMuted, width: 36, paddingTop: 2 },
  tsActive: { color: colors.primary },
  text: { ...typography.body, color: colors.textSecondary, flex: 1, fontSize: 15 },
  textActive: { color: colors.text },
});

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={sh.wrap}>
      <Text style={sh.title}>{title}</Text>
      {sub && <Text style={sh.sub}>{sub}</Text>}
    </View>
  );
}

const sh = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  title: { ...typography.headline, color: colors.text, fontSize: 17 },
  sub: {
    ...typography.caption,
    color: colors.primary,
    backgroundColor: 'rgba(69,227,164,0.12)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
});

// ── live analytics bar ────────────────────────────────────────────────────────

function LiveBar({
  sentence,
  index,
  sentenceTone,
}: {
  sentence: Sentence | null;
  index: number;
  sentenceTone: import('../types/analysis').SentenceTone;
}) {
  const wpm = sentence?.wpm ?? 0;
  const conf = sentenceTone?.confidence ?? sentence?.tone?.confidence ?? null;
  const energy = sentenceTone?.energy ?? sentence?.tone?.energy ?? null;

  const wpmPct = clamp((wpm / 200) * 100, 0, 100);
  const confPct = conf != null ? clamp(conf * 100, 0, 100) : null;
  const energyPct = energy != null ? clamp(energy * 100, 0, 100) : null;

  const wpmColor =
    wpm < 100 || wpm > 180 ? colors.warning : colors.primary;

  return (
    <View style={lb.wrap}>
      <View style={lb.bar}>
        <Text style={lb.barLabel}>Pace</Text>
        <View style={lb.track}>
          <View style={[lb.fill, { width: `${wpmPct}%` as any, backgroundColor: wpmColor }]} />
        </View>
        <Text style={[lb.barVal, { color: wpmColor }]}>{wpm > 0 ? `${Math.round(wpm)} wpm` : '—'}</Text>
      </View>
      <View style={lb.bar}>
        <Text style={lb.barLabel}>Confidence</Text>
        <View style={lb.track}>
          <View style={[lb.fill, { width: `${confPct ?? 0}%` as any, backgroundColor: colors.info }]} />
        </View>
        <Text style={[lb.barVal, { color: colors.info }]}>{confPct != null ? `${Math.round(confPct)}%` : '—'}</Text>
      </View>
    </View>
  );
}

const lb = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  bar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  barLabel: { ...typography.caption, color: colors.textMuted, width: 72 },
  track: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 2 },
  barVal: { ...typography.caption, width: 54, textAlign: 'right' },
});

// ── main screen ───────────────────────────────────────────────────────────────

export function AnalysisResultsScreen({
  navigation,
  route,
}: HomeStackScreenProps<'AnalysisResults'>) {
  const insets = useSafeAreaInsets();
  const result: AnalysisResult = route.params.result;

  const videoUri = result.assets?.edited_video ?? result.assets?.audio ?? null;
  const sentences: Sentence[] = result.metrics?.sentences ?? [];

  const player = useVideoPlayer(videoUri ?? '', (p) => {
    p.loop = false;
    p.allowsExternalPlayback = false;
  });

  const [currentTime, setCurrentTime] = useState(0);
  const [isLockedUntilEnd, setIsLockedUntilEnd] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const itemYMap = useRef<Record<number, number>>({});

  // Auto-play video when it's ready
  useEffect(() => {
    if (videoUri && player) {
      player.play();
    }
  }, [player, videoUri]);

  // Poll video position every 300ms
  useEffect(() => {
    if (!videoUri) return;
    const id = setInterval(() => {
      setCurrentTime(player.currentTime ?? 0);
    }, 300);
    return () => clearInterval(id);
  }, [player, videoUri]);

  // If we were navigated here directly from analysis, lock the "view results"
  // action until the user has watched to the end of the video once.
  useEffect(() => {
    const fromAnalysis = (route.params as any)?.fromAnalysis ?? false;
    if (fromAnalysis && videoUri) {
      setIsLockedUntilEnd(true);
    }
  }, [route.params, videoUri]);

  // Find active sentence index
  const activeSentenceIdx = sentences.findIndex(
    (s) => currentTime >= s.start && currentTime < s.end,
  );
  const activeSentence = activeSentenceIdx >= 0 ? sentences[activeSentenceIdx] : null;

  // Auto-scroll feed to keep active sentence tip visible
  const prevActiveIdx = useRef(-1);
  useEffect(() => {
    if (activeSentenceIdx < 0 || activeSentenceIdx === prevActiveIdx.current) return;
    prevActiveIdx.current = activeSentenceIdx;
    const y = itemYMap.current[activeSentenceIdx];
    if (y != null) {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 60), animated: true });
    }
  }, [activeSentenceIdx]);

  // Check if video has been watched to the end
  const hasWatchedToEnd = isLockedUntilEnd
    ? (player.currentTime ?? currentTime ?? 0) + 0.5 >= (player.duration ?? result.metrics?.duration ?? 0)
    : true;

  const goToSummary = useCallback(() => {
    if (!hasWatchedToEnd) return;
    navigation.navigate('AnalysisSummary', { result });
  }, [navigation, result, hasWatchedToEnd]);

  return (
    <View style={styles.root}>
      {/* Video */}
      {videoUri ? (
        <View style={styles.videoOuter}>
          <View style={styles.videoWrap}>
            <VideoView player={player} style={styles.video} nativeControls={false} />
          </View>
        </View>
      ) : (
        <View style={styles.noVideo}>
          <Ionicons name="videocam-off-outline" size={28} color={colors.textMuted} />
          <Text style={styles.noVideoText}>No video available</Text>
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Live analytics header */}
        <SectionHeader title="Live analytics" />

        <LiveBar
          sentence={activeSentence}
          index={activeSentenceIdx}
          sentenceTone={activeSentenceIdx >= 0 ? (result.tone?.sentences_tone[activeSentenceIdx] ?? null) : null}
        />

        {/* Live feedback feed */}
        <SectionHeader title="Live feedback from AI" sub="Synced to video" />

        <View style={styles.feedWrap}>
          {sentences.map((s, i) => {
            const tip = s.tip;
            if (!tip) return null;
            return (
              <View
                key={i}
                onLayout={(e) => { itemYMap.current[i] = e.nativeEvent.layout.y; }}
              >
                <FeedItem
                  timestamp={fmt(s.start)}
                  text={tip}
                  active={i === activeSentenceIdx}
                />
              </View>
            );
          })}
        </View>

        <Pressable
          style={[styles.skipBtn, hasWatchedToEnd ? styles.skipBtnEnabled : styles.skipBtnDisabled]}
          onPress={goToSummary}
          disabled={!hasWatchedToEnd}
        >
          <Text style={[styles.skipText, hasWatchedToEnd ? styles.skipTextEnabled : styles.skipTextDisabled]}>
            {!hasWatchedToEnd ? 'Watch full video to view results' : 'View results'}
          </Text>
          {hasWatchedToEnd && <Ionicons name="chevron-forward" size={14} color={colors.background} />}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  videoOuter: {
    width: '100%',
    backgroundColor: colors.surface,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
  },
  videoWrap: {
    height: 360,
    aspectRatio: 9 / 16,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  video: { width: '100%', height: '100%' },
  noVideo: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  noVideoText: { ...typography.caption, color: colors.textMuted },
  scroll: { flex: 1 },
  feedWrap: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderTopWidth: 0,
    borderTopColor: 'transparent',
  },
  skipBtnDisabled: { 
    opacity: 0.5,
    backgroundColor: colors.card,
  },
  skipBtnEnabled: {
    backgroundColor: colors.primary,
  },
  skipText: { ...typography.caption, color: colors.textMuted, fontWeight: '500' },
  skipTextDisabled: { color: colors.textMuted },
  skipTextEnabled: { color: colors.background, fontWeight: '600' },
});
