import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StatCard } from '../components/StatCard';
import { useAuth } from '../context/AuthContext';
import { getStubDashboardStats } from '../lib/stubAnalysis';
import { listSavedVideos } from '../lib/savedVideos';
import type { HomeStackParamList } from '../navigation/types';
import { colors, radius, spacing, typography } from '../theme';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'HomeDashboard'>;

export function HomeDashboardScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { user, signOut } = useAuth();
  const stats = getStubDashboardStats();
  const [totalVideos, setTotalVideos] = useState(stats.totalVideos);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
    } catch {
      Alert.alert('Error', 'Failed to sign out');
    }
  }, [signOut]);

  const refreshTotalVideos = useCallback(async () => {
    if (Platform.OS === 'web') {
      setTotalVideos(0);
      return;
    }
    try {
      const list = await listSavedVideos();
      setTotalVideos(list.length);
    } catch {
      setTotalVideos(stats.totalVideos);
    }
  }, [stats.totalVideos]);

  useFocusEffect(
    useCallback(() => {
      void refreshTotalVideos();
    }, [refreshTotalVideos]),
  );

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.root,
        { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.brand} numberOfLines={1}>
          Speakeasy
        </Text>
        <View style={styles.headerRight}>
          <Pressable
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Profile"
            style={styles.iconBtn}
            onPress={() => Alert.alert('Account', user?.email ?? 'Unknown')}
          >
            <Ionicons name="person-circle-outline" size={28} color={colors.textSecondary} />
          </Pressable>
          <Pressable
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Log out"
            style={styles.iconBtn}
            onPress={handleSignOut}
          >
            <Ionicons name="log-out-outline" size={24} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      <Pressable
        style={styles.hero}
        onPress={() => navigation.navigate('CreateVideo')}
        accessibilityRole="button"
        accessibilityLabel="Record new video"
      >
        <View style={styles.heroTextCol}>
          <Text style={styles.heroTitle} numberOfLines={2}>
            Record new video
          </Text>
          <Text style={styles.heroSub} numberOfLines={2}>
            Practice and get feedback
          </Text>
        </View>
        <View style={styles.heroPlus}>
          <Ionicons name="add" size={32} color={colors.background} />
        </View>
      </Pressable>

      <Text style={styles.sectionTitle} numberOfLines={1}>
        Your progress
      </Text>
      <StatCard
        icon="trending-up-outline"
        label="Total videos"
        value={totalVideos}
        footer="Recordings analyzed"
      />
      <StatCard
        icon="chatbubble-ellipses-outline"
        label="Avg filler words"
        value={stats.avgFillerWords}
        footer="Per video"
      />
      <StatCard
        icon="ribbon-outline"
        label="Clarity score"
        value={stats.avgClarityScore}
        footer="Average score"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  root: {
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  brand: {
    ...typography.title,
    fontSize: 24,
    color: colors.text,
    flex: 1,
    minWidth: 0,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 0,
  },
  iconBtn: {
    padding: spacing.xs,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardElevated,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primary,
    gap: spacing.md,
  },
  heroTextCol: {
    flex: 1,
    minWidth: 0,
  },
  heroTitle: {
    ...typography.title,
    color: colors.text,
  },
  heroSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  heroPlus: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sectionTitle: {
    ...typography.headline,
    color: colors.text,
    marginBottom: spacing.md,
  },
});
