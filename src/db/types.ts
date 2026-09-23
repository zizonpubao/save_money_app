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

/** 그 달의 하루치 합계 (기록이 있는 날만) */
export type DailyTotal = {
  date: string; // 'YYYY-MM-DD'
  total: number;
};

/** 홈 이모지 적립 줄 한 칸. id 로 "방금 저장한 기록" 을 가려 그 칸만 톡 튀게 한다. */
export type EntryEmoji = {
  id: number;
  emoji: string;
};

/** 그 해의 한 달치 합계 (기록이 있는 달만) */
export type MonthlyTotal = {
  month: string; // 'YYYY-MM'
  total: number;
};

/** 그 달의 카테고리별 합계. categoryId 가 null 이면 미분류. */
export type CategoryTotal = {
  categoryId: number | null;
  total: number;
};

/** 기간(월·년) 요약 숫자 */
export type MonthStats = {
  total: number;
  /** 기록 건수 */
  count: number;
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
