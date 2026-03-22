import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { authColors, fontFamily, radius, spacing } from '../theme';

export function HomeDashboardScreen() {
  const insets = useSafeAreaInsets();
  const progressLinePoints = useMemo(
    () => [
      { left: 16, top: 66 },
      { left: 86, top: 54 },
      { left: 145, top: 44 },
      { left: 206, top: 32 },
      { left: 266, top: 22 },
    ],
    [],
  );

  return (
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
          <Ionicons name="notifications-outline" size={22} color="#1F2A16" />
          <Ionicons name="menu-outline" size={24} color="#1F2A16" />
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.streakHeader}>
          <Text style={styles.streakLabel}>CURRENT STREAK</Text>
          <View style={styles.streakIconWrap}>
            <Image source={require('../../assets/icons/fire_streak_icon.png')} style={styles.streakIcon} resizeMode="contain" />
          </View>
        </View>
        <View style={styles.streakValueRow}>
          <Text style={styles.streakNum}>1</Text>
          <Text style={styles.streakDays}>days</Text>
        </View>
        <View style={styles.streakFooter}>
          <Text style={styles.streakMeta}>Weekly score</Text>
          <View style={styles.pointsRow}>
            <Text style={styles.points}>656 pts</Text>
            <View style={styles.pointsDeltaPill}>
              <Text style={styles.pointsDelta}>+68 today</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionHeading}>Daily video</Text>
        <Text style={styles.sectionSubheading}>Great work keeping your streak going!</Text>
        <View style={styles.dailyDoneRow}>
          <View style={styles.doneLeft}>
            <View style={styles.checkIconWrap}>
              <Image source={require('../../assets/icons/completion_checkmark_icon.png')} style={styles.checkIcon} resizeMode="contain" />
            </View>
            <Text style={styles.doneText}>Daily video completed!</Text>
          </View>
          <Text style={styles.reviewLink}>Review videos</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionHeading}>Your progress</Text>
          <Text style={styles.sectionHint}>This week</Text>
        </View>
        <View style={styles.chart}>
          <View style={styles.lineTrack} />
          {progressLinePoints.map((p, idx) => (
            <View key={idx} style={[styles.linePoint, { left: p.left, top: p.top }]} />
          ))}
          <View style={styles.activeDot} />
        </View>
        <View style={styles.weekAxis}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <Text key={d} style={[styles.weekDay, d === 'Sun' && styles.weekDayActive]}>
              {d}
            </Text>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionHeading}>Recording analytics</Text>
          <Text style={styles.sectionHint}>All time</Text>
        </View>
        <View style={styles.analyticsGrid}>
          <View style={styles.analyticsItem}>
            <Text style={styles.analyticsLabel}>Avg clarity score</Text>
            <Text style={styles.analyticsValue}>87</Text>
            <Text style={styles.analyticsSub}>out of 100</Text>
          </View>
          <View style={styles.analyticsItem}>
            <Text style={styles.analyticsLabel}>Videos recorded</Text>
            <Text style={styles.analyticsValue}>3</Text>
            <Text style={styles.analyticsSub}>total</Text>
          </View>
          <View style={styles.analyticsItem}>
            <Text style={styles.analyticsLabel}>Filler words</Text>
            <Text style={[styles.analyticsValue, { color: '#C8842E' }]}>0.0%</Text>
            <Text style={styles.analyticsSub}>avg this week</Text>
          </View>
          <View style={styles.analyticsItem}>
            <Text style={styles.analyticsLabel}>Speaking rate</Text>
            <Text style={[styles.analyticsValue, { color: '#678A45' }]}>0</Text>
            <Text style={styles.analyticsSub}>wpm avg</Text>
          </View>
        </View>
      </View>
    </ScrollView>
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
    width: 20,
    height: 20,
  },
  streakValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  streakNum: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 48,
    color: '#2E3520',
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
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  points: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 16,
    color: '#1F2A16',
  },
  pointsDeltaPill: {
    backgroundColor: '#CDE5A9',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pointsDelta: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: '#2C4C14',
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
  checkIcon: {
    width: 16,
    height: 16,
  },
  doneText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: '#1F2A16',
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
  lineTrack: {
    position: 'absolute',
    left: '7%',
    right: '8%',
    top: 58,
    height: 2,
    backgroundColor: '#5A6355',
    transform: [{ rotate: '-12deg' }],
  },
  linePoint: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#58614F',
  },
  activeDot: {
    position: 'absolute',
    right: '6%',
    top: 20,
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
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 40,
    color: '#1F2A16',
    lineHeight: 44,
  },
  analyticsSub: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: '#9AA2B8',
  },
});
