import type { SQLiteDatabase } from 'expo-sqlite';

type Migration = {
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

const migrations: Migration[] = [
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
 * schema_version 테이블 기준으로 아직 적용 안 된 마이그레이션을 순서대로 실행한다.
 * 각 마이그레이션은 트랜잭션 하나로 묶여서 중간 실패 시 롤백된다.
 */
export function runMigrations(db: SQLiteDatabase): number {
  let current = getCurrentVersion(db);
  for (const m of migrations) {
    if (m.version <= current) continue;
    db.withTransactionSync(() => {
      m.up(db);
      db.runSync('INSERT INTO schema_version (version) VALUES (?)', [m.version]);
    });
    current = m.version;
  }
  return current;
}
