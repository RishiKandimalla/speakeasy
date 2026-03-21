import type { SavedVideo } from './savedVideos';
import type { RecordingCardItem } from '../types/analysis';

export function formatSavedVideoTitle(item: SavedVideo): string {
  const m = item.filename.match(/^video_(\d+)\./);
  if (m) {
    const d = new Date(Number(m[1]));
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString();
    }
  }
  return item.filename;
}

/**
 * Relative-ish label from `video_<timestamp>.ext` in filename.
 */
export function formatSavedVideoTimeLabel(item: SavedVideo, now = Date.now()): string {
  const m = item.filename.match(/^video_(\d+)\./);
  if (!m) {
    return formatSavedVideoTitle(item);
  }
  const t = Number(m[1]);
  if (Number.isNaN(t)) {
    return formatSavedVideoTitle(item);
  }
  const d = new Date(t);
  const diffMs = now - t;
  const sec = Math.floor(diffMs / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (diffMs < 0) {
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  if (sec < 60) {
    return 'Just now';
  }
  if (min < 60) {
    return `${min}m ago`;
  }
  if (hr < 24) {
    return `${hr}h ago`;
  }
  if (day < 7) {
    return `${day}d ago`;
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function savedVideoToRecordingCardItem(
  item: SavedVideo,
): RecordingCardItem {
  return {
    id: item.uri,
    title: formatSavedVideoTitle(item),
    timestampLabel: formatSavedVideoTimeLabel(item),
  };
}
