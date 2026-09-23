/** categories 테이블 한 행 */
export type Category = {
  id: number;
  name: string;
  emoji: string;
  sortOrder: number;
  isDefault: boolean;
};

/** entries 테이블 한 행 */
export type Entry = {
  id: number;
  date: string; // 'YYYY-MM-DD'
  title: string;
  amount: number; // 원 단위 정수
  categoryId: number | null;
  memo: string | null;
  createdAt: string; // ISO8601
  updatedAt: string;
};

/** 기록 신규 저장/수정에 쓰는 입력형 (id, 타임스탬프 없음) */
export type EntryInput = {
  date: string; // 'YYYY-MM-DD'
  title: string;
  amount: number; // 원 단위 정수, 0 초과
  categoryId: number | null;
  memo: string | null;
};

/** SQLite 에서 읽어온 원본 행 (snake_case) */
export type CategoryRow = {
  id: number;
  name: string;
  emoji: string;
  sort_order: number;
  is_default: number;
};

export type EntryRow = {
  id: number;
  date: string;
  title: string;
  amount: number;
  category_id: number | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
};

export function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    sortOrder: row.sort_order,
    isDefault: row.is_default === 1,
  };
}

export function toEntry(row: EntryRow): Entry {
  return {
    id: row.id,
    date: row.date,
    title: row.title,
    amount: row.amount,
    categoryId: row.category_id,
    memo: row.memo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
