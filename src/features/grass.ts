import type { DailyTotal } from '@/src/db';
import { firstWeekday } from '@/src/utils/date';

import { buildDailyBars } from './monthlyStats';

/** 0 = 기록 없음, 1~4 = 그달 최댓값 대비 25% 구간마다 한 단계씩 진해진다 */
export type GrassLevel = 0 | 1 | 2 | 3 | 4;

export type GrassCell = {
  /** 1 ~ 말일 */
  day: number;
  date: string;
  total: number;
  level: GrassLevel;
  isToday: boolean;
  /** 오늘 이후 (아직 오지 않은 날) */
  isFuture: boolean;
};

export type GrassMonth = {
  /** 첫 주에서 1일 앞에 비워 둘 칸 수 = 1일의 요일 (일요일 시작 0 ~ 토요일 6) */
  leadingBlanks: number;
  cells: GrassCell[];
};

/**
 * 합계 / 그달 최댓값 비율 → 농도 단계.
 * (0, 25%] = 1, (25%, 50%] = 2, (50%, 75%] = 3, (75%, 100%] = 4. 기록 없는 날은 0.
 */
export function grassLevel(total: number, max: number): GrassLevel {
  if (total <= 0 || max <= 0) return 0;
  const step = Math.ceil((Math.min(total, max) / max) * 4);
  return Math.min(4, Math.max(1, step)) as GrassLevel;
}

/**
 * 이번 달 잔디 칸. 일별 합계(getDailyTotals)를 막대 그래프와 같은 방식으로 1일~말일까지 채운 뒤
 * 칸마다 농도·오늘·미래 여부를 붙인다. today 를 인자로 받아 테스트에서 날짜를 고정할 수 있다.
 */
export function buildGrassCells(
  month: string,
  dailyTotals: readonly DailyTotal[],
  today: string,
): GrassMonth {
  const bars = buildDailyBars(month, dailyTotals);
  const max = bars.reduce((acc, b) => (b.total > acc ? b.total : acc), 0);
  return {
    leadingBlanks: firstWeekday(month),
    cells: bars.map((b) => ({
      day: b.day,
      date: b.date,
      total: b.total,
      level: grassLevel(b.total, max),
      isToday: b.date === today,
      isFuture: b.date > today,
    })),
  };
}
