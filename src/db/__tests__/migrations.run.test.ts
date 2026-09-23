import type { SQLiteDatabase } from 'expo-sqlite';

import { getDb, initDatabase, openDatabaseAt, resetDatabaseConnection } from '@/src/db';
import { DEFAULT_CATEGORIES, runMigrations, runMigrationsUpTo } from '@/src/db/migrations';

/** v2·v3 시절 기본 카테고리 이름 순서 */
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

/** 전체 기본 카테고리(v4 이후) 이름 순서. 옷은 쇼핑 다음 */
const V4_CATEGORY_NAMES = [
  '커피',
  '밥값',
  '배달',
  '택시',
  '쇼핑',
  '옷',
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

function tableNames(db: SQLiteDatabase): string[] {
  return db
    .getAllSync<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table'")
    .map((r) => r.name);
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

  it('빈 DB 를 초기화하면 스키마 버전이 최신(4)이 된다 (0 → 4)', () => {
    initDatabase();
    expect(currentVersion(getDb())).toBe(4);
    expect(
      getDb().getAllSync<{ version: number }>('SELECT version FROM schema_version ORDER BY version'),
    ).toEqual([{ version: 1 }, { version: 2 }, { version: 3 }, { version: 4 }]);
  });

  it('초기화 후 settings 테이블이 있고 key 가 기본키다 (같은 키 두 번 넣기 실패)', () => {
    initDatabase();
    expect(tableNames(getDb())).toContain('settings');
    getDb().runSync('INSERT INTO settings (key, value) VALUES (?, ?)', ['monthly_goal', '1']);
    expect(() =>
      getDb().runSync('INSERT INTO settings (key, value) VALUES (?, ?)', ['monthly_goal', '2']),
    ).toThrow();
  });

  it('v2 까지만 올린 DB 를 최신으로 올리면 v3 · v4 가 추가로 적용되고 기록은 그대로다', () => {
    const db = getDb();
    expect(runMigrationsUpTo(db, 2)).toBe(2);
    expect(tableNames(db)).not.toContain('settings');
    db.runSync(
      'INSERT INTO entries (date, title, amount, category_id, memo, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['2026-09-01', '아메리카노', 4500, 1, null, '2026-09-01T09:00:00+09:00', '2026-09-01T09:00:00+09:00'],
    );

    expect(runMigrations(db)).toBe(4);
    expect(tableNames(db)).toContain('settings');
    expect(db.getFirstSync<{ n: number }>('SELECT COUNT(*) AS n FROM entries')?.n).toBe(1);
    expect(categoryNames(db)).toEqual(V4_CATEGORY_NAMES);
    // v3 는 빈 테이블만 만든다
    expect(db.getFirstSync<{ n: number }>('SELECT COUNT(*) AS n FROM settings')?.n).toBe(0);
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

  it('기본 카테고리는 커피·밥값·배달… 순서로 10개가 시드된다 (옷은 쇼핑 다음)', () => {
    initDatabase();
    expect(categoryNames(getDb())).toEqual(V4_CATEGORY_NAMES);
  });

  it('밥값은 커피 바로 다음(sort_order 1)에 들어간다', () => {
    initDatabase();
    expect(sortOrderOf(getDb(), '커피')).toBe(0);
    expect(sortOrderOf(getDb(), '밥값')).toBe(1);
    expect(sortOrderOf(getDb(), '배달')).toBe(2);
  });

  it('runMigrations 를 두 번 불러도 카테고리가 10개 그대로고 sort_order 가 밀리지 않는다', () => {
    initDatabase();
    const db = getDb();
    runMigrations(db);
    runMigrations(db);
    expect(categoryNames(db)).toEqual(V4_CATEGORY_NAMES);
    expect(sortOrderOf(db, '밥값')).toBe(1);
    expect(sortOrderOf(db, '옷')).toBe(5);
    expect(currentVersion(db)).toBe(4);
  });

  it('v1 만 적용된 DB 에 runMigrations 를 돌리면 v2 · v3 · v4 가 차례로 추가 적용된다', () => {
    const db = buildV1Database();
    expect(categoryNames(db)).toHaveLength(8);

    expect(runMigrations(db)).toBe(4);
    expect(
      db.getAllSync<{ version: number }>('SELECT version FROM schema_version ORDER BY version'),
    ).toEqual([{ version: 1 }, { version: 2 }, { version: 3 }, { version: 4 }]);
    expect(categoryNames(db)).toEqual(V4_CATEGORY_NAMES);
  });

  it('v1 → v2 업그레이드는 기존 카테고리를 한 칸씩 밀고 밥값을 1번 자리에 넣는다', () => {
    const db = buildV1Database();
    runMigrationsUpTo(db, 2);
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

    runMigrationsUpTo(db, 2);

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
    expect(categoryNames(getDb())).toEqual(V4_CATEGORY_NAMES);
  });

  it('runMigrationsUpTo(db, 1) 은 v1 까지만 적용한다', () => {
    const db = getDb();
    expect(runMigrationsUpTo(db, 1)).toBe(1);
    expect(currentVersion(db)).toBe(1);
    expect(categoryNames(db)).toHaveLength(8);

    // 이어서 최신까지 올리면 v2 · v3 · v4 가 마저 적용된다
    expect(runMigrations(db)).toBe(4);
    expect(categoryNames(db)).toEqual(V4_CATEGORY_NAMES);
  });

  it('openDatabaseAt 은 별도 연결을 열고 기본 연결(getDb)은 그대로 둔다', () => {
    initDatabase();
    const main = getDb();
    const other = openDatabaseAt('savelog-restore.db');
    expect(other).not.toBe(main);
    other.closeSync();

    // 다른 파일을 열고 닫아도 기본 연결은 갈아끼워지지 않는다
    expect(getDb()).toBe(main);
    expect(categoryNames(getDb())).toEqual(V4_CATEGORY_NAMES);
  });
});

describe('마이그레이션 v4 (옷 카테고리)', () => {
  beforeEach(() => {
    resetDatabaseConnection();
  });

  afterAll(() => {
    resetDatabaseConnection();
  });

  it('v3 까지 올린 DB 를 최신으로 올리면 v4 만 적용되고 옷이 쇼핑 다음(5)에 기본 카테고리로 들어간다', () => {
    const db = getDb();
    expect(runMigrationsUpTo(db, 3)).toBe(3);
    expect(categoryNames(db)).toEqual(V2_CATEGORY_NAMES);
    expect(sortOrderOf(db, '쇼핑')).toBe(4);

    expect(runMigrations(db)).toBe(4);
    expect(categoryNames(db)).toEqual(V4_CATEGORY_NAMES);
    expect(sortOrderOf(db, '쇼핑')).toBe(4);
    expect(sortOrderOf(db, '옷')).toBe(5);
    expect(sortOrderOf(db, '술')).toBe(6);
    expect(sortOrderOf(db, '기타')).toBe(9);
    const clothes = db.getFirstSync<{ emoji: string; is_default: number }>(
      'SELECT emoji, is_default FROM categories WHERE name = ?',
      ['옷'],
    );
    expect(clothes).toEqual({ emoji: '👕', is_default: 1 });
  });

  it('v3 → v4 업그레이드는 기존 기록과 카테고리 연결을 건드리지 않는다', () => {
    const db = getDb();
    runMigrationsUpTo(db, 3);
    const 술 = db.getFirstSync<{ id: number }>('SELECT id FROM categories WHERE name = ?', ['술']);
    db.runSync(
      'INSERT INTO entries (date, title, amount, category_id, memo, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['2026-09-01', '맥주', 8000, 술?.id ?? null, null, '2026-09-01T21:00:00+09:00', '2026-09-01T21:00:00+09:00'],
    );

    runMigrations(db);

    const entry = db.getFirstSync<{ title: string; name: string }>(
      'SELECT e.title AS title, c.name AS name FROM entries e JOIN categories c ON c.id = e.category_id',
    );
    expect(entry).toEqual({ title: '맥주', name: '술' });
  });

  it('사용자가 옷을 이미 만들어 둔 DB 를 v4 로 올려도 카테고리가 늘지 않고 사용자 것이 유지된다', () => {
    const db = getDb();
    runMigrationsUpTo(db, 3);
    db.runSync(
      'INSERT INTO categories (name, emoji, sort_order, is_default) VALUES (?, ?, ?, 0)',
      ['옷', '👗', 9],
    );
    expect(categoryNames(db)).toHaveLength(10);

    runMigrations(db);

    expect(categoryNames(db)).toHaveLength(10);
    const clothes = db.getFirstSync<{ emoji: string; is_default: number; sort_order: number }>(
      'SELECT emoji, is_default, sort_order FROM categories WHERE name = ?',
      ['옷'],
    );
    // 사용자 것은 이모지·삭제 가능 여부를 그대로 두고, 순서만 다른 카테고리와 함께 한 칸 밀린다
    expect(clothes).toEqual({ emoji: '👗', is_default: 0, sort_order: 10 });
    expect(categoryNames(db).slice(0, 5)).toEqual(['커피', '밥값', '배달', '택시', '쇼핑']);
  });
});
