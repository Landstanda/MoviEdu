import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { insertMedia } from './db/media';
import { newId } from './format';
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

export async function importMovie(): Promise<MediaFile> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['video/mp4', 'video/quicktime', 'public.movie', 'video/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (picked.canceled || !picked.assets?.[0]) {
    throw new Error('canceled');
  }
  const asset = picked.assets[0];
  await ensureDir(moviesDir());
  const safeName = (asset.name || 'movie.mp4').replace(/[^\w.\- ()]/g, '_');
  const dest = `${moviesDir()}${newId()}-${safeName}`;
  await FileSystem.copyAsync({ from: asset.uri, to: dest });
  return insertMedia({
    title: asset.name?.replace(/\.[^.]+$/, '') || 'Movie',
    fileUri: dest,
    durationSec: null,
    byteSize: asset.size ?? null,
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
