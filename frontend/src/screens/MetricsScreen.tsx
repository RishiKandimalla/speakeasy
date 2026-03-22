import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { SlideOutMenu } from '../components/SlideOutMenu';
import { authColors, radius, spacing } from '../theme';
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

  const daysWithVideos = new Set<number>();
  for (const job of jobs) {
    if (job.status !== 'completed') continue;
    const d = new Date(job.created_at);
    if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
      daysWithVideos.add(d.getDate());
    }
  }
  const calendarRows = buildCalendarRows(viewYear, viewMonth, daysWithVideos, today);

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

  const clarityScore = monthAvgClarity != null ? Math.round(monthAvgClarity) : null;
  const clarityPct = clarityScore != null ? clarityScore / 100 : 0;
  const fillerPerVideo = monthAvgFillerCount != null ? Math.round(monthAvgFillerCount) : null;
  const fillerPct = fillerPerVideo != null ? Math.min(fillerPerVideo / 20, 1) : 0;
  const wpmValue = monthAvgWpm != null ? Math.round(monthAvgWpm) : null;
  const wpmPct = wpmValue != null ? Math.min(wpmValue / 200, 1) : 0;

  const avgScoreStr = monthAvgScore != null ? String(Math.round(monthAvgScore)) : '--';
  const clarityStr = clarityScore != null ? `${clarityScore} / 100` : '-- / 100';
  const fillerStr = fillerPerVideo != null ? `${fillerPerVideo} / video` : '--';
  const wpmStr = wpmValue != null ? `${wpmValue} wpm` : '--';

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.root,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ───────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Image
            source={require('../../assets/images/speakeasy_name.png')}
            style={styles.wordmark}
            resizeMode="contain"
          />
          <View style={styles.headerIcons}>
            <Pressable hitSlop={8} onPress={() => navigation.navigate('Home', { screen: 'Notifications' })}>
              <Ionicons name="notifications-outline" size={22} color="#263103" />
            </Pressable>
            <Pressable hitSlop={8} onPress={() => setMenuVisible(true)}>
              <Ionicons name="menu-outline" size={24} color="#263103" />
            </Pressable>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#665672" />
          </View>
        ) : (
          <>
            {/* ── Calendar ─────────────────────────────────────────── */}
            <Text style={styles.sectionLabel}>Calendar</Text>
            <View style={styles.card}>
              {/* Month nav */}
              <View style={styles.monthHeader}>
                <Pressable hitSlop={12} onPress={prevMonth}>
                  <Text style={styles.monthNav}>← Prev</Text>
                </Pressable>
                <Text style={styles.monthTitle}>
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </Text>
                <Pressable hitSlop={12} onPress={nextMonth}>
                  <Text style={styles.monthNav}>Next →</Text>
                </Pressable>
              </View>

              {/* Weekday headers */}
              <View style={styles.weekRow}>
                {WEEKDAY_LABELS.map((d) => (
                  <View key={d} style={styles.daySlot}>
                    <Text style={styles.weekLabel}>{d}</Text>
                  </View>
                ))}
              </View>

              {/* Day grid */}
              <View style={styles.calGrid}>
                {calendarRows.map((row, ri) => (
                  <View key={ri} style={styles.weekRow}>
                    {row.map((cell, ci) => (
                      <View key={ci} style={styles.daySlot}>
                        <View style={[
                          styles.dayCell,
                          cell.hasVideo && !cell.isToday && styles.dayCellVideo,
                          cell.isToday && styles.dayCellToday,
                        ]}>
                          {cell.day !== null && (
                            <>
                              <Text style={[
                                styles.dayNum,
                                cell.hasVideo && !cell.isToday && styles.dayNumVideo,
                                cell.isToday && styles.dayNumToday,
                              ]}>
                                {cell.day}
                              </Text>
                              {(cell.hasVideo || cell.isToday) && (
                                <View style={[
                                  styles.dayDot,
                                  cell.isToday && styles.dayDotToday,
                                ]} />
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
                  <View style={[styles.legendSwatch, { backgroundColor: '#E0D6E8', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' }]} />
                  <Text style={styles.legendText}>Video saved</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendSwatch, { backgroundColor: '#665672' }]} />
                  <Text style={styles.legendText}>Today</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendSwatch, { backgroundColor: '#C5C5C5', borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' }]} />
                  <Text style={styles.legendText}>No video</Text>
                </View>
              </View>
            </View>

            {/* ── Your Progress chart ───────────────────────────────── */}
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardHeading}>Your Progress</Text>
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
              {/* Week axis — Figma uses Corben 10px, color #757D5C */}
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

            {/* ── This Month stats ──────────────────────────────────── */}
            <Text style={styles.sectionLabel}>This month</Text>
            <View style={styles.card}>
              {/* Three mini-stat tiles */}
              <View style={styles.statRow}>
                <View style={styles.statTile}>
                  <Text style={styles.statNum}>{monthVideoCount}</Text>
                  <Text style={styles.statSub}>Videos</Text>
                </View>
                <View style={styles.statTile}>
                  {/* Avg score — olive green from Figma */}
                  <Text style={[styles.statNum, { color: '#757D5C' }]}>{avgScoreStr}</Text>
                  <Text style={styles.statSub}>Avg score</Text>
                </View>
                <View style={styles.statTile}>
                  <Text style={styles.statNum}>{streakDays}</Text>
                  <Text style={styles.statSub}>Day streak</Text>
                </View>
              </View>

              {/* Metric rows with progress bars */}
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Clarity</Text>
                <View style={styles.barTrack}>
                  {/* Figma: clarity bar is #757D5C */}
                  <View style={[styles.barFill, { width: `${clarityPct * 100}%` as any, backgroundColor: '#757D5C' }]} />
                </View>
                <Text style={styles.metricValue}>{clarityStr}</Text>
              </View>
              <View style={styles.metricDivider} />

              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Filler words</Text>
                <View style={styles.barTrack}>
                  {/* Figma: filler bar is #FFEB92 yellow */}
                  <View style={[styles.barFill, { width: `${fillerPct * 100}%` as any, backgroundColor: '#FFEB92' }]} />
                </View>
                <Text style={styles.metricValue}>{fillerStr}</Text>
              </View>
              <View style={styles.metricDivider} />

              <View style={[styles.metricRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.metricLabel}>Speaking rate</Text>
                <View style={styles.barTrack}>
                  {/* Figma: speaking rate bar is #CABCD5 lavender */}
                  <View style={[styles.barFill, { width: `${wpmPct * 100}%` as any, backgroundColor: '#CABCD5' }]} />
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
  scroll: {
    flex: 1,
    backgroundColor: authColors.background, // #FFFAE0 cream
  },
  root: {
    paddingHorizontal: spacing.lg,
  },

  // Header
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

  // Section label — Figma: Corben 11px uppercase #9CA4AF letterSpacing 0.55
  sectionLabel: {
    fontFamily: 'Corben_400Regular',
    fontSize: 11,
    color: '#9CA4AF',
    textTransform: 'uppercase',
    letterSpacing: 0.55,
    lineHeight: 16.5,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },

  // Card — Figma: rgba(255,255,255,0.90) frosted, radius 16, olive border
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.90)',
    borderRadius: 16,
    borderWidth: 1.27,
    borderColor: 'rgba(38, 49, 3, 0.18)',
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.10,
    shadowRadius: 3,
    elevation: 2,
  },

  // ── Calendar ──────────────────────────────────────────────────────────

  // Month nav row — Figma: Jost 500 11px #665672 for nav, Corben 13px #111827 for month
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  monthNav: {
    fontFamily: 'Jost_500Medium',
    fontSize: 11,
    lineHeight: 16.5,
    color: '#665672',
  },
  monthTitle: {
    fontFamily: 'Corben_400Regular',
    fontSize: 13,
    lineHeight: 22,
    color: '#111827',
    includeFontPadding: false,
  },

  // Day-of-week header row — Figma: Jost 500 9px #9CA3AF letterSpacing 0.36
  weekRow: {
    flexDirection: 'row',
  },
  daySlot: {
    flex: 1,
    alignItems: 'center',
    marginVertical: 2,
  },
  weekLabel: {
    fontFamily: 'Jost_500Medium',
    fontSize: 9,
    color: '#9CA3AF',
    letterSpacing: 0.36,
    lineHeight: 13.5,
  },

  calGrid: {
    gap: 2,
    marginTop: spacing.xs,
  },

  // Day cells — Figma: 40×40 radius 7
  dayCell: {
    width: 40,
    height: 40,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Has video — Figma: #E0D6E8 lavender
  dayCellVideo: {
    backgroundColor: '#E0D6E8',
  },
  // Today — Figma: #665672 dark purple
  dayCellToday: {
    backgroundColor: '#665672',
  },

  // Day number — Figma: Jost 400 10px #6B7280 (no video), Jost 500 #665672 (has video)
  dayNum: {
    fontFamily: 'Jost_400Regular',
    fontSize: 10,
    lineHeight: 10,
    color: '#6B7280',
  },
  dayNumVideo: {
    fontFamily: 'Jost_500Medium',
    color: '#665672',
  },
  dayNumToday: {
    fontFamily: 'Jost_500Medium',
    color: 'rgba(255, 255, 255, 0.90)',
  },

  // Dot indicator — Figma: 4×4 circle #968E9D (video), white (today)
  dayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#968E9D',
    marginTop: 2,
  },
  dayDotToday: {
    backgroundColor: 'rgba(255, 255, 255, 0.90)',
  },

  // Legend
  legend: {
    flexDirection: 'row',
    gap: spacing.lg,
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
  legendText: {
    fontFamily: 'Jost_400Regular',
    fontSize: 10,
    lineHeight: 15,
    color: '#9CA3AF',
  },

  // ── Progress chart ────────────────────────────────────────────────────

  // Card heading — Figma: Corben 14px #111827
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardHeading: {
    fontFamily: 'Corben_400Regular',
    fontSize: 14,
    lineHeight: 22,
    color: '#111827',
    includeFontPadding: false,
  },
  // Card hint — Figma: Corben 11px #9CA3AF
  cardHint: {
    fontFamily: 'Corben_400Regular',
    fontSize: 11,
    lineHeight: 16.5,
    color: '#9CA3AF',
  },

  // Chart area — Figma: #F7F8F4 bg radius 10
  chart: {
    height: 86,
    borderRadius: 10,
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
    backgroundColor: '#757D5C',
  },
  activeDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#DBDFD4',
    backgroundColor: '#757D5C',
  },

  // Week axis — Figma: Corben 10px #757D5C
  weekAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekDay: {
    fontFamily: 'Corben_400Regular',
    fontSize: 10,
    lineHeight: 15,
    color: '#757D5C',
  },
  weekDayActive: {
    fontFamily: 'Corben_400Regular',
    color: '#4A5240',
  },

  // ── This Month stats ──────────────────────────────────────────────────

  // Three mini stat tiles — Figma: #F7F4F8 bg radius 10
  statRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statTile: {
    flex: 1,
    backgroundColor: '#F7F4F8',
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  // Stat number — Figma: Corben 26px #263103
  statNum: {
    fontFamily: 'Corben_400Regular',
    fontSize: 26,
    lineHeight: 38,
    color: '#263103',
    includeFontPadding: false,
  },
  // Stat sub — Figma: Jost 400 10px #9CA3AF
  statSub: {
    fontFamily: 'Jost_400Regular',
    fontSize: 10,
    lineHeight: 15,
    color: '#9CA3AF',
  },

  // Metric rows
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  metricDivider: {
    height: 1.27,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
  },
  // Metric label — Figma: Jost 400 12px #6B7280, fixed 80px width
  metricLabel: {
    width: 80,
    fontFamily: 'Jost_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: '#6B7280',
  },
  // Bar track — Figma: rgba(0,0,0,0.07) bg, radius full
  barTrack: {
    flex: 1,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.07)',
    overflow: 'hidden',
    marginHorizontal: spacing.sm,
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
  },
  // Metric value — Figma: Jost 500 12px #111827, right-aligned, fixed 58px width
  metricValue: {
    width: 58,
    textAlign: 'right',
    fontFamily: 'Jost_500Medium',
    fontSize: 12,
    lineHeight: 16,
    color: '#111827',
  },
});