import type { SQLiteDatabase } from 'expo-sqlite';

export type Migration = {
  version: number;
  up: (db: SQLiteDatabase) => void;
};

/** v1 시드용 기본 카테고리 8개. is_default=1 이라 삭제 불가. v1 마이그레이션이 참조하므로 수정 금지. */
export const DEFAULT_CATEGORIES: readonly { name: string; emoji: string }[] = [
  { name: '커피', emoji: '☕' },
  { name: '배달', emoji: '🛵' },
  { name: '택시', emoji: '🚕' },
  { name: '쇼핑', emoji: '🛍️' },
  { name: '술', emoji: '🍺' },
  { name: '간식', emoji: '🍪' },
  { name: '구독', emoji: '📱' },
  { name: '기타', emoji: '📦' },
];

/**
 * (M5) 최신 스키마 기준 기본 카테고리 10개와 순서 (v1 8개 + v2 밥값 + v4 옷).
 * 데이터 전체 삭제 후 다시 채우는 목록이자, 복원 때 is_default 를 정하는 기준 이름표다.
 * 마이그레이션이 기본 카테고리를 더 넣으면 여기에도 같은 자리에 넣는다.
 */
export const CURRENT_DEFAULT_CATEGORIES: readonly { name: string; emoji: string }[] = [
  { name: '커피', emoji: '☕' },
  { name: '밥값', emoji: '🍚' },
  { name: '배달', emoji: '🛵' },
  { name: '택시', emoji: '🚕' },
  { name: '쇼핑', emoji: '🛍️' },
  { name: '옷', emoji: '👕' },
  { name: '술', emoji: '🍺' },
  { name: '간식', emoji: '🍪' },
  { name: '구독', emoji: '📱' },
  { name: '기타', emoji: '📦' },
];

/** 버전 오름차순. 중간에 끼워 넣지 말고 항상 뒤에 추가한다. */
export const migrations: readonly Migration[] = [
  {
    version: 1,
    up: (db) => {
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
      `);

      const insert = db.prepareSync(
        'INSERT OR IGNORE INTO categories (name, emoji, sort_order, is_default) VALUES (?, ?, ?, 1)',
      );
      try {
        DEFAULT_CATEGORIES.forEach((c, i) => {
          insert.executeSync([c.name, c.emoji, i]);
        });
      } finally {
        insert.finalizeSync();
      }
    },
  },
  {
    // 기본 카테고리에 '밥값' 추가. 커피(0) 다음, 배달 앞에 끼워 넣기 위해
    // sort_order 1 이상을 한 칸씩 밀고 빈 자리에 삽입한다. 기존 기록은 건드리지 않는다.
    version: 2,
    up: (db) => {
      db.execSync('UPDATE categories SET sort_order = sort_order + 1 WHERE sort_order >= 1');
      db.runSync(
        'INSERT OR IGNORE INTO categories (name, emoji, sort_order, is_default) VALUES (?, ?, ?, ?)',
        ['밥값', '🍚', 1, 1],
      );
    },
  },
  {
    // (M3.5) 월 목표 등 앱 설정을 담는 키-값 테이블. 새 테이블만 만들고 기존 데이터는 건드리지 않는다.
    version: 3,
    up: (db) => {
      db.execSync(
        'CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);',
      );
    },
  },
  {
    // (M4) 기본 카테고리에 '옷' 추가. 쇼핑(4) 다음, 술 앞에 끼워 넣기 위해 v2 와 같은 방식으로
    // sort_order 5 이상을 한 칸씩 밀고 빈 자리에 삽입한다. 사용자가 이미 '옷' 을 만들었으면 그것을 그대로 둔다.
    version: 4,
    up: (db) => {
      db.execSync('UPDATE categories SET sort_order = sort_order + 1 WHERE sort_order >= 5');
      db.runSync(
        'INSERT OR IGNORE INTO categories (name, emoji, sort_order, is_default) VALUES (?, ?, ?, ?)',
        ['옷', '👕', 5, 1],
      );
    },
  },
];

export const LATEST_SCHEMA_VERSION = migrations[migrations.length - 1]?.version ?? 0;

function getCurrentVersion(db: SQLiteDatabase): number {
  db.execSync('CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL);');
  const row = db.getFirstSync<{ version: number | null }>(
    'SELECT MAX(version) AS version FROM schema_version',
  );
  return row?.version ?? 0;
}

/**
 * schema_version 테이블 기준으로 target 이하의 아직 적용 안 된 마이그레이션만 순서대로 실행한다.
 * 각 마이그레이션은 트랜잭션 하나로 묶여서 중간 실패 시 롤백된다.
 * (업그레이드 경로 테스트에서 "v1 까지만 올린 DB" 를 만들 때 쓴다.)
 */
export function runMigrationsUpTo(db: SQLiteDatabase, target: number): number {
  let current = getCurrentVersion(db);
  for (const m of migrations) {
    if (m.version <= current || m.version > target) continue;
    db.withTransactionSync(() => {
      m.up(db);
      db.runSync('INSERT INTO schema_version (version) VALUES (?)', [m.version]);
    });
    current = m.version;
  }
  return current;
}

/** 최신 버전까지 마이그레이션한다. */
export function runMigrations(db: SQLiteDatabase): number {
  return runMigrationsUpTo(db, LATEST_SCHEMA_VERSION);
}
