import type { Category, Entry } from '@/src/db';
import {
  autoBackupFileName,
  backupFileName,
  buildBackup,
  restoreSummary,
  validateBackup,
} from '@/src/features/backup';

const categories: Category[] = [
  { id: 1, name: '커피', emoji: '☕', sortOrder: 0, isDefault: true },
  { id: 11, name: '편의점', emoji: '🏪', sortOrder: 1, isDefault: false },
];

const entries: Entry[] = [
  {
    id: 5,
    date: '2026-09-23',
    title: '아메리카노',
    amount: 4500,
    categoryId: 1,
    memo: null,
    createdAt: '2026-09-23T09:00:00+09:00',
    updatedAt: '2026-09-23T09:00:00+09:00',
  },
];

/** 올바른 기록 한 줄 (over 로 한 칸씩 망가뜨린다) */
function rawEntry(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 1,
    date: '2026-09-23',
    title: '아메리카노',
    amount: 4500,
    categoryId: 1,
    memo: null,
    createdAt: '2026-09-23T09:00:00+09:00',
    updatedAt: '2026-09-23T09:00:00+09:00',
    ...over,
  };
}

function rawBackup(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    app: 'savelog',
    version: 2,
    exportedAt: '2026-09-23T13:58:00+09:00',
    settings: { monthlyGoal: 300000 },
    categories: [{ id: 1, name: '커피', emoji: '☕', sortOrder: 0, isDefault: true }],
    entries: [rawEntry()],
    ...over,
  };
}

describe('buildBackup', () => {
  it('PRD 형식 version 2: app · version · exportedAt · settings.monthlyGoal · categories · entries', () => {
    const backup = buildBackup(categories, entries, { monthlyGoal: 300000 }, '2026-09-23T13:58:00+09:00');
    expect(backup).toEqual({
      app: 'savelog',
      version: 2,
      exportedAt: '2026-09-23T13:58:00+09:00',
      settings: { monthlyGoal: 300000 },
      categories: [
        { id: 1, name: '커피', emoji: '☕', sortOrder: 0, isDefault: true },
        { id: 11, name: '편의점', emoji: '🏪', sortOrder: 1, isDefault: false },
      ],
      entries: [
        {
          id: 5,
          date: '2026-09-23',
          title: '아메리카노',
          amount: 4500,
          categoryId: 1,
          memo: null,
          createdAt: '2026-09-23T09:00:00+09:00',
          updatedAt: '2026-09-23T09:00:00+09:00',
        },
      ],
    });
  });

  it('exportedAt 기본값은 로컬 시간대가 붙은 ISO, 목표 없음은 null', () => {
    const backup = buildBackup([], [], { monthlyGoal: null });
    expect(backup.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
    expect(backup.settings).toEqual({ monthlyGoal: null });
  });

  it('JSON 으로 옮겨도 validateBackup 이 그대로 받는다', () => {
    const backup = buildBackup(categories, entries, { monthlyGoal: 300000 });
    const result = validateBackup(JSON.parse(JSON.stringify(backup)));
    expect(result.ok).toBe(true);
    expect(result.data?.entries).toEqual(backup.entries);
    expect(result.data?.categories.map((c) => c.name)).toEqual(['커피', '편의점']);
    expect(result.data?.settings).toEqual({ monthlyGoal: 300000 });
  });
});

describe('파일 이름', () => {
  it('JSON 은 savelog-backup-YYYY-MM-DD.json, 자동 백업은 시각까지', () => {
    expect(backupFileName('2026-09-25')).toBe('savelog-backup-2026-09-25.json');
    expect(autoBackupFileName('2026-09-25-135800')).toBe('savelog-autobackup-2026-09-25-135800.json');
  });
});

describe('validateBackup — 파일 전체 거부', () => {
  it.each([
    ['객체가 아님', 'hello'],
    ['null', null],
    ['배열', []],
    ['app 불일치', rawBackup({ app: 'otherapp' })],
    ['app 없음', rawBackup({ app: undefined })],
  ])('%s → SaveLog 백업 파일이 아닙니다', (_label, raw) => {
    const result = validateBackup(raw);
    expect(result.ok).toBe(false);
    expect(result.data).toBeNull();
    expect(result.errors).toEqual(['SaveLog 백업 파일이 아닙니다']);
  });

  it('version 이 1·2 가 아니면 거부', () => {
    expect(validateBackup(rawBackup({ version: 3 })).ok).toBe(false);
    expect(validateBackup(rawBackup({ version: '2' })).ok).toBe(false);
    expect(validateBackup(rawBackup({ version: 3 })).errors[0]).toContain('지원하지 않는 백업 버전');
  });

  it('categories 나 entries 가 배열이 아니면 거부', () => {
    expect(validateBackup(rawBackup({ categories: {} })).ok).toBe(false);
    expect(validateBackup(rawBackup({ entries: undefined })).ok).toBe(false);
  });
});

describe('validateBackup — 행 검증', () => {
  it('version 2: settings.monthlyGoal 을 읽는다 (1원 미만·소수는 목표 없음)', () => {
    expect(validateBackup(rawBackup()).data?.settings).toEqual({ monthlyGoal: 300000 });
    expect(validateBackup(rawBackup({ settings: { monthlyGoal: 0 } })).data?.settings).toEqual({
      monthlyGoal: null,
    });
    expect(validateBackup(rawBackup({ settings: { monthlyGoal: 1.5 } })).data?.settings).toEqual({
      monthlyGoal: null,
    });
  });

  it('version 1: settings 가 없어도 받고, 설정은 null(건드리지 않음)', () => {
    const raw = rawBackup({ version: 1 });
    delete raw.settings;
    const result = validateBackup(raw);
    expect(result.ok).toBe(true);
    expect(result.data?.version).toBe(1);
    expect(result.data?.settings).toBeNull();
    expect(result.data?.entries).toHaveLength(1);
  });

  it('잘못된 날짜 · 금액 · 빈 항목명 행은 건너뛰고 건수를 센다', () => {
    const result = validateBackup(
      rawBackup({
        entries: [
          rawEntry(),
          rawEntry({ date: '2026-02-30' }), // 없는 날
          rawEntry({ date: '2026-9-1' }), // 형식
          rawEntry({ date: '2026/09/01' }),
          rawEntry({ amount: 0 }),
          rawEntry({ amount: -100 }),
          rawEntry({ amount: 4500.5 }),
          rawEntry({ amount: '4500' }),
          rawEntry({ title: '   ' }),
          rawEntry({ title: undefined }),
          'not an entry',
          rawEntry({ title: '택시', amount: 12000 }),
        ],
      }),
    );
    expect(result.ok).toBe(true);
    expect(result.data?.entries.map((e) => e.title)).toEqual(['아메리카노', '택시']);
    expect(result.data?.skippedEntries).toBe(10);
    expect(result.errors).toHaveLength(10);
    expect(result.errors[0]).toBe('기록 2번째: 날짜 형식이 틀렸습니다');
    expect(result.errors).toContain('기록 5번째: 금액은 1원 이상의 정수여야 합니다');
    expect(result.errors).toContain('기록 9번째: 항목명이 비어 있습니다');
  });

  it('카테고리 이름·이모지가 문자열이 아니거나 비면 건너뛰고, 이름이 겹치면 뒤의 것을 건너뛴다', () => {
    const result = validateBackup(
      rawBackup({
        categories: [
          { id: 1, name: '커피', emoji: '☕', sortOrder: 0, isDefault: true },
          { id: 2, name: '', emoji: '🍚' },
          { id: 3, name: '배달', emoji: 5 },
          { id: 4, name: '커피', emoji: '🥤' },
          { name: '편의점', emoji: '🏪' },
        ],
        entries: [rawEntry({ categoryId: 4 })],
      }),
    );
    expect(result.data?.categories.map((c) => c.name)).toEqual(['커피', '편의점']);
    expect(result.data?.skippedCategories).toBe(3);
    // 겹쳐서 건너뛴 id 4 도 같은 이름 '커피' 로 이어 둔다
    expect(result.data?.categoryNameById.get(4)).toBe('커피');
    // id 없는 카테고리도 받는다 (기록과 이을 수만 없다)
    expect(result.data?.categories[1]?.id).toBeNull();
  });

  it('카테고리 이름 12자 · 이모지 2자를 넘으면 편집 화면과 같이 건너뛰고 건너뜀에 센다', () => {
    const result = validateBackup(
      rawBackup({
        categories: [
          { id: 1, name: '가나다라마바사아자차카타', emoji: '👨‍👩‍👧🛍️' },
          { id: 2, name: '가나다라마바사아자차카타파', emoji: '⭐' },
          { id: 3, name: '커피', emoji: '☕☕☕' },
        ],
        entries: [],
      }),
    );
    expect(result.data?.categories.map((c) => c.name)).toEqual(['가나다라마바사아자차카타']);
    expect(result.data?.skippedCategories).toBe(2);
    expect(result.errors).toContain('카테고리 2번째: 이름은 12자까지 쓸 수 있습니다');
    expect(result.errors).toContain('카테고리 3번째: 이모지는 2자까지 쓸 수 있습니다');
  });

  it('memo·categoryId 가 이상하면 null, 시각이 없으면 날짜로 채운다', () => {
    const result = validateBackup(
      rawBackup({ entries: [rawEntry({ memo: 3, categoryId: 'x', createdAt: undefined, updatedAt: '' })] }),
    );
    expect(result.data?.entries[0]).toMatchObject({
      memo: null,
      categoryId: null,
      createdAt: '2026-09-23T00:00:00',
      updatedAt: '2026-09-23T00:00:00',
    });
  });
});

describe('restoreSummary', () => {
  it('"기록 N건, 카테고리 M개. 건너뜀 K건" — 건너뜀이 없으면 뒤 문장 없음', () => {
    const ok = validateBackup(rawBackup());
    expect(ok.data && restoreSummary(ok.data)).toBe('기록 1건, 카테고리 1개.');
    const skipped = validateBackup(
      rawBackup({ entries: [rawEntry(), rawEntry({ amount: 0 }), rawEntry({ date: 'x' })] }),
    );
    expect(skipped.data && restoreSummary(skipped.data)).toBe('기록 1건, 카테고리 1개. 건너뜀 2건');
  });
});
