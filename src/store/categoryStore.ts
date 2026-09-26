import { create } from 'zustand';

import { getAllCategories, UNCATEGORIZED_EMOJI, type Category } from '@/src/db';

type CategoryState = {
  categories: Category[];
  loaded: boolean;
  reload: () => void;
};

/** 카테고리 목록 전역 상태. 이모지 표시·입력 칩에서 공유한다. */
export const useCategoryStore = create<CategoryState>((set) => ({
  categories: [],
  loaded: false,
  reload: () => set({ categories: getAllCategories(), loaded: true }),
}));

/** id → Category 조회용 맵 */
export function toCategoryMap(categories: Category[]): Map<number, Category> {
  return new Map(categories.map((c) => [c.id, c]));
}

/**
 * 기록 행에 붙일 이모지. 카테고리가 없거나(NULL) 지워졌으면(맵에 없음) 📦 —
 * 기록 탭 카테고리 합계의 "📦 미분류", 홈 이모지 적립 줄과 같은 글자
 */
export function entryEmoji(categoryId: number | null, categoryMap: Map<number, Category>): string {
  return (categoryId !== null && categoryMap.get(categoryId)?.emoji) || UNCATEGORIZED_EMOJI;
}
