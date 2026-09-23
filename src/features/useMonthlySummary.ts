import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import {
  getCategoryTotalsBetween,
  getDailyTotals,
  getEarliestEntryDate,
  getEntriesBetween,
  getMonthlyTotals,
  getStatsBetween,
  type CategoryTotal,
  type DailyTotal,
  type Entry,
  type MonthStats,
  type MonthlyTotal,
} from '@/src/db';
import { toCategoryMap, useCategoryStore } from '@/src/store/categoryStore';
import { useEntryStore, type RangeMode } from '@/src/store/entryStore';
import {
  addMonths,
  addYears,
  monthRange,
  thisMonth,
  thisYear,
  toMonth,
  toYear,
  today,
  yearRange,
} from '@/src/utils/date';

import { groupEntriesByDate, groupEntriesByMonth } from './groupEntries';
import {
  axisDays,
  buildCategoryRows,
  buildDailyBars,
  buildMonthlyBars,
  canGoNext,
  canGoNextYear,
  canGoPrev,
  canGoPrevYear,
  dailyAverage,
  monthForYear,
  monthlyAverage,
  toDailyChartBars,
  toMonthlyChartBars,
} from './monthlyStats';

/** 지금 보고 있는 기간. month 는 월 모드, year 는 년 모드에서 쓴다. */
type Cursor = {
  mode: RangeMode;
  /** 'YYYY-MM' */
  month: string;
  /** 'YYYY' */
  year: string;
};

type PeriodData = {
  stats: MonthStats;
  categoryTotals: CategoryTotal[];
  entries: Entry[];
  /** 월 모드: 그 달 날짜별 합계 (년 모드에선 빈 배열) */
  dailyTotals: DailyTotal[];
  /** 년 모드: 그 해 월별 합계 (월 모드에선 빈 배열) */
  monthlyTotals: MonthlyTotal[];
  /** 가장 오래된 기록 날짜 (이전 기간 이동 한계) */
  earliest: string | null;
};

type State = Cursor & { data: PeriodData };

/** 한 기간치 화면 데이터를 DB 에서 한 번에 읽어 온다. 합계는 전부 SQL 이 낸 값이다. */
function loadPeriod({ mode, month, year }: Cursor): PeriodData {
  const { start, end } = mode === 'year' ? yearRange(year) : monthRange(month);
  return {
    stats: getStatsBetween(start, end),
    categoryTotals: getCategoryTotalsBetween(start, end),
    entries: getEntriesBetween(start, end),
    dailyTotals: mode === 'month' ? getDailyTotals(month) : [],
    monthlyTotals: mode === 'year' ? getMonthlyTotals(year) : [],
    earliest: getEarliestEntryDate(),
  };
}

// 기간과 그 기간 데이터를 한 상태로 묶어 같은 setState 로 바꾼다 (한 번에 렌더).
// 기간만 먼저 바꾸면 포커스 효과가 다시 읽기 전 한 프레임 동안 새 기간 이름 + 이전 숫자가 섞여 보인다.
function stateFor(cursor: Cursor): State {
  return { ...cursor, data: loadPeriod(cursor) };
}

/**
 * 기록 탭 로직. 월/년 모드 + 기간 이동 + 요약·막대·카테고리·목록 데이터.
 * 계산은 monthlyStats.ts 의 순수 함수가 하고, 여기서는 읽기 시점만 관리한다.
 */
export function useMonthlySummary() {
  const [state, setState] = useState<State>(() =>
    stateFor({ mode: 'month', month: thisMonth(), year: thisYear() }),
  );
  const { mode, month, year, data } = state;

  const categories = useCategoryStore((s) => s.categories);
  const categoriesLoaded = useCategoryStore((s) => s.loaded);
  const reloadCategories = useCategoryStore((s) => s.reload);
  const removeEntry = useEntryStore((s) => s.remove);

  // 탭으로 돌아올 때와 보는 기간이 바뀔 때 다시 읽는다 (수정·삭제 후 복귀 포함).
  useFocusEffect(
    useCallback(() => {
      if (!categoriesLoaded) reloadCategories();
      // 달·해가 넘어간 뒤 앱을 다시 열면 미래 기간을 보고 있을 수 있다.
      setState(
        stateFor({
          mode,
          month: month > thisMonth() ? thisMonth() : month,
          year: year > thisYear() ? thisYear() : year,
        }),
      );
    }, [mode, month, year, categoriesLoaded, reloadCategories]),
  );

  const remove = useCallback(
    (id: number) => {
      removeEntry(id);
      setState(stateFor({ mode, month, year }));
    },
    [removeEntry, mode, month, year],
  );

  const isYear = mode === 'year';
  const earliest = data.earliest;
  const canPrev = isYear
    ? canGoPrevYear(year, earliest === null ? null : toYear(earliest))
    : canGoPrev(month, earliest === null ? null : toMonth(earliest));
  const canNext = isYear ? canGoNextYear(year, thisYear()) : canGoNext(month, thisMonth());

  /** 월 → 년: 보던 달의 해로 / 년 → 월: 보던 달이 그 해면 그대로, 아니면 이번 달(올해)·12월(지난 해) */
  const setMode = (next: RangeMode) => {
    if (next === mode) return;
    if (next === 'year') {
      setState(stateFor({ mode: 'year', month, year: toYear(month) }));
    } else {
      setState(stateFor({ mode: 'month', month: monthForYear(year, month, thisMonth()), year }));
    }
  };

  const move = (delta: number) => {
    setState(
      stateFor(
        isYear
          ? { mode, month, year: addYears(year, delta) }
          : { mode, month: addMonths(month, delta), year },
      ),
    );
  };

  const goPrev = () => {
    if (canPrev) move(-1);
  };

  const goNext = () => {
    if (canNext) move(1);
  };

  const bars = useMemo(
    () =>
      mode === 'year'
        ? toMonthlyChartBars(buildMonthlyBars(year, data.monthlyTotals))
        : toDailyChartBars(buildDailyBars(month, data.dailyTotals), axisDays(month)),
    [mode, month, year, data.dailyTotals, data.monthlyTotals],
  );
  const categoryMap = useMemo(() => toCategoryMap(categories), [categories]);
  const categoryRows = useMemo(
    () => buildCategoryRows(data.categoryTotals, categories),
    [data.categoryTotals, categories],
  );
  // 년 모드 목록은 월별 섹션(헤더 = 월 + 그달 합계), 월 모드는 날짜별 섹션
  const sections = useMemo(
    () => (mode === 'year' ? groupEntriesByMonth(data.entries) : groupEntriesByDate(data.entries)),
    [mode, data.entries],
  );

  return {
    mode,
    setMode,
    month,
    year,
    /** 지금 모드의 기간 값 ('YYYY-MM' 또는 'YYYY') */
    period: isYear ? year : month,
    canPrev,
    canNext,
    goPrev,
    goNext,
    total: data.stats.total,
    count: data.stats.count,
    /** 월 모드: 하루 평균 / 년 모드: 월 평균 */
    average: isYear
      ? monthlyAverage(data.stats.total, year, today())
      : dailyAverage(data.stats.total, month, today()),
    bars,
    categoryRows,
    sections,
    categoryMap,
    isEmpty: data.stats.count === 0,
    remove,
  };
}
