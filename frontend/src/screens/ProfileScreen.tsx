import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { SlideOutMenu } from '../components/SlideOutMenu';
import { authColors, fontFamily, radius, spacing } from '../theme';
import { getMyProfile, listJobs, type ProfileData, type JobSummary } from '../lib/api';
import { isPublished, initPublishedJobs } from '../lib/publishedJobs';
import type { AnalysisResult } from '../types/analysis';

// Module-level caches — survive navigation, cleared on app restart
let cachedProfile: ProfileData | null = null;
let cachedJobs: JobSummary[] | null = null;

function jobToResult(job: JobSummary): AnalysisResult {
  return {
    job_id: job.job_id,
    status: job.status,
    assets: job.video_url ? { edited_video: job.video_url } : null,
    transcript: job.transcript as AnalysisResult['transcript'],
    scores: job.scores as AnalysisResult['scores'],
    metrics: job.metrics as AnalysisResult['metrics'],
    feedback: job.feedback as AnalysisResult['feedback'],
    tone: job.tone as AnalysisResult['tone'],
  };
}

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<any>();
  const [menuVisible, setMenuVisible] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(cachedProfile);
  const [jobs, setJobs] = useState<JobSummary[]>(cachedJobs ?? []);
  const [loading, setLoading] = useState(cachedProfile === null);
  const [, forceUpdate] = useState(0);

  useFocusEffect(
    useCallback(() => {
      // Ensure published jobs are loaded so globe badges render correctly
      initPublishedJobs().then(() => forceUpdate((n) => n + 1));

      const isBackground = cachedProfile !== null;
      let cancelled = false;
      if (!isBackground) setLoading(true);
      Promise.all([getMyProfile(), listJobs(50)])
        .then(([p, j]) => {
          if (cancelled) return;
          const completed = j.filter((job) => job.status === 'completed');
          cachedProfile = p;
          cachedJobs = completed;
          setProfile(p);
          setJobs(completed);
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled && !isBackground) setLoading(false);
        });
      return () => { cancelled = true; };
    }, []),
  );

  const completedJobs = jobs;
  const username = profile?.username ?? '—';
  const followerCount = profile?.follower_count ?? 0;
  const followingCount = profile?.following_count ?? 0;
  const postCount = completedJobs.length;

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
            <ActivityIndicator color="#678A45" />
          </View>
        ) : (
          <>
            <View style={styles.profileTop}>
              <View style={styles.avatar} />
              <View style={styles.profileStat}>
                <Text style={styles.profileNum}>{postCount}</Text>
                <Text style={styles.profileLabel}>Posts</Text>
              </View>
              <View style={styles.profileStat}>
                <Text style={styles.profileNum}>{followerCount}</Text>
                <Text style={styles.profileLabel}>Followers</Text>
              </View>
              <View style={styles.profileStat}>
                <Text style={styles.profileNum}>{followingCount}</Text>
                <Text style={styles.profileLabel}>Following</Text>
              </View>
            </View>

            <Text style={styles.name}>{username}</Text>

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

            {completedJobs.length === 0 ? (
              <View style={styles.emptyGrid}>
                <Text style={styles.emptyGridText}>No videos yet. Record one to get started!</Text>
              </View>
            ) : (
              <View style={styles.grid}>
                {completedJobs.map((job) => {
                  const overall = job.scores?.overall;
                  const durationS = (job.metrics as Record<string, number> | null)?.duration;
                  const durationLabel = durationS != null
                    ? `${Math.floor(durationS / 60)}:${String(Math.round(durationS % 60)).padStart(2, '0')}`
                    : null;
                  return (
                    <Pressable
                      key={job.job_id}
                      style={({ pressed }) => [styles.gridTile, pressed && styles.gridTilePressed]}
                      onPress={() =>
                        navigation.navigate('Home', {
                          screen: 'AnalysisResults',
                          params: { result: jobToResult(job) },
                        })
                      }
                    >
                      {durationLabel && (
                        <View style={styles.durationPill}>
                          <Text style={styles.durationText}>{durationLabel}</Text>
                        </View>
                      )}
                      <View style={styles.tileBottom}>
                        {overall != null && (
                          <View style={styles.scorePill}>
                            <View style={styles.scoreDot} />
                            <Text style={styles.scoreText}>{Math.round(overall)}</Text>
                          </View>
                        )}
                        {isPublished(job.job_id) && (
                          <View style={styles.publicBadge}>
                            <Ionicons name="globe-outline" size={10} color="#fff" />
                          </View>
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
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
  emptyGrid: {
    paddingTop: spacing.xxl,
    alignItems: 'center',
  },
  emptyGridText: {
    fontFamily: fontFamily.body,
    color: '#A5AAC0',
    fontSize: 14,
    textAlign: 'center',
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
  gridTilePressed: {
    opacity: 0.7,
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
  tileBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scorePill: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  publicBadge: {
    backgroundColor: '#5a6b40',
    borderRadius: 6,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
