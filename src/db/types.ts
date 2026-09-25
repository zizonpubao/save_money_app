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

/** (M4) 빠른 입력 칩 한 개: 같은 항목명 중 가장 최근 기록의 카테고리·금액 */
export type RecentTitle = {
  title: string;
  categoryId: number | null;
  amount: number;
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

/** (M5) 복원으로 넣을 카테고리. id 는 새로 매기고 이름으로 기록과 잇는다 */
export type ImportCategory = {
  name: string;
  emoji: string;
  /** 덮어쓰기에서만 쓴다. 병합은 기존 맨 뒤에 이어 붙인다 */
  sortOrder: number;
  isDefault: boolean;
};

/** (M5) 복원으로 넣을 기록. 카테고리는 id 대신 이름(없으면 null)으로 들고 있다가 넣을 때 새 id 로 잇는다 */
export type ImportEntry = {
  date: string;
  title: string;
  amount: number;
  categoryName: string | null;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
};

/** (M5) importBackup 이 한 트랜잭션으로 실행할 계획. 병합이면 새로 넣을 것만, 덮어쓰기면 백업 전체 */
export type ImportPlan = {
  categories: ImportCategory[];
  entries: ImportEntry[];
  /**
   * 덮어쓰기에서 복원할 월 목표. number = 그 값으로, null = 목표 없음으로, undefined = 건드리지 않음
   * (version 1 백업처럼 settings 가 없는 경우). 병합은 항상 건드리지 않는다.
   */
  monthlyGoal?: number | null;
};

export type ImportMode = 'merge' | 'overwrite';

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
