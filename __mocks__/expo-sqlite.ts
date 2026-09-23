import type { BindParams, Database, SqlValue, Statement } from 'sql.js';

import { getSqlJs } from './sqlJsRuntime';

/**
 * jest 용 expo-sqlite 대역. 네이티브 SQLite 대신 sql.js(순수 JS/wasm) 인메모리 DB 를 감싼다.
 * `__mocks__/` 가 node_modules 와 같은 높이에 있으므로 jest 가 자동으로 이 파일을 쓴다.
 *
 * 흉내 내는 범위는 src/db/*.ts 가 실제로 호출하는 동기 API 뿐이다:
 * execSync / runSync / getAllSync / getFirstSync / prepareSync(+executeSync, finalizeSync) /
 * withTransactionSync / closeSync.
 *
 * 실제 expo-sqlite 와 다른 점(의도한 것): openDatabaseSync 는 이름과 상관없이 매번 빈
 * 인메모리 DB 를 연다. 테스트마다 resetDatabaseConnection() 만 부르면 깨끗한 DB 가 된다.
 */

type BindValue = SqlValue | boolean | undefined;

/** runSync(sql, [a, b]) 와 runSync(sql, a, b) 를 모두 받아 sql.js 가 이해하는 배열로 만든다. */
function normalizeParams(params: unknown[]): BindParams {
  const flat = params.length === 1 && Array.isArray(params[0]) ? (params[0] as unknown[]) : params;
  return flat.map((value) => toSqlValue(value as BindValue));
}

function toSqlValue(value: BindValue): SqlValue {
  if (value === undefined) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  return value;
}

function readAll<T>(statement: Statement, params: BindParams): T[] {
  statement.bind(params);
  const rows: T[] = [];
  while (statement.step()) {
    rows.push(statement.getAsObject() as T);
  }
  return rows;
}

export type SQLiteRunResult = {
  lastInsertRowId: number;
  changes: number;
};

/** expo-sqlite 의 SQLiteStatement 대역 */
export class MockSQLiteStatement {
  constructor(
    private readonly db: MockSQLiteDatabase,
    private readonly statement: Statement,
  ) {}

  executeSync<T>(...params: unknown[]) {
    const bound = normalizeParams(params);
    const rows = readAll<T>(this.statement, bound);
    const result = this.db.lastResult();
    return {
      ...result,
      getAllSync: (): T[] => rows,
      getFirstSync: (): T | null => rows[0] ?? null,
      resetSync: (): void => this.statement.reset(),
      [Symbol.iterator]: (): Iterator<T> => rows[Symbol.iterator](),
    };
  }

  finalizeSync(): void {
    this.statement.free();
  }
}

/** expo-sqlite 의 SQLiteDatabase 대역 */
export class MockSQLiteDatabase {
  private closed = false;

  constructor(
    public readonly databaseName: string,
    private readonly db: Database,
  ) {}

  /** 마지막 쓰기의 lastInsertRowId / changes */
  lastResult(): SQLiteRunResult {
    const rows = this.db.exec('SELECT last_insert_rowid() AS id');
    const id = rows[0]?.values[0]?.[0];
    return {
      lastInsertRowId: typeof id === 'number' ? id : 0,
      changes: this.db.getRowsModified(),
    };
  }

  /** 세미콜론으로 이어진 여러 문장을 한 번에 실행한다 (PRAGMA, CREATE TABLE 묶음). */
  execSync(source: string): void {
    this.assertOpen();
    this.db.run(source);
  }

  runSync(source: string, ...params: unknown[]): SQLiteRunResult {
    this.assertOpen();
    const statement = this.db.prepare(source);
    try {
      statement.run(normalizeParams(params));
    } finally {
      statement.free();
    }
    return this.lastResult();
  }

  getAllSync<T>(source: string, ...params: unknown[]): T[] {
    this.assertOpen();
    const statement = this.db.prepare(source);
    try {
      return readAll<T>(statement, normalizeParams(params));
    } finally {
      statement.free();
    }
  }

  getFirstSync<T>(source: string, ...params: unknown[]): T | null {
    return this.getAllSync<T>(source, ...params)[0] ?? null;
  }

  prepareSync(source: string): MockSQLiteStatement {
    this.assertOpen();
    return new MockSQLiteStatement(this, this.db.prepare(source));
  }

  withTransactionSync(task: () => void): void {
    this.assertOpen();
    this.db.run('BEGIN');
    try {
      task();
      this.db.run('COMMIT');
    } catch (error) {
      this.db.run('ROLLBACK');
      throw error;
    }
  }

  closeSync(): void {
    if (this.closed) return;
    this.closed = true;
    this.db.close();
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new Error('닫힌 DB 를 사용했습니다 (closeSync 이후 호출)');
    }
  }
}

/** 이름과 무관하게 매번 새 인메모리 DB 를 연다. */
export function openDatabaseSync(databaseName: string): MockSQLiteDatabase {
  const SQL = getSqlJs();
  return new MockSQLiteDatabase(databaseName, new SQL.Database());
}

export function deleteDatabaseSync(): void {
  // 인메모리라 남는 파일이 없다. 호출만 받아 준다.
}
