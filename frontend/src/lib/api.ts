import { supabase } from './supabase';
import type { AnalysisResult } from '../types/analysis';

export const API_BASE = 'https://speakeasy-101830418970.us-east1.run.app';

export type UploadResponse = {
  upload_id: string;
  status: string;
  bucket: string;
  path: string;
  video_url: string | null;
};

export type ClipCategory = 'minecraft' | 'drone' | 'both';

export type ClipResponse = {
  id: string;
  category: Exclude<ClipCategory, 'both'>;
  duration_s: number | null;
  file_size: number | null;
  video_url: string;
};

export type JobStatus = {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  stage: string;
  progress: number;
  error_message: string | null;
};

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  return headers;
}

async function parseJsonOrThrow(res: Response): Promise<unknown> {
  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const detail =
      typeof body === 'object' && body !== null && 'detail' in body
        ? String((body as { detail: unknown }).detail)
        : text || res.statusText;
    throw new Error(detail || `Request failed (${res.status})`);
  }
  return body;
}

export async function uploadVideo(
  fileUri: string,
  filename: string,
): Promise<UploadResponse> {
  const headers = await getAuthHeaders();
  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    name: filename,
    type: 'video/mp4',
  } as unknown as Blob);

  const res = await fetch(`${API_BASE}/v1/uploads`, {
    method: 'POST',
    body: formData,
    headers,
  });

  return parseJsonOrThrow(res) as Promise<UploadResponse>;
}

export async function createJob(uploadId: string): Promise<{ job_id: string; status: string; stage: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/v1/jobs`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ upload_id: uploadId }),
  });
  return parseJsonOrThrow(res) as Promise<{ job_id: string; status: string; stage: string }>;
}

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/v1/jobs/${jobId}`, { headers });
  return parseJsonOrThrow(res) as Promise<JobStatus>;
}

export async function getJobResult(jobId: string): Promise<AnalysisResult> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/v1/jobs/${jobId}/result`, { headers });
  return parseJsonOrThrow(res) as Promise<AnalysisResult>;
}

export async function listUploads(): Promise<UploadResponse[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/v1/uploads`, { headers });
  return parseJsonOrThrow(res) as Promise<UploadResponse[]>;
}

export async function getUpload(uploadId: string): Promise<UploadResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/v1/uploads/${uploadId}`, { headers });
  return parseJsonOrThrow(res) as Promise<UploadResponse>;
}

export type UserStats = {
  streak_days: number;
  total_sessions: number;
  made_video_today: boolean;
  weekly_averages: {
    overall_score: number | null;
    delivery_score: number | null;
    clarity_score: number | null;
    vocabulary_score: number | null;
    wpm: number | null;
    filler_rate: number | null;
    confidence: number | null;
    energy: number | null;
  };
  weekly_history: Array<{
    date: string;
    scores: { overall: number | null; delivery: number | null; clarity: number | null; vocabulary: number | null } | null;
    wpm: number | null;
    filler_rate: number | null;
    confidence: number | null;
    energy: number | null;
  }>;
};

export async function getMyStats(): Promise<UserStats> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/v1/stats/me`, { headers });
  return parseJsonOrThrow(res) as Promise<UserStats>;
}

export type ProfileData = {
  user_id: string;
  username: string;
  follower_count: number;
  following_count: number;
  created_at: string;
};

export async function getMyProfile(): Promise<ProfileData> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/v1/profile/me`, { headers });
  return parseJsonOrThrow(res) as Promise<ProfileData>;
}

export async function getProfile(userId: string): Promise<ProfileData> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/v1/profile/${userId}`, {
    headers,
  });
  return parseJsonOrThrow(res) as Promise<ProfileData>;
}

export type JobSummary = {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  stage: string;
  progress: number;
  created_at: string;
  upload_id: string;
  is_public: boolean;
  video_url: string | null;
  scores: Record<string, number> | null;
  metrics: Record<string, unknown> | null;
  feedback: Record<string, unknown> | null;
  tone: Record<string, unknown> | null;
  transcript: Record<string, unknown> | null;
};

export type FeedPostResponse = {
  post_id: string;
  username: string;
  audio_url: string;
  transcript_json: Record<string, unknown>;
  created_at: string;
};

export type PublishPostResponse = {
  post_id: string;
  audio_url: string;
};

export async function listJobs(limit = 20, offset = 0): Promise<JobSummary[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/v1/jobs?limit=${limit}&offset=${offset}`, { headers });
  return parseJsonOrThrow(res) as Promise<JobSummary[]>;
}

export async function publishPost(jobId: string): Promise<PublishPostResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/v1/jobs/${jobId}/publish`, {
    method: 'POST',
    headers,
  });
  return parseJsonOrThrow(res) as Promise<PublishPostResponse>;
}

export async function listUserPosts(userId: string, limit = 20): Promise<FeedPostResponse[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/v1/profile/${userId}/posts?limit=${limit}`, { headers });
  return parseJsonOrThrow(res) as Promise<FeedPostResponse[]>;
}

export async function listPublicFeed(limit = 20): Promise<FeedPostResponse[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/v1/feed/public?limit=${limit}`, { headers });
  return parseJsonOrThrow(res) as Promise<FeedPostResponse[]>;
}

export async function listClips(category: ClipCategory = 'both'): Promise<ClipResponse[]> {
  const params = new URLSearchParams({ category });
  const res = await fetch(`${API_BASE}/v1/clips?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  });
  return parseJsonOrThrow(res) as Promise<ClipResponse[]>;
}

// ── Reactions ──────────────────────────────────────────────────────────────────

export const REACTION_EMOJIS = ['fire', 'heart', 'laugh', 'clap', 'mindblown', 'sad'] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export const EMOJI_DISPLAY: Record<ReactionEmoji, string> = {
  fire: '🔥',
  heart: '❤️',
  laugh: '😂',
  clap: '👏',
  mindblown: '🤯',
  sad: '😢',
};

export type ReactionSummary = {
  post_id: string;
  emoji_counts: Record<string, number>;
  total_reactions: number;
  unique_reactors: number;
};

export async function addReaction(postId: string, emoji: string, timestampS: number): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/v1/posts/${postId}/reactions`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ emoji, timestamp_s: timestampS }),
  });
  await parseJsonOrThrow(res);
}

export async function getReactionSummary(postId: string): Promise<ReactionSummary> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/v1/posts/${postId}/reactions/summary`, { headers });
  return parseJsonOrThrow(res) as Promise<ReactionSummary>;
}

// ── Notifications ──────────────────────────────────────────────────────────────

export type NotificationItem = {
  notification_id: string;
  post_id: string;
  type: string;
  emoji: string | null;
  read: boolean;
  created_at: string;
};

export async function listNotifications(limit = 50, offset = 0): Promise<NotificationItem[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/v1/notifications?limit=${limit}&offset=${offset}`, { headers });
  return parseJsonOrThrow(res) as Promise<NotificationItem[]>;
}

export async function markNotificationsRead(ids: string[]): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/v1/notifications/read`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ notification_ids: ids }),
  });
  await parseJsonOrThrow(res);
}

export async function getUnreadNotificationCount(): Promise<number> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/v1/notifications/unread-count`, { headers });
  const data = (await parseJsonOrThrow(res)) as { count: number };
  return data.count;
}
