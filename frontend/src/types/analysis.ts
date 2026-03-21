export type AnalysisResult = {
  clarityScore: number;
  grade: string;
  fillerWords: { count: number; percentage: number };
  pauseTime: { total: number; average: number };
  speakingRate: { wpm: number };
  feedback: { text: string }[];
  transcript: string;
  fillerWordsInTranscript: string[];
  duration: string;
};

/** Row data for `RecordingRow`. Omit analysis fields when no API metrics exist (e.g. saved files only). */
export type RecordingCardItem = {
  id: string;
  title: string;
  timestampLabel: string;
  fillerWordCount?: number;
  wpm?: number;
  clarityScore?: number;
};

export type DashboardStats = {
  totalVideos: number;
  avgFillerWords: number;
  avgClarityScore: number;
};
