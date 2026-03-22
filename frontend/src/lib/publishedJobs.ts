import * as FileSystem from 'expo-file-system/legacy';

const FILE = `${FileSystem.documentDirectory}published_jobs.json`;

// In-memory mirror of the persisted set — always up-to-date after init
const published = new Set<string>();
let loaded = false;

async function load() {
  if (loaded) return;
  loaded = true;
  try {
    const info = await FileSystem.getInfoAsync(FILE);
    if (info.exists) {
      const raw = await FileSystem.readAsStringAsync(FILE);
      const ids: string[] = JSON.parse(raw);
      ids.forEach((id) => published.add(id));
    }
  } catch {
    // ignore — fresh start
  }
}

async function persist() {
  try {
    await FileSystem.writeAsStringAsync(FILE, JSON.stringify([...published]));
  } catch {
    // non-fatal
  }
}

// Call once on app start (or lazily — whichever comes first)
export async function initPublishedJobs() {
  await load();
}

export async function markPublished(jobId: string) {
  await load();
  published.add(jobId);
  await persist();
}

// Synchronous — returns false until initPublishedJobs() resolves,
// but that's fine: ProfileScreen re-renders after useFocusEffect fetches jobs.
export function isPublished(jobId: string) {
  return published.has(jobId);
}
