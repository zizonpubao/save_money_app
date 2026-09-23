import type { Category, CategoryTotal, DailyTotal } from '@/src/db';
import { dayOfMonth, daysInMonth, toMonth } from '@/src/utils/date';

/** 미분류(카테고리 없음 / 지워진 카테고리) 줄 */
export const UNCATEGORIZED = { key: 'none', name: '미분류', emoji: '📦' } as const;

/** 막대 그래프 한 칸 = 그 달의 하루 */
export type DayBar = {
  /** 1 ~ 말일 */
  day: number;
  date: string;
  total: number;
  /** 그 달 최댓값 대비 비율 0~1. 기록 없는 날은 0. */
  ratio: number;
  /** 그 달 최고 금액인 날 (막대 색을 primary 로) */
  isMax: boolean;
};

/** 카테고리별 합계 한 줄 */
export type CategoryBar = {
  key: string;
  emoji: string;
  name: string;
  total: number;
  /** 월 합계 대비 % (정수) */
  percent: number;
};

/** 축 라벨을 붙일 날짜 후보 (DESIGN.md: 1 · 15 · 말일). 말일은 항상 붙인다. */
const AXIS_DAYS = [1, 15];

/**
 * 하루 평균. (사용자 결정)
 * - 이번 달이면 오늘까지 경과일로 나눈다 (1일이면 1로 나눔 = 총액 그대로)
 * - 지난 달이면 그 달 전체 일수로 나눈다
 * - 기록이 없으면 0
 */
export function dailyAverage(total: number, month: string, todayDate: string): number {
  if (total <= 0) return 0;
  const divisor = toMonth(todayDate) === month ? dayOfMonth(todayDate) : daysInMonth(month);
  if (divisor <= 0) return 0;
  return Math.round(total / divisor);
}

/** 'YYYY-MM' + 3 → '2026-09-03' (DD 는 항상 두 자리) */
function dateOf(month: string, day: number): string {
  return `${month}-${String(day).padStart(2, '0')}`;
}

/** 1일~말일을 빠짐없이 채운 막대 데이터. 기록 없는 날은 total 0(빈 트랙). */
export function buildDailyBars(month: string, totals: readonly DailyTotal[]): DayBar[] {
  const byDate = new Map(totals.map((t) => [t.date, t.total]));
  const max = totals.reduce((acc, t) => (t.total > acc ? t.total : acc), 0);
  const bars: DayBar[] = [];
  for (let day = 1; day <= daysInMonth(month); day += 1) {
    const date = dateOf(month, day);
    const total = byDate.get(date) ?? 0;
    bars.push({
      day,
      date,
      total,
      ratio: max > 0 ? total / max : 0,
      isMax: max > 0 && total === max,
    });
  }
  return bars;
}

/** 축 라벨을 붙일 날짜들. 말일과 겹치거나 말일을 넘는 후보는 뺀다. */
export function axisDays(month: string): number[] {
  const last = daysInMonth(month);
  return [...AXIS_DAYS.filter((d) => d < last), last];
}

function percentOf(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

/**
 * 카테고리별 합계를 많은 순으로. 카테고리가 없거나 이미 지워진 기록은 "미분류" 한 줄로 묶어 맨 뒤에 둔다.
 */
export function buildCategoryRows(
  totals: readonly CategoryTotal[],
  categories: readonly Category[],
): CategoryBar[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const sum = totals.reduce((acc, t) => acc + t.total, 0);

  const rows: CategoryBar[] = [];
  let uncategorized = 0;
  for (const t of totals) {
    const category = t.categoryId === null ? undefined : byId.get(t.categoryId);
    if (!category) {
      uncategorized += t.total;
      continue;
    }
    rows.push({
      key: String(category.id),
      emoji: category.emoji,
      name: category.name,
      total: t.total,
      percent: percentOf(t.total, sum),
    });
  }
  rows.sort((a, b) => b.total - a.total);

  if (uncategorized > 0) {
    rows.push({
      key: UNCATEGORIZED.key,
      emoji: UNCATEGORIZED.emoji,
      name: UNCATEGORIZED.name,
      total: uncategorized,
      percent: percentOf(uncategorized, sum),
    });
  }
  return rows;
}

/** 이전 달로 갈 수 있는지. 가장 오래된 기록이 있는 달까지만. */
export function canGoPrev(month: string, earliestMonth: string | null): boolean {
  return earliestMonth !== null && month > earliestMonth;
}

/** 다음 달로 갈 수 있는지. 이번 달보다 미래로는 못 간다. */
export function canGoNext(month: string, currentMonth: string): boolean {
  return month < currentMonth;
}
