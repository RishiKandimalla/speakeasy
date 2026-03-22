import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';

import { NotificationBell } from '../components/NotificationBell';
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

  const weeklyScoreSum = (() => {
    if (!stats?.weekly_history) return null;
    const monday = getWeekStartMonday();
    let sum = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const entry = stats.weekly_history.find(e => e.date === dateStr);
      const score = entry?.scores?.overall;
      if (score != null) sum += score;
    }
    return sum + (stats.weekly_reaction_points ?? 0);
  })();
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
              <NotificationBell />
            </Pressable>
            <Pressable hitSlop={8} onPress={() => setMenuVisible(true)}>
              <Ionicons name="menu-outline" size={24} color="#263103" />
            </Pressable>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#4A5240" />
          </View>
        ) : (
          <>
            {/* Streak card */}
            <View style={styles.card}>
              <View style={styles.streakHeader}>
                <Text style={styles.streakLabel}>Current Streak</Text>
                <View style={styles.streakIconWrap}>
                  <Image source={require('../../assets/icons/streak.png')} style={styles.streakIcon} resizeMode="contain" />
                </View>
              </View>
              <View style={styles.streakValueRow}>
                <Text style={[styles.streakNum, isEmpty && styles.emptyNum]}>{streakDays}</Text>
                <Text style={styles.streakDays}>days</Text>
              </View>
              <View style={styles.streakFooter}>
                <Text style={styles.streakMeta}>Weekly score</Text>
                <View style={styles.weeklyScoreRow}>
                  <Text style={styles.weeklyScorePts}>{weeklyScoreSum != null ? `${weeklyScoreSum} pts` : '-- pts'}</Text>
                  <View style={styles.todayBadge}>
                    <Text style={styles.todayBadgeText}>+68 today</Text>
                  </View>
                </View>
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
                    <Text style={styles.reviewLink} onPress={() => navigation.getParent()?.navigate('Profile')}>
                      Review videos
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.sectionSubheading}>Record today's video to keep your streak alive.</Text>
                  <View style={[styles.dailyDoneRow, styles.dailyPendingRow]}>
                    <View style={styles.doneLeft}>
                      <View style={[styles.checkIconWrap, styles.checkIconPending]}>
                        <Ionicons name="videocam-outline" size={14} color="#9CA3AF" />
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
                <Text style={styles.sectionHeading}>Recording Analytics</Text>
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
                  <Text style={[styles.analyticsValue, isEmpty ? styles.emptyAnalyticsValue : { color: '#854F0B' }]}>{fillerPct}</Text>
                  <Text style={styles.analyticsSub}>avg this week</Text>
                </View>
                <View style={styles.analyticsItem}>
                  <Text style={styles.analyticsLabel}>Speaking rate</Text>
                  <Text style={[styles.analyticsValue, isEmpty ? styles.emptyAnalyticsValue : { color: '#3B6D11' }]}>{wpmStr}</Text>
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
    backgroundColor: '#FFFAE0', // Figma cream background
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
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderWidth: 1.27,
    borderColor: 'rgba(38, 49, 3, 0.18)',
    borderRadius: 16,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.10,
    shadowRadius: 3,
    elevation: 2,
  },
  streakHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  // Figma: "Current Streak" label uses Corben, color #9CA3AF, 14px, capitalize, letterSpacing 0.55
  streakLabel: {
    fontFamily: 'Corben_400Regular',
    fontSize: 14,
    letterSpacing: 0.55,
    color: '#9CA3AF',
    textTransform: 'capitalize',
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
    marginBottom: spacing.sm,
  },
  // Figma: streak number uses Corben 44px, color #4A5240
  streakNum: {
    fontFamily: 'Corben_400Regular',
    fontSize: 44,
    color: '#4A5240',
    lineHeight: 62,
    includeFontPadding: false,
  },
  emptyNum: {
    color: '#C4CABD',
  },
  // Figma: "days" label uses Jost 13px, color #9CA3AF
  streakDays: {
    fontFamily: 'Jost_400Regular',
    fontSize: 13,
    color: '#9CA3AF',
  },
  streakFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0,0,0,0.08)',
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  // Figma: "Weekly score" uses Jost 13px, color #6B7280
  streakMeta: {
    fontFamily: 'Jost_400Regular',
    fontSize: 13,
    color: '#6B7280',
  },
  weeklyScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // Figma: pts text uses Jost 14px medium, color #111827
  weeklyScorePts: {
    fontFamily: 'Jost_500Medium',
    fontSize: 14,
    color: '#111827',
  },
  // Figma: today badge is #EAF3DE pill with green text
  todayBadge: {
    backgroundColor: '#EAF3DE',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  todayBadgeText: {
    fontFamily: 'Jost_500Medium',
    fontSize: 11,
    color: '#3B6D11',
    lineHeight: 16.5,
  },
  // Figma: section headings use Corben 14px, color #111827
  sectionHeading: {
    fontFamily: 'Corben_400Regular',
    fontSize: 14,
    color: '#111827',
    lineHeight: 22,
    marginBottom: 4,
  },
  // Figma: subheading uses Jost 12px, color #9CA3AF
  sectionSubheading: {
    fontFamily: 'Jost_400Regular',
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: spacing.sm,
  },
  dailyDoneRow: {
    borderWidth: 1.27,
    borderColor: 'rgba(0,0,0,0.08)',
    borderRadius: 14,
    backgroundColor: '#F7F8F4',
    padding: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dailyPendingRow: {
    backgroundColor: '#F7F8F4',
    borderColor: 'rgba(0,0,0,0.08)',
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
    backgroundColor: '#EAF3DE',
  },
  checkIconPending: {
    backgroundColor: '#EAF3DE',
  },
  checkIcon: {
    width: 16,
    height: 16,
  },
  // Figma: done text uses Corben 13px, color #111827
  doneText: {
    fontFamily: 'Corben_400Regular',
    fontSize: 13,
    color: '#111827',
  },
  pendingText: {
    color: '#9CA3AF',
  },
  // Figma: "Review videos" uses Jost 13px medium, color #4A5240, underline
  reviewLink: {
    fontFamily: 'Jost_500Medium',
    fontSize: 13,
    color: '#4A5240',
    textDecorationLine: 'underline',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  // Figma: "All time" hint uses Corben 11px, color #9CA3AF
  sectionHint: {
    fontFamily: 'Corben_400Regular',
    fontSize: 11,
    color: '#9CA3AF',
  },
  chart: {
    height: 86,
    borderRadius: radius.md,
    backgroundColor: '#F7F8F4',
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
    fontFamily: 'Jost_400Regular',
    fontSize: 12,
    color: '#C0C5D4',
  },
  linePoint: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#4A5240',
  },
  activeDotStyle: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#DBDFD4',
    backgroundColor: '#639922',
  },
  weekAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  // Figma: week days use Jost 13px, color #9CA3AF (muted)
  weekDay: {
    fontFamily: 'Jost_400Regular',
    fontSize: 12,
    color: '#9CA3AF',
  },
  weekDayActive: {
    color: '#111827',
    fontFamily: 'Jost_500Medium',
  },
  // Most recent section label
  sectionLabel: {
    fontFamily: 'Corben_400Regular',
    fontSize: 11,
    color: '#9CA4AF',
    textTransform: 'uppercase',
    letterSpacing: 0.55,
    marginBottom: spacing.xs,
  },
  // Video thumbnail
  videoThumb: {
    height: 173,
    borderRadius: 10,
    backgroundColor: '#2E2E23',
    marginBottom: spacing.sm,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  playBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.40)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.60)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  durationText: {
    fontFamily: 'Jost_500Medium',
    fontSize: 11,
    color: 'white',
    lineHeight: 16.5,
  },
  // Figma: recording title uses Corben 14px, color #111827
  recordingTitle: {
    fontFamily: 'Corben_400Regular',
    fontSize: 14,
    color: '#111827',
    lineHeight: 21,
    marginBottom: 2,
  },
  // Figma: recording date uses Jost 11px, color #9CA3AF
  recordingDate: {
    fontFamily: 'Jost_400Regular',
    fontSize: 11,
    color: '#9CA3AF',
    lineHeight: 16.5,
    marginBottom: spacing.sm,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F7F8F4',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagDot: {
    width: 5,
    height: 5,
    borderRadius: 999,
  },
  // Figma: tag text uses Jost 11px, color #6B7280
  tagText: {
    fontFamily: 'Jost_400Regular',
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 16.5,
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  analyticsItem: {
    width: '48.5%',
    backgroundColor: '#F7F8F4',
    borderRadius: 10,
    padding: spacing.sm,
  },
  // Figma: analytics label uses Jost 11px, color #9CA3AF
  analyticsLabel: {
    fontFamily: 'Jost_400Regular',
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: spacing.xs,
  },
  // Figma: analytics value uses Corben 26px, color #111827
  analyticsValue: {
    fontFamily: 'Corben_400Regular',
    fontSize: 26,
    color: '#111827',
    lineHeight: 38,
    includeFontPadding: false,
  },
  emptyAnalyticsValue: {
    color: '#D0D4E0',
    fontSize: 26,
  },
  // Figma: analytics sub uses Jost 11px, color #9CA3AF
  analyticsSub: {
    fontFamily: 'Jost_400Regular',
    fontSize: 11,
    color: '#9CA3AF',
  },
});