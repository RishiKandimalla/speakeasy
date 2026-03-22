import type { AnalysisResult, DashboardStats } from '../types/analysis';

export function getStubAnalysisResult(): AnalysisResult {
  return {
    job_id: 'stub',
    status: 'completed',
    assets: null,
    transcript: { text: '', words: [] },
    scores: { overall: 0, delivery: 0, clarity: 0, vocabulary: 0 },
    metrics: null,
    feedback: null,
    tone: null,
  };
}

export function getStubDashboardStats(): DashboardStats {
  return {
    totalVideos: 0,
    avgFillerWords: 0,
    avgClarityScore: 0,
  };
}

export function buildInstagramCaption(result: AnalysisResult): string {
  const score = result.scores?.overall ?? 0;
  const wpm = result.metrics?.wpm ?? 0;
  return `Speakeasy — Score ${score} · ${Math.round(wpm)} wpm`;
}
