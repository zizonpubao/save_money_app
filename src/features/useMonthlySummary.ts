import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import {
  getCategoryTotals,
  getDailyTotals,
  getEarliestEntryDate,
  getEntriesBetween,
  getMonthStats,
  type CategoryTotal,
  type DailyTotal,
  type Entry,
  type MonthStats,
} from '@/src/db';
import { toCategoryMap, useCategoryStore } from '@/src/store/categoryStore';
import { useEntryStore } from '@/src/store/entryStore';
import { addMonths, monthRange, thisMonth, toMonth, today } from '@/src/utils/date';

import { groupEntriesByDate } from './groupEntries';
import {
  axisDays,
  buildCategoryRows,
  buildDailyBars,
  canGoNext,
  canGoPrev,
  dailyAverage,
} from './monthlyStats';

type MonthData = {
  stats: MonthStats;
  dailyTotals: DailyTotal[];
  categoryTotals: CategoryTotal[];
  entries: Entry[];
  /** 가장 오래된 기록 날짜 (이전 달 이동 한계) */
  earliest: string | null;
};

/** 한 달치 화면 데이터를 DB 에서 한 번에 읽어 온다. 합계는 전부 SQL 이 낸 값이다. */
function loadMonth(month: string): MonthData {
  const { start, end } = monthRange(month);
  return {
    stats: getMonthStats(month),
    dailyTotals: getDailyTotals(month),
    categoryTotals: getCategoryTotals(month),
    entries: getEntriesBetween(start, end),
    earliest: getEarliestEntryDate(),
  };
}

/**
 * 월별 탭 로직. 월 이동 + 요약·막대·카테고리·목록 데이터.
 * 계산은 monthlyStats.ts 의 순수 함수가 하고, 여기서는 읽기 시점만 관리한다.
 */
export function useMonthlySummary() {
  const [month, setMonth] = useState(thisMonth);
  const [data, setData] = useState<MonthData>(() => loadMonth(thisMonth()));

  const categories = useCategoryStore((s) => s.categories);
  const categoriesLoaded = useCategoryStore((s) => s.loaded);
  const reloadCategories = useCategoryStore((s) => s.reload);
  const removeEntry = useEntryStore((s) => s.remove);

  // 탭으로 돌아올 때와 보는 달이 바뀔 때 다시 읽는다 (수정·삭제 후 복귀 포함).
  useFocusEffect(
    useCallback(() => {
      if (!categoriesLoaded) reloadCategories();
      // 달이 넘어간 뒤 앱을 다시 열면 미래 달을 보고 있을 수 있다.
      const safeMonth = month > thisMonth() ? thisMonth() : month;
      if (safeMonth !== month) setMonth(safeMonth);
      setData(loadMonth(safeMonth));
    }, [month, categoriesLoaded, reloadCategories]),
  );

  const remove = useCallback(
    (id: number) => {
      removeEntry(id);
      setData(loadMonth(month));
    },
    [removeEntry, month],
  );

  const currentMonth = thisMonth();
  const earliestMonth = data.earliest === null ? null : toMonth(data.earliest);
  const canPrev = canGoPrev(month, earliestMonth);
  const canNext = canGoNext(month, currentMonth);

  // 달과 그 달 데이터를 같은 핸들러에서 함께 바꾼다 (한 번에 렌더).
  // month 만 먼저 바꾸면 포커스 효과가 다시 읽기 전 한 프레임 동안 새 달 이름 + 이전 달 숫자가 섞여 보인다.
  const moveTo = (next: string) => {
    setMonth(next);
    setData(loadMonth(next));
  };

  const goPrev = () => {
    if (canPrev) moveTo(addMonths(month, -1));
  };

  const goNext = () => {
    if (canNext) moveTo(addMonths(month, 1));
  };

  const bars = useMemo(() => buildDailyBars(month, data.dailyTotals), [month, data.dailyTotals]);
  const axis = useMemo(() => axisDays(month), [month]);
  const categoryMap = useMemo(() => toCategoryMap(categories), [categories]);
  const categoryRows = useMemo(
    () => buildCategoryRows(data.categoryTotals, categories),
    [data.categoryTotals, categories],
  );
  const sections = useMemo(() => groupEntriesByDate(data.entries), [data.entries]);

  return {
    month,
    canPrev,
    canNext,
    goPrev,
    goNext,
    total: data.stats.total,
    count: data.stats.count,
    average: dailyAverage(data.stats.total, month, today()),
    bars,
    axis,
    categoryRows,
    sections,
    categoryMap,
    isEmpty: data.stats.count === 0,
    remove,
  };
}
