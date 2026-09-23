import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo } from 'react';

import { toCategoryMap, useCategoryStore } from '@/src/store/categoryStore';
import { useEntryStore } from '@/src/store/entryStore';

import { groupEntriesByDate } from './groupEntries';

/** 홈 탭 목록 화면 로직. 날짜별 섹션 변환 + "이전 달 더 보기". (월/년 토글은 기록 탭으로 옮겼다) */
export function useEntryList() {
  const entries = useEntryStore((s) => s.entries);
  const todayTotal = useEntryStore((s) => s.todayTotal);
  const monthTotal = useEntryStore((s) => s.monthTotal);
  const hasMore = useEntryStore((s) => s.hasMore);
  const celebrateTick = useEntryStore((s) => s.celebrateTick);
  const lastRecord = useEntryStore((s) => s.lastRecord);
  const reload = useEntryStore((s) => s.reload);
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

  const sections = useMemo(() => groupEntriesByDate(entries), [entries]);
  const categoryMap = useMemo(() => toCategoryMap(categories), [categories]);

  return {
    sections,
    isEmpty: entries.length === 0,
    todayTotal,
    monthTotal,
    hasMore,
    loadMore,
    remove,
    celebrateTick,
    lastRecord,
    categoryMap,
  };
}
