import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../theme';

type ScoreBadgeProps = {
  score: number;
  grade: string;
};

export function ScoreBadge({ score, grade }: ScoreBadgeProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.circle}>
        <Text style={styles.score} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
          {score}
        </Text>
      </View>
      <View style={styles.badge}>
        <Text style={styles.grade} numberOfLines={1}>
          {grade}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  circle: {
    width: 120,
    height: 120,
    borderRadius: radius.full,
    borderWidth: 3,
    borderColor: colors.primary,
    backgroundColor: colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  score: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.text,
  },
  badge: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    maxWidth: '90%',
  },
  grade: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.background,
    textAlign: 'center',
  },
});
