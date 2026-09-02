import { getDb } from './client';
import type { ActiveTrial } from '../types';

const KEY = 'active_trial';
const GATE_KEY = 'gate_play_sec';
const GATE_MEDIA_KEY = 'gate_media_id';

export async function loadActiveTrial(): Promise<ActiveTrial | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM kv WHERE key = ?',
    KEY,
  );
  if (!row?.value) return null;
  try {
    return JSON.parse(row.value) as ActiveTrial;
  } catch {
    return null;
  }
}

export async function saveActiveTrial(trial: ActiveTrial | null): Promise<void> {
  const db = await getDb();
  if (!trial) {
    await db.runAsync('DELETE FROM kv WHERE key = ?', KEY);
    return;
  }
  await db.runAsync(
    'INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    KEY,
    JSON.stringify(trial),
  );
}

export async function loadGateProgress(): Promise<{ mediaId: string; playSec: number } | null> {
  const db = await getDb();
  const media = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM kv WHERE key = ?',
    GATE_MEDIA_KEY,
  );
  const play = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM kv WHERE key = ?',
    GATE_KEY,
  );
  if (!media?.value || play?.value == null) return null;
  const playSec = Number(play.value);
  if (!Number.isFinite(playSec)) return null;
  return { mediaId: media.value, playSec };
}

export async function saveGateProgress(mediaId: string, playSec: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    GATE_MEDIA_KEY,
    mediaId,
  );
  await db.runAsync(
    'INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    GATE_KEY,
    String(playSec),
  );
}
