import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

import { runMigrations } from './migrations';

export const DB_NAME = 'savelog.db';

let db: SQLiteDatabase | null = null;
let initialized = false;

/**
 * PRAGMA 는 연결마다 다시 걸어야 한다. 특히 foreign_keys 가 꺼지면
 * 카테고리 삭제 시 ON DELETE SET NULL 이 동작하지 않는다.
 */
function configure(conn: SQLiteDatabase): SQLiteDatabase {
  conn.execSync('PRAGMA journal_mode = WAL;');
  conn.execSync('PRAGMA foreign_keys = ON;');
  return conn;
}

/** 앱 전체에서 하나만 쓰는 기본 DB 연결. */
export function getDb(): SQLiteDatabase {
  if (!db) {
    db = configure(openDatabaseSync(DB_NAME));
  }
  return db;
}

/**
 * 기본 DB 가 아닌 파일(복원 대상 등)을 따로 연다.
 * 전역 연결은 건드리지 않으므로, 다 쓰면 호출자가 closeSync() 로 닫는다.
 */
export function openDatabaseAt(name: string): SQLiteDatabase {
  return configure(openDatabaseSync(name));
}

/** 앱 시작 시 한 번 호출. 연결(+PRAGMA) 확보 후 마이그레이션. 여러 번 불러도 안전. */
export function initDatabase(): void {
  if (initialized) return;
  runMigrations(getDb());
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
