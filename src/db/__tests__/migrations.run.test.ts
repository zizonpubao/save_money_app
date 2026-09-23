import type { SQLiteDatabase } from 'expo-sqlite';

import { getDb, initDatabase, resetDatabaseConnection } from '@/src/db';
import { DEFAULT_CATEGORIES, runMigrations } from '@/src/db/migrations';

/** 전체 기본 카테고리(v2 이후) 이름 순서 */
const V2_CATEGORY_NAMES = [
  '커피',
  '밥값',
  '배달',
  '택시',
  '쇼핑',
  '술',
  '간식',
  '구독',
  '기타',
];

function categoryNames(db: SQLiteDatabase): string[] {
  return db
    .getAllSync<{ name: string }>('SELECT name FROM categories ORDER BY sort_order ASC, id ASC')
    .map((r) => r.name);
}

function sortOrderOf(db: SQLiteDatabase, name: string): number {
  return (
    db.getFirstSync<{ sort_order: number }>('SELECT sort_order FROM categories WHERE name = ?', [
      name,
    ])?.sort_order ?? -1
  );
}

function currentVersion(db: SQLiteDatabase): number {
  return (
    db.getFirstSync<{ version: number | null }>('SELECT MAX(version) AS version FROM schema_version')
      ?.version ?? 0
  );
}

/** v1 시절의 DB 를 그대로 재현한다 (v2 업그레이드 경로를 테스트하기 위해). */
function buildV1Database(): SQLiteDatabase {
  const db = getDb();
  db.execSync('PRAGMA foreign_keys = ON;');
  db.execSync(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      emoji TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_default INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      amount INTEGER NOT NULL,
      category_id INTEGER,
      memo TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date);

    CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL);
  `);
  DEFAULT_CATEGORIES.forEach((c, i) => {
    db.runSync(
      'INSERT OR IGNORE INTO categories (name, emoji, sort_order, is_default) VALUES (?, ?, ?, 1)',
      [c.name, c.emoji, i],
    );
  });
  db.runSync('INSERT INTO schema_version (version) VALUES (1)');
  return db;
}

describe('마이그레이션 실행', () => {
  beforeEach(() => {
    resetDatabaseConnection();
  });

  afterAll(() => {
    resetDatabaseConnection();
  });

  it('빈 DB 를 초기화하면 스키마 버전이 최신(2)이 된다', () => {
    initDatabase();
    expect(currentVersion(getDb())).toBe(2);
  });

  it('초기화 후 categories · entries · schema_version 세 테이블이 생긴다', () => {
    initDatabase();
    const tables = getDb()
      .getAllSync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
      )
      .map((r) => r.name);
    expect(tables).toEqual(expect.arrayContaining(['categories', 'entries', 'schema_version']));
  });

  it('기본 카테고리는 커피·밥값·배달… 순서로 9개가 시드된다', () => {
    initDatabase();
    expect(categoryNames(getDb())).toEqual(V2_CATEGORY_NAMES);
  });

  it('밥값은 커피 바로 다음(sort_order 1)에 들어간다', () => {
    initDatabase();
    expect(sortOrderOf(getDb(), '커피')).toBe(0);
    expect(sortOrderOf(getDb(), '밥값')).toBe(1);
    expect(sortOrderOf(getDb(), '배달')).toBe(2);
  });

  it('runMigrations 를 두 번 불러도 카테고리가 9개 그대로고 sort_order 가 밀리지 않는다', () => {
    initDatabase();
    const db = getDb();
    runMigrations(db);
    runMigrations(db);
    expect(categoryNames(db)).toEqual(V2_CATEGORY_NAMES);
    expect(sortOrderOf(db, '밥값')).toBe(1);
    expect(currentVersion(db)).toBe(2);
  });

  it('v1 만 적용된 DB 에 runMigrations 를 돌리면 v2 만 추가로 적용된다', () => {
    const db = buildV1Database();
    expect(categoryNames(db)).toHaveLength(8);

    expect(runMigrations(db)).toBe(2);
    expect(
      db.getAllSync<{ version: number }>('SELECT version FROM schema_version ORDER BY version'),
    ).toEqual([{ version: 1 }, { version: 2 }]);
  });

  it('v1 → v2 업그레이드는 기존 카테고리를 한 칸씩 밀고 밥값을 1번 자리에 넣는다', () => {
    const db = buildV1Database();
    runMigrations(db);
    expect(categoryNames(db)).toEqual(V2_CATEGORY_NAMES);
    expect(sortOrderOf(db, '커피')).toBe(0);
    expect(sortOrderOf(db, '밥값')).toBe(1);
    expect(sortOrderOf(db, '기타')).toBe(8);
  });

  it('v1 → v2 업그레이드는 기존 기록을 건드리지 않는다', () => {
    const db = buildV1Database();
    db.runSync(
      'INSERT INTO entries (date, title, amount, category_id, memo, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['2026-09-01', '아메리카노', 4500, 1, null, '2026-09-01T09:00:00+09:00', '2026-09-01T09:00:00+09:00'],
    );
    runMigrations(db);
    const entry = db.getFirstSync<{ title: string; amount: number; category_id: number | null }>(
      'SELECT title, amount, category_id FROM entries',
    );
    expect(entry).toEqual({ title: '아메리카노', amount: 4500, category_id: 1 });
  });

  it('사용자가 밥값을 이미 만들어 둔 DB 를 v2 로 올려도 카테고리가 늘어나지 않고 사용자 것이 유지된다', () => {
    const db = buildV1Database();
    db.runSync(
      'INSERT INTO categories (name, emoji, sort_order, is_default) VALUES (?, ?, ?, 0)',
      ['밥값', '🍱', 8],
    );
    expect(categoryNames(db)).toHaveLength(9);

    runMigrations(db);

    expect(categoryNames(db)).toHaveLength(9);
    const bab = db.getFirstSync<{ emoji: string; is_default: number }>(
      'SELECT emoji, is_default FROM categories WHERE name = ?',
      ['밥값'],
    );
    expect(bab).toEqual({ emoji: '🍱', is_default: 0 });
  });

  it('initDatabase 를 두 번 불러도 안전하다', () => {
    initDatabase();
    initDatabase();
    expect(categoryNames(getDb())).toEqual(V2_CATEGORY_NAMES);
  });
});
