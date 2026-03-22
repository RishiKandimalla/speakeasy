import { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { HomeStackScreenProps } from '../navigation/types';
import type { AnalysisResult } from '../types/analysis';
import { spacing } from '../theme';

// ── Figma design tokens ───────────────────────────────────────────────────────

const R = {
  bg: '#FFFAE0',
  // Hero card — Figma: #B9CCA3 fill, rgba(38,49,3,0.65) border
  heroBg: '#B9CCA3',
  heroBorder: 'rgba(38,49,3,0.65)',
  // Hero score — Figma: Corben 72px #5A6B40
  heroScore: '#5A6B40',
  // Badge — Figma: rgba(255,255,255,0.20) fill, rgba(255,255,255,0.30) border
  badgeBg: 'rgba(255,255,255,0.20)',
  badgeBorder: 'rgba(255,255,255,0.30)',
  badgeDot: '#5A6B40',
  badgeText: '#5A6B40',
  // Tabbed card — Figma: rgba(255,255,255,0.90) fill
  cardBg: 'rgba(255,255,255,0.90)',
  cardBorder: 'rgba(38,49,3,0.12)',
  // Section cards inside tab — Figma: rgba(255,250,224,0.50) fill
  innerBg: 'rgba(255,250,224,0.50)',
  innerBorder: 'rgba(38,49,3,0.08)',
  // Mini stat cards — Figma: rgba(255,255,255,0.60)
  miniCardBg: 'rgba(255,255,255,0.60)',
  // Sub-score boxes on hero — Figma: rgba(255,255,255,0.40)
  scoreBoxBg: 'rgba(255,255,255,0.40)',
  text: '#263103',
  textMuted: '#8A8070',
  // Accent — Figma: #5A6B40 olive green
  accent: '#5A6B40',
  // Filler amber — Figma: #AB902B
  amber: '#AB902B',
  amberBg: 'rgba(254,249,195,0.60)',
  amberBorder: 'rgba(133,79,11,0.10)',
  // Progress track
  progressBg: 'rgba(38,49,3,0.10)',
  // Tab colours
  tabActive: '#263103',
  tabInactive: '#8A8070',
  tabIndicator: '#5A6B40',
  // Share button — Figma: #757D5C
  btnBg: '#757D5C',
  toneBar1: '#D4537E',
  toneBar2: '#ED93B1',
  grammarBg: 'rgba(254,243,242,0.60)',
  grammarBorder: 'rgba(255,201,201,0.30)',
  grammarError: '#7A1A1A',
} as const;

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function scoreLabel(v: number) {
  if (v >= 85) return 'Excellent';
  if (v >= 70) return 'Good';
  if (v >= 55) return 'Fair';
  return 'Needs work';
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

// ── shared sub-components ─────────────────────────────────────────────────────

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <View style={pb.track}>
      <View style={[pb.fill, { width: `${clamp(pct, 0, 100)}%` as any, backgroundColor: color }]} />
    </View>
  );
}

const pb = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: R.progressBg,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 3 },
});

function SectionCard({ children }: { children: React.ReactNode }) {
  return <View style={scard.wrap}>{children}</View>;
}

const scard = StyleSheet.create({
  wrap: {
    backgroundColor: R.innerBg,
    borderWidth: 1.27,
    borderColor: R.innerBorder,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
});

// Figma: section headers use Corben 400 14px for title, icon wrap with brand bg
function SectionHeader({
  title,
  badge,
  iconBg,
  iconColor,
}: {
  title: string;
  badge?: string;
  iconBg?: string;
  iconColor?: string;
}) {
  return (
    <View style={sh.row}>
      <View style={[sh.iconWrap, { backgroundColor: iconBg ?? '#E8F5E3' }]} />
      <Text style={sh.title}>{title}</Text>
      {badge != null && <Text style={[sh.badge, iconColor ? { color: iconColor } : {}]}>{badge}</Text>}
    </View>
  );
}

const sh = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 14,
  },
  // Figma: section title is Corben 400 14px #263103
  title: {
    fontFamily: 'Corben_400Regular',
    fontSize: 14,
    lineHeight: 21,
    color: R.text,
    flex: 1,
    includeFontPadding: false,
  },
  // Figma: badge/count uses Corben 400 16px
  badge: {
    fontFamily: 'Corben_400Regular',
    fontSize: 16,
    lineHeight: 24,
    color: R.accent,
    includeFontPadding: false,
  },
});

// Figma: mini stat cards — rgba(255,255,255,0.60) bg, Corben 400 24px value
function MiniCard({
  label,
  value,
  sub,
  color,
  children,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={mc.wrap}>
      <Text style={mc.label}>{label}</Text>
      <Text style={[mc.value, color ? { color } : {}]}>{value}</Text>
      {children}
      {sub && <Text style={mc.sub}>{sub}</Text>}
    </View>
  );
}

const mc = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: R.miniCardBg,
    borderWidth: 1.27,
    borderColor: R.innerBorder,
    borderRadius: 14,
    padding: 13,
  },
  // Figma: label is Jost 400 10px #8A8070 uppercase letterSpacing 0.25
  label: {
    fontFamily: 'Jost_400Regular',
    fontSize: 10,
    color: R.textMuted,
    letterSpacing: 0.25,
    textTransform: 'uppercase',
    lineHeight: 15,
    marginBottom: 6,
  },
  // Figma: value is Corben 400 24px #263103
  value: {
    fontFamily: 'Corben_400Regular',
    fontSize: 24,
    lineHeight: 36,
    color: R.text,
    marginBottom: 4,
    includeFontPadding: false,
  },
  // Figma: sub is Jost 400 10px #8A8070
  sub: {
    fontFamily: 'Jost_400Regular',
    fontSize: 10,
    lineHeight: 15,
    color: R.textMuted,
  },
});

// ── hero card ─────────────────────────────────────────────────────────────────

function HeroCard({ result }: { result: AnalysisResult }) {
  const scores = result.scores;
  const tone = result.tone;

  const overall = Math.round(scores?.overall ?? 0);
  const delivery = Math.round(scores?.delivery ?? 0);
  const clarity = Math.round(scores?.clarity ?? 0);
  const vocab = Math.round(scores?.vocabulary ?? 0);
  const confidence = tone ? Math.round((tone.overall?.confidence ?? 0) * 100) : null;
  const energy = tone ? Math.round((tone.overall?.energy ?? 0) * 100) : null;

  return (
    <View style={hero.card}>
      {/* Figma: "Clarity Score" label — Corben 400 14px rgba(41,41,41,0.80) */}
      <Text style={hero.scoreLabel}>Clarity Score</Text>
      {/* Figma: big score — Corben 400 72px #5A6B40 */}
      <Text style={hero.score}>{overall}</Text>

      {/* Figma: "Excellent" badge — rgba(255,255,255,0.20) pill, rgba(255,255,255,0.30) border */}
      <View style={hero.badge}>
        <View style={hero.badgeDot} />
        {/* Figma: badge text — Jost 500 14px #5A6B40 */}
        <Text style={hero.badgeText}>{scoreLabel(overall)}</Text>
      </View>

      {/* Figma: 3 sub-score boxes — rgba(255,255,255,0.40), Jost 500 22px (Delivery), Corben 22px (Clarity/Vocab) */}
      <View style={hero.subRow}>
        <View style={hero.subBox}>
          <Text style={hero.subNumJost}>{delivery}</Text>
          <Text style={hero.subLabel}>DELIVERY</Text>
        </View>
        <View style={hero.subBox}>
          <Text style={hero.subNumCorben}>{clarity}</Text>
          <Text style={hero.subLabel}>CLARITY</Text>
        </View>
        <View style={hero.subBox}>
          <Text style={hero.subNumCorben}>{vocab}</Text>
          <Text style={hero.subLabel}>VOCAB</Text>
        </View>
      </View>

      {/* Figma: confidence/energy mini cards — rgba(255,255,255,0.30), #5A6B40 bar */}
      {(confidence != null || energy != null) && (
        <View style={hero.miniRow}>
          {confidence != null && (
            <View style={hero.miniCard}>
              <Text style={hero.miniLabel}>CONFIDENCE</Text>
              <View style={hero.miniTrack}>
                <View style={[hero.miniFill, { width: `${confidence}%` as any }]} />
              </View>
              <Text style={hero.miniVal}>{confidence} / 100</Text>
            </View>
          )}
          {energy != null && (
            <View style={hero.miniCard}>
              <Text style={hero.miniLabel}>ENERGY</Text>
              <View style={hero.miniTrack}>
                <View style={[hero.miniFill, { width: `${energy}%` as any }]} />
              </View>
              <Text style={hero.miniVal}>{energy} / 100</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const hero = StyleSheet.create({
  // Figma: #B9CCA3 fill, radius 24, rgba(38,49,3,0.65) border
  card: {
    marginHorizontal: 42,
    marginTop: 32,
    backgroundColor: R.heroBg,
    borderRadius: 24,
    borderWidth: 1.27,
    borderColor: R.heroBorder,
    paddingTop: 32,
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  // Figma: Corben 400 14px rgba(41,41,41,0.80)
  scoreLabel: {
    fontFamily: 'Corben_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(41,41,41,0.80)',
    marginBottom: 2,
    includeFontPadding: false,
  },
  // Figma: Corben 400 72px #5A6B40
  score: {
    fontFamily: 'Corben_400Regular',
    fontSize: 72,
    lineHeight: 104,
    color: R.heroScore,
    includeFontPadding: false,
  },
  // Figma: pill badge rgba(255,255,255,0.20) fill
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: R.badgeBg,
    borderWidth: 1.27,
    borderColor: R.badgeBorder,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 8,
    marginBottom: 20,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: R.badgeDot },
  // Figma: Jost 500 14px #5A6B40
  badgeText: {
    fontFamily: 'Jost_500Medium',
    fontSize: 14,
    lineHeight: 20,
    color: R.badgeText,
  },
  subRow: { flexDirection: 'row', gap: 10, marginBottom: 16, width: '100%' },
  subBox: {
    flex: 1,
    backgroundColor: R.scoreBoxBg,
    borderWidth: 1.27,
    borderColor: R.innerBorder,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 13,
    alignItems: 'center',
    gap: 4,
  },
  // Figma: Delivery uses Jost 500 22px
  subNumJost: {
    fontFamily: 'Jost_500Medium',
    fontSize: 22,
    lineHeight: 33,
    color: R.text,
  },
  // Figma: Clarity/Vocab use Corben 400 22px
  subNumCorben: {
    fontFamily: 'Corben_400Regular',
    fontSize: 22,
    lineHeight: 33,
    color: R.text,
    includeFontPadding: false,
  },
  // Figma: Jost 400 9px rgba(38,49,3,0.50) uppercase letterSpacing 0.45
  subLabel: {
    fontFamily: 'Jost_400Regular',
    fontSize: 9,
    lineHeight: 13.5,
    color: 'rgba(38,49,3,0.50)',
    letterSpacing: 0.45,
    textTransform: 'uppercase',
  },
  miniRow: { flexDirection: 'row', gap: 12, width: '100%' },
  // Figma: rgba(255,255,255,0.30) fill, radius 10, rgba(38,49,3,0.08) border
  miniCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.30)',
    borderWidth: 1.27,
    borderColor: R.innerBorder,
    borderRadius: 10,
    padding: 11,
  },
  // Figma: Jost 400 9px rgba(38,49,3,0.50) uppercase letterSpacing 0.45
  miniLabel: {
    fontFamily: 'Jost_400Regular',
    fontSize: 9,
    lineHeight: 13.5,
    color: 'rgba(38,49,3,0.50)',
    letterSpacing: 0.45,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  miniTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: R.progressBg,
    overflow: 'hidden',
    marginBottom: 6,
  },
  // Figma: bar fill is #5A6B40
  miniFill: { height: '100%', borderRadius: 3, backgroundColor: '#5A6B40' },
  // Figma: Jost 400 10px rgba(38,49,3,0.60) centred
  miniVal: {
    fontFamily: 'Jost_400Regular',
    fontSize: 10,
    lineHeight: 15,
    color: 'rgba(38,49,3,0.60)',
    textAlign: 'center',
  },
});

// ── tab bar ───────────────────────────────────────────────────────────────────

type Tab = 'Speech' | 'Vocabulary' | 'Grammar' | 'Feedback';
const TABS: Tab[] = ['Speech', 'Vocabulary', 'Grammar', 'Feedback'];

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tb.inner}
      >
        {TABS.map((tab) => (
          <Pressable key={tab} style={tb.btn} onPress={() => onChange(tab)}>
            {/* Figma: active tab has white bg panel behind it */}
            {active === tab && <View style={tb.activePanel} />}
            {/* Figma: Jost 500 13px, active #263103, inactive #8A8070 */}
            <Text style={[tb.label, active === tab && tb.labelActive]}>{tab}</Text>
            {/* Figma: #5A6B40 pill underline on active */}
            {active === tab && <View style={tb.indicator} />}
          </Pressable>
        ))}
      </ScrollView>
      {/* Figma: rgba(38,49,3,0.12) bottom divider */}
      <View style={tb.divider} />
    </View>
  );
}

const tb = StyleSheet.create({
  inner: { paddingHorizontal: 8, paddingTop: 4 },
  btn: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    paddingTop: 4,
    alignItems: 'center',
    position: 'relative',
    minWidth: 70,
  },
  // Figma: active tab has a white rounded-top background panel
  activePanel: {
    position: 'absolute',
    top: 4,
    left: 8,
    right: 8,
    bottom: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  label: {
    fontFamily: 'Jost_500Medium',
    fontSize: 13,
    lineHeight: 19.5,
    color: R.tabInactive,
    zIndex: 1,
  },
  labelActive: { color: R.tabActive },
  // Figma: pill underline #5A6B40
  indicator: {
    position: 'absolute',
    bottom: 0,
    left: 8,
    right: 8,
    height: 2,
    borderRadius: 1,
    backgroundColor: R.tabIndicator,
    zIndex: 1,
  },
  divider: { height: 1.27, backgroundColor: R.cardBorder },
});

// ── Speech tab ────────────────────────────────────────────────────────────────

function SpeechTab({ result }: { result: AnalysisResult }) {
  const m = result.metrics;
  if (!m) return <Text style={empty.text}>No speech data available.</Text>;

  const wpm = Math.round(m.wpm);
  const duration = fmtDuration(m.duration);
  const fillerCount = m.filler_count;
  const fillerRate = m.filler_rate.toFixed(1);
  const fillerPct = m.word_count > 0
    ? ((m.filler_count / m.word_count) * 100).toFixed(1)
    : '0';
  const fillerWords = Object.entries(m.filler_words ?? {}).slice(0, 4);
  const avgPause = m.avg_pause?.toFixed(1) ?? '—';
  const longestPause = m.longest_pause?.toFixed(1) ?? '—';
  const totalPause = ((m.avg_pause ?? 0) * (m.pause_count ?? 0)).toFixed(1);
  const accel = m.acceleration;
  const paceTrend =
    accel?.trend === 'accelerating' ? 'Speeding up slightly ↑'
    : accel?.trend === 'decelerating' ? 'Slowing down slightly ↓'
    : 'Steady pace →';

  return (
    <View>
      {/* Speaking Rate — Figma: #E8F5E3 icon bg */}
      <SectionCard>
        <SectionHeader title="Speaking Rate" iconBg="#E8F5E3" />
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
          <MiniCard label="Words / min" value={`${wpm}`} />
          <MiniCard label="Total words" value={`${m.word_count}`} sub={`in ${duration}`} />
        </View>
        {accel && (
          // Figma: pace trend card — rgba(232,245,227,0.60) bg, rgba(90,107,64,0.20) border
          <View style={sp.trendCard}>
            <Text style={sp.trendLabel}>PACE TREND</Text>
            {/* Figma: trend value — Corben 400 13px #263103 */}
            <Text style={sp.trendVal}>{paceTrend}</Text>
            <Text style={sp.trendSub}>
              First half: {Math.round(accel.first_half_wpm)} wpm · Second half:{' '}
              {Math.round(accel.second_half_wpm)} wpm
            </Text>
          </View>
        )}
      </SectionCard>

      {/* Filler Words — Figma: #FEF9C3 icon bg, badge Corben #AB902B */}
      <SectionCard>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <View style={[sh.iconWrap, { backgroundColor: '#FEF9C3' }]} />
          <Text style={sh.title}>Filler Words</Text>
          {/* Figma: "4 total" badge — Corben 400 16px #AB902B */}
          <Text style={sp.fillerBadge}>{fillerCount} total</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
          {/* Figma: Rate value is #AB902B amber */}
          <MiniCard label="Rate" value={fillerRate} sub="per minute" color={R.amber} />
          <MiniCard label="% of words" value={`${fillerPct}%`}>
            {/* Figma: filler bar is #FFEB92 yellow */}
            <ProgressBar pct={parseFloat(fillerPct) * 10} color="#FFEB92" />
          </MiniCard>
        </View>
        {fillerWords.length > 0 && (
          // Figma: filler word pills — rgba(254,249,195,0.60) bg, rgba(133,79,11,0.10) border
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {fillerWords.map(([word, count]) => (
              <View key={word} style={sp.pill}>
                <Text style={sp.pillText}>"{word}" </Text>
                <Text style={sp.pillCount}>×{count}</Text>
              </View>
            ))}
          </View>
        )}
      </SectionCard>

      {/* Pauses — Figma: #E0D6E8 lavender icon bg */}
      <SectionCard>
        <SectionHeader title="Pauses" iconBg="#E0D6E8" />
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
          <MiniCard label="Count" value={`${m.pause_count}`} sub="≥ 0.5s each" />
          <MiniCard label="Avg pause" value={`${avgPause}s`} />
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <MiniCard label="Longest" value={`${longestPause}s`} />
          <MiniCard label="Total pause" value={`${totalPause}s`} sub={`of ${duration} speech`} />
        </View>
      </SectionCard>
    </View>
  );
}

const sp = StyleSheet.create({
  // Figma: pace trend card rgba(232,245,227,0.60) bg, rgba(90,107,64,0.20) border
  trendCard: {
    backgroundColor: 'rgba(232,245,227,0.60)',
    borderWidth: 1.27,
    borderColor: 'rgba(90,107,64,0.20)',
    borderRadius: 14,
    padding: 13,
    gap: 4,
  },
  // Figma: Jost 400 10px #8A8070 uppercase letterSpacing 0.25
  trendLabel: {
    fontFamily: 'Jost_400Regular',
    fontSize: 10,
    color: R.textMuted,
    letterSpacing: 0.25,
    textTransform: 'uppercase',
    lineHeight: 15,
  },
  // Figma: Corben 400 13px #263103
  trendVal: {
    fontFamily: 'Corben_400Regular',
    fontSize: 13,
    lineHeight: 19.5,
    color: R.text,
    includeFontPadding: false,
  },
  // Figma: Jost 400 11px #8A8070
  trendSub: {
    fontFamily: 'Jost_400Regular',
    fontSize: 11,
    lineHeight: 16.5,
    color: R.textMuted,
  },
  // Figma: filler badge Corben 400 16px #AB902B
  fillerBadge: {
    fontFamily: 'Corben_400Regular',
    fontSize: 16,
    lineHeight: 24,
    color: R.amber,
    includeFontPadding: false,
  },
  // Figma: filler word pills rgba(254,249,195,0.60)
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: R.amberBg,
    borderWidth: 1.27,
    borderColor: R.amberBorder,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 6,
  },
  // Figma: Jost 400 12px #9F8113
  pillText: {
    fontFamily: 'Jost_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: '#9F8113',
  },
  // Figma: Jost 500 12px #9F8113
  pillCount: {
    fontFamily: 'Jost_500Medium',
    fontSize: 12,
    lineHeight: 18,
    color: '#9F8113',
  },
});

// ── Vocabulary tab ────────────────────────────────────────────────────────────

function VocabularyTab({ result }: { result: AnalysisResult }) {
  const m = result.metrics;
  const tone = result.tone;
  if (!m) return <Text style={empty.text}>No vocabulary data available.</Text>;

  const richness = (m.vocabulary_richness ?? 0).toFixed(2);
  const richnessPct = Math.round((m.vocabulary_richness ?? 0) * 100);
  const avgLen = (m.avg_word_length ?? 0).toFixed(1);
  const repeated = m.repeated_phrases ?? [];
  const confidence = tone ? Math.round((tone.overall?.confidence ?? 0) * 100) : null;
  const energy = tone ? Math.round((tone.overall?.energy ?? 0) * 100) : null;

  return (
    <View>
      <SectionCard>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <View style={[sh.iconWrap, { backgroundColor: '#EEF0E8' }]} />
          <Text style={sh.title}>Vocabulary richness</Text>
          <Text style={sh.badge}>{richnessPct}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <MiniCard label="Richness score" value={richness} color={R.accent}>
            <ProgressBar pct={richnessPct} color={R.accent} />
          </MiniCard>
          <MiniCard label="Avg word length" value={avgLen} sub="chars / word" />
        </View>
      </SectionCard>

      {repeated.length > 0 && (
        <SectionCard>
          <SectionHeader title="Repeated phrases" iconBg="#FEF9C3" />
          <Text style={voc.hint}>These phrases appeared 2+ times — try varying your wording.</Text>
          <View style={{ gap: 8 }}>
            {repeated.slice(0, 5).map((p, i) => (
              <View key={i} style={voc.phraseRow}>
                <Text style={voc.phraseText}>"{p.phrase}"</Text>
                <Text style={voc.phraseCount}>×{p.count}</Text>
              </View>
            ))}
          </View>
        </SectionCard>
      )}

      {(confidence != null || energy != null) && (
        <SectionCard>
          <SectionHeader title="Tone" iconBg="#FBEAF0" />
          {confidence != null && (
            <View style={voc.toneRow}>
              <Text style={voc.toneName}>Confidence</Text>
              <View style={voc.toneTrack}>
                <View style={[voc.toneFill, { width: `${confidence}%` as any, backgroundColor: R.toneBar1 }]} />
              </View>
              <Text style={voc.toneVal}>{confidence}</Text>
            </View>
          )}
          {energy != null && (
            <View style={voc.toneRow}>
              <Text style={voc.toneName}>Energy</Text>
              <View style={voc.toneTrack}>
                <View style={[voc.toneFill, { width: `${energy}%` as any, backgroundColor: R.toneBar2 }]} />
              </View>
              <Text style={voc.toneVal}>{energy}</Text>
            </View>
          )}
        </SectionCard>
      )}
    </View>
  );
}

const voc = StyleSheet.create({
  hint: {
    fontFamily: 'Jost_400Regular',
    fontSize: 12,
    lineHeight: 19,
    color: R.textMuted,
    marginBottom: 10,
  },
  phraseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(238,240,232,0.60)',
    borderWidth: 1.27,
    borderColor: 'rgba(38,49,3,0.10)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  phraseText: {
    fontFamily: 'Jost_500Medium',
    fontSize: 12,
    lineHeight: 18,
    color: R.text,
    flex: 1,
  },
  phraseCount: {
    fontFamily: 'Jost_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: R.accent,
  },
  toneRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  toneName: {
    fontFamily: 'Jost_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: R.textMuted,
    width: 80,
  },
  toneTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: R.progressBg, overflow: 'hidden' },
  toneFill: { height: '100%', borderRadius: 4 },
  toneVal: {
    fontFamily: 'Jost_500Medium',
    fontSize: 13,
    lineHeight: 19.5,
    color: R.text,
    width: 28,
    textAlign: 'right',
  },
});

// ── Grammar tab ───────────────────────────────────────────────────────────────

function GrammarTab({ result }: { result: AnalysisResult }) {
  const m = result.metrics;
  if (!m) return <Text style={empty.text}>No grammar data available.</Text>;

  const grammarScore = Math.round(m.grammar_score ?? 0);
  const allIssues = (m.sentences ?? []).flatMap((s) => s.grammar_issues ?? []).slice(0, 6);

  return (
    <View>
      <SectionCard>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <View style={[sh.iconWrap, { backgroundColor: '#E8F5E3' }]} />
          <Text style={sh.title}>Grammar score</Text>
          <Text style={sh.badge}>{grammarScore} / 100</Text>
        </View>
        <ProgressBar pct={grammarScore} color={R.accent} />
        {allIssues.length > 0 ? (
          <View style={{ gap: 8, marginTop: 16 }}>
            {allIssues.map((issue, i) => (
              <View key={i} style={gr.issueCard}>
                <Text style={gr.issueText}>"{issue.issue}"</Text>
                <Text style={gr.issueFix}>→ {issue.suggestion}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={gr.noIssues}>No grammar issues found. Great job!</Text>
        )}
      </SectionCard>
    </View>
  );
}

const gr = StyleSheet.create({
  issueCard: {
    backgroundColor: R.grammarBg,
    borderWidth: 1.27,
    borderColor: R.grammarBorder,
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  issueText: {
    fontFamily: 'Jost_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: R.grammarError,
    fontStyle: 'italic',
  },
  issueFix: {
    fontFamily: 'Jost_400Regular',
    fontSize: 11,
    lineHeight: 16.5,
    color: R.textMuted,
  },
  noIssues: {
    fontFamily: 'Jost_400Regular',
    fontSize: 13,
    lineHeight: 19.5,
    color: R.textMuted,
    marginTop: 12,
  },
});

// ── Feedback tab ──────────────────────────────────────────────────────────────

function FeedbackTab({ result }: { result: AnalysisResult }) {
  const feedback = result.feedback;
  if (!feedback) return <Text style={empty.text}>No feedback available.</Text>;

  return (
    <View>
      {feedback.summary ? (
        <SectionCard>
          <SectionHeader title="Summary" iconBg="#E6F1FB" />
          <Text style={fb.bodyText}>{feedback.summary}</Text>
        </SectionCard>
      ) : null}
      {feedback.strengths?.length > 0 && (
        <SectionCard>
          <SectionHeader title="Strengths" iconBg="#E8F5E3" />
          {feedback.strengths.map((s, i) => (
            <View key={i} style={fb.row}>
              <View style={[fb.dot, { backgroundColor: R.accent }]} />
              <Text style={fb.bodyText}>{s}</Text>
            </View>
          ))}
        </SectionCard>
      )}
      {feedback.improvements?.length > 0 && (
        <SectionCard>
          <SectionHeader title="To improve" iconBg="#FEF9C3" />
          {feedback.improvements.map((s, i) => (
            <View key={i} style={fb.row}>
              <View style={[fb.dot, { backgroundColor: R.amber }]} />
              <Text style={fb.bodyText}>{s}</Text>
            </View>
          ))}
        </SectionCard>
      )}
      {feedback.tips?.length > 0 && (
        <SectionCard>
          <SectionHeader title="Tips" iconBg="#E6F1FB" />
          {feedback.tips.map((s, i) => (
            <View key={i} style={fb.row}>
              <View style={[fb.dot, { backgroundColor: '#79B8FF' }]} />
              <Text style={fb.bodyText}>{s}</Text>
            </View>
          ))}
        </SectionCard>
      )}
    </View>
  );
}

const fb = StyleSheet.create({
  bodyText: {
    fontFamily: 'Jost_400Regular',
    fontSize: 13,
    lineHeight: 20,
    color: R.textMuted,
    flex: 1,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 6, flexShrink: 0 },
});

// ── empty state ───────────────────────────────────────────────────────────────

const empty = StyleSheet.create({
  text: {
    fontFamily: 'Jost_400Regular',
    fontSize: 13,
    lineHeight: 19.5,
    color: R.textMuted,
    padding: 16,
    textAlign: 'center',
  },
});

// ── main screen ───────────────────────────────────────────────────────────────

export function AnalysisSummaryScreen({
  navigation,
  route,
}: HomeStackScreenProps<'AnalysisSummary'>) {
  const insets = useSafeAreaInsets();
  const result: AnalysisResult = route.params.result;
  const [activeTab, setActiveTab] = useState<Tab>('Speech');

  const done = useCallback(() => {
    navigation.navigate('ShareResults', { result });
  }, [navigation, result]);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero score card */}
        <HeroCard result={result} />

        {/* Tabbed content card — Figma: rgba(255,255,255,0.90) radius 24 */}
        <View style={styles.tabbedCard}>
          <TabBar active={activeTab} onChange={setActiveTab} />
          <View style={styles.tabContent}>
            {activeTab === 'Speech' && <SpeechTab result={result} />}
            {activeTab === 'Vocabulary' && <VocabularyTab result={result} />}
            {activeTab === 'Grammar' && <GrammarTab result={result} />}
            {activeTab === 'Feedback' && <FeedbackTab result={result} />}
          </View>
        </View>
      </ScrollView>

      {/* Sticky share button — Figma: #757D5C fill, radius 14, Jost 500 14px white */}
      <View style={[styles.btnWrap, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable
          style={({ pressed }) => [styles.doneBtn, pressed && styles.doneBtnPressed]}
          onPress={done}
        >
          <Text style={styles.doneBtnText}>Share results</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: R.bg },
  scroll: { flex: 1 },

  // Figma: tabbed card rgba(255,255,255,0.90) radius 24, offset from edges
  tabbedCard: {
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 12,
    backgroundColor: R.cardBg,
    borderRadius: 24,
    borderWidth: 1.27,
    borderColor: R.cardBorder,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.10,
    shadowRadius: 3,
    elevation: 2,
  },
  tabContent: { padding: 16 },

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
  },
  // Figma: #757D5C fill, radius 14, shadow
  doneBtn: {
    backgroundColor: R.btnBg,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.10,
    shadowRadius: 3,
    elevation: 2,
  },
  doneBtnPressed: { backgroundColor: '#636950' },
  // Figma: Jost 500 14px white
  doneBtnText: {
    fontFamily: 'Jost_500Medium',
    fontSize: 14,
    lineHeight: 20,
    color: 'white',
  },
});