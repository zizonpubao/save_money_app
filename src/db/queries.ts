import { getDb } from './database';
import { toCategory, type Category, type CategoryRow } from './types';

/** 모든 카테고리를 sort_order 순으로 */
export function getAllCategories(): Category[] {
  const rows = getDb().getAllSync<CategoryRow>(
    'SELECT id, name, emoji, sort_order, is_default FROM categories ORDER BY sort_order ASC, id ASC',
  );
  return rows.map(toCategory);
}
