import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

import { runMigrations } from './migrations';

export const DB_NAME = 'savelog.db';

let db: SQLiteDatabase | null = null;
let initialized = false;

/** 앱 전체에서 하나만 쓰는 DB 연결 */
export function getDb(): SQLiteDatabase {
  if (!db) {
    db = openDatabaseSync(DB_NAME);
  }
  return db;
}

/** 앱 시작 시 한 번 호출. PRAGMA 설정 + 마이그레이션. 여러 번 불러도 안전. */
export function initDatabase(): void {
  if (initialized) return;
  const database = getDb();
  database.execSync('PRAGMA journal_mode = WAL;');
  database.execSync('PRAGMA foreign_keys = ON;');
  runMigrations(database);
  initialized = true;
}

/** 테스트/복원용: 연결을 끊고 다음 getDb() 에서 다시 연다. */
export function resetDatabaseConnection(): void {
  if (db) {
    db.closeSync();
    db = null;
  }
  initialized = false;
}
