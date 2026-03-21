import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../theme';

type StatCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  footer: string;
};

export function StatCard({ icon, label, value, footer }: StatCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.iconWrap} accessibilityLabel="">
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <View style={styles.textCol}>
        <Text style={styles.label} numberOfLines={2} ellipsizeMode="tail">
          {label}
        </Text>
        <Text style={styles.value} numberOfLines={1}>
          {value}
        </Text>
        <Text style={styles.footer} numberOfLines={2} ellipsizeMode="tail">
          {footer}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  value: {
    ...typography.metric,
    color: colors.text,
  },
  footer: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
