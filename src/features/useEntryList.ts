import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo } from 'react';

import { toCategoryMap, useCategoryStore } from '@/src/store/categoryStore';
import { useEntryStore } from '@/src/store/entryStore';

import { groupEntriesByDate, groupEntriesByMonth } from './groupEntries';

/** 홈 탭 목록 화면 로직. 섹션 변환 + 범위 전환 + 더 보기. */
export function useEntryList() {
  const mode = useEntryStore((s) => s.mode);
  const entries = useEntryStore((s) => s.entries);
  const todayTotal = useEntryStore((s) => s.todayTotal);
  const monthTotal = useEntryStore((s) => s.monthTotal);
  const hasMore = useEntryStore((s) => s.hasMore);
  const celebrateTick = useEntryStore((s) => s.celebrateTick);
  const reload = useEntryStore((s) => s.reload);
  const setMode = useEntryStore((s) => s.setMode);
  const loadMore = useEntryStore((s) => s.loadMore);
  const remove = useEntryStore((s) => s.remove);

  const categories = useCategoryStore((s) => s.categories);
  const categoriesLoaded = useCategoryStore((s) => s.loaded);
  const reloadCategories = useCategoryStore((s) => s.reload);

  // 탭으로 돌아올 때마다 다시 읽는다 (자정 넘김, 다른 화면에서의 변경 반영)
  useFocusEffect(
    useCallback(() => {
      if (!categoriesLoaded) reloadCategories();
      reload();
    }, [categoriesLoaded, reloadCategories, reload]),
  );

  // 년 모드는 해당 연도 전체를 월별 섹션으로 (PRD 화면 1)
  const sections = useMemo(
    () => (mode === 'year' ? groupEntriesByMonth(entries) : groupEntriesByDate(entries)),
    [mode, entries],
  );
  const categoryMap = useMemo(() => toCategoryMap(categories), [categories]);

  return {
    mode,
    setMode,
    sections,
    isEmpty: entries.length === 0,
    todayTotal,
    monthTotal,
    hasMore,
    loadMore,
    remove,
    celebrateTick,
    categoryMap,
  };
}
