import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CameraView } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { VideoPreview } from '../components/VideoPreview';
import type { HomeStackParamList } from '../navigation/types';
import { usePermissions } from '../hooks/usePermissions';
import { uploadVideo } from '../lib/api';
import { persistVideoFromUri } from '../lib/savedVideos';
import { colors, radius, spacing, typography } from '../theme';

type Phase = 'idle' | 'recording' | 'preview';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'RecordVideo'>;

export function RecordVideoScreen() {
  const navigation = useNavigation<Nav>();
  const { allGranted, ready, requestAll } = usePermissions();
  const cameraRef = useRef<CameraView>(null);
  const recordingPromiseRef = useRef<Promise<{ uri: string } | undefined> | null>(
    null,
  );

  const [phase, setPhase] = useState<Phase>('idle');
  const [cameraReady, setCameraReady] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [playbackPlaying, setPlaybackPlaying] = useState(false);
  const [uploadingToServer, setUploadingToServer] = useState(false);

  useEffect(() => {
    if (phase === 'idle') {
      setCameraReady(false);
    }
  }, [phase]);

  const startRecording = useCallback(async () => {
    const cam = cameraRef.current;
    if (!cam || phase !== 'idle') return;
    try {
      recordingPromiseRef.current = cam.recordAsync();
      setPhase('recording');
    } catch (e) {
      recordingPromiseRef.current = null;
      Alert.alert('Recording failed', String(e));
    }
  }, [phase]);

  const stopRecording = useCallback(async () => {
    if (phase !== 'recording') return;
    cameraRef.current?.stopRecording();
    const pending = recordingPromiseRef.current;
    recordingPromiseRef.current = null;
    if (!pending) {
      setPhase('idle');
      return;
    }
    try {
      const result = await pending;
      if (result?.uri) {
        setVideoUri(result.uri);
        setPlaybackPlaying(false);
        setPhase('preview');
      } else {
        setPhase('idle');
        Alert.alert('Recording', 'No video was produced.');
      }
    } catch (e) {
      setPhase('idle');
      Alert.alert('Recording failed', String(e));
    }
  }, [phase]);

  const discardRecording = useCallback(() => {
    setVideoUri(null);
    setPlaybackPlaying(false);
    setPhase('idle');
  }, []);

  const saveToCameraRoll = useCallback(async () => {
    if (!videoUri) return;
    try {
      await MediaLibrary.saveToLibraryAsync(videoUri);
      Alert.alert('Saved', 'Video saved to your camera roll.');
    } catch (e) {
      Alert.alert('Save failed', String(e));
    }
  }, [videoUri]);

  const keepInApp = useCallback(async () => {
    if (!videoUri) return;
    try {
      await persistVideoFromUri(videoUri);
      Alert.alert('Kept', 'Video saved in the app. Open the Saved tab to view or delete it.');
    } catch (e) {
      Alert.alert('Could not save in app', String(e));
    }
  }, [videoUri]);

  const uploadToServer = useCallback(async () => {
    if (!videoUri || uploadingToServer) return;
    setUploadingToServer(true);
    try {
      const result = await uploadVideo(videoUri, 'recording.mp4');
      Alert.alert(
        'Uploaded',
        `Video is on the server. Open the Cloud tab to view it.\n\nUpload ID: ${result.upload_id.slice(0, 8)}…`,
      );
    } catch (e) {
      Alert.alert('Upload failed', String(e));
    } finally {
      setUploadingToServer(false);
    }
  }, [videoUri, uploadingToServer]);

  const analyze = useCallback(() => {
    if (!videoUri) return;
    navigation.replace('AnalysisLoading', { videoUri });
  }, [navigation, videoUri]);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted} numberOfLines={4}>
          Video recording is not supported on web in this build. Use iOS or Android with Expo Go.
        </Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.muted}>Checking permissions…</Text>
      </View>
    );
  }

  if (!allGranted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted} numberOfLines={4}>
          Camera, microphone, and photo library access are required to record and save video.
        </Text>
        <Pressable style={styles.btn} onPress={() => void requestAll()}>
          <Text style={styles.btnText}>Request permissions</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
      style={styles.scrollView}
    >
      <View style={styles.inner}>
        {phase !== 'preview' && (
          <View style={styles.cameraBox}>
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing="back"
              mode="video"
              mute={false}
              onCameraReady={() => setCameraReady(true)}
            />
          </View>
        )}

        {phase === 'idle' && (
          <Pressable
            style={[styles.btn, !cameraReady && styles.btnDisabled]}
            onPress={() => void startRecording()}
            disabled={!cameraReady}
          >
            <Text style={styles.btnText}>Start recording</Text>
          </Pressable>
        )}

        {phase === 'recording' && (
          <Pressable style={[styles.btn, styles.btnDanger]} onPress={() => void stopRecording()}>
            <Text style={styles.btnText}>Stop recording</Text>
          </Pressable>
        )}

        {phase === 'preview' && videoUri && (
          <>
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
            <Pressable
              style={[styles.btnSecondary, uploadingToServer && styles.btnDisabled]}
              onPress={() => void uploadToServer()}
              disabled={uploadingToServer}
            >
              {uploadingToServer ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={styles.btnSecondaryText}>Upload to server</Text>
              )}
            </Pressable>
            <Pressable style={styles.btnSecondary} onPress={discardRecording}>
              <Text style={styles.btnSecondaryText}>Discard</Text>
            </Pressable>
          </>
        )}
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
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  muted: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  cameraBox: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    aspectRatio: 3 / 4,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
  },
  camera: {
    flex: 1,
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
  btnDisabled: {
    opacity: 0.5,
  },
  btnDanger: {
    backgroundColor: colors.danger,
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
