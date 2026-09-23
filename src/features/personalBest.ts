/** 저장 직후 홈에 띄울 개인 최고 갱신 종류. 둘 다 해당하면 월이 우선. */
export type PersonalBest = 'day' | 'month' | null;

export type PersonalBestInput = {
  /** 저장 전, 저장한 날짜를 뺀 역대 하루 최고. 0이면 비교 대상이 없다(첫 기록). */
  prevMaxDay: number;
  /** 저장 전 그날 합계 */
  dayTotalBefore: number;
  /** 저장 후 그날 합계 */
  dayTotal: number;
  /** 저장 전, 저장한 달을 뺀 역대 월 최고. 0이면 비교 대상이 없다(첫 달). */
  prevMaxMonth: number;
  /** 저장 전 그달 합계 */
  monthTotalBefore: number;
  /** 저장 후 그달 합계 */
  monthTotal: number;
  /** 저장한 기록이 오늘 날짜인지 */
  isToday: boolean;
  /** 저장한 기록이 이번 달인지 */
  isThisMonth: boolean;
};

/**
 * 이번 저장으로 최고선을 "처음" 넘었는가. 이미 넘어 있던 상태에서 더 쌓는 건 새 기록이 아니다
 * (그러지 않으면 한 번 최고를 찍은 뒤 저장할 때마다 축하가 반복된다).
 * 비교 대상이 없으면(prevMax 0) 최고로 치지 않는다. 동점은 넘긴 게 아니다.
 */
function crossed(prevMax: number, before: number, after: number): boolean {
  return prevMax > 0 && before <= prevMax && after > prevMax;
}

/**
 * "역대 최고를 넘겼는가" 판정. 그날 / 그달에 처음 넘기는 저장에서만 한 번씩 뜬다.
 * - 비교 대상(다른 날/다른 달)이 없으면 최고로 치지 않는다 → 첫 기록·첫 달은 null
 * - 동점은 "넘긴" 게 아니다 (저장 전 최고 < 저장 후 값 이어야 한다)
 * - 문구가 "오늘"·"이번 달" 이므로 과거 날짜로 넣은 기록은 축하하지 않는다
 */
export function detectPersonalBest(input: PersonalBestInput): PersonalBest {
  if (input.isThisMonth && crossed(input.prevMaxMonth, input.monthTotalBefore, input.monthTotal)) {
    return 'month';
  }
  if (input.isToday && crossed(input.prevMaxDay, input.dayTotalBefore, input.dayTotal)) {
    return 'day';
  }
  return null;
}

/** 홈 저장 이펙트에 한 줄로 띄울 문구 */
export function personalBestMessage(best: PersonalBest): string | null {
  if (best === 'month') return '이번 달 최고 기록! 🏆';
  if (best === 'day') return '하루 최고 기록! 🏆';
  return null;
}
