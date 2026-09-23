import { create } from 'zustand';

import {
  addEntry,
  deleteEntry,
  getEarliestEntryDate,
  getEntriesBetween,
  getMaxDailyTotal,
  getMaxMonthlyTotal,
  getSumBetween,
  getSumByDate,
  updateEntry,
  type Entry,
  type EntryInput,
} from '@/src/db';
import { detectPersonalBest, type PersonalBest } from '@/src/features/personalBest';
import {
  addMonths,
  monthRange,
  thisMonth,
  toMonth,
  today,
  yearRange,
} from '@/src/utils/date';

export type RangeMode = 'month' | 'year';

type EntryState = {
  mode: RangeMode;
  /** month 모드에서 화면에 로드한 가장 오래된 달 ('YYYY-MM'). 이번 달부터 한 달씩 뒤로 늘어난다. */
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

  reload: () => void;
  setMode: (mode: RangeMode) => void;
  loadMore: () => void;
  add: (input: EntryInput) => Entry;
  update: (id: number, input: EntryInput) => Entry | null;
  remove: (id: number) => void;
};

/**
 * 목록에 담을 날짜 구간. 기준 달을 인자로 받는 순수 함수라 테스트에서 시각을 고정할 수 있다.
 * month 모드: oldestMonth 1일 ~ 기준 달 말일 / year 모드: 기준 연도 전체.
 */
export function computeRange(
  mode: RangeMode,
  oldestMonth: string,
  currentMonth: string = thisMonth(),
): { start: string; end: string } {
  if (mode === 'year') return yearRange(currentMonth.slice(0, 'YYYY'.length));
  return { start: monthRange(oldestMonth).start, end: monthRange(currentMonth).end };
}

function fetchSnapshot(mode: RangeMode, oldestMonth: string) {
  const range = computeRange(mode, oldestMonth);
  const earliest = getEarliestEntryDate();
  return {
    entries: getEntriesBetween(range.start, range.end),
    todayTotal: getSumByDate(today()),
    monthTotal: getSumBetween(monthRange(thisMonth()).start, monthRange(thisMonth()).end),
    hasMore: mode === 'month' && earliest !== null && earliest < range.start,
  };
}

export const useEntryStore = create<EntryState>((set, get) => ({
  mode: 'month',
  oldestMonth: thisMonth(),
  entries: [],
  todayTotal: 0,
  monthTotal: 0,
  hasMore: false,
  celebrateTick: 0,
  lastRecord: null,

  reload: () => {
    const { mode, oldestMonth } = get();
    // oldestMonth 는 이번 달에서 시작해 뒤로만 늘어나므로 이번 달보다 미래일 수 없다.
    // 기기 시계가 과거로 돌아간 경우에만 이번 달로 당겨 빈 범위를 막는다.
    const safeOldest = oldestMonth > thisMonth() ? thisMonth() : oldestMonth;
    set({ oldestMonth: safeOldest, ...fetchSnapshot(mode, safeOldest) });
  },

  setMode: (mode) => {
    if (mode === get().mode) return;
    const oldestMonth = thisMonth();
    set({ mode, oldestMonth, ...fetchSnapshot(mode, oldestMonth) });
  },

  loadMore: () => {
    const { mode, oldestMonth, hasMore } = get();
    if (mode !== 'month' || !hasMore) return;
    const next = addMonths(oldestMonth, -1);
    set({ oldestMonth: next, ...fetchSnapshot(mode, next) });
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

    const created = addEntry(input);

    const lastRecord = detectPersonalBest({
      prevMaxDay,
      dayTotalBefore,
      dayTotal: getSumByDate(input.date),
      prevMaxMonth,
      monthTotalBefore,
      monthTotal: getSumBetween(range.start, range.end),
      isToday: input.date === today(),
      isThisMonth: month === thisMonth(),
    });

    const { mode, oldestMonth, celebrateTick } = get();
    set({ ...fetchSnapshot(mode, oldestMonth), celebrateTick: celebrateTick + 1, lastRecord });
    return created;
  },

  // 수정은 새로 절약한 게 아니므로 축하 이펙트를 내지 않는다 (celebrateTick 그대로).
  update: (id, input) => {
    const updated = updateEntry(id, input);
    const { mode, oldestMonth } = get();
    set({ ...fetchSnapshot(mode, oldestMonth), lastRecord: null });
    return updated;
  },

  remove: (id) => {
    deleteEntry(id);
    const { mode, oldestMonth } = get();
    set({ ...fetchSnapshot(mode, oldestMonth), lastRecord: null });
  },
}));
