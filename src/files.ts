import * as DocumentPicker from 'expo-document-picker';
import { Paths } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { insertMedia, listMedia } from './db/media';
import { newId } from './format';
import { probeVideoDuration, UNPLAYABLE_FILE_MESSAGE } from './probeVideo';
import type { MediaFile } from './types';

function moviesDir(): string {
  return `${FileSystem.documentDirectory}movies/`;
}

function imagesDir(): string {
  return `${FileSystem.documentDirectory}word-images/`;
}

async function ensureDir(dir: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

function assertEnoughSpace(byteSize: number | null): void {
  if (!byteSize || byteSize <= 0) return;
  const free = Paths.availableDiskSpace;
  if (!Number.isFinite(free) || free <= 0) return;
  const padded = byteSize + 80 * 1024 * 1024;
  if (padded > free) {
    const needGb = (byteSize / (1024 * 1024 * 1024)).toFixed(1);
    throw new Error(
      `Not enough free space to copy this movie (${needGb} GB). Free up storage and try again.`,
    );
  }
}

/** Re-register movie files that are already on disk if the SQLite catalog was wiped. */
export async function recoverImportedMovies(): Promise<void> {
  const dir = moviesDir();
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) return;
  const names = await FileSystem.readDirectoryAsync(dir);
  const existing = await listMedia();
  const have = new Set(existing.map((m) => m.fileUri));
  for (const name of names) {
    const fileUri = `${dir}${name}`;
    if (have.has(fileUri)) continue;
    const st = await FileSystem.getInfoAsync(fileUri);
    if (!st.exists || st.isDirectory) continue;
    const title = name.replace(/^[^-]+-/, '').replace(/\.[^.]+$/, '') || name;
    await insertMedia({
      title,
      fileUri,
      durationSec: null,
      byteSize: 'size' in st ? st.size ?? null : null,
    });
  }
}

export async function importMovie(): Promise<MediaFile> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['video/mp4', 'video/quicktime', 'video/*'],
    copyToCacheDirectory: false,
    multiple: false,
  });
  if (picked.canceled || !picked.assets?.[0]) {
    throw new Error('canceled');
  }
  const asset = picked.assets[0];
  assertEnoughSpace(asset.size ?? null);
  await ensureDir(moviesDir());
  const safeName = (asset.name || 'movie.mp4').replace(/[^\w.\- ()]/g, '_');
  const dest = `${moviesDir()}${newId()}-${safeName}`;
  try {
    await FileSystem.copyAsync({ from: asset.uri, to: dest });
  } catch {
    throw new Error(
      'Could not copy the movie into the app. For large films, keep the tablet plugged in and try again. Prefer MP4 (H.264 + AAC).',
    );
  }
  const copied = await FileSystem.getInfoAsync(dest);
  if (!copied.exists) {
    throw new Error('The movie did not copy onto this tablet. Try again with an MP4.');
  }

  const durationSec = await probeVideoDuration(dest);
  if (durationSec == null) {
    const status = await FileSystem.getInfoAsync(dest);
    const looksTiny = !status.exists || ('size' in status && (status.size ?? 0) < 1024);
    if (looksTiny) {
      await removeFileQuietly(dest);
      throw new Error(UNPLAYABLE_FILE_MESSAGE);
    }
  }

  return insertMedia({
    title: asset.name?.replace(/\.[^.]+$/, '') || 'Movie',
    fileUri: dest,
    durationSec,
    byteSize: asset.size ?? ('size' in copied ? copied.size ?? null : null),
  });
}

export async function pickWordImage(): Promise<string> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.85,
  });
  if (result.canceled || !result.assets[0]) {
    throw new Error('canceled');
  }
  await ensureDir(imagesDir());
  const src = result.assets[0].uri;
  const dest = `${imagesDir()}${newId()}.jpg`;
  await FileSystem.copyAsync({ from: src, to: dest });
  return dest;
}

export async function removeFileQuietly(uri: string | null | undefined): Promise<void> {
  if (!uri) return;
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  } catch {
    // ignore
  }
}

export async function writeTempCsv(contents: string): Promise<string> {
  const path = `${FileSystem.cacheDirectory}moviedu-log.csv`;
  await FileSystem.writeAsStringAsync(path, contents, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return path;
}
