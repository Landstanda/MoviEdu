import { updateWord } from './db/words';
import type { Word } from './types';

export function pickNextWord(words: Word[], usedIds: string[]): Word | null {
  const enabled = words.filter((w) => w.enabled && w.word.length > 0 && !usedIds.includes(w.id));
  if (!enabled.length) return null;

  const now = Date.now();
  const due = enabled.filter((w) => {
    if (!w.nextDueAt) return true;
    return new Date(w.nextDueAt).getTime() <= now;
  });
  const pool = due.length ? due : enabled;

  const emerging = pool.filter((w) => w.status === 'emerging' || w.promptMode === 'from_scratch');
  const fresh = pool.filter((w) => w.promptMode === 'outline');

  if (emerging.length) {
    return emerging[0];
  }
  if (fresh.length) {
    return fresh[0];
  }
  return pool[0];
}

function addDays(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

export async function recordSuccess(word: Word, outlineUntilCorrect: number): Promise<void> {
  const consecutiveCorrect = word.consecutiveCorrect + 1;
  const consecutiveWrong = 0;
  let promptMode = word.promptMode;
  let status = word.status;
  let intervalDays = word.intervalDays;
  let ease = word.ease;

  if (promptMode === 'outline' && consecutiveCorrect >= outlineUntilCorrect) {
    promptMode = 'from_scratch';
    status = 'emerging';
  }

  if (promptMode === 'from_scratch' && consecutiveCorrect >= outlineUntilCorrect + 3) {
    status = 'proficient';
  }

  if (status === 'proficient') {
    intervalDays = intervalDays <= 0 ? 1 : Math.min(30, intervalDays * ease);
    ease = Math.min(3.0, ease + 0.05);
  } else if (status === 'emerging') {
    intervalDays = 0.3;
  } else {
    intervalDays = 0;
  }

  await updateWord(word.id, {
    consecutiveCorrect,
    consecutiveWrong,
    promptMode,
    status,
    intervalDays,
    ease,
    nextDueAt: addDays(intervalDays),
  });
}

export async function recordIncomplete(word: Word): Promise<void> {
  await updateWord(word.id, {
    consecutiveWrong: word.consecutiveWrong + 1,
    consecutiveCorrect: 0,
    nextDueAt: new Date().toISOString(),
  });
}
