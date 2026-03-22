import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { SlideOutMenu } from '../components/SlideOutMenu';
import { authColors, fontFamily, radius, spacing } from '../theme';
import { getMyStats, listJobs, type JobSummary, type UserStats } from '../lib/api';
import type { Metrics } from '../types/analysis';

// Module-level caches — survive navigation, cleared on app restart
let cachedStats: UserStats | null = null;
let cachedJobs: JobSummary[] | null = null;

const WEEKDAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay(); // 0=Sun
}

function buildCalendarRows(year: number, month: number, daysWithVideos: Set<number>, today: { year: number; month: number; day: number }) {
  const totalDays = daysInMonth(year, month);
  const offset = firstDayOfMonth(year, month);
  const cells: Array<{ day: number | null; hasVideo: boolean; isToday: boolean }> = [];

  for (let i = 0; i < offset; i++) cells.push({ day: null, hasVideo: false, isToday: false });
  for (let d = 1; d <= totalDays; d++) {
    const isToday = year === today.year && month === today.month && d === today.day;
    cells.push({ day: d, hasVideo: daysWithVideos.has(d), isToday });
  }
  // Pad to complete final row
  while (cells.length % 7 !== 0) cells.push({ day: null, hasVideo: false, isToday: false });

  const rows: typeof cells[] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

function buildChartPoints(history: UserStats['weekly_history']): Array<{ left: number; top: number } | null> {
  const scoreByDate: Record<string, number> = {};
  for (const entry of history) {
    const score = entry.scores?.overall;
    if (score != null) scoreByDate[entry.date] = score;
  }

  const today = new Date();
  const dayOfWeek = today.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  monday.setHours(0, 0, 0, 0);

  const CHART_WIDTH = 300;
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
      const top = PADDING + ((100 - score) / 100) * (CHART_HEIGHT - PADDING * 2);
      points.push({ left, top });
    }
  }
  return points;
}

function avg(nums: number[]): number | null {
  const valid = nums.filter((n) => n != null && !isNaN(n));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

export function MetricsScreen() {
  const insets = useSafeAreaInsets();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<any>();
  const [menuVisible, setMenuVisible] = useState(false);
  const [stats, setStats] = useState<UserStats | null>(cachedStats);
  const [jobs, setJobs] = useState<JobSummary[]>(cachedJobs ?? []);
  const [loading, setLoading] = useState(cachedStats === null);

  const todayDate = new Date();
  const today = { year: todayDate.getFullYear(), month: todayDate.getMonth(), day: todayDate.getDate() };

  const [viewYear, setViewYear] = useState(today.year);
  const [viewMonth, setViewMonth] = useState(today.month);

  const fetchData = useCallback(async (background: boolean) => {
    if (!background) setLoading(true);
    try {
      const [statsData, jobsData] = await Promise.all([getMyStats(), listJobs(100)]);
      cachedStats = statsData;
      cachedJobs = jobsData;
      setStats(statsData);
      setJobs(jobsData);
    } catch {
      if (!background) { setStats(null); setJobs([]); }
    } finally {
      if (!background) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchData(cachedStats !== null);
    }, [fetchData]),
  );

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  // Build set of days with videos for the viewed month
  const daysWithVideos = new Set<number>();
  for (const job of jobs) {
    if (job.status !== 'completed') continue;
    const d = new Date(job.created_at);
    if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
      daysWithVideos.add(d.getDate());
    }
  }
  const calendarRows = buildCalendarRows(viewYear, viewMonth, daysWithVideos, today);

  // Monthly stats from jobs in current calendar month
  const monthJobs = jobs.filter((j) => {
    if (j.status !== 'completed') return false;
    const d = new Date(j.created_at);
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
  });
  const monthVideoCount = monthJobs.length;
  const monthAvgScore = avg(monthJobs.map((j) => j.scores?.['overall'] ?? NaN));
  const monthAvgClarity = avg(monthJobs.map((j) => j.scores?.['clarity'] ?? NaN));
  const monthAvgFillerCount = avg(monthJobs.map((j) => {
    const m = j.metrics as Metrics | null;
    return m?.filler_count ?? NaN;
  }));
  const monthAvgWpm = avg(monthJobs.map((j) => {
    const m = j.metrics as Metrics | null;
    return m?.wpm ?? NaN;
  }));

  const streakDays = stats?.streak_days ?? 0;

  const chartPoints = stats ? buildChartPoints(stats.weekly_history) : [];
  const activeChartPoints = chartPoints.filter((p): p is { left: number; top: number } => p !== null);

  const currentDayIdx = todayDate.getDay();

  // Derived display values
  const clarityScore = monthAvgClarity != null ? Math.round(monthAvgClarity) : null;
  const clarityPct = clarityScore != null ? clarityScore / 100 : 0;
  const fillerPerVideo = monthAvgFillerCount != null ? Math.round(monthAvgFillerCount) : null;
  const fillerPct = fillerPerVideo != null ? Math.min(fillerPerVideo / 20, 1) : 0; // cap at 20 for bar scale
  const wpmValue = monthAvgWpm != null ? Math.round(monthAvgWpm) : null;
  const wpmPct = wpmValue != null ? Math.min(wpmValue / 200, 1) : 0; // cap at 200 for bar scale

  const avgScoreStr = monthAvgScore != null ? String(Math.round(monthAvgScore)) : '--';
  const clarityStr = clarityScore != null ? `${clarityScore} / 100` : '-- / 100';
  const fillerStr = fillerPerVideo != null ? `${fillerPerVideo} / video` : '--';
  const wpmStr = wpmValue != null ? `${wpmValue} wpm` : '--';

  return (
    <>
      <ScrollView
        style={styles.root}
        contentContainerStyle={{
          paddingTop: insets.top + spacing.md,
          paddingBottom: insets.bottom + spacing.xxl,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Image source={require('../../assets/images/speakeasy_name.png')} style={styles.wordmark} resizeMode="contain" />
          <View style={styles.headerIcons}>
            <Pressable hitSlop={8} onPress={() => navigation.navigate('Home', { screen: 'Notifications' })}>
              <Ionicons name="notifications-outline" size={22} color="#1F2A16" />
            </Pressable>
            <Pressable hitSlop={8} onPress={() => setMenuVisible(true)}>
              <Ionicons name="menu-outline" size={24} color="#1F2A16" />
            </Pressable>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#665672" />
          </View>
        ) : (
          <>
            {/* Calendar Section */}
            <Text style={styles.sectionTitle}>CALENDAR</Text>
            <View style={styles.card}>
              {/* Month nav */}
              <View style={styles.monthHeader}>
                <Pressable hitSlop={12} onPress={prevMonth}>
                  <Text style={styles.monthNav}>← Prev</Text>
                </Pressable>
                <Text style={styles.monthText}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
                <Pressable hitSlop={12} onPress={nextMonth}>
                  <Text style={styles.monthNav}>Next →</Text>
                </Pressable>
              </View>

              {/* Weekday labels */}
              <View style={styles.weekHeader}>
                {WEEKDAY_LABELS.map((day) => (
                  <View key={day} style={styles.weekSlot}>
                    <Text style={styles.weekLabel}>{day}</Text>
                  </View>
                ))}
              </View>

              {/* Calendar grid */}
              <View style={styles.calendarGrid}>
                {calendarRows.map((row, rowIndex) => (
                  <View key={rowIndex} style={styles.calendarRow}>
                    {row.map((cell, idx) => (
                      <View key={`${rowIndex}-${idx}`} style={styles.daySlot}>
                        <View style={[
                          styles.dayCell,
                          cell.day !== null && !cell.hasVideo && !cell.isToday && styles.dayCellEmpty,
                          cell.hasVideo && !cell.isToday && styles.dayCellHasVideo,
                          cell.isToday && styles.dayCellToday,
                        ]}>
                          {cell.day !== null && (
                            <>
                              <Text style={[styles.dayLabel, cell.isToday && styles.dayLabelToday]}>
                                {cell.day}
                              </Text>
                              {(cell.hasVideo || cell.isToday) && (
                                <View style={[styles.dayDot, cell.isToday && styles.dayDotToday]} />
                              )}
                            </>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                ))}
              </View>

              {/* Legend */}
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendSwatch, styles.legendSwatchVideo]} />
                  <Text style={styles.legendText}>Video saved</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendSwatch, styles.legendSwatchToday]} />
                  <Text style={styles.legendText}>Today</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendSwatch, styles.legendSwatchNone]} />
                  <Text style={styles.legendText}>No video</Text>
                </View>
              </View>
            </View>

            {/* Timeline Section */}
            <Text style={styles.sectionTitle}>TIMELINE</Text>
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardHeading}>Your progress</Text>
                <Text style={styles.cardHint}>This week</Text>
              </View>
              <View style={styles.chart}>
                {activeChartPoints.length < 2 ? (
                  <View style={styles.emptyChartInner}>
                    <Text style={styles.emptyChartText}>Record videos to see your progress</Text>
                  </View>
                ) : (
                  activeChartPoints.map((p, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.linePoint,
                        { left: p.left, top: p.top },
                        idx === activeChartPoints.length - 1 && styles.activeDot,
                      ]}
                    />
                  ))
                )}
              </View>
              <View style={styles.weekAxis}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => {
                  const jsDay = i === 6 ? 0 : i + 1;
                  return (
                    <Text key={d} style={[styles.weekDay, jsDay === currentDayIdx && styles.weekDayActive]}>
                      {d}
                    </Text>
                  );
                })}
              </View>
            </View>

            {/* This Month Section */}
            <Text style={styles.sectionTitle}>THIS MONTH</Text>
            <View style={styles.card}>
              {/* Stats mini-cards */}
              <View style={styles.monthStats}>
                <View style={styles.statMini}>
                  <Text style={styles.statNum}>{monthVideoCount}</Text>
                  <Text style={styles.statSub}>Videos</Text>
                </View>
                <View style={styles.statMini}>
                  <Text style={[styles.statNum, styles.statNumGreen]}>{avgScoreStr}</Text>
                  <Text style={styles.statSub}>Avg score</Text>
                </View>
                <View style={styles.statMini}>
                  <Text style={[styles.statNum, styles.statNumPurple]}>{streakDays}</Text>
                  <Text style={styles.statSub}>Day streak</Text>
                </View>
              </View>

              {/* Metric rows */}
              <View style={styles.metricRowWrap}>
                <Text style={styles.metricLabel}>Clarity</Text>
                <View style={styles.metricBarTrack}>
                  <View style={[styles.metricBarFill, { width: `${clarityPct * 100}%`, backgroundColor: '#639922' }]} />
                </View>
                <Text style={styles.metricValue}>{clarityStr}</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricRowWrap}>
                <Text style={styles.metricLabel}>Filler words</Text>
                <View style={styles.metricBarTrack}>
                  <View style={[styles.metricBarFill, { width: `${fillerPct * 100}%`, backgroundColor: '#F1AC4C' }]} />
                </View>
                <Text style={styles.metricValue}>{fillerStr}</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricRowWrap}>
                <Text style={styles.metricLabel}>Speaking rate</Text>
                <View style={styles.metricBarTrack}>
                  <View style={[styles.metricBarFill, { width: `${wpmPct * 100}%`, backgroundColor: '#C69AE8' }]} />
                </View>
                <Text style={styles.metricValue}>{wpmStr}</Text>
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
  root: {
    flex: 1,
    backgroundColor: authColors.background,
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  wordmark: {
    width: 116,
    height: 30,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  loadingBox: {
    paddingTop: 80,
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 11,
    color: '#2D2830',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    letterSpacing: 0.55,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: radius.lg,
    borderWidth: 1.27,
    borderColor: 'rgba(38,49,3,0.18)',
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  monthNav: {
    fontFamily: fontFamily.bodyMedium,
    color: '#665672',
    fontSize: 11,
  },
  monthText: {
    fontFamily: fontFamily.bodyMedium,
    color: '#111827',
    fontSize: 13,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  weekSlot: {
    flex: 1,
    alignItems: 'center',
  },
  weekLabel: {
    fontFamily: fontFamily.bodyMedium,
    color: '#9CA3AF',
    fontSize: 9,
    letterSpacing: 0.36,
  },
  calendarGrid: {
    gap: 4,
  },
  calendarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  daySlot: {
    flex: 1,
    alignItems: 'center',
  },
  dayCell: {
    width: 40,
    height: 40,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  dayCellEmpty: {
    backgroundColor: 'transparent',
  },
  dayCellHasVideo: {
    backgroundColor: '#E0D6E8',
  },
  dayCellToday: {
    backgroundColor: '#665672',
  },
  dayLabel: {
    fontFamily: fontFamily.body,
    color: '#6B7280',
    fontSize: 10,
  },
  dayLabelToday: {
    fontFamily: fontFamily.bodyMedium,
    color: 'rgba(255,255,255,0.9)',
  },
  dayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#968E9D',
    marginTop: 2,
  },
  dayDotToday: {
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  legend: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendSwatchVideo: {
    backgroundColor: '#E0D6E8',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  legendSwatchToday: {
    backgroundColor: '#665672',
  },
  legendSwatchNone: {
    backgroundColor: '#C5C5C5',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  legendText: {
    fontFamily: fontFamily.body,
    fontSize: 10,
    color: '#9CA3AF',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardHeading: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 14,
    color: '#111827',
  },
  cardHint: {
    fontFamily: fontFamily.body,
    fontSize: 11,
    color: '#9CA3AF',
  },
  chart: {
    height: 86,
    borderRadius: radius.md,
    backgroundColor: '#F6F4F8',
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
    backgroundColor: '#4F4052',
  },
  activeDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D8D0DF',
    backgroundColor: '#665672',
  },
  weekAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekDay: {
    fontFamily: fontFamily.body,
    fontSize: 10,
    color: '#A69CAF',
  },
  weekDayActive: {
    color: '#4F4052',
    fontFamily: fontFamily.bodyMedium,
  },
  monthStats: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statMini: {
    flex: 1,
    borderRadius: radius.sm,
    backgroundColor: '#F7F4F8',
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  statNum: {
    fontFamily: fontFamily.playfair,
    fontSize: 26,
    lineHeight: 28,
    color: '#111827',
  },
  statNumGreen: {
    color: '#76C95F',
  },
  statNumPurple: {
    color: '#4A5240',
  },
  statSub: {
    fontFamily: fontFamily.body,
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  metricRowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  metricDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  metricLabel: {
    width: 80,
    fontFamily: fontFamily.body,
    color: '#6B7280',
    fontSize: 12,
  },
  metricBarTrack: {
    flex: 1,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.07)',
    marginHorizontal: spacing.sm,
    overflow: 'hidden',
  },
  metricBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  metricValue: {
    width: 70,
    textAlign: 'right',
    fontFamily: fontFamily.bodyMedium,
    color: '#111827',
    fontSize: 12,
  },
});
