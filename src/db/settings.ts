import { getDb } from './client';
import { DEFAULT_SETTINGS, MAX_INTERVAL_SEC, MIN_INTERVAL_SEC, type Settings } from '../types';

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    key,
  );
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    value,
  );
}

export async function loadSettings(): Promise<Settings> {
  const keys = Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[];
  const out: Settings = { ...DEFAULT_SETTINGS };
  for (const key of keys) {
    const raw = await getSetting(key);
    if (raw == null) continue;
    if (key === 'interruptStyle') {
      if (
        raw === 'pause_hidden' ||
        raw === 'pip_paused' ||
        raw === 'pip_playing_muted'
      ) {
        out.interruptStyle = raw;
      }
    } else if (key === 'ttsVoiceId') {
      out.ttsVoiceId = raw.length ? raw : null;
    } else {
      const n = Number(raw);
      if (Number.isFinite(n)) {
        (out as unknown as Record<string, number>)[key] = n;
      }
    }
  }
  out.interruptStyle = 'pause_hidden';
  out.intervalSec = clamp(Math.round(out.intervalSec), MIN_INTERVAL_SEC, MAX_INTERVAL_SEC);
  out.countdownSec = clamp(Math.round(out.countdownSec), 3, 120);
  out.questionsPerInterrupt = clamp(Math.round(out.questionsPerInterrupt), 1, 5);
  out.remainingLessons = clamp(Math.round(out.remainingLessons), 0, 99);
  out.outlineUntilCorrect = clamp(Math.round(out.outlineUntilCorrect), 1, 10);
  out.ttsRate = clamp(Math.round(out.ttsRate * 10) / 10, 0.5, 1.5);
  out.ttsPitch = clamp(Math.round(out.ttsPitch * 10) / 10, 0.5, 2);
  return out;
}

export async function saveSettings(next: Settings): Promise<void> {
  const payload: Record<string, string> = {
    intervalSec: String(next.intervalSec),
    countdownSec: String(next.countdownSec),
    questionsPerInterrupt: String(next.questionsPerInterrupt),
    remainingLessons: String(next.remainingLessons),
    interruptStyle: 'pause_hidden',
    outlineUntilCorrect: String(next.outlineUntilCorrect),
    ttsVoiceId: next.ttsVoiceId ?? '',
    ttsRate: String(next.ttsRate),
    ttsPitch: String(next.ttsPitch),
  };
  for (const [key, value] of Object.entries(payload)) {
    await setSetting(key, value);
  }
}

export async function patchSettings(partial: Partial<Settings>): Promise<Settings> {
  const current = await loadSettings();
  const next = { ...current, ...partial };
  await saveSettings(next);
  return next;
}

