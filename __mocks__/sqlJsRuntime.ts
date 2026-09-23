import type { SqlJsStatic } from 'sql.js';

/**
 * sql.js 는 `initSqlJs()` 로 비동기 초기화해야 하지만 expo-sqlite 의 API 는 전부 동기다.
 * 그래서 jest.setup.ts 의 beforeAll 에서 한 번 로드해 여기에 담아 두고,
 * __mocks__/expo-sqlite.ts 가 동기적으로 꺼내 쓴다.
 *
 * jest.resetModules() 를 써도 살아남도록 모듈 변수가 아니라 globalThis 에 둔다.
 */
const KEY = '__savelogSqlJs__';

type GlobalWithSqlJs = typeof globalThis & Record<typeof KEY, SqlJsStatic | undefined>;

export function setSqlJs(sql: SqlJsStatic): void {
  (globalThis as GlobalWithSqlJs)[KEY] = sql;
}

export function getSqlJs(): SqlJsStatic {
  const sql = (globalThis as GlobalWithSqlJs)[KEY];
  if (!sql) {
    throw new Error(
      'sql.js 가 아직 로드되지 않았습니다. package.json 의 jest.setupFilesAfterEnv 에 jest.setup.ts 가 연결됐는지 확인하세요.',
    );
  }
  return sql;
}
