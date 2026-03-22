import { Directory, File, Paths } from 'expo-file-system';

const CLIP_CACHE_DIR = new Directory(Paths.cache, 'clips');
const inFlight = new Map<string, Promise<string>>();

async function ensureCacheDir(): Promise<void> {
  if (!CLIP_CACHE_DIR.exists) {
    CLIP_CACHE_DIR.create({ idempotent: true, intermediates: true });
  }
}

function cacheFileForClip(clipId: string): File {
  return new File(CLIP_CACHE_DIR, `${clipId}.mp4`);
}

async function ensureCachedClip(clipId: string, remoteUrl: string): Promise<string> {
  await ensureCacheDir();
  const file = cacheFileForClip(clipId);
  if (file.exists) return file.uri;
  const downloaded = await File.downloadFileAsync(remoteUrl, file, { idempotent: true });
  return downloaded.uri;
}

export async function getCachedClipUri(clipId: string, remoteUrl: string): Promise<string> {
  const key = `${clipId}:${remoteUrl}`;
  const existing = inFlight.get(key);
  if (existing) {
    return existing;
  }
  const pending = ensureCachedClip(clipId, remoteUrl).finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, pending);
  return pending;
}

export async function prefetchClip(clipId: string, remoteUrl: string): Promise<void> {
  try {
    await getCachedClipUri(clipId, remoteUrl);
  } catch {
    // Ignore prefetch failures; playback falls back to remote URL.
  }
}
