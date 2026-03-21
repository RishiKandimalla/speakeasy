import * as FileSystem from 'expo-file-system/legacy';

const SAVED_SUBDIR = 'saved-videos';

export type SavedVideo = {
  filename: string;
  uri: string;
};

function extensionFromSourceUri(uri: string): string {
  const clean = uri.split('?')[0] ?? uri;
  const dot = clean.lastIndexOf('.');
  if (dot === -1 || dot === clean.length - 1) return '.mp4';
  const ext = clean.slice(dot).toLowerCase();
  if (ext === '.mov' || ext === '.mp4' || ext === '.m4v') return ext;
  return '.mp4';
}

function getSavedDir(): string {
  const base = FileSystem.documentDirectory;
  if (!base) {
    throw new Error('documentDirectory is not available on this platform');
  }
  return `${base}${SAVED_SUBDIR}/`;
}

export async function ensureSavedDir(): Promise<string> {
  const dir = getSavedDir();
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  return dir;
}

/**
 * Copies a recording from the camera cache (or any readable file URI) into app documents.
 * Returns the persistent file URI.
 */
export async function persistVideoFromUri(sourceUri: string): Promise<string> {
  const dir = await ensureSavedDir();
  const ext = extensionFromSourceUri(sourceUri);
  const filename = `video_${Date.now()}${ext}`;
  const destUri = `${dir}${filename}`;
  await FileSystem.copyAsync({ from: sourceUri, to: destUri });
  return destUri;
}

export async function listSavedVideos(): Promise<SavedVideo[]> {
  if (!FileSystem.documentDirectory) {
    return [];
  }
  const dir = getSavedDir();
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists || !info.isDirectory) {
    return [];
  }
  const names = await FileSystem.readDirectoryAsync(dir);
  const videos = names
    .filter((n) => /\.(mp4|mov|m4v)$/i.test(n))
    .sort()
    .reverse()
    .map((filename) => ({
      filename,
      uri: `${dir}${filename}`,
    }));
  return videos;
}

export async function deleteSavedVideo(fileUri: string): Promise<void> {
  await FileSystem.deleteAsync(fileUri, { idempotent: true });
}
