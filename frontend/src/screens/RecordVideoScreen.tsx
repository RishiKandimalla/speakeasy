import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CameraView } from 'expo-camera';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { VideoPreview } from '../components/VideoPreview';
import { usePermissions } from '../hooks/usePermissions';
import { createJob, uploadVideo } from '../lib/api';
import type { HomeStackParamList } from '../navigation/types';
import { fontFamily, spacing } from '../theme';

type Phase = 'idle' | 'recording' | 'preview';
type Nav = NativeStackNavigationProp<HomeStackParamList, 'RecordVideo'>;

const BG = '#2d2f2a';
const RED = '#fb2c36';
const OLIVE = '#5a6b40';
const { width: SW } = Dimensions.get('window');
const CIRCLE = SW - 40;
const WAVE_HEIGHTS = [12, 15, 23, 8, 19, 12, 12, 12, 12];

export function RecordVideoScreen() {
  const navigation = useNavigation<Nav>();
  const { allGranted, ready, requestAll } = usePermissions();
  const cameraRef = useRef<CameraView>(null);
  const recordingPromiseRef = useRef<Promise<{ uri: string } | undefined> | null>(null);

  const [phase, setPhase] = useState<Phase>('idle');
  const [cameraReady, setCameraReady] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [playbackPlaying, setPlaybackPlaying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadLabel, setUploadLabel] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const waveAnims = useRef(WAVE_HEIGHTS.map(() => new Animated.Value(1))).current;

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    if (phase === 'idle') {
      setCameraReady(false);
      setElapsed(0);
    }
  }, [phase, elapsed]);

  // Timer during recording
  useEffect(() => {
    if (phase !== 'recording') return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Waveform animation
  useEffect(() => {
    if (phase !== 'recording') {
      waveAnims.forEach((a) => a.setValue(1));
      return;
    }
    const anims = waveAnims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 0.2 + (i % 3) * 0.3,
            duration: 220 + i * 55,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.5 + (i % 2) * 0.5,
            duration: 220 + i * 55,
            useNativeDriver: true,
          }),
        ])
      )
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, [phase, waveAnims]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const startRecording = useCallback(async () => {
    if (!cameraRef.current || phase !== 'idle') return;
    try {
      recordingPromiseRef.current = cameraRef.current.recordAsync();
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
    if (!pending) { setPhase('idle'); return; }
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

  const analyze = useCallback(async () => {
    if (!videoUri || submitting) return;
    setSubmitting(true);
    setUploadLabel('Uploading video…');
    try {
      const upload = await uploadVideo(videoUri, 'recording.mp4');
      setUploadLabel('Starting analysis…');
      const job = await createJob(upload.upload_id);
      navigation.replace('AnalysisLoading', { jobId: job.job_id });
    } catch (e) {
      Alert.alert('Upload failed', String(e));
      setSubmitting(false);
      setUploadLabel('');
    }
  }, [videoUri, submitting, navigation]);

  // ── Permission gates ──────────────────────────────────────────────────────
  if (Platform.OS === 'web') {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Video recording is not supported on web.</Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#45E3A4" />
        <Text style={styles.muted}>Checking permissions…</Text>
      </View>
    );
  }

  if (!allGranted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>
          Camera, microphone, and photo library access are required.
        </Text>
        <Pressable style={styles.permBtn} onPress={() => void requestAll()}>
          <Text style={styles.permBtnText}>Request permissions</Text>
        </Pressable>
      </View>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <View style={styles.screen}>
      {/* Header */}
      <SafeAreaView>
        <View style={[styles.header, phase === 'recording' && styles.headerSpaceBetween]}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={10}>
            <Ionicons name="arrow-back" size={16} color="rgba(255,255,255,0.9)" />
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          {phase === 'recording' && (
            <>
              <View style={styles.recPill}>
                <View style={styles.recDot} />
                <Text style={styles.recLabel}>REC</Text>
              </View>
              <Text style={styles.timerText}>{formatTime(elapsed)}</Text>
            </>
          )}

          {phase === 'preview' && (
            <Pressable onPress={discardRecording} hitSlop={10}>
              <Text style={styles.reRecordHeaderBtn}>Re-record</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>

      {/* Camera area — CameraView stays mounted through idle↔recording */}
      {phase !== 'preview' && (
        <View style={styles.mainArea}>
          {/*
           * Wrapper style changes (circle → full) but CameraView stays in
           * the same tree position, so it is never unmounted between phases.
           */}
          <View style={phase === 'recording' ? styles.cameraFull : styles.cameraCircle}>
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing="front"
              mode="video"
              videoQuality="480p"
              mute={false}
              onCameraReady={() => setCameraReady(true)}
            />

            {/* Placeholder rings before camera is ready */}
            {phase === 'idle' && !cameraReady && (
              <View style={styles.placeholderOverlay}>
                <View style={styles.placeholderOuter}>
                  <View style={styles.placeholderInner} />
                </View>
              </View>
            )}

            {/* "Tap record to start" hint inside the circle */}
            {phase === 'idle' && (
              <View style={styles.tapHintWrapper}>
                <Text style={styles.tapHint}>Tap record to start</Text>
              </View>
            )}

            {/* Waveform bars overlay during recording */}
            {phase === 'recording' && (
              <View style={styles.waveform}>
                {WAVE_HEIGHTS.map((h, i) => (
                  <Animated.View
                    key={i}
                    style={[
                      styles.waveBar,
                      { height: h, transform: [{ scaleY: waveAnims[i] }] },
                    ]}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Spacer — pushes idle controls to bottom */}
          {phase === 'idle' && <View style={{ flex: 1 }} />}

          {/* Record / Stop button — absolute during recording, in-flow during idle */}
          <View
            style={
              phase === 'recording' ? styles.stopBtnAbsolute : styles.idleControls
            }
          >
            <Pressable
              style={[
                styles.circleBtn,
                phase === 'idle' && !cameraReady && styles.dimmed,
                phase === 'recording' && elapsed < 15 && styles.stopLocked,
                phase === 'recording' && elapsed >= 15 && styles.stopReady,
              ]}
              onPress={
                phase === 'idle'
                  ? () => void startRecording()
                  : () => void stopRecording()
              }
              disabled={(phase === 'idle' && !cameraReady) || (phase === 'recording' && elapsed < 15)}
            >
              {phase === 'idle' ? (
                <View style={styles.recordCore} />
              ) : (
                <View style={[styles.stopCore, elapsed >= 15 && styles.stopCoreReady]} />
              )}
            </Pressable>
              <Text style={styles.btnHint}>
                {phase === 'idle'
                  ? 'Tap to start recording'
                  : elapsed < 15
                  ? `Keep recording ${15 - elapsed}s to unlock stop`
                  : 'Tap to stop recording'}
              </Text>
          </View>
        </View>
      )}

      {/* Preview */}
      {phase === 'preview' && videoUri && (
        <View style={styles.previewArea}>
          <Text style={styles.completedTitle}>Recording complete</Text>

          <View style={styles.videoCard}>
            <VideoPreview uri={videoUri} isPlaying={playbackPlaying} />
          </View>

          <Text style={styles.durationLabel}>{formatTime(elapsed)}</Text>

          <Pressable
            style={[styles.analyzeBtn, submitting && styles.dimmed]}
            onPress={() => void analyze()}
            disabled={submitting}
          >
            {submitting ? (
              <View style={styles.row}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.analyzeBtnText}>{uploadLabel}</Text>
              </View>
            ) : (
              <View style={styles.row}>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
                <Text style={styles.analyzeBtnText}>Continue to analysis</Text>
              </View>
            )}
          </Pressable>

          <View style={styles.reRecordRow}>
            <Text style={styles.orText}>OR </Text>
            <Pressable onPress={discardRecording} hitSlop={8}>
              <Text style={styles.reRecordLink}>RE-RECORD</Text>
            </Pressable>
            <Text style={styles.orText}> IF YOU'RE NOT HAPPY</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  centered: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  muted: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  permBtn: {
    backgroundColor: '#45E3A4',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
    borderRadius: 16,
  },
  permBtnText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 15,
    color: BG,
    fontWeight: '600',
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    height: 56,
  },
  headerSpaceBetween: { justifyContent: 'space-between' },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  backText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  recPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251,44,54,0.2)',
    borderWidth: 1.3,
    borderColor: 'rgba(251,44,54,0.3)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: spacing.xs,
  },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: RED },
  recLabel: { fontFamily: fontFamily.bodyMedium, fontSize: 12, color: '#fff' },
  timerText: { fontFamily: fontFamily.bodyMedium, fontSize: 24, color: '#fff' },
  reRecordHeaderBtn: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },

  // ── Camera ──
  mainArea: { flex: 1 },

  cameraCircle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    overflow: 'hidden',
    backgroundColor: '#3a3c37',
    alignSelf: 'center',
    marginTop: spacing.xxl,
  },
  cameraFull: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#3a3c37',
  },

  placeholderOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  tapHintWrapper: {
    position: 'absolute',
    bottom: spacing.xl,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  tapHint: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
  },

  waveform: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },

  idleControls: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  stopBtnAbsolute: {
    position: 'absolute',
    bottom: spacing.xxl,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: spacing.sm,
  },

  circleBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1.3,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopLocked: {
    backgroundColor: 'rgba(100,100,100,0.3)',
    borderColor: 'rgba(100,100,100,0.4)',
    opacity: 0.5,
  },
  stopReady: {
    backgroundColor: RED,
    borderColor: RED,
    opacity: 1,
  },
  dimmed: { opacity: 0.4 },
  recordCore: { width: 64, height: 64, borderRadius: 32, backgroundColor: RED },
  stopCore: { width: 28, height: 28, borderRadius: 4, backgroundColor: RED },
  stopCoreReady: { backgroundColor: '#fff' },
  btnHint: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },

  // ── Preview ──
  previewArea: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  completedTitle: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
  },
  videoCard: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#3a3c37',
  },
  durationLabel: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'right',
  },
  analyzeBtn: {
    backgroundColor: OLIVE,
    paddingVertical: spacing.md + 2,
    borderRadius: 16,
    alignItems: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  analyzeBtnText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 14,
    color: '#fff',
  },
  reRecordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: spacing.xxl,
  },
  orText: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
  reRecordLink: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    textDecorationLine: 'underline',
  },
});
