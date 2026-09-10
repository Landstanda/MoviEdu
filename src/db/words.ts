import { getDb } from './client';
import { newId, normalizeWord } from '../format';
import { SPELLING_IMAGES } from '../spellingImages';
import type { PromptMode, Word, WordStatus } from '../types';

/** Enabled bundled words for this sitting. Other bundled cards stay in assets but start off. */
export const ACTIVE_BUNDLE_WORDS = [
  'bed',
  'box',
  'bus',
  'dog',
  'egg',
  'fan',
  'fish',
  'jet',
  'lips',
  'mug',
  'pot',
  'rat',
] as const;

function rowToWord(row: {
  id: string;
  word: string;
  image_uri: string | null;
  enabled: number;
  status: string;
  prompt_mode: string;
  ease: number;
  interval_days: number;
  next_due_at: string | null;
  consecutive_correct: number;
  consecutive_wrong: number;
  created_at: string;
}): Word {
  return {
    id: row.id,
    word: row.word,
    imageUri: row.image_uri,
    enabled: !!row.enabled,
    status: row.status as WordStatus,
    promptMode: row.prompt_mode as PromptMode,
    ease: row.ease,
    intervalDays: row.interval_days,
    nextDueAt: row.next_due_at,
    consecutiveCorrect: row.consecutive_correct,
    consecutiveWrong: row.consecutive_wrong,
    createdAt: row.created_at,
  };
}

export async function listWords(): Promise<Word[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    word: string;
    image_uri: string | null;
    enabled: number;
    status: string;
    prompt_mode: string;
    ease: number;
    interval_days: number;
    next_due_at: string | null;
    consecutive_correct: number;
    consecutive_wrong: number;
    created_at: string;
  }>('SELECT * FROM words ORDER BY created_at ASC');
  return rows.map(rowToWord);
}

export async function getWord(id: string): Promise<Word | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    id: string;
    word: string;
    image_uri: string | null;
    enabled: number;
    status: string;
    prompt_mode: string;
    ease: number;
    interval_days: number;
    next_due_at: string | null;
    consecutive_correct: number;
    consecutive_wrong: number;
    created_at: string;
  }>('SELECT * FROM words WHERE id = ?', id);
  return row ? rowToWord(row) : null;
}

export async function insertWord(input: {
  word: string;
  imageUri: string | null;
}): Promise<Word> {
  const db = await getDb();
  const now = new Date().toISOString();
  const item: Word = {
    id: newId(),
    word: normalizeWord(input.word),
    imageUri: input.imageUri,
    enabled: true,
    status: 'new',
    promptMode: 'outline',
    ease: 2.5,
    intervalDays: 0,
    nextDueAt: now,
    consecutiveCorrect: 0,
    consecutiveWrong: 0,
    createdAt: now,
  };
  await db.runAsync(
    `INSERT INTO words (
      id, word, image_uri, enabled, status, prompt_mode, ease, interval_days,
      next_due_at, consecutive_correct, consecutive_wrong, created_at
    ) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, 0, 0, ?)`,
    item.id,
    item.word,
    item.imageUri,
    item.status,
    item.promptMode,
    item.ease,
    item.intervalDays,
    item.nextDueAt,
    item.createdAt,
  );
  return item;
}

export async function seedBundledSpellingWords(): Promise<void> {
  const existing = await listWords();
  const byWord = new Map(existing.map((w) => [w.word.toUpperCase(), w]));
  const active = new Set(ACTIVE_BUNDLE_WORDS.map((w) => w.toUpperCase()));

  for (const key of ACTIVE_BUNDLE_WORDS) {
    const word = key.toUpperCase();
    const row = byWord.get(word);
    if (!row) {
      await insertWord({ word, imageUri: null });
      continue;
    }
    if (!row.enabled) {
      await updateWord(row.id, { enabled: true });
    }
  }

  for (const row of existing) {
    const key = row.word.toLowerCase();
    if (row.enabled && key in SPELLING_IMAGES && !active.has(row.word.toUpperCase())) {
      await updateWord(row.id, { enabled: false });
    }
  }
}

export async function updateWord(
  id: string,
  patch: Partial<
    Pick<
      Word,
      | 'word'
      | 'imageUri'
      | 'enabled'
      | 'status'
      | 'promptMode'
      | 'ease'
      | 'intervalDays'
      | 'nextDueAt'
      | 'consecutiveCorrect'
      | 'consecutiveWrong'
    >
  >,
): Promise<void> {
  const current = await getWord(id);
  if (!current) return;
  const next: Word = {
    ...current,
    ...patch,
    word: patch.word ? normalizeWord(patch.word) : current.word,
  };
  const db = await getDb();
  await db.runAsync(
    `UPDATE words SET
      word = ?, image_uri = ?, enabled = ?, status = ?, prompt_mode = ?,
      ease = ?, interval_days = ?, next_due_at = ?,
      consecutive_correct = ?, consecutive_wrong = ?
     WHERE id = ?`,
    next.word,
    next.imageUri,
    next.enabled ? 1 : 0,
    next.status,
    next.promptMode,
    next.ease,
    next.intervalDays,
    next.nextDueAt,
    next.consecutiveCorrect,
    next.consecutiveWrong,
    id,
  );
}

export async function deleteWord(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM words WHERE id = ?', id);
}
