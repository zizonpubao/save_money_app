import { create } from 'zustand';

import {
  addEntry,
  deleteEntry,
  getEarliestEntryDate,
  getEntriesBetween,
  getSumBetween,
  getSumByDate,
  updateEntry,
  type Entry,
  type EntryInput,
} from '@/src/db';
import { addMonths, monthRange, thisMonth, thisYear, today, yearRange } from '@/src/utils/date';

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
  /** 저장 성공 횟수. 홈 카드가 이 값이 바뀔 때 축하 이펙트를 재생한다. */
  celebrateTick: number;

  reload: () => void;
  setMode: (mode: RangeMode) => void;
  loadMore: () => void;
  add: (input: EntryInput) => Entry;
  update: (id: number, input: EntryInput) => Entry | null;
  remove: (id: number) => void;
};

function currentRange(mode: RangeMode, oldestMonth: string): { start: string; end: string } {
  if (mode === 'year') return yearRange(thisYear());
  return { start: monthRange(oldestMonth).start, end: monthRange(thisMonth()).end };
}

function fetchSnapshot(mode: RangeMode, oldestMonth: string) {
  const range = currentRange(mode, oldestMonth);
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
    const created = addEntry(input);
    const { mode, oldestMonth, celebrateTick } = get();
    set({ ...fetchSnapshot(mode, oldestMonth), celebrateTick: celebrateTick + 1 });
    return created;
  },

  update: (id, input) => {
    const updated = updateEntry(id, input);
    const { mode, oldestMonth, celebrateTick } = get();
    set({ ...fetchSnapshot(mode, oldestMonth), celebrateTick: celebrateTick + 1 });
    return updated;
  },

  remove: (id) => {
    deleteEntry(id);
    const { mode, oldestMonth } = get();
    set(fetchSnapshot(mode, oldestMonth));
  },
}));
