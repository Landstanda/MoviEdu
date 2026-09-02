import { getDb } from './client';
import { newId } from '../format';
import type { TrialLog } from '../types';

export async function insertLog(input: Omit<TrialLog, 'id' | 'ts'> & { ts?: string }): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO logs (
      id, ts, word, word_id, wrong_letter_count, fails, time_to_correct_ms, input_mode, completed
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    newId(),
    input.ts ?? new Date().toISOString(),
    input.word,
    input.wordId,
    input.wrongLetterCount,
    input.fails,
    input.timeToCorrectMs,
    input.inputMode,
    input.completed ? 1 : 0,
  );
}

export async function listLogs(limit = 200): Promise<TrialLog[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    ts: string;
    word: string;
    word_id: string | null;
    wrong_letter_count: number;
    fails: number;
    time_to_correct_ms: number | null;
    input_mode: 'keyboard';
    completed: number;
  }>('SELECT * FROM logs ORDER BY ts DESC LIMIT ?', limit);
  return rows.map((row) => ({
    id: row.id,
    ts: row.ts,
    word: row.word,
    wordId: row.word_id,
    wrongLetterCount: row.wrong_letter_count,
    fails: row.fails,
    timeToCorrectMs: row.time_to_correct_ms,
    inputMode: row.input_mode,
    completed: !!row.completed,
  }));
}

export function logsToCsv(logs: TrialLog[]): string {
  const header = [
    'timestamp',
    'word',
    'wrong_letter_count',
    'fails',
    'time_to_correct_ms',
    'input_mode',
    'completed',
  ].join(',');
  const lines = logs.map((log) =>
    [
      log.ts,
      JSON.stringify(log.word),
      log.wrongLetterCount,
      log.fails,
      log.timeToCorrectMs ?? '',
      log.inputMode,
      log.completed ? '1' : '0',
    ].join(','),
  );
  return [header, ...lines].join('\n');
}
