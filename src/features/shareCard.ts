import { formatKoMonth, formatKoYear } from '@/src/utils/date';
import { formatWon } from '@/src/utils/money';

import type { RangeMode } from './rangeMode';

/** 자랑 카드에 넣는 내용 */
export type ShareCardData = {
  /** '2026년 10월' 또는 '2026년' */
  periodLabel: string;
  /** '110,000원' */
  amountText: string;
  /** '기록 12건' */
  countText: string;
  /** 가장 많이 아낀 카테고리 '☕ 커피'. 기록이 없으면 null */
  topCategoryText: string | null;
};

type CategoryRow = { emoji: string; name: string; total: number };

/** 합계가 가장 큰 카테고리. 미분류는 합계와 상관없이 목록 맨 뒤에 있어서 처음 칸이 아니라 금액으로 고른다 */
export function topCategory<T extends CategoryRow>(rows: readonly T[]): T | null {
  let top: T | null = null;
  for (const row of rows) {
    if (top === null || row.total > top.total) top = row;
  }
  return top;
}

export function buildShareCardData(input: {
  mode: RangeMode;
  /** 'YYYY-MM' 또는 'YYYY' */
  period: string;
  total: number;
  count: number;
  categoryRows: readonly CategoryRow[];
}): ShareCardData {
  const top = topCategory(input.categoryRows);
  return {
    periodLabel: input.mode === 'year' ? formatKoYear(input.period) : formatKoMonth(input.period),
    amountText: formatWon(input.total),
    countText: `기록 ${input.count}건`,
    topCategoryText: top ? `${top.emoji} ${top.name}` : null,
  };
}

/** view-shot 은 iOS 에서 file:// 없는 경로를 준다. 공유 시트에는 file:// 주소를 넘긴다 */
export function toFileUri(path: string): string {
  return path.startsWith('file://') ? path : `file://${path}`;
}
