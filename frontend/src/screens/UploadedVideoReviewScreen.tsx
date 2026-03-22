import * as MediaLibrary from 'expo-media-library';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { VideoPreview } from '../components/VideoPreview';
import type { HomeStackScreenProps } from '../navigation/types';
import { uploadVideo, createJob } from '../lib/api';
import { persistVideoFromUri } from '../lib/savedVideos';
import { colors, radius, spacing, typography } from '../theme';

export function UploadedVideoReviewScreen({
  navigation,
  route,
}: HomeStackScreenProps<'UploadedVideoReview'>) {
  const videoUri = route.params.videoUri;
  const [playbackPlaying, setPlaybackPlaying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadLabel, setUploadLabel] = useState('');

  const pickedFilename = useMemo(() => {
    const clean = videoUri.split('?')[0] ?? videoUri;
    const slash = clean.lastIndexOf('/');
    const name = slash >= 0 ? clean.slice(slash + 1) : clean;
    if (name && /\.(mp4|mov|m4v)$/i.test(name)) return name;
    return 'upload.mp4';
  }, [videoUri]);
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions({
    writeOnly: true,
  });

  const saveToCameraRoll = useCallback(async () => {
    let granted = mediaPermission?.granted === true;
    if (!granted) {
      const next = await requestMediaPermission();
      granted = next.granted === true;
    }
    if (!granted) {
      Alert.alert('Permission needed', 'Allow photo library access to save the video.');
      return;
    }
    try {
      await MediaLibrary.saveToLibraryAsync(videoUri);
      Alert.alert('Saved', 'Video saved to your camera roll.');
    } catch (e) {
      Alert.alert('Save failed', String(e));
    }
  }, [mediaPermission?.granted, requestMediaPermission, videoUri]);

  const keepInApp = useCallback(async () => {
    try {
      await persistVideoFromUri(videoUri);
      Alert.alert('Kept', 'Video saved in the app. Open the Saved tab to view or delete it.');
    } catch (e) {
      Alert.alert('Could not save in app', String(e));
    }
  }, [videoUri]);

  const analyze = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    setUploadLabel('Uploading video…');
    try {
      const upload = await uploadVideo(videoUri, pickedFilename);
      setUploadLabel('Starting analysis…');
      const job = await createJob(upload.upload_id);
      navigation.replace('AnalysisLoading', { jobId: job.job_id });
    } catch (e) {
      Alert.alert('Upload failed', String(e));
      setSubmitting(false);
      setUploadLabel('');
    }
  }, [videoUri, pickedFilename, submitting, navigation]);

  const discard = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
      style={styles.scrollView}
    >
      <View style={styles.inner}>
        <Text style={styles.pageTitle}>Review upload</Text>
        <Text style={styles.pageSub}>Preview your clip, then choose to analyze or save it.</Text>
        <VideoPreview uri={videoUri} isPlaying={playbackPlaying} />
        <Pressable
          style={styles.btnSecondary}
          onPress={() => setPlaybackPlaying((p) => !p)}
        >
          <Text style={styles.btnSecondaryText}>
            {playbackPlaying ? 'Pause' : 'Play'}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.btn, submitting && styles.btnDisabled]}
          onPress={() => void analyze()}
          disabled={submitting}
        >
          {submitting ? (
            <View style={styles.btnRow}>
              <ActivityIndicator color={colors.background} size="small" />
              <Text style={[styles.btnText, styles.btnRowText]}>{uploadLabel}</Text>
            </View>
          ) : (
            <Text style={styles.btnText}>Analyze</Text>
          )}
        </Pressable>
        <Pressable style={styles.btnSecondary} onPress={() => void saveToCameraRoll()}>
          <Text style={styles.btnSecondaryText}>Save to camera roll</Text>
        </Pressable>
        <Pressable style={styles.btnSecondary} onPress={discard}>
          <Text style={styles.btnSecondaryText}>Discard</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: spacing.xxl,
  },
  inner: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
    alignItems: 'stretch',
  },
  pageTitle: {
    ...typography.headline,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  pageSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  btn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  btnText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.background,
  },
  btnSecondary: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  btnSecondaryText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnRowText: {
    marginLeft: spacing.sm,
  },
});
