import { create } from 'zustand';

import {
  addEntry,
  deleteEntry,
  getEarliestEntryDate,
  getEntriesBetween,
  getMaxDailyTotal,
  getMaxMonthlyTotal,
  getSetting,
  getSumBetween,
  getSumByDate,
  setSetting,
  SETTING_KEYS,
  updateEntry,
  type Entry,
  type EntryInput,
} from '@/src/db';
import { detectGoalReached, parseGoal } from '@/src/features/goal';
import { detectPersonalBest, type PersonalBest } from '@/src/features/personalBest';
import { addMonths, monthRange, thisMonth, toMonth, today } from '@/src/utils/date';

type EntryState = {
  /** 홈 목록에 로드한 가장 오래된 달 ('YYYY-MM'). 이번 달부터 한 달씩 뒤로 늘어난다. */
  oldestMonth: string;
  entries: Entry[];
  todayTotal: number;
  monthTotal: number;
  /** "이전 달 더 보기" 로 더 가져올 기록이 남아 있는지 */
  hasMore: boolean;
  /** 저장 성공 횟수. 홈 카드가 이 값이 바뀔 때 축하 이펙트를 재생한다. (수정은 올리지 않는다) */
  celebrateTick: number;
  /** 마지막 저장이 역대 최고를 갱신했는지. 홈에서 "최고 기록!" 한 줄을 띄우는 데 쓴다. */
  lastRecord: PersonalBest;
  /** 목표를 처음 넘긴 저장 횟수. 홈 카드가 이 값이 바뀔 때 바 차오름·틴트·강한 햅틱을 낸다. */
  goalReachedTick: number;
  /** 마지막 저장이 이번 달 목표를 처음 넘겼는지. "이번 달 목표 달성 🎉" 한 줄에 쓴다. */
  lastGoalReached: boolean;

  reload: () => void;
  loadMore: () => void;
  add: (input: EntryInput) => Entry;
  update: (id: number, input: EntryInput) => Entry | null;
  remove: (id: number) => void;
};

/**
 * 홈 목록에 담을 날짜 구간: oldestMonth 1일 ~ 기준 달 말일.
 * 기준 달을 인자로 받는 순수 함수라 테스트에서 시각을 고정할 수 있다.
 */
export function computeRange(
  oldestMonth: string,
  currentMonth: string = thisMonth(),
): { start: string; end: string } {
  return { start: monthRange(oldestMonth).start, end: monthRange(currentMonth).end };
}

/** 이번 달 합계. 목표 판정은 저장한 기록의 달이 아니라 항상 이번 달 기준이다. */
function thisMonthTotal(): number {
  const { start, end } = monthRange(thisMonth());
  return getSumBetween(start, end);
}

/**
 * 저장 직후 목표 달성 판정. 처음 넘었으면 이번 달을 축하한 달로 기록해 같은 달에 다시 뜨지 않게 한다.
 * 목표·축하 기록은 스토어가 아니라 DB 에서 읽는다 (설정 탭을 한 번도 안 열었어도 맞게 동작).
 */
function checkGoalReached(before: number, after: number): boolean {
  const month = thisMonth();
  const reached = detectGoalReached(
    before,
    after,
    parseGoal(getSetting(SETTING_KEYS.monthlyGoal)),
    getSetting(SETTING_KEYS.goalReachedMonth),
    month,
  );
  if (reached) setSetting(SETTING_KEYS.goalReachedMonth, month);
  return reached;
}

/** fn 이 던지면 fallback. 저장 뒤 부가 판정(축하)이 저장 자체를 실패로 만들지 않게 한다. */
function orFallback<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

/** 홈 목록 스냅숏. 홈은 월 단위(이번 달 + "이전 달 더 보기")만 쓴다. */
function fetchSnapshot(oldestMonth: string) {
  const range = computeRange(oldestMonth);
  const earliest = getEarliestEntryDate();
  return {
    entries: getEntriesBetween(range.start, range.end),
    todayTotal: getSumByDate(today()),
    monthTotal: getSumBetween(monthRange(thisMonth()).start, monthRange(thisMonth()).end),
    hasMore: earliest !== null && earliest < range.start,
  };
}

export const useEntryStore = create<EntryState>((set, get) => ({
  oldestMonth: thisMonth(),
  entries: [],
  todayTotal: 0,
  monthTotal: 0,
  hasMore: false,
  celebrateTick: 0,
  lastRecord: null,
  goalReachedTick: 0,
  lastGoalReached: false,

  reload: () => {
    const { oldestMonth } = get();
    // oldestMonth 는 이번 달에서 시작해 뒤로만 늘어나므로 이번 달보다 미래일 수 없다.
    // 기기 시계가 과거로 돌아간 경우에만 이번 달로 당겨 빈 범위를 막는다.
    const safeOldest = oldestMonth > thisMonth() ? thisMonth() : oldestMonth;
    set({ oldestMonth: safeOldest, ...fetchSnapshot(safeOldest) });
  },

  loadMore: () => {
    const { oldestMonth, hasMore } = get();
    if (!hasMore) return;
    const next = addMonths(oldestMonth, -1);
    set({ oldestMonth: next, ...fetchSnapshot(next) });
  },

  add: (input) => {
    // 저장 전 시점의 "다른 날 / 다른 달" 최고값(자기 자신은 빼고)과 그날·그달 합계를 먼저 재 둔다.
    // 저장 전 합계가 있어야 "이번 저장으로 처음 넘었는지"를 가릴 수 있다.
    const month = toMonth(input.date);
    const range = monthRange(month);
    const prevMaxDay = getMaxDailyTotal(input.date);
    const prevMaxMonth = getMaxMonthlyTotal(month);
    const dayTotalBefore = getSumByDate(input.date);
    const monthTotalBefore = getSumBetween(range.start, range.end);
    const thisMonthBefore = thisMonthTotal();

    const created = addEntry(input);

    // 기록은 이미 저장됐다. 축하 판정이 실패해도 화면에 "저장 실패" 가 뜨면 안 되므로 이펙트만 건너뛴다.
    const lastGoalReached = orFallback(
      () => checkGoalReached(thisMonthBefore, thisMonthTotal()),
      false,
    );

    const lastRecord = orFallback<PersonalBest>(
      () =>
        detectPersonalBest({
          prevMaxDay,
          dayTotalBefore,
          dayTotal: getSumByDate(input.date),
          prevMaxMonth,
          monthTotalBefore,
          monthTotal: getSumBetween(range.start, range.end),
          isToday: input.date === today(),
          isThisMonth: month === thisMonth(),
        }),
      null,
    );

    const { oldestMonth, celebrateTick, goalReachedTick } = get();
    set({
      ...fetchSnapshot(oldestMonth),
      celebrateTick: celebrateTick + 1,
      lastRecord,
      goalReachedTick: lastGoalReached ? goalReachedTick + 1 : goalReachedTick,
      lastGoalReached,
    });
    return created;
  },

  // 수정은 새로 절약한 게 아니므로 축하 이펙트를 내지 않는다 (celebrateTick 그대로).
  update: (id, input) => {
    const updated = updateEntry(id, input);
    set({ ...fetchSnapshot(get().oldestMonth), lastRecord: null, lastGoalReached: false });
    return updated;
  },

  remove: (id) => {
    deleteEntry(id);
    set({ ...fetchSnapshot(get().oldestMonth), lastRecord: null, lastGoalReached: false });
  },
}));
