import { CameraView } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppHeading } from '../components/AppHeading';
import { VideoPreview } from '../components/VideoPreview';
import { usePermissions } from '../hooks/usePermissions';
import { persistVideoFromUri } from '../lib/savedVideos';

type Phase = 'idle' | 'recording' | 'preview';

export function HomeScreen() {
  const { allGranted, ready, requestAll } = usePermissions();
  const cameraRef = useRef<CameraView>(null);
  const recordingPromiseRef = useRef<Promise<{ uri: string } | undefined> | null>(
    null,
  );

  const [phase, setPhase] = useState<Phase>('idle');
  const [cameraReady, setCameraReady] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [playbackPlaying, setPlaybackPlaying] = useState(false);

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

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <AppHeading />
        <Text style={styles.subtitle}>
          Video recording is not supported on web in this build. Use iOS or Android with Expo Go.
        </Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={styles.container}>
        <AppHeading />
        <Text style={styles.subtitle}>Checking permissions…</Text>
      </View>
    );
  }

  if (!allGranted) {
    return (
      <View style={styles.container}>
        <AppHeading />
        <Text style={styles.subtitle}>
          Camera, microphone, and photo library access are required to record and save video.
        </Text>
        <Button title="Request permissions" onPress={() => void requestAll()} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.inner}>
        <AppHeading />
        <Text style={styles.subtitle}>Record, play back, save to camera roll</Text>

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
          <View style={styles.row}>
            <Button
              title="Start recording"
              onPress={() => void startRecording()}
              disabled={!cameraReady}
            />
          </View>
        )}

        {phase === 'recording' && (
          <View style={styles.row}>
            <Button title="Stop recording" onPress={() => void stopRecording()} color="#c00" />
          </View>
        )}

        {phase === 'preview' && videoUri && (
          <>
            <VideoPreview uri={videoUri} isPlaying={playbackPlaying} />
            <View style={styles.row}>
              <Button
                title={playbackPlaying ? 'Pause' : 'Play'}
                onPress={() => setPlaybackPlaying((p) => !p)}
              />
            </View>
            <View style={styles.row}>
              <Button title="Save to camera roll" onPress={() => void saveToCameraRoll()} />
            </View>
            <View style={styles.row}>
              <Button title="Keep in app" onPress={() => void keepInApp()} />
            </View>
            <View style={styles.row}>
              <Button title="Discard / record again" onPress={discardRecording} />
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 16,
  },
  cameraBox: {
    width: '100%',
    maxWidth: 360,
    aspectRatio: 3 / 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#111',
    marginBottom: 16,
  },
  camera: {
    flex: 1,
  },
  row: {
    width: '100%',
    maxWidth: 360,
    marginBottom: 10,
  },
});
