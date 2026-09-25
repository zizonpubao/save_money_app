import type { Category, Entry } from '@/src/db';
import { CURRENT_DEFAULT_CATEGORIES } from '@/src/db/migrations';
import { validateBackup, type ValidBackup } from '@/src/features/backup';
import {
  isDefaultCategoryName,
  mergeResultMessage,
  planMerge,
  planOverwrite,
} from '@/src/features/restore';

function valid(raw: Record<string, unknown>): ValidBackup {
  const result = validateBackup({ app: 'savelog', version: 2, settings: { monthlyGoal: 200000 }, ...raw });
  if (!result.ok) throw new Error(result.errors.join());
  return result.data;
}

function entry(over: Partial<Entry> = {}): Entry {
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

const existingCategories: Category[] = [
  { id: 1, name: '커피', emoji: '☕', sortOrder: 0, isDefault: true },
  { id: 2, name: '택시', emoji: '🚕', sortOrder: 1, isDefault: true },
];

// 백업 쪽 id 는 지금 DB 와 다르다 (다른 기기·초기화 후). 이름으로만 이어야 한다
const incoming = valid({
  categories: [
    { id: 7, name: '택시', emoji: '🚖', sortOrder: 1 },
    { id: 8, name: '편의점', emoji: '🏪', sortOrder: 2 },
    { id: 9, name: '커피', emoji: '🥤', sortOrder: 0 },
  ],
  entries: [
    { date: '2026-09-23', title: '아메리카노', amount: 4500, categoryId: 9, createdAt: '2026-09-23T09:00:00+09:00' },
    { date: '2026-09-23', title: '아메리카노', amount: 4500, categoryId: 9, createdAt: '2026-09-23T15:00:00+09:00' },
    { date: '2026-09-24', title: '택시비', amount: 12000, categoryId: 7, createdAt: '2026-09-24T09:00:00+09:00' },
    { date: '2026-09-24', title: '삼각김밥', amount: 1500, categoryId: 8, createdAt: '2026-09-24T12:00:00+09:00' },
    { date: '2026-09-24', title: '물', amount: 900, categoryId: 42, createdAt: '2026-09-24T13:00:00+09:00' },
    { date: '2026-09-24', title: '삼각김밥', amount: 1500, categoryId: 8, createdAt: '2026-09-24T12:00:00+09:00' },
  ],
});

describe('planMerge', () => {
  const plan = planMerge({ categories: existingCategories, entries: [entry()] }, incoming);

  it('카테고리는 이름으로 맞춰 없는 것만 추가한다 (기존 이모지는 그대로, 새 것은 사용자 카테고리)', () => {
    expect(plan.categories).toEqual([{ name: '편의점', emoji: '🏪', sortOrder: 0, isDefault: false }]);
  });

  it('(date, title, amount, created_at) 가 같은 기록은 건너뛴다 — 파일 안에서 겹친 것도', () => {
    expect(plan.entries.map((e) => `${e.title}@${e.createdAt}`)).toEqual([
      '아메리카노@2026-09-23T15:00:00+09:00',
      '택시비@2026-09-24T09:00:00+09:00',
      '삼각김밥@2026-09-24T12:00:00+09:00',
      '물@2026-09-24T13:00:00+09:00',
    ]);
    expect(plan.skippedDuplicates).toBe(2);
  });

  it('category_id 는 백업 id → 이름으로 바꿔 둔다 (넣을 때 그 이름의 id 로 다시 잇는다). 모르는 id 는 미분류', () => {
    expect(plan.entries.map((e) => e.categoryName)).toEqual(['커피', '택시', '편의점', null]);
  });

  it('월 목표는 건드리지 않는다', () => {
    expect(plan.monthlyGoal).toBeUndefined();
  });

  it('완료 문구: 추가 건수 + 건너뛴 중복', () => {
    expect(mergeResultMessage(plan)).toBe(
      '기록 4건, 카테고리 1개를 추가했습니다.\n이미 있는 기록 2건은 건너뛰었습니다.',
    );
    expect(mergeResultMessage({ ...plan, skippedDuplicates: 0 })).toBe(
      '기록 4건, 카테고리 1개를 추가했습니다.',
    );
  });
});

describe('planOverwrite', () => {
  const plan = planOverwrite(incoming);

  it('백업 카테고리 전부를 sortOrder 순으로 0부터 다시 매기고, 기본 이름이면 is_default. 빠진 기본은 맨 뒤에', () => {
    expect(plan.categories.slice(0, 3)).toEqual([
      { name: '커피', emoji: '🥤', sortOrder: 0, isDefault: true },
      { name: '택시', emoji: '🚖', sortOrder: 1, isDefault: true },
      { name: '편의점', emoji: '🏪', sortOrder: 2, isDefault: false },
    ]);
    expect(plan.categories.slice(3)).toEqual(
      ['밥값', '배달', '쇼핑', '옷', '술', '간식', '구독', '기타'].map((name, i) =>
        expect.objectContaining({ name, sortOrder: 3 + i, isDefault: true }),
      ),
    );
  });

  it('카테고리 0개 백업(전부 걸러진 것 포함)도 기본 10개가 남는다', () => {
    const empty = valid({ categories: [], entries: [] });
    expect(planOverwrite(empty).categories).toEqual(
      CURRENT_DEFAULT_CATEGORIES.map((d, i) => ({ name: d.name, emoji: d.emoji, sortOrder: i, isDefault: true })),
    );
    const allBad = valid({ categories: [{ name: '', emoji: '☕' }, { name: '커피' }], entries: [] });
    expect(allBad.skippedCategories).toBe(2);
    expect(planOverwrite(allBad).categories.filter((c) => c.isDefault)).toHaveLength(10);
  });

  it('이름 바꾼 기본은 채우지 않고 기타 유지', () => {
    // 커피 → 카페 로 이름만 바꾼 백업: 기본이 이미 10개라 커피를 채우지 않고, 기타도 빼지 않는다
    const rest = CURRENT_DEFAULT_CATEGORIES.slice(1).map((d, i) => ({ ...d, sortOrder: 1 + i, isDefault: true }));
    const renamed = valid({
      categories: [
        { name: '카페', emoji: '☕', sortOrder: 0, isDefault: true },
        ...rest,
        { name: '편의점', emoji: '🏪', sortOrder: 10, isDefault: false },
      ],
      entries: [],
    });
    const cats = planOverwrite(renamed).categories;
    expect(cats.map((c) => [c.name, c.isDefault])).toEqual([
      ['카페', true],
      ...rest.map((d) => [d.name, true]),
      ['편의점', false],
    ]);
    expect(cats.map((c) => c.name)).not.toContain('커피');
  });

  it('기본이 10개 미만이면 빠진 기본 이름을 기본 목록 순서로 10개가 될 만큼만 채운다', () => {
    const partial = valid({
      categories: [
        { name: '카페', emoji: '☕', sortOrder: 0, isDefault: true },
        { name: '밥값', emoji: '🍚', sortOrder: 1, isDefault: true },
        { name: '편의점', emoji: '🏪', sortOrder: 2, isDefault: false },
      ],
      entries: [],
    });
    const cats = planOverwrite(partial).categories;
    expect(cats.filter((c) => c.isDefault)).toHaveLength(10);
    expect(cats.slice(3).map((c) => c.name)).toEqual(['커피', '배달', '택시', '쇼핑', '옷', '술', '간식', '구독']);
  });

  it('파일에 isDefault 가 11개 이상이면 기본 목록에 없는 이름부터 사용자 카테고리로 내린다', () => {
    const extra = ['가', '나'].map((name, i) => ({ name, emoji: '⭐', sortOrder: i, isDefault: true }));
    const all = CURRENT_DEFAULT_CATEGORIES.map((d, i) => ({ ...d, sortOrder: 2 + i, isDefault: true }));
    const cats = planOverwrite(valid({ categories: [...extra, ...all], entries: [] })).categories;
    expect(cats).toHaveLength(12);
    expect(cats.filter((c) => c.isDefault).map((c) => c.name)).toEqual(CURRENT_DEFAULT_CATEGORIES.map((d) => d.name));
    expect(cats.filter((c) => !c.isDefault).map((c) => c.name)).toEqual(['가', '나']);
  });

  it('기록은 중복 걸러내기 없이 전부, 월 목표는 백업 값', () => {
    expect(plan.entries).toHaveLength(6);
    expect(plan.monthlyGoal).toBe(200000);
  });

  it('version 1(설정 없음)이면 목표는 건드리지 않음(undefined), 목표 없음(null)과 구분', () => {
    const v1 = validateBackup({ app: 'savelog', version: 1, categories: [], entries: [] });
    expect(v1.data && planOverwrite(v1.data).monthlyGoal).toBeUndefined();
    const noGoal = valid({ settings: { monthlyGoal: null }, categories: [], entries: [] });
    expect(planOverwrite(noGoal).monthlyGoal).toBeNull();
  });
});

describe('isDefaultCategoryName', () => {
  it('기본 10개 이름만 true', () => {
    expect(['커피', '밥값', '옷', '기타'].every(isDefaultCategoryName)).toBe(true);
    expect(isDefaultCategoryName('편의점')).toBe(false);
  });
});
