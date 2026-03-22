export type Scores = {
  overall: number;
  delivery: number;
  clarity: number;
  vocabulary: number;
};

export type Acceleration = {
  first_half_wpm: number;
  second_half_wpm: number;
  delta: number;
  trend: 'accelerating' | 'decelerating' | 'steady';
};

export type GrammarIssue = {
  issue: string;
  suggestion: string;
};

export type SentenceTone = {
  confidence: number;
  energy: number;
} | null;

export type Sentence = {
  text: string;
  start: number;
  end: number;
  word_count: number;
  wpm: number;
  filler_count: number;
  vocabulary_richness: number;
  grammar_issues: GrammarIssue[];
  tone: SentenceTone;
  tip?: string;
};

export type Word = {
  word: string;
  start: number;
  end: number;
};

export type Transcript = {
  text: string;
  words: Word[];
};

export type Metrics = {
  duration: number;
  word_count: number;
  wpm: number;
  filler_count: number;
  filler_rate: number;
  filler_words: Record<string, number>;
  pause_count: number;
  longest_pause: number;
  avg_pause: number;
  vocabulary_richness: number;
  avg_word_length: number;
  repeated_phrases: { phrase: string; count: number; n: number }[];
  acceleration: Acceleration;
  grammar_score: number;
  sentences: Sentence[];
};

export type ToneOverall = {
  confidence: number;
  energy: number;
};

export type Tone = {
  overall: ToneOverall;
  sentences_tone: SentenceTone[];
};

export type Feedback = {
  summary: string;
  strengths: string[];
  improvements: string[];
  tips: string[];
  sentence_tips: string[];
};

export type AnalysisResult = {
  job_id: string;
  status: string;
  assets: { edited_video?: string; audio?: string } | null;
  transcript: Transcript | null;
  scores: Scores | null;
  metrics: Metrics | null;
  feedback: Feedback | null;
  tone: Tone | null;
};

/** Row data for RecordingRow */
export type RecordingCardItem = {
  id: string;
  title: string;
  timestampLabel: string;
  fillerWordCount?: number;
  wpm?: number;
  overallScore?: number;
};

export type DashboardStats = {
  totalVideos: number;
  avgFillerWords: number;
  avgClarityScore: number;
};
