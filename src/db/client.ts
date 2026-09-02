import * as SQLite from 'expo-sqlite';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('moviedu.db').then(async (db) => {
      await db.execAsync(`
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
      `);
      return db;
    });
  }
  return dbPromise;
}
