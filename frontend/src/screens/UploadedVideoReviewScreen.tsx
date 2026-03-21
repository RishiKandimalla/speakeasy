import * as MediaLibrary from 'expo-media-library';
import { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { VideoPreview } from '../components/VideoPreview';
import type { HomeStackScreenProps } from '../navigation/types';
import { persistVideoFromUri } from '../lib/savedVideos';
import { colors, radius, spacing, typography } from '../theme';

export function UploadedVideoReviewScreen({
  navigation,
  route,
}: HomeStackScreenProps<'UploadedVideoReview'>) {
  const videoUri = route.params.videoUri;
  const [playbackPlaying, setPlaybackPlaying] = useState(false);
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

  const analyze = useCallback(() => {
    navigation.replace('AnalysisLoading', { videoUri });
  }, [navigation, videoUri]);

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
        <VideoPreview uri={videoUri} isPlaying={playbackPlaying} />
        <Pressable
          style={styles.btnSecondary}
          onPress={() => setPlaybackPlaying((p) => !p)}
        >
          <Text style={styles.btnSecondaryText}>
            {playbackPlaying ? 'Pause' : 'Play'}
          </Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={analyze}>
          <Text style={styles.btnText}>Analyze</Text>
        </Pressable>
        <Pressable style={styles.btnSecondary} onPress={() => void saveToCameraRoll()}>
          <Text style={styles.btnSecondaryText}>Save to camera roll</Text>
        </Pressable>
        <Pressable style={styles.btnSecondary} onPress={() => void keepInApp()}>
          <Text style={styles.btnSecondaryText}>Keep in app</Text>
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
  btn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  btnSecondaryText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
});
