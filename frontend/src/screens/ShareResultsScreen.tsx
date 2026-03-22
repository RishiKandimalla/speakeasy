import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { publishPost } from '../lib/api';
import type { HomeStackScreenProps } from '../navigation/types';
import type { AnalysisResult } from '../types/analysis';
import { authColors, spacing } from '../theme';

// ── design tokens ─────────────────────────────────────────────────────────────

const R = {
  bg: '#FFFAE0',
  cardBg: 'rgba(255,255,255,0.55)',
  cardBorder: 'rgba(38,49,3,0.18)',
  text: '#263103',
  textMuted: '#6B7280',
  textSoft: '#8A8070',
  accent: '#5A6B40',
  accentLight: 'rgba(90,107,64,0.10)',
  unselectedIconBg: 'rgba(138,128,112,0.20)',
  // Primary button — Figma: #757D5C
  btnBg: '#757D5C',
  cancelBg: 'rgba(255,255,255,0.55)',
} as const;

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ── video summary card ────────────────────────────────────────────────────────

function VideoSummaryCard({ result }: { result: AnalysisResult }) {
  const duration = result.metrics ? fmtDuration(result.metrics.duration) : '0:00';
  const clarityScore = Math.round(result.scores?.clarity ?? result.scores?.overall ?? 0);
  const wpm = result.metrics ? Math.round(result.metrics.wpm) : 0;
  const fillerCount = result.metrics?.filler_count ?? 0;

  return (
    <View style={vs.card}>
      {/* Figma: Corben 400 18px #263103 */}
      <Text style={vs.title}>Video Summary</Text>
      <View style={vs.rows}>
        <View style={vs.row}>
          <Text style={vs.label}>Duration</Text>
          <Text style={vs.value}>{duration}</Text>
        </View>
        <View style={vs.row}>
          <Text style={vs.label}>Clarity Score</Text>
          <View style={vs.scorePill}>
            <Text style={vs.scoreText}>{clarityScore}</Text>
          </View>
        </View>
        <View style={vs.row}>
          <Text style={vs.label}>Speaking Rate</Text>
          <Text style={vs.value}>{wpm} wpm</Text>
        </View>
        <View style={vs.row}>
          <Text style={vs.label}>Filler Words</Text>
          <Text style={vs.value}>{fillerCount}</Text>
        </View>
      </View>
    </View>
  );
}

const vs = StyleSheet.create({
  card: {
    backgroundColor: R.cardBg,
    borderWidth: 1.27,
    borderColor: R.cardBorder,
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.10,
    shadowRadius: 3,
    elevation: 2,
  },
  title: {
    fontFamily: 'Corben_400Regular',
    fontSize: 18,
    lineHeight: 27,
    color: R.text,
    marginBottom: 20,
    includeFontPadding: false,
  },
  rows: { gap: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: {
    fontFamily: 'Jost_400Regular',
    fontSize: 14,
    lineHeight: 21,
    color: R.textMuted,
  },
  value: {
    fontFamily: 'Jost_500Medium',
    fontSize: 16,
    lineHeight: 24,
    color: R.text,
  },
  scorePill: {
    backgroundColor: R.accent,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 4,
    minWidth: 48,
    alignItems: 'center',
  },
  scoreText: {
    fontFamily: 'Jost_500Medium',
    fontSize: 16,
    lineHeight: 24,
    color: 'white',
  },
});

// ── privacy settings card ─────────────────────────────────────────────────────

type Privacy = 'private' | 'public';

function PrivacySettingsCard({
  selected,
  onChange,
}: {
  selected: Privacy;
  onChange: (p: Privacy) => void;
}) {
  return (
    <View style={ps.card}>
      <Text style={ps.title}>Privacy Settings</Text>
      <View style={{ gap: 12 }}>
        <Pressable
          style={[ps.option, selected === 'public' && ps.optionSelected]}
          onPress={() => onChange('public')}
        >
          <View style={[ps.iconCircle, selected === 'public' && ps.iconCircleSelected]}>
            <Ionicons name="globe-outline" size={22} color={selected === 'public' ? 'white' : '#8A8070'} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={ps.optionTitle}>Public</Text>
            <Text style={ps.optionDesc}>Share to your profile and the community feed</Text>
          </View>
          {selected === 'public' && <Ionicons name="checkmark" size={20} color={R.accent} />}
        </Pressable>

        <Pressable
          style={[ps.option, selected === 'private' && ps.optionSelected]}
          onPress={() => onChange('private')}
        >
          <View style={[ps.iconCircle, selected === 'private' && ps.iconCircleSelected]}>
            <Ionicons name="lock-closed-outline" size={22} color={selected === 'private' ? 'white' : '#8A8070'} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={ps.optionTitle}>Private</Text>
            <Text style={ps.optionDesc}>Save to your account only (visible only to you)</Text>
          </View>
          {selected === 'private' && <Ionicons name="checkmark" size={20} color={R.accent} />}
        </Pressable>
      </View>
    </View>
  );
}

const ps = StyleSheet.create({
  card: {
    backgroundColor: R.cardBg,
    borderWidth: 1.27,
    borderColor: R.cardBorder,
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.10,
    shadowRadius: 3,
    elevation: 2,
  },
  title: {
    fontFamily: 'Corben_400Regular',
    fontSize: 18,
    lineHeight: 27,
    color: R.text,
    marginBottom: 20,
    includeFontPadding: false,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.30)',
    borderWidth: 1.27,
    borderColor: R.cardBorder,
    borderRadius: 14,
    padding: 16,
  },
  optionSelected: {
    backgroundColor: R.accentLight,
    borderColor: R.accent,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: R.unselectedIconBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleSelected: {
    backgroundColor: R.accent,
  },
  optionTitle: {
    fontFamily: 'Corben_400Regular',
    fontSize: 16,
    lineHeight: 24,
    color: R.text,
    marginBottom: 2,
    includeFontPadding: false,
  },
  optionDesc: {
    fontFamily: 'Jost_400Regular',
    fontSize: 13,
    lineHeight: 19.5,
    color: R.textMuted,
  },
});

// ── social media card ─────────────────────────────────────────────────────────

function SocialMediaCard() {
  return (
    <View style={sm.card}>
      <Text style={sm.title}>Share to Social Media</Text>
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable style={sm.socialBtn}>
            <Ionicons name="logo-instagram" size={16} color={R.text} />
            <Text style={sm.socialText}>Instagram</Text>
          </Pressable>
          <Pressable style={sm.socialBtn}>
            <Ionicons name="logo-twitter" size={16} color={R.text} />
            <Text style={sm.socialText}>Twitter</Text>
          </Pressable>
        </View>
        <Pressable style={sm.downloadBtn}>
          <Ionicons name="download-outline" size={16} color={R.text} />
          <Text style={sm.socialText}>Download Video</Text>
        </Pressable>
      </View>
    </View>
  );
}

const sm = StyleSheet.create({
  card: {
    backgroundColor: R.cardBg,
    borderWidth: 1.27,
    borderColor: R.cardBorder,
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.10,
    shadowRadius: 3,
    elevation: 2,
  },
  title: {
    fontFamily: 'Corben_400Regular',
    fontSize: 18,
    lineHeight: 27,
    color: R.text,
    marginBottom: 16,
    includeFontPadding: false,
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: R.cardBg,
    borderWidth: 1.27,
    borderColor: R.cardBorder,
    borderRadius: 14,
    paddingVertical: 10,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: R.cardBg,
    borderWidth: 1.27,
    borderColor: R.cardBorder,
    borderRadius: 14,
    paddingVertical: 10,
  },
  socialText: {
    fontFamily: 'Jost_500Medium',
    fontSize: 14,
    lineHeight: 20,
    color: R.text,
  },
});

// ── confirmation shared styles ────────────────────────────────────────────────

const conf = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: R.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  // Figma: #5A6B40 circle 96×96
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#5A6B40',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.10,
    shadowRadius: 15,
    elevation: 8,
  },
  // Figma: Corben 400 30px #263103
  heading: {
    fontFamily: 'Corben_400Regular',
    fontSize: 30,
    lineHeight: 44,
    color: '#263103',
    marginBottom: 12,
    textAlign: 'center',
    includeFontPadding: false,
  },
  // Figma: Jost 400 16px #8A8070
  sub: {
    fontFamily: 'Jost_400Regular',
    fontSize: 16,
    lineHeight: 24,
    color: '#8A8070',
    textAlign: 'center',
    marginBottom: 36,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  // Figma: #757D5C fill, radius 14, Jost 500 14px white
  primaryBtn: {
    backgroundColor: '#757D5C',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  primaryText: {
    fontFamily: 'Jost_500Medium',
    fontSize: 14,
    lineHeight: 20,
    color: 'white',
  },
  // Figma: rgba(255,255,255,0.55) frosted, olive border, radius 14
  secondaryBtn: {
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1.27,
    borderColor: 'rgba(38,49,3,0.18)',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  // Figma: Jost 500 14px #263103
  secondaryText: {
    fontFamily: 'Jost_500Medium',
    fontSize: 14,
    lineHeight: 20,
    color: '#263103',
  },
});

// ── saved confirmation ────────────────────────────────────────────────────────

function SavedConfirmation({ onViewSaved, onGoHome }: { onViewSaved: () => void; onGoHome: () => void }) {
  return (
    <View style={conf.root}>
      <View style={conf.iconWrap}>
        <Ionicons name="checkmark" size={48} color="white" />
      </View>
      <Text style={conf.heading}>Video Saved!</Text>
      <Text style={conf.sub}>Your video has been saved privately to your account</Text>
      <View style={conf.btnRow}>
        <Pressable style={conf.primaryBtn} onPress={onViewSaved}>
          <Text style={conf.primaryText}>View Saved</Text>
        </Pressable>
        <Pressable style={conf.secondaryBtn} onPress={onGoHome}>
          <Text style={conf.secondaryText}>Go Home</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── posted confirmation ───────────────────────────────────────────────────────

function PostedConfirmation({ onViewProfile, onGoHome }: { onViewProfile: () => void; onGoHome: () => void }) {
  return (
    <View style={conf.root}>
      <View style={conf.iconWrap}>
        <Ionicons name="checkmark" size={48} color="white" />
      </View>
      <Text style={conf.heading}>Video Posted!</Text>
      <Text style={conf.sub}>Your video is now visible on your profile and in the review feed</Text>
      <View style={conf.btnRow}>
        <Pressable style={conf.primaryBtn} onPress={onViewProfile}>
          <Text style={conf.primaryText}>View Profile</Text>
        </Pressable>
        <Pressable style={conf.secondaryBtn} onPress={onGoHome}>
          <Text style={conf.secondaryText}>Go Home</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── main screen ───────────────────────────────────────────────────────────────

type Outcome = null | 'saved' | 'posted';

export function ShareResultsScreen({
  navigation,
  route,
}: HomeStackScreenProps<'ShareResults'>) {
  const insets = useSafeAreaInsets();
  const result: AnalysisResult = route.params.result;

  const [privacy, setPrivacy] = useState<Privacy>('private');
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [submitting, setSubmitting] = useState(false);

  const goHome = useCallback(() => {
    navigation.reset({ index: 0, routes: [{ name: 'HomeDashboard' }] });
  }, [navigation]);

  const goProfile = useCallback(() => {
    navigation.reset({ index: 0, routes: [{ name: 'HomeDashboard' }] });
    navigation.getParent()?.navigate('Profile');
  }, [navigation]);

  const handleCancel = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handlePrimaryAction = useCallback(async () => {
    if (submitting) return;
    const isPublic = privacy === 'public';
    if (!isPublic) {
      setOutcome('saved');
      return;
    }
    setSubmitting(true);
    try {
      await publishPost(result.job_id);
      setOutcome('posted');
    } catch (e) {
      Alert.alert('Could not publish post', String(e));
    } finally {
      setSubmitting(false);
    }
  }, [privacy, result.job_id, submitting]);

  if (outcome === 'saved') {
    return <SavedConfirmation onViewSaved={goProfile} onGoHome={goHome} />;
  }

  if (outcome === 'posted') {
    return <PostedConfirmation onViewProfile={goProfile} onGoHome={goHome} />;
  }

  const isPublic = privacy === 'public';

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <VideoSummaryCard result={result} />
        <PrivacySettingsCard selected={privacy} onChange={setPrivacy} />
        {isPublic && <SocialMediaCard />}
      </ScrollView>

      {/* Sticky action buttons */}
      <View style={[styles.btnWrap, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable
          style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]}
          onPress={handlePrimaryAction}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons
                name={isPublic ? 'share-social-outline' : 'lock-closed-outline'}
                size={16}
                color="white"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.primaryText}>
                {isPublic ? 'Post to Profile' : 'Save Privately'}
              </Text>
            </>
          )}
        </Pressable>

        <Pressable style={styles.cancelBtn} onPress={handleCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: R.bg },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  btnWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: R.bg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(38,49,3,0.08)',
    gap: 10,
  },
  // Figma: #757D5C fill, Jost 500 14px white
  primaryBtn: {
    backgroundColor: R.btnBg,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.10,
    shadowRadius: 3,
    elevation: 2,
  },
  primaryBtnDisabled: { opacity: 0.75 },
  primaryText: {
    fontFamily: 'Jost_500Medium',
    fontSize: 14,
    lineHeight: 20,
    color: 'white',
  },
  // Figma: frosted cancel button
  cancelBtn: {
    backgroundColor: R.cancelBg,
    borderWidth: 1.27,
    borderColor: R.cardBorder,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: 'Jost_500Medium',
    fontSize: 14,
    lineHeight: 20,
    color: R.text,
  },
});