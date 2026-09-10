import { updateWord } from './db/words';
import type { Word } from './types';

/** Last shown word ids this sitting (module-level so player remounts keep spacing). */
const recentShownIds: string[] = [];
const RECENT_KEEP = 16;
/** Prefer not repeating a word inside this many recent shows, if another choice exists. */
const RECENT_GAP = 3;

export function rememberShownWord(id: string): void {
  if (!id) return;
  const i = recentShownIds.indexOf(id);
  if (i >= 0) recentShownIds.splice(i, 1);
  recentShownIds.push(id);
  if (recentShownIds.length > RECENT_KEEP) {
    recentShownIds.splice(0, recentShownIds.length - RECENT_KEEP);
  }
}

export function getRecentShownIds(): string[] {
  return recentShownIds.slice();
}

function isDue(word: Word, now: number): boolean {
  if (!word.nextDueAt) return true;
  return new Date(word.nextDueAt).getTime() <= now;
}

function isNewOutline(word: Word): boolean {
  return word.promptMode === 'outline' && word.status === 'new';
}

function isReview(word: Word): boolean {
  return word.status === 'emerging' || word.promptMode === 'from_scratch';
}

/** Higher = more likely. Misses and emerging review beat proficient words. */
export function wordWeight(word: Word): number {
  const missBoost = 1 + Math.min(6, word.consecutiveWrong) * 2.5;
  if (word.status === 'emerging' || word.promptMode === 'from_scratch') {
    return 10 * missBoost;
  }
  if (word.status === 'new' || word.promptMode === 'outline') {
    return 6 * missBoost;
  }
  return 1.4 * missBoost;
}

export function weightedPick<T>(items: T[], weightOf: (item: T) => number, random = Math.random): T {
  const weights = items.map((item) => Math.max(0, weightOf(item)));
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) {
    return items[Math.floor(random() * items.length)] ?? items[0];
  }
  let ticket = random() * total;
  for (let i = 0; i < items.length; i++) {
    ticket -= weights[i];
    if (ticket <= 0) return items[i];
  }
  return items[items.length - 1];
}

export function pickNextWord(words: Word[], usedIds: string[], recentIds: string[] = getRecentShownIds()): Word | null {
  const enabled = words.filter((w) => w.enabled && w.word.length > 0 && !usedIds.includes(w.id));
  if (!enabled.length) return null;

  const now = Date.now();
  const due = enabled.filter((w) => isDue(w, now));
  let pool = due.length ? due : enabled;

  const usedWords = words.filter((w) => usedIds.includes(w.id));
  if (usedWords.some(isNewOutline)) {
    const review = pool.filter((w) => !isNewOutline(w));
    if (review.length) pool = review;
  }

  const reviewOrNew = pool.filter((w) => isReview(w) || isNewOutline(w));
  if (reviewOrNew.length) pool = reviewOrNew;

  const avoid = new Set(recentIds.slice(-RECENT_GAP));
  const spaced = pool.filter((w) => !avoid.has(w.id));
  const candidates = spaced.length ? spaced : pool;

  return weightedPick(candidates, wordWeight);
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
