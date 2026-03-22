import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';

import {
  EMOJI_DISPLAY,
  getReactionSummary,
  listPostReactions,
  type ReactionEmoji,
  type ReactionItem,
  type ReactionSummary,
} from '../lib/api';
import type { HomeStackParamList } from '../navigation/types';
import { authColors, fontFamily, radius, spacing } from '../theme';

function formatTimestamp(s: number): string {
  const mins = Math.floor(s / 60);
  const secs = Math.round(s % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function PostReactionsScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<HomeStackParamList, 'PostReactions'>>();
  const { postId } = route.params;

  const [reactions, setReactions] = useState<ReactionItem[]>([]);
  const [summary, setSummary] = useState<ReactionSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [r, s] = await Promise.all([
        listPostReactions(postId),
        getReactionSummary(postId),
      ]);
      setReactions(r);
      setSummary(s);
    } catch {
      // keep empty
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    void load();
  }, [load]);

  const emojiEntries = summary
    ? Object.entries(summary.emoji_counts).sort((a, b) => b[1] - a[1])
    : [];

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.md }]}>
      <Text style={styles.title}>Reactions</Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#678A45" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator
        >
          {summary && (
            <View style={styles.summarySection}>
              <View style={styles.statRow}>
                <View style={styles.statPill}>
                  <Text style={styles.statNum}>{summary.total_reactions}</Text>
                  <Text style={styles.statLabel}>total</Text>
                </View>
                <View style={styles.statPill}>
                  <Text style={styles.statNum}>{summary.unique_reactors}</Text>
                  <Text style={styles.statLabel}>unique</Text>
                </View>
              </View>
              <View style={styles.emojiBreakdown}>
                {emojiEntries.map(([key, count]) => (
                  <View key={key} style={styles.emojiPill}>
                    <Text style={styles.emojiPillChar}>
                      {EMOJI_DISPLAY[key as ReactionEmoji] ?? key}
                    </Text>
                    <Text style={styles.emojiPillCount}>{count}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {!reactions.length ? (
            <View style={styles.emptyInline}>
              <Text style={styles.emptyText}>No reactions yet. Send some from the feed.</Text>
            </View>
          ) : (
            <>
              <Text style={styles.everyReactionLabel}>
                Every. Single. Reaction. ({reactions.length})
              </Text>

              {reactions.map((r, i) => (
                <View key={r.reaction_id} style={styles.reactionRow}>
                  <Text style={styles.reactionIndex}>#{i + 1}</Text>
                  <Text style={styles.reactionBigEmoji}>
                    {EMOJI_DISPLAY[r.emoji as ReactionEmoji] ?? r.emoji}
                  </Text>
                  <Text style={styles.reactionTimestamp}>
                    at {formatTimestamp(r.timestamp_s)}
                  </Text>
                </View>
              ))}

              <View style={styles.bottomPadding}>
                <Text style={styles.bottomText}>
                  You scrolled through {reactions.length} reaction{reactions.length !== 1 ? 's' : ''}. Congrats.
                </Text>
              </View>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: authColors.background,
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 28,
    color: '#1F2A16',
    marginBottom: spacing.lg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: fontFamily.body,
    fontSize: 16,
    color: '#A5AAC0',
  },
  emptyInline: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 60,
  },
  summarySection: {
    marginBottom: spacing.xxl,
    gap: spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    backgroundColor: '#EFF3E7',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  statNum: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 22,
    color: '#1F2A16',
  },
  statLabel: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: '#8E95A8',
  },
  emojiBreakdown: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  emojiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFC',
    borderWidth: 1,
    borderColor: '#DDE1EA',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  emojiPillChar: {
    fontSize: 20,
  },
  emojiPillCount: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 14,
    color: '#1F2A16',
  },
  everyReactionLabel: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 16,
    color: '#4D5A37',
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  reactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#EDEEE8',
  },
  reactionIndex: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: '#B8BFAB',
    width: 48,
  },
  reactionBigEmoji: {
    fontSize: 40,
  },
  reactionTimestamp: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: '#8E95A8',
    marginLeft: 'auto',
  },
  bottomPadding: {
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxxl,
    alignItems: 'center',
  },
  bottomText: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: '#B8BFAB',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
