import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import type { DimensionValue } from 'react-native';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScoreBadge } from '../components/ScoreBadge';
import { buildInstagramCaption, getStubAnalysisResult } from '../lib/stubAnalysis';
import type { HomeStackScreenProps } from '../navigation/types';
import type { AnalysisResult } from '../types/analysis';
import { colors, radius, spacing, typography } from '../theme';

function MetricCard({
  icon,
  title,
  value,
  sub,
  barPct,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: string;
  sub: string;
  barPct: number;
}) {
  const width = `${Math.min(100, Math.max(0, barPct))}%` as DimensionValue;
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricTop}>
        <Ionicons name={icon} size={22} color={colors.primary} style={styles.metricIcon} />
        <View style={styles.metricTextCol}>
          <Text style={styles.metricTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.metricValue} numberOfLines={1}>
            {value}
          </Text>
          <Text style={styles.metricSub} numberOfLines={2} ellipsizeMode="tail">
            {sub}
          </Text>
        </View>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width }]} />
      </View>
    </View>
  );
}

function renderTranscript(result: AnalysisResult) {
  const fillers = result.fillerWordsInTranscript.filter(Boolean);
  if (fillers.length === 0) {
    return (
      <Text style={styles.transcriptText} selectable>
        {result.transcript}
      </Text>
    );
  }
  const pattern = new RegExp(
    `(${fillers.map((f) => f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'gi',
  );
  const parts = result.transcript.split(pattern);
  return (
    <Text style={styles.transcriptText} selectable>
      {parts.map((part, i) => {
        const isFiller = fillers.some(
          (f) => f.toLowerCase() === part.toLowerCase(),
        );
        if (isFiller) {
          return (
            <Text key={`${i}-${part}`} style={styles.fillerHighlight}>
              {part}
            </Text>
          );
        }
        return <Text key={`${i}-${part}`}>{part}</Text>;
      })}
    </Text>
  );
}

export function AnalysisResultsScreen({
  navigation,
  route,
}: HomeStackScreenProps<'AnalysisResults'>) {
  const insets = useSafeAreaInsets();
  const result = route.params?.result ?? getStubAnalysisResult();
  const defaultCaption = useMemo(() => buildInstagramCaption(result), [result]);
  const [caption, setCaption] = useState(defaultCaption);

  const copyCaption = useCallback(async () => {
    await Clipboard.setStringAsync(caption);
    Alert.alert('Copied', 'Caption copied.');
  }, [caption]);

  const done = useCallback(() => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'HomeDashboard' }],
    });
  }, [navigation]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={{
        padding: spacing.lg,
        paddingBottom: insets.bottom + spacing.xxl,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.trophyRow}>
        <Ionicons name="trophy" size={28} color={colors.primary} />
      </View>
      <Text style={styles.pageTitle} numberOfLines={2}>
        Analysis complete
      </Text>

      <Text style={styles.scoreLabel} numberOfLines={1}>
        Clarity score
      </Text>
      <ScoreBadge score={result.clarityScore} grade={result.grade} />

      <MetricCard
        icon="chatbubble-outline"
        title="Filler words"
        value={String(result.fillerWords.count)}
        sub={`${result.fillerWords.percentage}% of words`}
        barPct={Math.min(100, result.fillerWords.percentage * 20)}
      />
      <MetricCard
        icon="time-outline"
        title="Pause time"
        value={`${result.pauseTime.total}s`}
        sub={`Avg ${result.pauseTime.average}s`}
        barPct={50}
      />
      <MetricCard
        icon="flash-outline"
        title="Speaking rate"
        value={String(result.speakingRate.wpm)}
        sub="Words per minute"
        barPct={Math.min(100, (result.speakingRate.wpm / 200) * 100)}
      />

      <Text style={styles.sectionTitle} numberOfLines={1}>
        Feedback
      </Text>
      {result.feedback.map((f, idx) => (
        <View key={idx} style={styles.feedbackRow}>
          <View style={styles.feedbackDot} />
          <Text style={styles.feedbackText} numberOfLines={4}>
            {f.text}
          </Text>
        </View>
      ))}

      <Text style={styles.sectionTitle} numberOfLines={1}>
        Transcript
      </Text>
      <View style={styles.transcriptBox}>{renderTranscript(result)}</View>

      <Text style={styles.sectionTitle} numberOfLines={1}>
        Share
      </Text>
      <View style={styles.captionHeader}>
        <Text style={styles.captionLabel} numberOfLines={1}>
          Caption
        </Text>
        <Pressable onPress={() => void copyCaption()} hitSlop={8}>
          <Text style={styles.copyLink} numberOfLines={1}>
            Copy
          </Text>
        </Pressable>
      </View>
      <TextInput
        style={styles.captionInput}
        value={caption}
        onChangeText={setCaption}
        multiline
        placeholderTextColor={colors.textMuted}
        placeholder="Caption"
      />

      <Pressable style={styles.primaryBtn} onPress={() => Alert.alert('Instagram', 'Stub: post later.')}>
        <Ionicons name="logo-instagram" size={22} color={colors.background} />
        <Text style={styles.primaryBtnText} numberOfLines={1}>
          Post to Instagram
        </Text>
      </Pressable>

      <Pressable style={styles.secondaryBtn} onPress={done}>
        <Ionicons name="archive-outline" size={20} color={colors.primary} />
        <Text style={styles.secondaryBtnText} numberOfLines={1}>
          Save for later
        </Text>
      </Pressable>

      <Pressable style={styles.textBtn} onPress={done}>
        <Text style={styles.textBtnLabel} numberOfLines={1}>
          Back to home
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  trophyRow: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  pageTitle: {
    ...typography.title,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  scoreLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  metricCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  metricTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  metricIcon: {
    marginTop: 2,
    flexShrink: 0,
  },
  metricTextCol: {
    flex: 1,
    minWidth: 0,
  },
  metricTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  metricValue: {
    ...typography.headline,
    fontSize: 20,
    color: colors.text,
  },
  metricSub: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.cardElevated,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  sectionTitle: {
    ...typography.headline,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  feedbackDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 6,
    flexShrink: 0,
  },
  feedbackText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
    minWidth: 0,
  },
  transcriptBox: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  transcriptText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  fillerHighlight: {
    backgroundColor: 'rgba(126, 203, 161, 0.35)',
    color: colors.text,
  },
  captionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  captionLabel: {
    ...typography.caption,
    color: colors.textMuted,
    flex: 1,
    minWidth: 0,
  },
  copyLink: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    flexShrink: 0,
  },
  captionInput: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 88,
    textAlignVertical: 'top',
    marginBottom: spacing.lg,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  primaryBtnText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.background,
    flexShrink: 1,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  secondaryBtnText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.primary,
    flexShrink: 1,
  },
  textBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  textBtnLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
