import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { getJobStatus, getJobResult } from '../lib/api';
import type { HomeStackScreenProps } from '../navigation/types';
import { authColors, fontFamily, spacing } from '../theme';

const POLL_INTERVAL_MS = 3000;

const STAGE_LABELS: Record<string, string> = {
  pending: 'Queued…',
  downloading: 'Downloading video…',
  extracting_audio: 'Extracting audio…',
  transcribing: 'Transcribing speech…',
  analyzing: 'Analyzing speech…',
  analyzing_tone: 'Analyzing tone…',
  generating_feedback: 'Generating feedback…',
  burning_captions: 'Burning captions…',
  uploading_outputs: 'Finishing up…',
  completed: 'Done!',
};

export function AnalysisLoadingScreen({
  navigation,
  route,
}: HomeStackScreenProps<'AnalysisLoading'>) {
  const { jobId } = route.params;
  const [stageLabel, setStageLabel] = useState('Starting…');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const poll = async () => {
      try {
        const status = await getJobStatus(jobId);
        setStageLabel(STAGE_LABELS[status.stage] ?? status.stage);
        setProgress(status.progress);

        if (status.status === 'completed') {
          if (intervalRef.current) clearInterval(intervalRef.current);
          const result = await getJobResult(jobId);
          // mark that we're navigating here from the analysis flow so
          // the results screen can enforce "must watch full video" behavior
          navigation.replace('AnalysisResults', { result, fromAnalysis: true });
        } else if (status.status === 'failed') {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setError(status.error_message ?? 'Analysis failed. Please try again.');
        }
      } catch (e) {
        setError(String(e));
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    };

    void poll();
    intervalRef.current = setInterval(() => void poll(), POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [jobId, navigation]);

  return (
    <View style={styles.root}>
      <View style={styles.badge}>
        {error ? (
          <Text style={styles.errorIcon}>✕</Text>
        ) : (
          <ActivityIndicator size="large" color={authColors.cta} />
        )}
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {error ? 'Analysis failed' : 'Analyzing your session'}
      </Text>
      <Text style={styles.sub} numberOfLines={2}>
        {error ?? stageLabel}
      </Text>
      {!error && (
        <>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{progress}%</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: authColors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  badge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#FFFFFC',
    borderWidth: 1,
    borderColor: authColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorIcon: {
    fontSize: 32,
    color: '#C0392B',
  },
  title: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 20,
    color: authColors.text,
    marginTop: spacing.lg,
  },
  sub: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: authColors.textMuted,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  progressBar: {
    width: '100%',
    maxWidth: 280,
    height: 4,
    borderRadius: 2,
    backgroundColor: authColors.border,
    marginTop: spacing.xl,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: authColors.cta,
    borderRadius: 2,
  },
  progressLabel: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: authColors.textMuted,
    marginTop: spacing.sm,
  },
});
