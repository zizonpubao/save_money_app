import { addDays } from '@/src/utils/date';

/**
 * (M4) 연속 기록일. 오늘부터 거꾸로 하루도 빠짐없이 기록한 날 수.
 * 오늘 기록이 아직 없어도 어제까지 이어졌으면 어제부터 센다 (하루가 끝나기 전엔 끊긴 게 아니다).
 * 어제도 없으면 0. 0이면 홈 칩을 숨긴다 (끊겼다는 경고는 하지 않는다).
 * recordedDates 는 기록이 있는 날짜('YYYY-MM-DD') 목록. 순서·중복은 상관없다.
 */
export function computeStreak(recordedDates: readonly string[], today: string): number {
  const days = new Set(recordedDates);
  let day = days.has(today) ? today : addDays(today, -1);
  let count = 0;
  while (days.has(day)) {
    count += 1;
    day = addDays(day, -1);
  }
  return count;
}

/** 홈 칩 행 글자: 5 → '🔥 5일째' */
export function streakLabel(streak: number): string {
  return `🔥 ${streak}일째`;
}
