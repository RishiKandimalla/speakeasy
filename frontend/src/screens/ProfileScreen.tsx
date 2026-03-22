import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';

import { NotificationBell } from '../components/NotificationBell';
import { SlideOutMenu } from '../components/SlideOutMenu';
import {
  getMyProfile,
  getProfile,
  getReactionSummary,
  listJobs,
  listUserPosts,
  publishPost,
  type FeedPostResponse,
  type JobSummary,
  type ProfileData,
  type ReactionSummary,
} from '../lib/api';
import type { RootTabParamList } from '../navigation/types';
import { authColors, fontFamily, radius, spacing } from '../theme';
import type { AnalysisResult } from '../types/analysis';

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

function transcriptPreview(post: FeedPostResponse): string {
  const text = post.transcript_json?.text;
  if (typeof text === 'string' && text.trim()) {
    return text.trim().slice(0, 120);
  }
  return 'Transcript available';
}

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootTabParamList, 'Profile'>>();
  const routeUserId = route.params?.userId;

  const [menuVisible, setMenuVisible] = useState(false);
  const [viewerProfile, setViewerProfile] = useState<ProfileData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [publicPosts, setPublicPosts] = useState<FeedPostResponse[]>([]);
  const [reactionSummaries, setReactionSummaries] = useState<Record<string, ReactionSummary>>({});
  const [loading, setLoading] = useState(true);
  const [publishingJobId, setPublishingJobId] = useState<string | null>(null);

  const isOwnProfile = routeUserId == null || (viewerProfile != null && routeUserId === viewerProfile.user_id);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      void (async () => {
        try {
          const me = await getMyProfile();
          if (cancelled) return;
          setViewerProfile(me);
          const targetUserId = routeUserId ?? me.user_id;
          const own = targetUserId === me.user_id;
          if (own) {
            const [userJobs, ownPosts] = await Promise.all([
              listJobs(50),
              listUserPosts(targetUserId, 50),
            ]);
            if (cancelled) return;
            setProfile(me);
            setJobs(userJobs.filter((job) => job.status === 'completed'));
            setPublicPosts([]);

            const summaries: Record<string, ReactionSummary> = {};
            await Promise.all(
              ownPosts.map(async (p) => {
                try {
                  const s = await getReactionSummary(p.post_id);
                  summaries[p.post_id] = s;
                } catch {
                  // ignore individual failures
                }
              }),
            );
            if (!cancelled) setReactionSummaries(summaries);
          } else {
            const [targetProfile, posts] = await Promise.all([
              getProfile(targetUserId),
              listUserPosts(targetUserId, 50),
            ]);
            if (cancelled) return;
            setProfile(targetProfile);
            setPublicPosts(posts);
            setJobs([]);
            setReactionSummaries({});
          }
        } catch (e) {
          if (!cancelled) {
            Alert.alert('Could not load profile', String(e));
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [routeUserId]),
  );

  const handlePublish = useCallback(async (jobId: string) => {
    if (publishingJobId) return;
    setPublishingJobId(jobId);
    try {
      await publishPost(jobId);
      setJobs((prev) => prev.map((job) => (job.job_id === jobId ? { ...job, is_public: true } : job)));
    } catch (e) {
      Alert.alert('Could not publish post', String(e));
    } finally {
      setPublishingJobId(null);
    }
  }, [publishingJobId]);

  const username = profile?.username ?? '—';
  const followerCount = profile?.follower_count ?? 0;
  const followingCount = profile?.following_count ?? 0;
  const postCount = isOwnProfile ? jobs.length : publicPosts.length;
  const hasOwnPosts = jobs.length > 0;
  const hasPublicPosts = publicPosts.length > 0;

  const headerTitle = useMemo(() => (isOwnProfile ? 'My posts' : 'Public posts'), [isOwnProfile]);

  const aggregateReactions = useMemo(() => {
    const summaryList = Object.values(reactionSummaries);
    if (!summaryList.length) return null;
    let total = 0;
    let uniqueReactors = 0;
    for (const s of summaryList) {
      total += s.total_reactions;
      uniqueReactors += s.unique_reactors;
    }
    return { total, uniqueReactors };
  }, [reactionSummaries]);

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
            {isOwnProfile && (
              <Pressable hitSlop={8} onPress={() => navigation.navigate('Home', { screen: 'Notifications' })}>
                <NotificationBell />
              </Pressable>
            )}
            {isOwnProfile && (
              <Pressable hitSlop={8} onPress={() => setMenuVisible(true)}>
                <Ionicons name="menu-outline" size={24} color="#1F2A16" />
              </Pressable>
            )}
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

            {isOwnProfile && aggregateReactions && aggregateReactions.total > 0 && (
              <View style={styles.reactionSummaryRow}>
                <View style={styles.reactionSummaryPill}>
                  <Ionicons name="heart-outline" size={14} color="#678A45" />
                  <Text style={styles.reactionSummaryText}>
                    {aggregateReactions.total} reaction{aggregateReactions.total !== 1 ? 's' : ''}
                  </Text>
                </View>
                <View style={styles.reactionSummaryPill}>
                  <Ionicons name="people-outline" size={14} color="#678A45" />
                  <Text style={styles.reactionSummaryText}>
                    {aggregateReactions.uniqueReactors} unique reactor{aggregateReactions.uniqueReactors !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
            )}

            {isOwnProfile && (
              <View style={styles.actionRow}>
                <View style={styles.outlineBtnLarge}>
                  <Text style={styles.outlineBtnText}>Edit profile</Text>
                </View>
                <View style={styles.outlineBtnSmall}>
                  <Ionicons name="share-social-outline" size={16} color="#1F2A16" />
                  <Text style={styles.outlineBtnText}>Share</Text>
                </View>
              </View>
            )}

            <View style={styles.tabHeader}>
              <View style={styles.tabItemActive}>
                <Ionicons name={isOwnProfile ? 'grid-outline' : 'musical-notes-outline'} size={16} color="#1F2A16" />
                <Text style={styles.tabItemTextActive}>{headerTitle}</Text>
              </View>
            </View>

            {isOwnProfile ? (
              !hasOwnPosts ? (
                <View style={styles.emptyGrid}>
                  <Text style={styles.emptyGridText}>No videos yet. Record one to get started!</Text>
                </View>
              ) : (
                <View style={styles.grid}>
                  {jobs.map((job) => {
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
                        <View style={styles.tileTop}>
                          <View style={[styles.visibilityPill, job.is_public ? styles.publicPill : styles.privatePill]}>
                            <Text style={styles.visibilityText}>{job.is_public ? 'Public' : 'Private'}</Text>
                          </View>
                          {durationLabel && (
                            <View style={styles.durationPill}>
                              <Text style={styles.durationText}>{durationLabel}</Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.tileBottom}>
                          {!job.is_public && (
                            <Pressable
                              style={styles.publishBtn}
                              disabled={publishingJobId === job.job_id}
                              onPress={(e) => {
                                e.stopPropagation();
                                void handlePublish(job.job_id);
                              }}
                            >
                              {publishingJobId === job.job_id ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <Text style={styles.publishBtnText}>Publish</Text>
                              )}
                            </Pressable>
                          )}
                          {overall != null && (
                            <View style={styles.scorePill}>
                              <View style={styles.scoreDot} />
                              <Text style={styles.scoreText}>{Math.round(overall)}</Text>
                            </View>
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )
            ) : (
              !hasPublicPosts ? (
                <View style={styles.emptyGrid}>
                  <Text style={styles.emptyGridText}>No public audio posts yet.</Text>
                </View>
              ) : (
                <View style={styles.audioList}>
                  {publicPosts.map((post) => (
                    <View key={post.post_id} style={styles.audioCard}>
                      <View style={styles.audioCardTop}>
                        <Ionicons name="mic-outline" size={16} color="#1F2A16" />
                        <Text style={styles.audioLabel}>Audio Post</Text>
                        <Text style={styles.audioDate}>{new Date(post.created_at).toLocaleDateString()}</Text>
                      </View>
                      <Text style={styles.audioTranscript} numberOfLines={3}>
                        {transcriptPreview(post)}
                      </Text>
                    </View>
                  ))}
                </View>
              )
            )}
          </>
        )}
      </ScrollView>
      {isOwnProfile && <SlideOutMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />}
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
  reactionSummaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  reactionSummaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF3E7',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  reactionSummaryText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: '#4D5A37',
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
  tabItemTextActive: {
    fontFamily: fontFamily.bodyMedium,
    color: '#1F2A16',
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
    aspectRatio: 0.9,
    borderWidth: 0.5,
    borderColor: '#DDE1EA',
    backgroundColor: '#2D3330',
    padding: spacing.xs,
    justifyContent: 'space-between',
  },
  gridTilePressed: {
    opacity: 0.7,
  },
  tileTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tileBottom: {
    gap: spacing.xs,
  },
  visibilityPill: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  publicPill: {
    backgroundColor: 'rgba(123,193,77,0.3)',
  },
  privatePill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  visibilityText: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bodyMedium,
    fontSize: 10,
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
  publishBtn: {
    alignSelf: 'flex-start',
    minWidth: 60,
    minHeight: 24,
    borderRadius: 8,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4D5A37',
  },
  publishBtnText: {
    fontFamily: fontFamily.bodyMedium,
    color: '#fff',
    fontSize: 11,
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
  audioList: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  audioCard: {
    borderWidth: 1,
    borderColor: '#DDE1EA',
    borderRadius: radius.md,
    backgroundColor: '#FFFFFC',
    padding: spacing.md,
    gap: spacing.xs,
  },
  audioCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  audioLabel: {
    fontFamily: fontFamily.bodySemiBold,
    color: '#1F2A16',
    fontSize: 13,
  },
  audioDate: {
    marginLeft: 'auto',
    fontFamily: fontFamily.body,
    color: '#8E95A8',
    fontSize: 12,
  },
  audioTranscript: {
    fontFamily: fontFamily.body,
    color: '#3E4634',
    fontSize: 13,
    lineHeight: 18,
  },
});
