import { create } from 'zustand';

import { getAllCategories, type Category } from '@/src/db';

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
