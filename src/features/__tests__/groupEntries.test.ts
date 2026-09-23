import type { Entry } from '../../db/types';
import { groupEntriesByDate, groupEntriesByMonth, sumAmounts } from '../groupEntries';

function entry(id: number, date: string, amount: number, title = `항목${id}`): Entry {
  return {
    id,
    date,
    title,
    amount,
    categoryId: null,
    memo: null,
    createdAt: '2026-09-23T10:00:00+09:00',
    updatedAt: '2026-09-23T10:00:00+09:00',
  };
}

describe('groupEntriesByDate', () => {
  it('빈 목록이면 빈 배열', () => {
    expect(groupEntriesByDate([])).toEqual([]);
  });

  it('같은 날짜끼리 묶고 그날 합계를 계산한다', () => {
    const sections = groupEntriesByDate([
      entry(1, '2026-09-23', 4500),
      entry(2, '2026-09-23', 12000),
      entry(3, '2026-09-22', 3000),
    ]);
    expect(sections).toHaveLength(2);
    expect(sections[0]?.key).toBe('2026-09-23');
    expect(sections[0]?.total).toBe(16500);
    expect(sections[0]?.data.map((e) => e.id)).toEqual([2, 1]);
    expect(sections[1]?.key).toBe('2026-09-22');
    expect(sections[1]?.total).toBe(3000);
  });

  it('입력 순서와 무관하게 최신 날짜 → 최근 등록(id 큰 순)으로 정렬한다', () => {
    const sections = groupEntriesByDate([
      entry(1, '2026-09-01', 1000),
      entry(5, '2026-09-23', 1000),
      entry(2, '2026-09-23', 1000),
      entry(3, '2026-09-10', 1000),
    ]);
    expect(sections.map((s) => s.key)).toEqual(['2026-09-23', '2026-09-10', '2026-09-01']);
    expect(sections[0]?.data.map((e) => e.id)).toEqual([5, 2]);
  });

  it('연도가 다른 날짜도 문자열 비교로 올바르게 정렬된다', () => {
    const sections = groupEntriesByDate([
      entry(1, '2025-12-31', 1000),
      entry(2, '2026-01-01', 2000),
    ]);
    expect(sections.map((s) => s.key)).toEqual(['2026-01-01', '2025-12-31']);
  });

  it('원본 배열을 변경하지 않는다', () => {
    const input = [entry(1, '2026-09-01', 1000), entry(2, '2026-09-23', 1000)];
    const copy = [...input];
    groupEntriesByDate(input);
    expect(input).toEqual(copy);
  });
});

describe('groupEntriesByMonth', () => {
  it('빈 목록이면 빈 배열', () => {
    expect(groupEntriesByMonth([])).toEqual([]);
  });

  it('여러 달이 섞여 있어도 같은 달끼리 묶고 key 는 YYYY-MM 이다', () => {
    const sections = groupEntriesByMonth([
      entry(1, '2026-09-23', 1000),
      entry(2, '2026-08-05', 2000),
      entry(3, '2026-09-01', 3000),
      entry(4, '2026-03-15', 4000),
      entry(5, '2026-08-31', 5000),
    ]);
    expect(sections.map((s) => s.key)).toEqual(['2026-09', '2026-08', '2026-03']);
    expect(sections[0]?.data.map((e) => e.id)).toEqual([1, 3]);
    expect(sections[1]?.data.map((e) => e.id)).toEqual([5, 2]);
    expect(sections[2]?.data.map((e) => e.id)).toEqual([4]);
  });

  it('섹션 합계는 그 달 금액의 합이다', () => {
    const sections = groupEntriesByMonth([
      entry(1, '2026-09-23', 4500),
      entry(2, '2026-09-02', 12000),
      entry(3, '2026-08-20', 3000),
    ]);
    expect(sections[0]?.total).toBe(16500);
    expect(sections[1]?.total).toBe(3000);
  });

  it('섹션은 최신 월 먼저, 섹션 안 행은 date DESC → id DESC 로 정렬한다', () => {
    const sections = groupEntriesByMonth([
      entry(1, '2026-01-10', 1000),
      entry(7, '2026-05-03', 1000),
      entry(2, '2026-05-20', 1000),
      entry(9, '2026-05-20', 1000),
      entry(4, '2026-05-03', 1000),
      entry(3, '2025-12-31', 1000),
    ]);
    expect(sections.map((s) => s.key)).toEqual(['2026-05', '2026-01', '2025-12']);
    expect(sections[0]?.data.map((e) => e.id)).toEqual([9, 2, 7, 4]);
  });

  it('원본 배열을 변경하지 않는다', () => {
    const input = [entry(1, '2026-09-01', 1000), entry(2, '2026-03-23', 1000)];
    const copy = [...input];
    groupEntriesByMonth(input);
    expect(input).toEqual(copy);
  });
});

describe('sumAmounts', () => {
  it('금액을 정수로 합산한다', () => {
    expect(sumAmounts([])).toBe(0);
    expect(sumAmounts([entry(1, '2026-09-23', 4500), entry(2, '2026-09-23', 500)])).toBe(5000);
  });
});
