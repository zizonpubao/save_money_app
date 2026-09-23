import { formatWon } from '@/src/utils/money';

import { personalBestMessage, type PersonalBest } from './personalBest';

/** 목표 달성 순간 카드 아래에 띄우는 문구 */
export const GOAL_REACHED_MESSAGE = '이번 달 목표 달성 🎉';

/** 설정 탭 목표 프리셋 칩 (원) */
export const GOAL_PRESETS = [100000, 200000, 300000, 500000] as const;

/** 프리셋 칩 글자: 300000 → '30만' */
export function presetLabel(amount: number): string {
  return `${Math.floor(amount / 10000)}만`;
}

export type GoalProgress = {
  /** 진행 바 채움 0~1. 목표를 넘어도 1에서 멈춘다 (넘은 만큼은 문구로 보여준다) */
  ratio: number;
  /** 화면에 쓰는 정수 %. 내림이라 목표에 1원이라도 모자라면 100% 가 되지 않는다 */
  percent: number;
  /** 목표까지 남은 금액 (달성 후 0) */
  remaining: number;
  /** 목표를 넘은 금액 (달성 전 0) */
  over: number;
  /** 이번 달 합계 ≥ 목표 */
  reached: boolean;
};

/** 저장된 문자열을 목표 금액으로. 1원 이상 정수가 아니면 목표 없음(null). */
export function parseGoal(value: string | null): number | null {
  if (value === null || !/^\d+$/.test(value)) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** 목표로 쓸 수 있는 금액인지 (1원 이상 정수) */
export function isValidGoal(goal: number): boolean {
  return Number.isSafeInteger(goal) && goal > 0;
}

/** 이번 달 합계의 목표 진행률. 목표가 없거나 0 이하면 null (카드에 바 대신 안내 문구). */
export function goalProgress(monthTotal: number, goal: number | null): GoalProgress | null {
  if (goal === null || goal <= 0) return null;
  const total = Math.max(0, monthTotal);
  const raw = total / goal;
  return {
    ratio: Math.min(1, raw),
    percent: Math.floor(raw * 100),
    remaining: Math.max(0, goal - total),
    over: Math.max(0, total - goal),
    reached: total >= goal,
  };
}

/**
 * 카드 진행 바 아래 한 줄.
 * - 달성 전: "목표 300,000원 · 62%"
 * - 달성 후: "목표 300,000원 · 달성! +12,000원 초과" (딱 목표면 "달성!" 까지만)
 */
export function goalLine(goal: number, progress: GoalProgress): string {
  const head = `목표 ${formatWon(goal)}`;
  if (!progress.reached) return `${head} · ${progress.percent}%`;
  return progress.over > 0 ? `${head} · 달성! +${formatWon(progress.over)} 초과` : `${head} · 달성!`;
}

/**
 * 이번 저장으로 목표를 "처음" 넘었는가. (PRD M3.5: 이전 합계 < 목표 ≤ 새 합계, 월 1회)
 * - 목표가 없으면 false
 * - 목표와 딱 같아져도 달성이다 (≤)
 * - 이번 달에 이미 축하했으면(reachedMonth === thisMonth) 다시 하지 않는다
 *   (목표를 정하거나 바꾸면 settingsStore 가 reachedMonth 를 지우므로 새 목표로는 다시 축하한다)
 * before / after 는 "이번 달" 합계여야 한다. 지난 달 날짜로 넣은 기록은 둘이 같아 자연히 false.
 */
export function detectGoalReached(
  before: number,
  after: number,
  goal: number | null,
  reachedMonth: string | null,
  thisMonth: string,
): boolean {
  if (goal === null || goal <= 0) return false;
  if (reachedMonth === thisMonth) return false;
  return before < goal && goal <= after;
}

/** 저장 직후 카드 아래 한 줄. 목표 달성이 개인 최고보다 우선한다. */
export function celebrationMessage(goalReached: boolean, best: PersonalBest): string | null {
  return goalReached ? GOAL_REACHED_MESSAGE : personalBestMessage(best);
}
