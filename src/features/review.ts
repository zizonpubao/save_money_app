import { addMonths, dayOfMonth, monthOfYear, toMonth } from '@/src/utils/date';
import { formatWon } from '@/src/utils/money';

/** (M4) 지난달 회고 카드를 띄우는 날: 매달 1~3일 */
export const REVIEW_LAST_DAY = 3;

/** 오늘 기준 회고할 달('YYYY-MM') = 지난달. settings review_dismissed_month 에도 이 값을 적는다 */
export function reviewMonthOf(today: string): string {
  return addMonths(toMonth(today), -1);
}

/**
 * 회고 카드를 띄울지.
 * - 매달 1~3일에만
 * - 지난달 기록이 0건이면 띄우지 않는다
 * - 닫은 적이 있으면(dismissedMonth === 지난달) 그달엔 다시 띄우지 않는다
 */
export function shouldShowReview(
  today: string,
  dismissedMonth: string | null,
  lastMonthCount: number,
): boolean {
  if (dayOfMonth(today) > REVIEW_LAST_DAY) return false;
  if (lastMonthCount <= 0) return false;
  return dismissedMonth !== reviewMonthOf(today);
}

export type ReviewTop = { emoji: string; name: string };

/**
 * 회고 한 줄: '9월엔 23번 참아 184,000원 · 최다 ☕ 커피'.
 * 최다 카테고리는 금액 합계 기준 (미분류가 1위면 '📦 미분류'). top 이 없으면 뒷부분을 뺀다.
 */
export function reviewMessage(
  month: string,
  count: number,
  total: number,
  top: ReviewTop | null,
): string {
  const head = `${monthOfYear(month)}월엔 ${count}번 참아 ${formatWon(total)}`;
  return top ? `${head} · 최다 ${top.emoji} ${top.name}` : head;
}

/** 홈이 읽어 두는 지난달 회고 재료. topCategoryId 는 금액 합계 1위 (null = 미분류 또는 기록 없음) */
export type MonthReviewData = {
  month: string;
  count: number;
  total: number;
  topCategoryId: number | null;
};
