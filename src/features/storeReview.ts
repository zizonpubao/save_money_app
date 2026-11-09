import { daysBetween, isValidDateString } from '@/src/utils/date';

/** 이 건수부터 별점을 요청한다. 막 설치한 사람에게 묻지 않게 */
export const REVIEW_MIN_ENTRIES = 5;
/** 마지막 요청 뒤 쉬는 날 수. 애플이 앱당 1년 3회로 제한해서 1년에 3번이 넘지 않게 잡았다 */
export const REVIEW_COOLDOWN_DAYS = 120;

export type ReviewCheck = {
  /** 이번 저장이 월 목표를 처음 달성했는지 */
  goalReached: boolean;
  /** 이번 저장으로 새로 넘은 누적 이정표. 없으면 null */
  milestone: number | null;
  /** 이번 저장까지 포함한 전체 기록 건수 */
  entryCount: number;
  /** settings review_requested_at 값 */
  lastRequestedAt: string | null;
  /** 'YYYY-MM-DD' */
  today: string;
};

/** 이번 저장 뒤 별점 창을 요청할지. 값이 망가졌으면 요청한 적 없는 것으로 본다 */
export function shouldRequestReview(check: ReviewCheck): boolean {
  if (!check.goalReached && check.milestone === null) return false;
  if (check.entryCount < REVIEW_MIN_ENTRIES) return false;
  const last = check.lastRequestedAt;
  if (last === null || !isValidDateString(last)) return true;
  return daysBetween(last, check.today) >= REVIEW_COOLDOWN_DAYS;
}
