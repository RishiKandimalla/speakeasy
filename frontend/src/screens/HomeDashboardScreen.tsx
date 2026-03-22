import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';

import { SlideOutMenu } from '../components/SlideOutMenu';
import { authColors, fontFamily, radius, spacing } from '../theme';
import { getMyStats, type UserStats } from '../lib/api';

// Module-level cache — survives navigation, cleared on app restart
let cachedStats: UserStats | null = null;

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function todayDayIndex(): number {
  return new Date().getDay(); // 0=Sun … 6=Sat
}

function getWeekStartMonday(): Date {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function buildChartPoints(history: UserStats['weekly_history']): Array<{ left: number; top: number } | null> {
  // Build a map of date string → overall score
  const scoreByDate: Record<string, number> = {};
  for (const entry of history) {
    const score = entry.scores?.overall;
    if (score != null) scoreByDate[entry.date] = score;
  }

  const monday = getWeekStartMonday();
  const CHART_WIDTH = 300; // approximate inner chart width
  const CHART_HEIGHT = 86;
  const PADDING = 20;

  const points: Array<{ left: number; top: number } | null> = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const score = scoreByDate[dateStr];
    if (score == null) {
      points.push(null);
    } else {
      const left = PADDING + (i / 6) * (CHART_WIDTH - PADDING * 2);
      // score 0–100: high score = low top (inverted)
      const top = PADDING + ((100 - score) / 100) * (CHART_HEIGHT - PADDING * 2);
      points.push({ left, top });
    }
  }
  return points;
}

export function HomeDashboardScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const [menuVisible, setMenuVisible] = useState(false);
  // Initialise from cache so the screen renders immediately on re-visits
  const [stats, setStats] = useState<UserStats | null>(cachedStats);
  const [loading, setLoading] = useState(cachedStats === null);

  const fetchStats = useCallback(async (background: boolean) => {
    if (!background) setLoading(true);
    try {
      const data = await getMyStats();
      cachedStats = data;
      setStats(data);
    } catch {
      // On background refresh keep showing cached data; on first load show empty state
      if (!background) setStats(null);
    } finally {
      if (!background) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Already have data — refresh silently in the background
      void fetchStats(cachedStats !== null);
    }, [fetchStats]),
  );

  const isEmpty = !stats || stats.total_sessions === 0;
  const streakDays = stats?.streak_days ?? 0;
  const madeVideoToday = stats?.made_video_today ?? false;
  const avg = stats?.weekly_averages;
  const chartPoints = stats ? buildChartPoints(stats.weekly_history) : [];
  const activeChartPoints = chartPoints.filter((p): p is { left: number; top: number } => p !== null);

  const fillerPct =
    avg?.filler_rate != null ? `${(avg.filler_rate * 100).toFixed(1)}%` : '--';
  const wpmStr = avg?.wpm != null ? String(Math.round(avg.wpm)) : '--';
  const clarityStr =
    avg?.clarity_score != null ? String(Math.round(avg.clarity_score)) : '--';
  const sessionsStr = stats?.total_sessions != null ? String(stats.total_sessions) : '--';

  const currentDayIdx = todayDayIndex(); // 0=Sun

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.root,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Image source={require('../../assets/images/speakeasy_name.png')} style={styles.wordmark} resizeMode="contain" />
          <View style={styles.headerRight}>
            <Pressable hitSlop={8} onPress={() => navigation.navigate('Notifications')}>
              <Ionicons name="notifications-outline" size={22} color="#1F2A16" />
            </Pressable>
            <Pressable hitSlop={8} onPress={() => setMenuVisible(true)}>
              <Ionicons name="menu-outline" size={24} color="#1F2A16" />
            </Pressable>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#678A45" />
          </View>
        ) : (
          <>
            {/* Streak card */}
            <View style={styles.card}>
              <View style={styles.streakHeader}>
                <Text style={styles.streakLabel}>CURRENT STREAK</Text>
                <View style={styles.streakIconWrap}>
                  <Image source={require('../../assets/icons/fire_streak_icon.png')} style={styles.streakIcon} resizeMode="contain" />
                </View>
              </View>
              <View style={styles.streakValueRow}>
                <Text style={[styles.streakNum, isEmpty && styles.emptyNum]}>{streakDays}</Text>
                <Text style={styles.streakDays}>days</Text>
              </View>
              <View style={styles.streakFooter}>
                <Text style={styles.streakMeta}>{isEmpty ? 'Start your streak today!' : 'Keep it going!'}</Text>
              </View>
            </View>

            {/* Daily video card */}
            <View style={styles.card}>
              <Text style={styles.sectionHeading}>Daily video</Text>
              {isEmpty ? (
                <Text style={styles.sectionSubheading}>Record your first video to start building your streak.</Text>
              ) : madeVideoToday ? (
                <>
                  <Text style={styles.sectionSubheading}>Great work keeping your streak going!</Text>
                  <View style={styles.dailyDoneRow}>
                    <View style={styles.doneLeft}>
                      <View style={styles.checkIconWrap}>
                        <Image source={require('../../assets/icons/completion_checkmark_icon.png')} style={styles.checkIcon} resizeMode="contain" />
                      </View>
                      <Text style={styles.doneText}>Daily video completed!</Text>
                    </View>
                    <Text style={styles.reviewLink} onPress={() => navigation.navigate('Profile' as any)}>Review videos</Text>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.sectionSubheading}>Record today's video to keep your streak alive.</Text>
                  <View style={[styles.dailyDoneRow, styles.dailyPendingRow]}>
                    <View style={styles.doneLeft}>
                      <View style={[styles.checkIconWrap, styles.checkIconPending]}>
                        <Ionicons name="videocam-outline" size={14} color="#A9ADBF" />
                      </View>
                      <Text style={[styles.doneText, styles.pendingText]}>No video yet today</Text>
                    </View>
                  </View>
                </>
              )}
            </View>

            {/* Progress chart */}
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.sectionHeading}>Your progress</Text>
                <Text style={styles.sectionHint}>This week</Text>
              </View>
              <View style={styles.chart}>
                {activeChartPoints.length < 2 ? (
                  <View style={styles.emptyChartInner}>
                    <Text style={styles.emptyChartText}>
                      {isEmpty ? 'Record videos to see your progress' : 'More sessions will appear here'}
                    </Text>
                  </View>
                ) : (
                  activeChartPoints.map((p, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.linePoint,
                        { left: p.left, top: p.top },
                        idx === activeChartPoints.length - 1 && styles.activeDotStyle,
                      ]}
                    />
                  ))
                )}
              </View>
              <View style={styles.weekAxis}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => {
                  // Map Mon=0..Sun=6 to JS day index (Mon=1..Sun=0)
                  const jsDay = i === 6 ? 0 : i + 1;
                  return (
                    <Text key={d} style={[styles.weekDay, jsDay === currentDayIdx && styles.weekDayActive]}>
                      {d}
                    </Text>
                  );
                })}
              </View>
            </View>

            {/* Analytics */}
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.sectionHeading}>Recording analytics</Text>
                <Text style={styles.sectionHint}>All time</Text>
              </View>
              <View style={styles.analyticsGrid}>
                <View style={styles.analyticsItem}>
                  <Text style={styles.analyticsLabel}>Avg clarity score</Text>
                  <Text style={[styles.analyticsValue, isEmpty && styles.emptyAnalyticsValue]}>{clarityStr}</Text>
                  <Text style={styles.analyticsSub}>out of 100</Text>
                </View>
                <View style={styles.analyticsItem}>
                  <Text style={styles.analyticsLabel}>Videos recorded</Text>
                  <Text style={[styles.analyticsValue, isEmpty && styles.emptyAnalyticsValue]}>{sessionsStr}</Text>
                  <Text style={styles.analyticsSub}>total</Text>
                </View>
                <View style={styles.analyticsItem}>
                  <Text style={styles.analyticsLabel}>Filler words</Text>
                  <Text style={[styles.analyticsValue, isEmpty ? styles.emptyAnalyticsValue : { color: '#C8842E' }]}>{fillerPct}</Text>
                  <Text style={styles.analyticsSub}>avg this week</Text>
                </View>
                <View style={styles.analyticsItem}>
                  <Text style={styles.analyticsLabel}>Speaking rate</Text>
                  <Text style={[styles.analyticsValue, isEmpty ? styles.emptyAnalyticsValue : { color: '#678A45' }]}>{wpmStr}</Text>
                  <Text style={styles.analyticsSub}>wpm avg</Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
      <SlideOutMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: authColors.background,
  },
  root: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  wordmark: {
    width: 116,
    height: 30,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingBox: {
    paddingTop: 80,
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#FFFFFC',
    borderWidth: 1,
    borderColor: '#DCD8CA',
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  streakHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  streakLabel: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 11,
    letterSpacing: 1.6,
    color: '#A9ADBF',
  },
  streakIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFF6D8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakIcon: {
    width: 26,
    height: 26,
  },
  streakValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  streakNum: {
    fontFamily: fontFamily.playfair,
    fontSize: 48,
    color: '#2E3520',
  },
  emptyNum: {
    color: '#C4CABD',
  },
  streakDays: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: '#99A0B3',
  },
  streakFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  streakMeta: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: '#8F96AC',
  },
  sectionHeading: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 18,
    color: '#1F2A16',
  },
  sectionSubheading: {
    fontFamily: fontFamily.body,
    color: '#A1A8BC',
    fontSize: 12,
    marginBottom: spacing.sm,
  },
  dailyDoneRow: {
    borderWidth: 1,
    borderColor: '#E3E6ED',
    borderRadius: radius.md,
    backgroundColor: '#FCFCF9',
    padding: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dailyPendingRow: {
    backgroundColor: '#FAFAFA',
    borderColor: '#EBEBEB',
  },
  doneLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  checkIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF6E3',
  },
  checkIconPending: {
    backgroundColor: '#F2F2F2',
  },
  checkIcon: {
    width: 16,
    height: 16,
  },
  doneText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: '#1F2A16',
  },
  pendingText: {
    color: '#B0B5C8',
  },
  reviewLink: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 12,
    color: '#3E4537',
    textDecorationLine: 'underline',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionHint: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: '#A2A9BD',
  },
  chart: {
    height: 86,
    borderRadius: radius.md,
    backgroundColor: '#FBFCF8',
    overflow: 'hidden',
    position: 'relative',
    marginBottom: spacing.sm,
  },
  emptyChartInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyChartText: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: '#C0C5D4',
  },
  linePoint: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#58614F',
  },
  activeDotStyle: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#DBDFD4',
    backgroundColor: '#657256',
  },
  weekAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekDay: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: '#A3AAC0',
  },
  weekDayActive: {
    color: '#1F2A16',
    fontFamily: fontFamily.bodyMedium,
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  analyticsItem: {
    width: '48.5%',
    backgroundColor: '#FBFCF8',
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  analyticsLabel: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: '#A5AAC0',
    marginBottom: spacing.xs,
  },
  analyticsValue: {
    fontFamily: fontFamily.playfair,
    fontSize: 40,
    color: '#1F2A16',
    lineHeight: 44,
  },
  emptyAnalyticsValue: {
    color: '#D0D4E0',
    fontSize: 32,
  },
  analyticsSub: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: '#9AA2B8',
  },
});
