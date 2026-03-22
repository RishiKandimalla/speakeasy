import { Ionicons } from '@expo/vector-icons';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { authColors, fontFamily, radius, spacing } from '../theme';

const CALENDAR_DAYS = [
  '', '1', '2', '3', '4', '5', '6', '7',
  '8', '9', '10', '11', '12', '13', '14',
  '15', '16', '17', '18', '19', '20', '21',
  '22', '23', '24', '25', '26', '27', '28',
  '29', '30', '', '', '', '', '',
];
const WEEKDAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const CALENDAR_ROWS = [0, 1, 2, 3, 4].map((row) => CALENDAR_DAYS.slice(row * 7, row * 7 + 7));

export function MetricsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.md,
        paddingBottom: insets.bottom + spacing.xxl,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Image source={require('../../assets/images/speakeasy_name.png')} style={styles.wordmark} resizeMode="contain" />
        <View style={styles.headerIcons}>
          <Ionicons name="notifications-outline" size={22} color="#1F2A16" />
          <Ionicons name="menu-outline" size={24} color="#1F2A16" />
        </View>
      </View>

      <Text style={styles.sectionTitle}>MOST RECENT</Text>
      <View style={styles.card}>
        <View style={styles.videoStub}>
          <Ionicons name="play" size={34} color="#FFFFFF" />
          <View style={styles.durationPill}>
            <Text style={styles.durationText}>1:18</Text>
          </View>
        </View>
        <Text style={styles.videoTitle}>My Career Goals</Text>
        <Text style={styles.videoDate}>March 20, 2026</Text>
        <View style={styles.tagRow}>
          <View style={styles.tagPill}>
            <View style={[styles.tagDot, { backgroundColor: '#9ACE58' }]} />
            <Text style={styles.tagText}>87 clarity</Text>
          </View>
          <View style={styles.tagPill}>
            <View style={[styles.tagDot, { backgroundColor: '#FFC861' }]} />
            <Text style={styles.tagText}>12 fillers</Text>
          </View>
          <View style={styles.tagPill}>
            <View style={[styles.tagDot, { backgroundColor: '#72A9FF' }]} />
            <Text style={styles.tagText}>145 wpm</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>VIDEO TRACKER</Text>
      <View style={styles.card}>
        <View style={styles.monthHeader}>
          <Text style={styles.monthNav}>← Prev</Text>
          <Text style={styles.monthText}>March 2026</Text>
          <Text style={styles.monthNav}>Next →</Text>
        </View>
        <View style={styles.weekHeader}>
          {WEEKDAY_LABELS.map((day) => (
            <View key={day} style={styles.weekSlot}>
              <Text style={styles.weekLabel}>{day}</Text>
            </View>
          ))}
        </View>
        <View style={styles.calendarGrid}>
          {CALENDAR_ROWS.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.calendarRow}>
              {row.map((day, idx) => {
                const active = day === '21';
                const selected = day === '4' || day === '6' || day === '7';
                const empty = day === '';
                return (
                  <View key={`${rowIndex}-${idx}-${day}`} style={styles.daySlot}>
                    <View style={[styles.dayCell, selected && styles.dayCellSelected, active && styles.dayCellActive, empty && styles.dayCellEmpty]}>
                      <Text style={[styles.dayLabel, active && styles.dayLabelActive]}>{day}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      <Text style={styles.sectionTitle}>THIS MONTH</Text>
      <View style={styles.card}>
        <View style={styles.monthStats}>
          <View style={styles.statMini}>
            <Text style={styles.statNum}>14</Text>
            <Text style={styles.statSub}>Videos</Text>
          </View>
          <View style={styles.statMini}>
            <Text style={styles.statNum}>87</Text>
            <Text style={styles.statSub}>Avg score</Text>
          </View>
          <View style={styles.statMini}>
            <Text style={styles.statNum}>12</Text>
            <Text style={styles.statSub}>Day streak</Text>
          </View>
        </View>
        <View style={styles.metricRowWrap}>
          <Text style={styles.metricLabel}>Clarity</Text>
          <View style={styles.metricBarTrack}>
            <View style={[styles.metricBarFill, { width: '87%', backgroundColor: '#7D9D3F' }]} />
          </View>
          <Text style={styles.metricValue}>87 / 100</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricRowWrap}>
          <Text style={styles.metricLabel}>Filler words</Text>
          <View style={styles.metricBarTrack}>
            <View style={[styles.metricBarFill, { width: '42%', backgroundColor: '#F4DB67' }]} />
          </View>
          <Text style={styles.metricValue}>12 / video</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricRowWrap}>
          <Text style={styles.metricLabel}>Speaking rate</Text>
          <View style={styles.metricBarTrack}>
            <View style={[styles.metricBarFill, { width: '73%', backgroundColor: '#D5C7E8' }]} />
          </View>
          <Text style={styles.metricValue}>145 wpm</Text>
        </View>
      </View>
    </ScrollView>
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
  brand: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 30,
    color: '#111111',
  },
  wordmark: {
    width: 116,
    height: 30,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  sectionTitle: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 14,
    color: '#B0B3C0',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#FFFFFC',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#DCD8CA',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  videoStub: {
    height: 156,
    borderRadius: radius.md,
    backgroundColor: '#9EA2A7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  durationPill: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    backgroundColor: '#111111',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  durationText: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
  },
  videoTitle: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 30,
    color: '#1F2A16',
  },
  videoDate: {
    fontFamily: fontFamily.body,
    fontSize: 16,
    color: '#A5A6B4',
    marginBottom: spacing.sm,
  },
  tagRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  tagPill: {
    backgroundColor: '#F6F8FB',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tagText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 14,
    color: '#4D5669',
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  monthNav: {
    fontFamily: fontFamily.bodyMedium,
    color: '#656D7C',
    fontSize: 14,
  },
  monthText: {
    fontFamily: fontFamily.bodySemiBold,
    color: '#283015',
    fontSize: 22,
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
    width: 42,
    textAlign: 'center',
    fontFamily: fontFamily.bodyMedium,
    color: '#C5C8D3',
    fontSize: 11,
  },
  calendarGrid: {
    gap: 6,
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
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#FBFCF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellEmpty: {
    backgroundColor: 'transparent',
  },
  dayCellSelected: {
    backgroundColor: '#F4F6ED',
  },
  dayCellActive: {
    backgroundColor: '#59634D',
  },
  dayLabel: {
    fontFamily: fontFamily.bodyMedium,
    color: '#66707E',
    fontSize: 13,
  },
  dayLabelActive: {
    color: '#FFFFFF',
  },
  monthStats: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statMini: {
    flex: 1,
    borderRadius: radius.md,
    backgroundColor: '#FAFBF6',
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  statNum: {
    fontFamily: fontFamily.playfair,
    fontSize: 36,
    lineHeight: 38,
    color: '#1F2A16',
  },
  statSub: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: '#A8ABBA',
  },
  metricRowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  metricDivider: {
    height: 1,
    backgroundColor: '#ECEDE4',
  },
  metricLabel: {
    width: 80,
    fontFamily: fontFamily.bodyMedium,
    color: '#757A8A',
    fontSize: 12,
  },
  metricBarTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ECEDE4',
    marginHorizontal: spacing.sm,
    overflow: 'hidden',
  },
  metricBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  metricValue: {
    width: 70,
    textAlign: 'right',
    fontFamily: fontFamily.bodySemiBold,
    color: '#2D321F',
    fontSize: 12,
  },
});
