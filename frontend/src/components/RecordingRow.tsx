import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { RecordingCardItem } from '../types/analysis';
import { colors, radius, spacing, typography } from '../theme';

type RecordingRowProps = {
  item: RecordingCardItem;
  index: number;
};

function Chip({ children }: { children: ReactNode }) {
  return <View style={styles.chip}>{children}</View>;
}

function hasAnalysisMetrics(item: RecordingCardItem): boolean {
  return (
    item.fillerWordCount != null &&
    item.wpm != null &&
    item.clarityScore != null
  );
}

export function RecordingRow({ item, index }: RecordingRowProps) {
  const badgeLabel = String(index + 1);
  const showMetrics = hasAnalysisMetrics(item);

  return (
    <View style={styles.card}>
      <View style={styles.rowTop}>
        <View style={styles.thumb} accessibilityLabel={`Recording ${badgeLabel}`}>
          <Text style={styles.thumbText} numberOfLines={1}>
            {badgeLabel}
          </Text>
        </View>
        <View style={styles.mainCol}>
          <Text style={styles.title} numberOfLines={2} ellipsizeMode="middle">
            {item.title}
          </Text>
          <View style={styles.chipRow}>
            <Chip>
              <View style={styles.chipInner}>
                <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                <Text style={styles.chipText} numberOfLines={1}>
                  {item.timestampLabel}
                </Text>
              </View>
            </Chip>
            {showMetrics && (
              <>
                <Chip>
                  <Text style={styles.chipText} numberOfLines={1}>
                    {item.fillerWordCount} filler
                  </Text>
                </Chip>
                <Chip>
                  <Text style={styles.chipText} numberOfLines={1}>
                    {item.wpm} wpm
                  </Text>
                </Chip>
              </>
            )}
          </View>
        </View>
        {showMetrics && (
          <View style={styles.scoreCol}>
            <Text style={styles.scoreNum} numberOfLines={1}>
              {item.clarityScore}
            </Text>
            <Text style={styles.scoreLabel} numberOfLines={1}>
              Clarity
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
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
  title: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.cardElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    maxWidth: '100%',
  },
  chipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '100%',
  },
  chipText: {
    ...typography.caption,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  scoreCol: {
    alignItems: 'flex-end',
    minWidth: 48,
    flexShrink: 0,
  },
  scoreNum: {
    ...typography.metric,
    fontSize: 22,
    color: colors.text,
  },
  scoreLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
