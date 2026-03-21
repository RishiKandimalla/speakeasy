import type { AnalysisResult, DashboardStats } from '../types/analysis';

export function getStubAnalysisResult(): AnalysisResult {
  return {
    clarityScore: 92,
    grade: 'Excellent',
    fillerWords: { count: 1, percentage: 0.4 },
    pauseTime: { total: 7.5, average: 1.2 },
    speakingRate: { wpm: 167 },
    feedback: [
      { text: 'Great job minimizing filler words.' },
      { text: 'You are speaking clearly and at a steady pace.' },
    ],
    transcript:
      'Thanks for listening today. You know, I wanted to share a few ideas about how we can improve our process and stay aligned as a team.',
    fillerWordsInTranscript: ['you know'],
    duration: '2:14',
  };
}

export function getStubDashboardStats(): DashboardStats {
  return {
    totalVideos: 0,
    avgFillerWords: 3,
    avgClarityScore: 88,
  };
}

export function buildInstagramCaption(result: AnalysisResult): string {
  return `Speakeasy — Clarity ${result.clarityScore} · ${result.speakingRate.wpm} wpm · ${result.fillerWords.count} filler words`;
}
