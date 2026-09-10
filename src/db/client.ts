import * as SQLite from 'expo-sqlite';

const SCHEMA = `
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS media (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    file_uri TEXT NOT NULL,
    duration_sec REAL,
    position_sec REAL NOT NULL DEFAULT 0,
    byte_size INTEGER,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS words (
    id TEXT PRIMARY KEY NOT NULL,
    word TEXT NOT NULL,
    image_uri TEXT,
    enabled INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'new',
    prompt_mode TEXT NOT NULL DEFAULT 'outline',
    ease REAL NOT NULL DEFAULT 2.5,
    interval_days REAL NOT NULL DEFAULT 0,
    next_due_at TEXT,
    consecutive_correct INTEGER NOT NULL DEFAULT 0,
    consecutive_wrong INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS logs (
    id TEXT PRIMARY KEY NOT NULL,
    ts TEXT NOT NULL,
    word TEXT NOT NULL,
    word_id TEXT,
    wrong_letter_count INTEGER NOT NULL,
    fails INTEGER NOT NULL,
    time_to_correct_ms INTEGER,
    input_mode TEXT NOT NULL,
    completed INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS kv (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
`;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function isCorruptDbError(err: unknown): boolean {
  const msg = err instanceof Error ? `${err.message} ${err}` : String(err);
  return /malformed|SQLITE_CORRUPT|SQLITE_NOTADB|disk image/i.test(msg);
}

async function openWithSchema(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('moviedu.db');
  await db.execAsync(SCHEMA);
  return db;
}

async function openReadyDb(): Promise<SQLite.SQLiteDatabase> {
  try {
    return await openWithSchema();
  } catch (err) {
    if (!isCorruptDbError(err)) throw err;
    try {
      await SQLite.deleteDatabaseAsync('moviedu.db');
    } catch {
      // ignore — a missing file is the success case
    }
    return openWithSchema();
  }
}

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openReadyDb();
  }
  return dbPromise;
}
