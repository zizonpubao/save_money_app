import { buildShareCardData, toFileUri, topCategory } from '@/src/features/shareCard';

const COFFEE = { emoji: '☕', name: '커피', total: 30000 };
const MEAL = { emoji: '🍚', name: '밥값', total: 20000 };
const NONE = { emoji: '📦', name: '미분류', total: 90000 };

describe('topCategory', () => {
  it('합계가 가장 큰 카테고리', () => {
    expect(topCategory([COFFEE, MEAL])).toBe(COFFEE);
  });

  it('맨 뒤에 있는 미분류가 가장 크면 미분류', () => {
    expect(topCategory([COFFEE, MEAL, NONE])).toBe(NONE);
  });

  it('같으면 앞 칸', () => {
    expect(topCategory([COFFEE, { ...MEAL, total: COFFEE.total }])).toBe(COFFEE);
  });

  it('없으면 null', () => {
    expect(topCategory([])).toBeNull();
  });
});

describe('buildShareCardData', () => {
  const base = { total: 110000, count: 12, categoryRows: [COFFEE, MEAL] };

  it('월 모드', () => {
    expect(buildShareCardData({ ...base, mode: 'month', period: '2026-10' })).toEqual({
      periodLabel: '2026년 10월',
      amountText: '110,000원',
      countText: '기록 12건',
      topCategoryText: '☕ 커피',
    });
  });

  it('년 모드', () => {
    expect(buildShareCardData({ ...base, mode: 'year', period: '2026' }).periodLabel).toBe('2026년');
  });

  it('카테고리가 없으면 topCategoryText 는 null', () => {
    expect(
      buildShareCardData({ ...base, mode: 'month', period: '2026-10', categoryRows: [] }).topCategoryText,
    ).toBeNull();
  });
});

describe('toFileUri', () => {
  it('iOS 경로에 file:// 를 붙인다', () => {
    expect(toFileUri('/private/tmp/a.png')).toBe('file:///private/tmp/a.png');
  });

  it('이미 file:// 면 그대로', () => {
    expect(toFileUri('file:///tmp/a.png')).toBe('file:///tmp/a.png');
  });
});
