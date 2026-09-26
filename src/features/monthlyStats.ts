import {
  UNCATEGORIZED_EMOJI,
  UNCATEGORIZED_NAME,
  type Category,
  type CategoryTotal,
  type DailyTotal,
  type MonthlyTotal,
} from '@/src/db';
import { dayOfMonth, daysInMonth, monthOfYear, toMonth, toYear } from '@/src/utils/date';

/** 미분류(카테고리 없음 / 지워진 카테고리) 줄 */
export const UNCATEGORIZED = {
  key: 'none',
  name: UNCATEGORIZED_NAME,
  emoji: UNCATEGORIZED_EMOJI,
} as const;

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

/** 막대 그래프 한 칸 = 그 해의 한 달 (년 모드) */
export type MonthBar = {
  /** 1 ~ 12 */
  monthNumber: number;
  /** 'YYYY-MM' */
  month: string;
  total: number;
  /** 그 해 최댓값 대비 비율 0~1. 기록 없는 달은 0. */
  ratio: number;
  /** 그 해 최고 금액인 달 */
  isMax: boolean;
};

/** BarChart 가 그리는 한 칸. 일별·월별 막대를 이 모양으로 바꿔 같은 컴포넌트로 그린다. */
export type ChartBar = {
  key: string;
  /** 툴팁·접근성 라벨 앞부분: "23일" / "9월" */
  label: string;
  /** 축 아래 숫자. 라벨을 붙이지 않는 칸은 null */
  axisLabel: string | null;
  total: number;
  ratio: number;
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

/** 축 라벨을 붙일 날짜 후보 (DESIGN.md: 1 · 5일 단위 · 말일). 말일은 항상 붙인다. */
const AXIS_DAYS = [1, 5, 10, 15, 20, 25, 30];

const MONTHS_IN_YEAR = 12;

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

/**
 * 월 평균. (하루 평균과 같은 규칙)
 * - 이번 해면 이번 달까지 경과 개월 수로 나눈다 (9월이면 9)
 * - 지난 해면 12로 나눈다
 * - 기록이 없으면 0
 */
export function monthlyAverage(total: number, year: string, todayDate: string): number {
  if (total <= 0) return 0;
  const divisor = toYear(todayDate) === year ? monthOfYear(todayDate) : MONTHS_IN_YEAR;
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

/** 1월~12월을 빠짐없이 채운 막대 데이터. 기록 없는 달은 total 0(빈 트랙). */
export function buildMonthlyBars(year: string, totals: readonly MonthlyTotal[]): MonthBar[] {
  const byMonth = new Map(totals.map((t) => [t.month, t.total]));
  const max = totals.reduce((acc, t) => (t.total > acc ? t.total : acc), 0);
  const bars: MonthBar[] = [];
  for (let monthNumber = 1; monthNumber <= MONTHS_IN_YEAR; monthNumber += 1) {
    const month = `${year}-${String(monthNumber).padStart(2, '0')}`;
    const total = byMonth.get(month) ?? 0;
    bars.push({
      monthNumber,
      month,
      total,
      ratio: max > 0 ? total / max : 0,
      isMax: max > 0 && total === max,
    });
  }
  return bars;
}

/** 일별 막대 → BarChart 칸. 축 라벨은 axis 에 든 날짜(1 · 5 · 10 … · 말일)에만. */
export function toDailyChartBars(bars: readonly DayBar[], axis: readonly number[]): ChartBar[] {
  const axisSet = new Set(axis);
  return bars.map((bar) => ({
    key: bar.date,
    label: `${bar.day}일`,
    axisLabel: axisSet.has(bar.day) ? String(bar.day) : null,
    total: bar.total,
    ratio: bar.ratio,
    isMax: bar.isMax,
  }));
}

/** 월별 막대 → BarChart 칸. 12칸이라 폭이 넉넉해 1~12 모두 축 라벨을 붙인다 (숫자만, 일별 축과 같은 모양). */
export function toMonthlyChartBars(bars: readonly MonthBar[]): ChartBar[] {
  return bars.map((bar) => ({
    key: bar.month,
    label: `${bar.monthNumber}월`,
    axisLabel: String(bar.monthNumber),
    total: bar.total,
    ratio: bar.ratio,
    isMax: bar.isMax,
  }));
}

/**
 * 축 라벨을 붙일 날짜들. 말일과 겹치거나 바로 붙는 후보는 뺀다 — 30·31 처럼 붙은 라벨은 좁은 칸에서 겹친다.
 * (31일 달 → …25, 31 / 30일 달 → …25, 30 / 2월 → …25, 28)
 */
export function axisDays(month: string): number[] {
  const last = daysInMonth(month);
  return [...AXIS_DAYS.filter((d) => d < last - 1), last];
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

/** 이전 해로 갈 수 있는지. 가장 오래된 기록이 있는 해까지만. ('YYYY' 도 문자열 비교로 충분) */
export function canGoPrevYear(year: string, earliestYear: string | null): boolean {
  return canGoPrev(year, earliestYear);
}

/** 다음 해로 갈 수 있는지. 올해보다 미래로는 못 간다. */
export function canGoNextYear(year: string, currentYear: string): boolean {
  return canGoNext(year, currentYear);
}

/**
 * 년 → 월 모드로 돌아갈 때 보여줄 달. (구현 중 정한 규칙)
 * 보던 달이 그 해 안이면 그대로, 아니면 올해는 이번 달 / 지난 해는 12월.
 */
export function monthForYear(year: string, lastMonth: string, currentMonth: string): string {
  if (toYear(lastMonth) === year) return lastMonth;
  return toYear(currentMonth) === year ? currentMonth : `${year}-12`;
}
