import { formatNumber } from '@/src/utils/money';

/** (M4) 누적 절약액 이정표 (원). 오름차순 */
export const MILESTONES = [100000, 500000, 1000000, 5000000, 10000000] as const;

/** settings milestone_reached 값(축하한 가장 큰 이정표). 1 이상 정수가 아니면 없음(null) */
export function parseMilestone(value: string | null): number | null {
  if (value === null || !/^\d+$/.test(value)) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/**
 * 이번 저장으로 새로 넘은 이정표. 저장 전 누적 < 이정표 ≤ 저장 후 누적 이면서 이미 축하한 것(reachedMax)보다 커야 한다.
 * 한 번에 여러 개를 넘으면 가장 큰 것 하나만. 삭제로 누적이 줄었다가 다시 넘어도 재축하하지 않는다.
 */
export function detectMilestone(before: number, after: number, reachedMax: number | null): number | null {
  const floor = reachedMax ?? 0;
  let hit: number | null = null;
  for (const m of MILESTONES) {
    if (before < m && m <= after && m > floor) hit = m;
  }
  return hit;
}

/** 배너 문구: 500000 → '누적 50만원 돌파 🎉', 10000000 → '누적 1,000만원 돌파 🎉' */
export function milestoneMessage(milestone: number): string {
  return `누적 ${formatNumber(Math.floor(milestone / 10000))}만원 돌파 🎉`;
}
