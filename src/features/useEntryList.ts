import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo } from 'react';

import { toCategoryMap, useCategoryStore } from '@/src/store/categoryStore';
import { useEntryStore } from '@/src/store/entryStore';
import { useSettingsStore } from '@/src/store/settingsStore';

import { groupEntriesByDate } from './groupEntries';

/** 홈 탭 화면 로직. 날짜별 섹션 변환 + "이전 달 더 보기" + 월 목표. (월/년 토글은 기록 탭으로 옮겼다) */
export function useEntryList() {
  const entries = useEntryStore((s) => s.entries);
  const todayTotal = useEntryStore((s) => s.todayTotal);
  const monthTotal = useEntryStore((s) => s.monthTotal);
  const hasMore = useEntryStore((s) => s.hasMore);
  const celebrateTick = useEntryStore((s) => s.celebrateTick);
  const lastRecord = useEntryStore((s) => s.lastRecord);
  const goalReachedTick = useEntryStore((s) => s.goalReachedTick);
  const lastGoalReached = useEntryStore((s) => s.lastGoalReached);
  const openHome = useEntryStore((s) => s.openHome);
  const loadMore = useEntryStore((s) => s.loadMore);
  const remove = useEntryStore((s) => s.remove);

  const categories = useCategoryStore((s) => s.categories);
  const categoriesLoaded = useCategoryStore((s) => s.loaded);
  const reloadCategories = useCategoryStore((s) => s.reload);

  const monthlyGoal = useSettingsStore((s) => s.monthlyGoal);
  const settingsLoaded = useSettingsStore((s) => s.loaded);
  const loadSettings = useSettingsStore((s) => s.load);

  // 탭으로 돌아올 때마다 다시 읽는다 (자정 넘김, 다른 화면에서의 변경 반영).
  // 읽으면서 "오늘 첫 오픈" 도 함께 판정한다 (카드 큰 숫자 카운트업)
  useFocusEffect(
    useCallback(() => {
      if (!categoriesLoaded) reloadCategories();
      // 목표는 설정 탭이 스토어를 바로 고치므로 처음 한 번만 DB 에서 읽으면 된다
      if (!settingsLoaded) loadSettings();
      openHome();
    }, [categoriesLoaded, reloadCategories, settingsLoaded, loadSettings, openHome]),
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
    monthlyGoal,
    goalReachedTick,
    lastGoalReached,
    categoryMap,
  };
}
