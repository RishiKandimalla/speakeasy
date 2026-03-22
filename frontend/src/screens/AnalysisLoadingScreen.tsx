import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { getStubAnalysisResult } from '../lib/stubAnalysis';
import type { HomeStackScreenProps } from '../navigation/types';
import { colors, spacing, typography } from '../theme';

const DELAY_MS = 2000;

export function AnalysisLoadingScreen({
  navigation,
}: HomeStackScreenProps<'AnalysisLoading'>) {
  useEffect(() => {
    const t = setTimeout(() => {
      navigation.replace('AnalysisResults', { result: getStubAnalysisResult() });
    }, DELAY_MS);
    return () => clearTimeout(t);
  }, [navigation]);

  return (
    <View style={styles.root}>
      <View style={styles.badge}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
      <Text style={styles.title} numberOfLines={1}>
        Analyzing your session
      </Text>
      <Text style={styles.sub} numberOfLines={2}>
        We are extracting transcript and generating speaking feedback.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  badge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.headline,
    color: colors.text,
    marginTop: spacing.lg,
  },
  sub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
