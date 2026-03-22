import { Ionicons } from '@expo/vector-icons';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { authColors, fontFamily, radius, spacing } from '../theme';

const GRID_ITEMS = [
  { score: 91, duration: '3:44' },
  { score: 88, duration: '2:23' },
  { score: 74, duration: '1:56' },
  { score: 85, duration: '4:01' },
  { score: 79, duration: '2:33' },
  { score: 83, duration: '3:10' },
];

export function ProfileScreen() {
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

      <View style={styles.profileTop}>
        <View style={styles.avatar} />
        <View style={styles.profileStat}>
          <Text style={styles.profileNum}>6</Text>
          <Text style={styles.profileLabel}>Posts</Text>
        </View>
        <View style={styles.profileStat}>
          <Text style={styles.profileNum}>142</Text>
          <Text style={styles.profileLabel}>Followers</Text>
        </View>
        <View style={styles.profileStat}>
          <Text style={styles.profileNum}>89</Text>
          <Text style={styles.profileLabel}>Following</Text>
        </View>
      </View>

      <Text style={styles.name}>Joh</Text>
      <Text style={styles.bio}>Public speaking enthusiast</Text>
      <Text style={styles.bio}>Building confidence one video at a time</Text>

      <View style={styles.actionRow}>
        <View style={styles.outlineBtnLarge}>
          <Text style={styles.outlineBtnText}>Edit profile</Text>
        </View>
        <View style={styles.outlineBtnSmall}>
          <Ionicons name="share-social-outline" size={16} color="#1F2A16" />
          <Text style={styles.outlineBtnText}>Share</Text>
        </View>
      </View>

      <View style={styles.tabHeader}>
        <View style={styles.tabItemActive}>
          <Ionicons name="grid-outline" size={16} color="#1F2A16" />
          <Text style={styles.tabItemTextActive}>My posts</Text>
        </View>
        <View style={styles.tabItem}>
          <Ionicons name="heart-outline" size={16} color="#9FA4B2" />
          <Text style={styles.tabItemText}>Reacted to</Text>
        </View>
      </View>

      <View style={styles.grid}>
        {GRID_ITEMS.map((item, index) => (
          <View key={`${item.duration}-${index}`} style={styles.gridTile}>
            <View style={styles.durationPill}>
              <Text style={styles.durationText}>{item.duration}</Text>
            </View>
            <View style={styles.scorePill}>
              <View style={styles.scoreDot} />
              <Text style={styles.scoreText}>{item.score}</Text>
            </View>
          </View>
        ))}
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
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 1,
    borderColor: '#CFD0C4',
    backgroundColor: '#FCFDF9',
  },
  profileStat: {
    flex: 1,
    alignItems: 'center',
  },
  profileNum: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 20,
    color: '#1E2514',
  },
  profileLabel: {
    fontFamily: fontFamily.body,
    color: '#8E95A8',
    fontSize: 12,
  },
  name: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 32,
    color: '#1F2A16',
  },
  bio: {
    fontFamily: fontFamily.body,
    color: '#68718A',
    fontSize: 14,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  outlineBtnLarge: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#C6C9D4',
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFC',
  },
  outlineBtnSmall: {
    width: 92,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#C6C9D4',
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    flexDirection: 'row',
    backgroundColor: '#FFFFFC',
  },
  outlineBtnText: {
    fontFamily: fontFamily.bodySemiBold,
    color: '#1F2A16',
    fontSize: 12,
  },
  tabHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#D4D8E3',
  },
  tabItemActive: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderBottomWidth: 3,
    borderBottomColor: '#4D5A37',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  tabItemTextActive: {
    fontFamily: fontFamily.bodyMedium,
    color: '#1F2A16',
    fontSize: 14,
  },
  tabItemText: {
    fontFamily: fontFamily.bodyMedium,
    color: '#9FA4B2',
    fontSize: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  gridTile: {
    width: '33.3333%',
    aspectRatio: 0.82,
    borderWidth: 0.5,
    borderColor: '#DDE1EA',
    backgroundColor: '#2D3330',
    padding: spacing.xs,
    justifyContent: 'space-between',
  },
  durationPill: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  durationText: {
    fontFamily: fontFamily.bodyMedium,
    color: '#FFFFFF',
    fontSize: 10,
  },
  scorePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scoreDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#7BC14D',
  },
  scoreText: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bodyMedium,
    fontSize: 11,
  },
});
