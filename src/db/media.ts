import { getDb } from './client';
import { newId } from '../format';
import type { MediaFile } from '../types';

function rowToMedia(row: {
  id: string;
  title: string;
  file_uri: string;
  duration_sec: number | null;
  position_sec: number;
  byte_size: number | null;
  created_at: string;
}): MediaFile {
  return {
    id: row.id,
    title: row.title,
    fileUri: row.file_uri,
    durationSec: row.duration_sec,
    positionSec: row.position_sec,
    byteSize: row.byte_size,
    createdAt: row.created_at,
  };
}

export async function listMedia(): Promise<MediaFile[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    title: string;
    file_uri: string;
    duration_sec: number | null;
    position_sec: number;
    byte_size: number | null;
    created_at: string;
  }>('SELECT * FROM media ORDER BY created_at DESC');
  return rows.map(rowToMedia);
}

export async function getMedia(id: string): Promise<MediaFile | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    id: string;
    title: string;
    file_uri: string;
    duration_sec: number | null;
    position_sec: number;
    byte_size: number | null;
    created_at: string;
  }>('SELECT * FROM media WHERE id = ?', id);
  return row ? rowToMedia(row) : null;
}

export async function insertMedia(input: {
  title: string;
  fileUri: string;
  durationSec: number | null;
  byteSize: number | null;
}): Promise<MediaFile> {
  const db = await getDb();
  const item: MediaFile = {
    id: newId(),
    title: input.title,
    fileUri: input.fileUri,
    durationSec: input.durationSec,
    positionSec: 0,
    byteSize: input.byteSize,
    createdAt: new Date().toISOString(),
  };
  await db.runAsync(
    `INSERT INTO media (id, title, file_uri, duration_sec, position_sec, byte_size, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    item.id,
    item.title,
    item.fileUri,
    item.durationSec,
    item.positionSec,
    item.byteSize,
    item.createdAt,
  );
  return item;
}

export async function saveMediaPosition(
  id: string,
  positionSec: number,
  durationSec?: number | null,
): Promise<void> {
  const db = await getDb();
  if (durationSec != null && Number.isFinite(durationSec)) {
    await db.runAsync(
      'UPDATE media SET position_sec = ?, duration_sec = ? WHERE id = ?',
      positionSec,
      durationSec,
      id,
    );
  } else {
    await db.runAsync('UPDATE media SET position_sec = ? WHERE id = ?', positionSec, id);
  }
}

const LAST_MEDIA_KEY = 'last_media_id';

export async function deleteMedia(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM media WHERE id = ?', id);
  const last = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM kv WHERE key = ?',
    LAST_MEDIA_KEY,
  );
  if (last?.value === id) {
    await db.runAsync('DELETE FROM kv WHERE key = ?', LAST_MEDIA_KEY);
  }
}

export async function setLastPlayedMediaId(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    LAST_MEDIA_KEY,
    id,
  );
}

export async function getResumeMedia(): Promise<MediaFile | null> {
  const db = await getDb();
  const last = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM kv WHERE key = ?',
    LAST_MEDIA_KEY,
  );
  if (last?.value) {
    const found = await getMedia(last.value);
    if (found) return found;
  }
  const all = await listMedia();
  return all[0] ?? null;
}
