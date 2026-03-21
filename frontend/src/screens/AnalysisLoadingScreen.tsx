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
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.title} numberOfLines={1}>
        Analyzing…
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
  title: {
    ...typography.headline,
    color: colors.textSecondary,
    marginTop: spacing.lg,
  },
});
