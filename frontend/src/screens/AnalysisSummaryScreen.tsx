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
import { fontFamily } from '../theme';

// ── Figma design tokens ──────────────────────────────────────────────────────

const R = {
  bg: '#fffae0',
  heroBg: '#d0e9ab',
  heroBorder: 'rgba(38,49,3,0.65)',
  heroScore: '#388223',
  badgeBg: 'rgba(255,255,255,0.2)',
  badgeBorder: 'rgba(255,255,255,0.3)',
  badgeDot: '#8bc87a',
  badgeText: '#5fc144',
  cardBg: 'rgba(255,255,255,0.9)',
  cardBorder: 'rgba(38,49,3,0.12)',
  innerBg: 'rgba(255,250,224,0.5)',
  innerBorder: 'rgba(38,49,3,0.08)',
  miniCardBg: 'rgba(255,255,255,0.6)',
  scoreBoxBg: 'rgba(255,255,255,0.4)',
  text: '#263103',
  textMuted: '#8a8070',
  accent: '#5a6b40',
  accentGreen: '#86cc1b',
  amber: '#854f0b',
  amberBg: 'rgba(254,249,195,0.6)',
  amberBorder: 'rgba(133,79,11,0.1)',
  progressBg: 'rgba(38,49,3,0.1)',
  tabActive: '#263103',
  tabInactive: '#8a8070',
  tabIndicator: '#5a6b40',
  btnBg: '#4a5240',
  toneBar1: '#d4537e',
  toneBar2: '#ed93b1',
  grammarBg: 'rgba(254,243,242,0.6)',
  grammarBorder: 'rgba(255,201,201,0.3)',
  grammarError: '#7a1a1a',
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
      <View
        style={[pb.fill, { width: `${clamp(pct, 0, 100)}%` as any, backgroundColor: color }]}
      />
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

function SectionHeader({
  icon,
  title,
  badge,
  iconBg,
}: {
  icon: string;
  title: string;
  badge?: string;
  iconBg?: string;
}) {
  return (
    <View style={sh.row}>
      <View style={[sh.iconWrap, { backgroundColor: iconBg ?? '#e8f5e3' }]}>
        <Text style={sh.iconText}>{icon}</Text>
      </View>
      <Text style={sh.title}>{title}</Text>
      {badge != null && <Text style={sh.badge}>{badge}</Text>}
    </View>
  );
}

const sh = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 15 },
  title: { fontFamily: fontFamily.bodyMedium, fontSize: 14, color: R.text, flex: 1 },
  badge: { fontFamily: fontFamily.bodyMedium, fontSize: 16, color: R.accent },
});

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
    padding: 12,
  },
  label: {
    fontFamily: fontFamily.body,
    fontSize: 10,
    color: R.textMuted,
    letterSpacing: 0.25,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  value: {
    fontFamily: fontFamily.display,
    fontSize: 24,
    color: R.text,
    marginBottom: 4,
  },
  sub: { fontFamily: fontFamily.body, fontSize: 10, color: R.textMuted },
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
      <Text style={hero.scoreLabel}>Overall score</Text>
      <Text style={hero.score}>{overall}</Text>

      <View style={hero.badge}>
        <View style={hero.badgeDot} />
        <Text style={hero.badgeText}>{scoreLabel(overall)}</Text>
      </View>

      {/* 3 sub-scores */}
      <View style={hero.subRow}>
        {[
          { num: delivery, label: 'DELIVERY' },
          { num: clarity, label: 'CLARITY' },
          { num: vocab, label: 'VOCAB' },
        ].map(({ num, label }) => (
          <View key={label} style={hero.subBox}>
            <Text style={hero.subNum}>{num}</Text>
            <Text style={hero.subLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Confidence / Energy mini bars */}
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
  card: {
    marginHorizontal: 24,
    marginTop: 20,
    backgroundColor: R.heroBg,
    borderRadius: 24,
    borderWidth: 1.27,
    borderColor: R.heroBorder,
    paddingTop: 32,
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
  },
  scoreLabel: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: 'rgba(41,41,41,0.8)',
    marginBottom: 2,
  },
  score: {
    fontFamily: fontFamily.playfairSemiBold,
    fontSize: 72,
    color: R.heroScore,
    lineHeight: 80,
  },
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
  badgeText: { fontFamily: fontFamily.bodyMedium, fontSize: 14, color: R.badgeText },
  subRow: { flexDirection: 'row', gap: 10, marginBottom: 16, width: '100%' },
  subBox: {
    flex: 1,
    backgroundColor: R.scoreBoxBg,
    borderWidth: 1.27,
    borderColor: R.innerBorder,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  subNum: { fontFamily: fontFamily.display, fontSize: 22, color: R.text, marginBottom: 2 },
  subLabel: {
    fontFamily: fontFamily.body,
    fontSize: 9,
    color: 'rgba(38,49,3,0.5)',
    letterSpacing: 0.45,
  },
  miniRow: { flexDirection: 'row', gap: 12, width: '100%' },
  miniCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 1.27,
    borderColor: R.innerBorder,
    borderRadius: 10,
    padding: 10,
  },
  miniLabel: {
    fontFamily: fontFamily.body,
    fontSize: 9,
    color: 'rgba(38,49,3,0.5)',
    letterSpacing: 0.45,
    marginBottom: 8,
  },
  miniTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: R.progressBg,
    overflow: 'hidden',
    marginBottom: 6,
  },
  miniFill: { height: '100%', borderRadius: 3, backgroundColor: R.accentGreen },
  miniVal: {
    fontFamily: fontFamily.body,
    fontSize: 10,
    color: 'rgba(38,49,3,0.6)',
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
            <Text style={[tb.label, active === tab && tb.labelActive]}>{tab}</Text>
            {active === tab && <View style={tb.indicator} />}
          </Pressable>
        ))}
      </ScrollView>
      <View style={tb.divider} />
    </View>
  );
}

const tb = StyleSheet.create({
  inner: { paddingHorizontal: 16, paddingTop: 8 },
  btn: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    alignItems: 'center',
    position: 'relative',
  },
  label: { fontFamily: fontFamily.bodyMedium, fontSize: 13, color: R.tabInactive },
  labelActive: { color: R.tabActive },
  indicator: {
    position: 'absolute',
    bottom: 0,
    left: 8,
    right: 8,
    height: 2,
    borderRadius: 1,
    backgroundColor: R.tabIndicator,
  },
  divider: { height: 1.27, backgroundColor: R.cardBorder, marginHorizontal: 16 },
});

// ── Speech tab ─────────────────────────────────────────────────────────────────

function SpeechTab({ result }: { result: AnalysisResult }) {
  const m = result.metrics;
  if (!m) {
    return <Text style={empty.text}>No speech data available.</Text>;
  }

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
      {/* Speaking rate */}
      <SectionCard>
        <SectionHeader icon="🎤" title="Speaking rate" iconBg="#e8f5e3" />
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
          <MiniCard label="Words / min" value={`${wpm}`} />
          <MiniCard label="Total words" value={`${m.word_count}`} sub={`in ${duration}`} />
        </View>
        {accel && (
          <View style={sp.trendCard}>
            <Text style={sp.trendLabel}>PACE TREND</Text>
            <Text style={sp.trendVal}>{paceTrend}</Text>
            <Text style={sp.trendSub}>
              First half: {Math.round(accel.first_half_wpm)} wpm · Second half:{' '}
              {Math.round(accel.second_half_wpm)} wpm
            </Text>
          </View>
        )}
      </SectionCard>

      {/* Filler words */}
      <SectionCard>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <View style={[sh.iconWrap, { backgroundColor: '#fef9c3' }]}>
            <Text style={sh.iconText}>⚡</Text>
          </View>
          <Text style={[sh.title]}>Filler words</Text>
          <Text style={sp.fillerBadge}>{fillerCount} total</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
          <MiniCard label="Rate" value={fillerRate} sub="per minute" color={R.amber} />
          <MiniCard label="% of words" value={`${fillerPct}%`}>
            <ProgressBar pct={parseFloat(fillerPct) * 10} color="#ef9f27" />
          </MiniCard>
        </View>
        {fillerWords.length > 0 && (
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

      {/* Pauses */}
      <SectionCard>
        <SectionHeader icon="⏸️" title="Pauses" iconBg="#e6f1fb" />
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
  trendCard: {
    backgroundColor: 'rgba(232,245,227,0.6)',
    borderWidth: 1.27,
    borderColor: 'rgba(90,107,64,0.2)',
    borderRadius: 14,
    padding: 12,
  },
  trendLabel: {
    fontFamily: fontFamily.body,
    fontSize: 10,
    color: R.textMuted,
    letterSpacing: 0.25,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  trendVal: { fontFamily: fontFamily.bodyMedium, fontSize: 13, color: R.text, marginBottom: 2 },
  trendSub: { fontFamily: fontFamily.body, fontSize: 11, color: R.textMuted },
  fillerBadge: { fontFamily: fontFamily.bodyMedium, fontSize: 16, color: R.amber },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: R.amberBg,
    borderWidth: 1.27,
    borderColor: R.amberBorder,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillText: { fontFamily: fontFamily.body, fontSize: 12, color: R.amber },
  pillCount: { fontFamily: fontFamily.bodyMedium, fontSize: 12, color: R.amber },
});

// ── Vocabulary tab ─────────────────────────────────────────────────────────────

function VocabularyTab({ result }: { result: AnalysisResult }) {
  const m = result.metrics;
  const tone = result.tone;
  if (!m) {
    return <Text style={empty.text}>No vocabulary data available.</Text>;
  }

  const richness = (m.vocabulary_richness ?? 0).toFixed(2);
  const richnessPct = Math.round((m.vocabulary_richness ?? 0) * 100);
  const avgLen = (m.avg_word_length ?? 0).toFixed(1);
  const repeated = m.repeated_phrases ?? [];
  const confidence = tone ? Math.round((tone.overall?.confidence ?? 0) * 100) : null;
  const energy = tone ? Math.round((tone.overall?.energy ?? 0) * 100) : null;

  return (
    <View>
      {/* Vocabulary richness */}
      <SectionCard>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <View style={[sh.iconWrap, { backgroundColor: '#eef0e8' }]}>
            <Text style={sh.iconText}>📖</Text>
          </View>
          <Text style={sh.title}>Vocabulary richness</Text>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 16, color: R.accent }}>
            {richnessPct}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <MiniCard label="Richness score" value={richness} color={R.accent}>
            <ProgressBar pct={richnessPct} color={R.accent} />
          </MiniCard>
          <MiniCard label="Avg word length" value={avgLen} sub="chars / word" />
        </View>
      </SectionCard>

      {/* Repeated phrases */}
      {repeated.length > 0 && (
        <SectionCard>
          <SectionHeader icon="🔁" title="Repeated phrases" iconBg="#fef9c3" />
          <Text style={voc.hint}>
            These phrases appeared 2+ times — try varying your wording.
          </Text>
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

      {/* Tone */}
      {(confidence != null || energy != null) && (
        <SectionCard>
          <SectionHeader icon="🎭" title="Tone" iconBg="#fbeaf0" />
          {confidence != null && (
            <View style={voc.toneRow}>
              <Text style={voc.toneName}>Confidence</Text>
              <View style={voc.toneTrack}>
                <View
                  style={[
                    voc.toneFill,
                    { width: `${confidence}%` as any, backgroundColor: R.toneBar1 },
                  ]}
                />
              </View>
              <Text style={voc.toneVal}>{confidence}</Text>
            </View>
          )}
          {energy != null && (
            <View style={voc.toneRow}>
              <Text style={voc.toneName}>Energy</Text>
              <View style={voc.toneTrack}>
                <View
                  style={[
                    voc.toneFill,
                    { width: `${energy}%` as any, backgroundColor: R.toneBar2 },
                  ]}
                />
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
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: R.textMuted,
    lineHeight: 19,
    marginBottom: 10,
  },
  phraseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(238,240,232,0.6)',
    borderWidth: 1.27,
    borderColor: 'rgba(38,49,3,0.1)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  phraseText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: R.text,
    flex: 1,
  },
  phraseCount: { fontFamily: fontFamily.body, fontSize: 12, color: R.accent },
  toneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  toneName: { fontFamily: fontFamily.body, fontSize: 12, color: R.textMuted, width: 80 },
  toneTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: R.progressBg,
    overflow: 'hidden',
  },
  toneFill: { height: '100%', borderRadius: 4 },
  toneVal: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: R.text,
    width: 28,
    textAlign: 'right',
  },
});

// ── Grammar tab ────────────────────────────────────────────────────────────────

function GrammarTab({ result }: { result: AnalysisResult }) {
  const m = result.metrics;
  if (!m) {
    return <Text style={empty.text}>No grammar data available.</Text>;
  }

  const grammarScore = Math.round(m.grammar_score ?? 0);
  const allIssues = (m.sentences ?? [])
    .flatMap((s) => s.grammar_issues ?? [])
    .slice(0, 6);

  return (
    <View>
      <SectionCard>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <View style={[sh.iconWrap, { backgroundColor: '#e8f5e3' }]}>
            <Text style={sh.iconText}>✓</Text>
          </View>
          <Text style={sh.title}>Grammar score</Text>
          <Text style={{ fontFamily: fontFamily.bodyMedium, fontSize: 16, color: R.accent }}>
            {grammarScore} / 100
          </Text>
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
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: R.grammarError,
    fontStyle: 'italic',
  },
  issueFix: { fontFamily: fontFamily.body, fontSize: 11, color: R.textMuted },
  noIssues: { fontFamily: fontFamily.body, fontSize: 13, color: R.textMuted, marginTop: 12 },
});

// ── Feedback tab ───────────────────────────────────────────────────────────────

function FeedbackTab({ result }: { result: AnalysisResult }) {
  const feedback = result.feedback;
  if (!feedback) {
    return <Text style={empty.text}>No feedback available.</Text>;
  }

  return (
    <View>
      {feedback.summary ? (
        <SectionCard>
          <SectionHeader icon="💬" title="Summary" iconBg="#e6f1fb" />
          <Text style={fb.bodyText}>{feedback.summary}</Text>
        </SectionCard>
      ) : null}

      {feedback.strengths?.length > 0 && (
        <SectionCard>
          <SectionHeader icon="✅" title="Strengths" iconBg="#e8f5e3" />
          {feedback.strengths.map((s, i) => (
            <View key={i} style={fb.row}>
              <View style={[fb.dot, { backgroundColor: R.accentGreen }]} />
              <Text style={fb.bodyText}>{s}</Text>
            </View>
          ))}
        </SectionCard>
      )}

      {feedback.improvements?.length > 0 && (
        <SectionCard>
          <SectionHeader icon="📈" title="To improve" iconBg="#fef9c3" />
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
          <SectionHeader icon="💡" title="Tips" iconBg="#e6f1fb" />
          {feedback.tips.map((s, i) => (
            <View key={i} style={fb.row}>
              <View style={[fb.dot, { backgroundColor: '#79b8ff' }]} />
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
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: R.textMuted,
    lineHeight: 20,
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 6, flexShrink: 0 },
});

// ── empty state ────────────────────────────────────────────────────────────────

const empty = StyleSheet.create({
  text: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: R.textMuted,
    padding: 16,
    textAlign: 'center',
  },
});

// ── main screen ────────────────────────────────────────────────────────────────

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

        {/* Tabbed content card */}
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

      {/* Sticky bottom button */}
      <View style={[styles.btnWrap, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable style={styles.doneBtn} onPress={done}>
          <Text style={styles.doneBtnText}>Share results</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: R.bg },
  scroll: { flex: 1 },
  tabbedCard: {
    marginHorizontal: 12,
    marginTop: 16,
    marginBottom: 12,
    backgroundColor: R.cardBg,
    borderRadius: 24,
    borderWidth: 1.27,
    borderColor: R.cardBorder,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabContent: { padding: 16 },
  btnWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: R.bg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(38,49,3,0.08)',
  },
  doneBtn: {
    backgroundColor: R.btnBg,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  doneBtnText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 14,
    color: 'white',
  },
});
