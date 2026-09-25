import { addDays, monthRange, nowIso, today, yearRange } from '@/src/utils/date';

import { getDb } from './database';
import { CURRENT_DEFAULT_CATEGORIES } from './migrations';
import {
  toCategory,
  toEntry,
  type Category,
  type CategoryRow,
  type CategoryTotal,
  type DailyTotal,
  type Entry,
  type EntryEmoji,
  type EntryInput,
  type EntryRow,
  type ImportMode,
  type ImportPlan,
  type MonthStats,
  type MonthlyTotal,
  type RecentTitle,
} from './types';

const ENTRY_COLUMNS =
  'id, date, title, amount, category_id, memo, created_at, updated_at';

// ---------- categories ----------

/** 모든 카테고리를 sort_order 순으로 */
export function getAllCategories(): Category[] {
  const rows = getDb().getAllSync<CategoryRow>(
    'SELECT id, name, emoji, sort_order, is_default FROM categories ORDER BY sort_order ASC, id ASC',
  );
  return rows.map(toCategory);
}

// ---------- entries: 읽기 ----------

export function getEntryById(id: number): Entry | null {
  const row = getDb().getFirstSync<EntryRow>(
    `SELECT ${ENTRY_COLUMNS} FROM entries WHERE id = ?`,
    [id],
  );
  return row ? toEntry(row) : null;
}

/** start ≤ date ≤ end 구간의 기록. 최신 날짜 → 최근 등록 순. */
export function getEntriesBetween(start: string, end: string): Entry[] {
  const rows = getDb().getAllSync<EntryRow>(
    `SELECT ${ENTRY_COLUMNS} FROM entries WHERE date BETWEEN ? AND ? ORDER BY date DESC, id DESC`,
    [start, end],
  );
  return rows.map(toEntry);
}

/** start ≤ date ≤ end 구간 합계. 기록이 없으면 0. */
export function getSumBetween(start: string, end: string): number {
  const row = getDb().getFirstSync<{ total: number | null }>(
    'SELECT SUM(amount) AS total FROM entries WHERE date BETWEEN ? AND ?',
    [start, end],
  );
  return row?.total ?? 0;
}

/** 특정 날짜 합계. 기록이 없으면 0. */
export function getSumByDate(date: string): number {
  const row = getDb().getFirstSync<{ total: number | null }>(
    'SELECT SUM(amount) AS total FROM entries WHERE date = ?',
    [date],
  );
  return row?.total ?? 0;
}

/** 가장 오래된 기록의 날짜. 기록이 하나도 없으면 null. ("이전 달 더 보기" 노출 판단용) */
export function getEarliestEntryDate(): string | null {
  const row = getDb().getFirstSync<{ date: string | null }>(
    'SELECT MIN(date) AS date FROM entries',
  );
  return row?.date ?? null;
}

// ---------- 월별 집계 (M3) ----------
// 합계는 모두 SQL SUM/GROUP BY 로 낸다. 화면에서 기록을 순회하며 더하지 않는다.

/** 그 달의 날짜별 합계. 기록이 있는 날만 날짜 오름차순으로 돌려준다. */
export function getDailyTotals(month: string): DailyTotal[] {
  const { start, end } = monthRange(month);
  return getDb().getAllSync<DailyTotal>(
    'SELECT date, SUM(amount) AS total FROM entries WHERE date BETWEEN ? AND ? GROUP BY date ORDER BY date ASC',
    [start, end],
  );
}

/** start ≤ date ≤ end 구간의 카테고리별 합계. 많은 순. 미분류(NULL)도 한 줄로 들어온다. */
export function getCategoryTotalsBetween(start: string, end: string): CategoryTotal[] {
  const rows = getDb().getAllSync<{ category_id: number | null; total: number }>(
    'SELECT category_id, SUM(amount) AS total FROM entries WHERE date BETWEEN ? AND ? GROUP BY category_id ORDER BY total DESC',
    [start, end],
  );
  return rows.map((r) => ({ categoryId: r.category_id, total: r.total }));
}

/** 그 달의 카테고리별 합계. */
export function getCategoryTotals(month: string): CategoryTotal[] {
  const { start, end } = monthRange(month);
  return getCategoryTotalsBetween(start, end);
}

/** start ≤ date ≤ end 구간의 총 절약액과 기록 건수. 기록이 없으면 { total: 0, count: 0 }. */
export function getStatsBetween(start: string, end: string): MonthStats {
  const row = getDb().getFirstSync<{ total: number | null; count: number | null }>(
    'SELECT SUM(amount) AS total, COUNT(*) AS count FROM entries WHERE date BETWEEN ? AND ?',
    [start, end],
  );
  return { total: row?.total ?? 0, count: row?.count ?? 0 };
}

/** 그 달의 총 절약액과 기록 건수. */
export function getMonthStats(month: string): MonthStats {
  const { start, end } = monthRange(month);
  return getStatsBetween(start, end);
}

/**
 * 그 해('YYYY')의 월별 합계. 기록이 있는 달만 월 오름차순으로 돌려준다.
 * 빈 달을 0으로 채워 12칸을 만드는 건 buildMonthlyBars 가 한다 (getDailyTotals 와 같은 방식).
 */
export function getMonthlyTotals(year: string): MonthlyTotal[] {
  const { start, end } = yearRange(year);
  // substr(date, 1, 7) = 'YYYY-MM'
  return getDb().getAllSync<MonthlyTotal>(
    `SELECT substr(date, 1, 7) AS month, SUM(amount) AS total FROM entries
     WHERE date BETWEEN ? AND ?
     GROUP BY substr(date, 1, 7) ORDER BY month ASC`,
    [start, end],
  );
}

/**
 * 역대 하루 합계 중 최댓값. excludeDate 를 주면 그 날짜는 빼고 센다(개인 최고 판정용).
 * 비교 대상이 하나도 없으면 0. 빈 문자열은 어떤 날짜와도 같지 않아 "제외 없음" 으로 쓴다.
 */
export function getMaxDailyTotal(excludeDate?: string): number {
  const row = getDb().getFirstSync<{ best: number | null }>(
    `SELECT MAX(total) AS best FROM (
       SELECT SUM(amount) AS total FROM entries WHERE date <> ? GROUP BY date
     )`,
    [excludeDate ?? ''],
  );
  return row?.best ?? 0;
}

/** 역대 월 합계 중 최댓값. excludeMonth('YYYY-MM') 를 주면 그 달은 빼고 센다. 없으면 0. */
export function getMaxMonthlyTotal(excludeMonth?: string): number {
  // substr(date, 1, 7) = 'YYYY-MM'
  const row = getDb().getFirstSync<{ best: number | null }>(
    `SELECT MAX(total) AS best FROM (
       SELECT SUM(amount) AS total FROM entries
       WHERE substr(date, 1, 7) <> ?
       GROUP BY substr(date, 1, 7)
     )`,
    [excludeMonth ?? ''],
  );
  return row?.best ?? 0;
}

// ---------- 홈 이모지 적립 줄 (M3.6) ----------

/** 카테고리가 없거나 지워진 기록의 이모지 (기록 탭 카테고리 합계의 "미분류" 와 같은 글자) */
export const UNCATEGORIZED_EMOJI = '📦';

/**
 * 그 달 기록의 카테고리 이모지를 등록한 순서(created_at, 같은 초면 id)대로.
 * 기록 날짜가 아니라 등록 순서라서, 방금 저장한 기록이 항상 맨 끝에 온다.
 */
export function getEntryEmojisForMonth(month: string): EntryEmoji[] {
  const { start, end } = monthRange(month);
  return getDb().getAllSync<EntryEmoji>(
    `SELECT e.id AS id, COALESCE(c.emoji, ?) AS emoji
     FROM entries e LEFT JOIN categories c ON c.id = e.category_id
     WHERE e.date BETWEEN ? AND ?
     ORDER BY e.created_at ASC, e.id ASC`,
    [UNCATEGORIZED_EMOJI, start, end],
  );
}

// ---------- 연속 기록일 · 누적 (M4) ----------

/**
 * 오늘부터 sinceDays 일 전까지 기록이 있는 날짜, 최신 날짜부터. 연속 기록일 계산용.
 * 연속이 이 기간보다 길면 이 기간까지만 센다 (한 번에 읽는 양을 묶어 둔다).
 */
export function getRecordedDates(sinceDays: number = 400): string[] {
  return getDb()
    .getAllSync<{ date: string }>(
      'SELECT DISTINCT date FROM entries WHERE date >= ? ORDER BY date DESC',
      [addDays(today(), -sinceDays)],
    )
    .map((r) => r.date);
}

/** 전체 기록의 누적 절약액. 기록이 없으면 0. */
export function getTotalSum(): number {
  const row = getDb().getFirstSync<{ total: number | null }>(
    'SELECT SUM(amount) AS total FROM entries',
  );
  return row?.total ?? 0;
}

// ---------- 빠른 입력 (M4) ----------

/**
 * 입력 시트 빠른 입력 칩. 같은 항목명은 가장 최근(updated_at, 같으면 id) 한 건만 남기고, 최근 순으로 limit 개.
 * 항목명마다 최신 행을 고르는 데 창 함수를 쓴다 (기록이 많아도 한 번 정렬로 끝난다).
 */
export function getRecentTitles(limit: number): RecentTitle[] {
  const rows = getDb().getAllSync<{ title: string; category_id: number | null; amount: number }>(
    `SELECT title, category_id, amount FROM (
       SELECT title, category_id, amount, updated_at, id,
         ROW_NUMBER() OVER (PARTITION BY title ORDER BY updated_at DESC, id DESC) AS rn
       FROM entries
     )
     WHERE rn = 1
     ORDER BY updated_at DESC, id DESC
     LIMIT ?`,
    [limit],
  );
  return rows.map((r) => ({ title: r.title, categoryId: r.category_id, amount: r.amount }));
}

// ---------- settings (M3.5) ----------

/** settings 테이블 키. 값은 항상 문자열로 저장하고, 해석은 쓰는 쪽(features)이 한다. */
export const SETTING_KEYS = {
  /** 월 목표 금액. 원 단위 정수 문자열 ('300000') */
  monthlyGoal: 'monthly_goal',
  /** 목표 달성을 축하한 달 ('YYYY-MM'). 한 달에 한 번만 축하하기 위해 기록한다. */
  goalReachedMonth: 'goal_reached_month',
  /** (M3.6) 홈을 마지막으로 연 날 ('YYYY-MM-DD'). 그날 처음 열 때만 월 합계를 0부터 카운트업한다. */
  lastOpenDate: 'last_open_date',
  /** (M4) 축하한 가장 큰 누적 이정표(원 정수 문자열). 이보다 작거나 같은 이정표는 다시 축하하지 않는다. */
  milestoneReached: 'milestone_reached',
  /** (M4) 닫은 회고 카드의 대상 달 ('YYYY-MM', 지난달). 같은 달 회고는 다시 띄우지 않는다. */
  reviewDismissedMonth: 'review_dismissed_month',
  /** (M4) 저장 효과음 켬/끔 ('1' | '0'). 없으면 켬 */
  soundEnabled: 'sound_enabled',
  /** (M4) 앱 전체 햅틱 켬/끔 ('1' | '0'). 없으면 켬 */
  hapticsEnabled: 'haptics_enabled',
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

/** 설정 값. 없으면 null. */
export function getSetting(key: SettingKey): string | null {
  const row = getDb().getFirstSync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [
    key,
  ]);
  return row?.value ?? null;
}

/** 설정 값을 저장한다. 이미 있으면 덮어쓴다. */
export function setSetting(key: SettingKey, value: string): void {
  getDb().runSync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value],
  );
}

/** 설정 값을 지운다. 없는 키여도 아무 일 없다. */
export function deleteSetting(key: SettingKey): void {
  getDb().runSync('DELETE FROM settings WHERE key = ?', [key]);
}

// ---------- entries: 쓰기 ----------

/** 폼이 이미 막지만, 백업 복원(M5) 등 다른 경로도 같은 함수를 쓰므로 쿼리 계층에서 한 번 더 막는다. */
export function assertValidEntryInput(input: EntryInput): void {
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new Error('금액은 1원 이상의 정수여야 합니다');
  }
  if (!input.title.trim()) {
    throw new Error('항목명이 비어 있습니다');
  }
}

export function addEntry(input: EntryInput): Entry {
  assertValidEntryInput(input);
  const now = nowIso();
  const result = getDb().runSync(
    'INSERT INTO entries (date, title, amount, category_id, memo, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [input.date, input.title, input.amount, input.categoryId, input.memo, now, now],
  );
  const created = getEntryById(result.lastInsertRowId);
  if (!created) {
    throw new Error('기록 저장 후 다시 읽어오지 못했습니다');
  }
  return created;
}

/** 수정 후 갱신된 행을 돌려준다. 해당 id 가 없으면 null. */
export function updateEntry(id: number, input: EntryInput): Entry | null {
  assertValidEntryInput(input);
  getDb().runSync(
    'UPDATE entries SET date = ?, title = ?, amount = ?, category_id = ?, memo = ?, updated_at = ? WHERE id = ?',
    [input.date, input.title, input.amount, input.categoryId, input.memo, nowIso(), id],
  );
  return getEntryById(id);
}

/** 삭제된 행 수를 돌려준다 (0이면 없는 id). */
export function deleteEntry(id: number): number {
  return getDb().runSync('DELETE FROM entries WHERE id = ?', [id]).changes;
}

// ---------- 카테고리 관리 (M5) ----------

/** 같은 이름의 카테고리가 이미 있다 (name UNIQUE). 화면은 이 오류로 "이미 있는 이름" 안내를 띄운다 */
export class CategoryNameTakenError extends Error {
  constructor(name: string) {
    super(`이미 있는 카테고리 이름입니다: ${name}`);
    this.name = 'CategoryNameTakenError';
  }
}

/** 기본 카테고리는 지울 수 없다 */
export class DefaultCategoryDeleteError extends Error {
  constructor() {
    super('기본 카테고리는 삭제할 수 없습니다');
    this.name = 'DefaultCategoryDeleteError';
  }
}

export type CategoryInput = { name: string; emoji: string };

/** 이름·이모지 앞뒤 공백을 걷고 비었으면 던진다. 화면이 저장 버튼으로 먼저 막는다 */
function normalizeCategoryInput(input: CategoryInput): CategoryInput {
  const name = input.name.trim();
  const emoji = input.emoji.trim();
  if (!name) throw new Error('카테고리 이름이 비어 있습니다');
  if (!emoji) throw new Error('카테고리 이모지가 비어 있습니다');
  return { name, emoji };
}

/**
 * UNIQUE 위반 메시지는 플랫폼마다 달라서, 넣기 전에 같은 이름을 먼저 찾아 전용 오류로 바꾼다.
 * exceptId 는 수정할 때 자기 자신을 빼기 위한 것
 */
function assertNameFree(name: string, exceptId: number | null): void {
  const row = getDb().getFirstSync<{ id: number }>(
    'SELECT id FROM categories WHERE name = ? AND id <> ?',
    [name, exceptId ?? -1],
  );
  if (row) throw new CategoryNameTakenError(name);
}

export function getCategoryById(id: number): Category | null {
  const row = getDb().getFirstSync<CategoryRow>(
    'SELECT id, name, emoji, sort_order, is_default FROM categories WHERE id = ?',
    [id],
  );
  return row ? toCategory(row) : null;
}

/** 새 카테고리를 맨 뒤에 추가한다. 사용자가 만든 것이라 is_default = 0 */
export function addCategory(input: CategoryInput): Category {
  const { name, emoji } = normalizeCategoryInput(input);
  assertNameFree(name, null);
  const result = getDb().runSync(
    `INSERT INTO categories (name, emoji, sort_order, is_default)
     VALUES (?, ?, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM categories), 0)`,
    [name, emoji],
  );
  const created = getCategoryById(result.lastInsertRowId);
  if (!created) throw new Error('카테고리 저장 후 다시 읽어오지 못했습니다');
  return created;
}

/** 이름·이모지 수정. 기본 카테고리도 바꿀 수 있다 (삭제만 막는다). 없는 id 면 null */
export function updateCategory(id: number, input: CategoryInput): Category | null {
  const { name, emoji } = normalizeCategoryInput(input);
  assertNameFree(name, id);
  getDb().runSync('UPDATE categories SET name = ?, emoji = ? WHERE id = ?', [name, emoji, id]);
  return getCategoryById(id);
}

/** 이 카테고리를 쓰는 기록 수. 삭제 전 "기록 N건이 미분류가 됩니다" 경고용 */
export function countEntriesInCategory(id: number): number {
  const row = getDb().getFirstSync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM entries WHERE category_id = ?',
    [id],
  );
  return row?.count ?? 0;
}

/**
 * 카테고리를 지우고 그 카테고리의 기록은 미분류(NULL)로 돌린다. 기본 카테고리면 던진다.
 * 외래 키 ON DELETE SET NULL 이 있지만, PRAGMA 가 꺼진 연결에서도 같게 동작하도록 직접 비운다.
 * 지운 행 수(0 = 없는 id)를 돌려준다
 */
export function deleteCategory(id: number): number {
  const found = getCategoryById(id);
  if (!found) return 0;
  if (found.isDefault) throw new DefaultCategoryDeleteError();
  let changes = 0;
  const db = getDb();
  db.withTransactionSync(() => {
    db.runSync('UPDATE entries SET category_id = NULL WHERE category_id = ?', [id]);
    changes = db.runSync('DELETE FROM categories WHERE id = ?', [id]).changes;
  });
  return changes;
}

/** ids 순서대로 sort_order 를 0, 1, 2… 로 다시 매긴다. 목록에 없는 카테고리는 그 뒤로 기존 순서대로 */
export function reorderCategories(ids: readonly number[]): void {
  const db = getDb();
  const rest = getAllCategories()
    .map((c) => c.id)
    .filter((id) => !ids.includes(id));
  db.withTransactionSync(() => {
    [...ids, ...rest].forEach((id, index) => {
      db.runSync('UPDATE categories SET sort_order = ? WHERE id = ?', [index, id]);
    });
  });
}

// ---------- 백업 · 복원 · 전체 삭제 (M5) ----------

/** 모든 기록, 날짜 → 등록 순 (CSV 가 시간 순으로 읽히게) */
export function getAllEntries(): Entry[] {
  const rows = getDb().getAllSync<EntryRow>(
    `SELECT ${ENTRY_COLUMNS} FROM entries ORDER BY date ASC, id ASC`,
  );
  return rows.map(toEntry);
}

/** settings 테이블 전체 (키 → 문자열 값) */
export function getAllSettings(): Record<string, string> {
  const rows = getDb().getAllSync<{ key: string; value: string }>('SELECT key, value FROM settings');
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export type ImportResult = { categoriesAdded: number; entriesAdded: number };

/**
 * 복원 계획을 트랜잭션 하나로 실행한다. 중간에 하나라도 실패하면 전부 롤백돼 복원 전 상태가 그대로 남는다.
 * - merge: 새 카테고리를 기존 맨 뒤에 붙이고(is_default 는 계획대로) 기록을 추가한다. 목표는 건드리지 않는다
 * - overwrite: 기록·카테고리를 모두 지우고 계획대로 채운 뒤 월 목표를 복원한다 (효과음·햅틱 등 다른 설정은 둔다)
 * 기록의 created_at/updated_at 은 백업 값을 그대로 쓴다 — 같은 파일을 다시 병합할 때 중복으로 걸러지게
 */
export function importBackup(plan: ImportPlan, mode: ImportMode): ImportResult {
  for (const e of plan.entries) {
    assertValidEntryInput({ ...e, categoryId: null });
  }
  const db = getDb();
  let entriesAdded = 0;
  db.withTransactionSync(() => {
    if (mode === 'overwrite') {
      db.runSync('DELETE FROM entries');
      db.runSync('DELETE FROM categories');
    }
    const base =
      mode === 'overwrite'
        ? 0
        : (db.getFirstSync<{ next: number }>(
            'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM categories',
          )?.next ?? 0);
    plan.categories.forEach((c, i) => {
      db.runSync(
        'INSERT INTO categories (name, emoji, sort_order, is_default) VALUES (?, ?, ?, ?)',
        [c.name, c.emoji, mode === 'overwrite' ? c.sortOrder : base + i, c.isDefault ? 1 : 0],
      );
    });
    // 새 id 는 넣은 뒤에야 알 수 있어 이름 → id 표를 트랜잭션 안에서 다시 읽는다
    const idByName = new Map(
      db
        .getAllSync<{ id: number; name: string }>('SELECT id, name FROM categories')
        .map((r) => [r.name, r.id]),
    );
    for (const e of plan.entries) {
      const categoryId = e.categoryName !== null ? (idByName.get(e.categoryName) ?? null) : null;
      db.runSync(
        'INSERT INTO entries (date, title, amount, category_id, memo, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [e.date, e.title, e.amount, categoryId, e.memo, e.createdAt, e.updatedAt],
      );
      entriesAdded += 1;
    }
    if (mode === 'overwrite' && plan.monthlyGoal !== undefined) {
      if (plan.monthlyGoal === null) {
        db.runSync('DELETE FROM settings WHERE key = ?', [SETTING_KEYS.monthlyGoal]);
      } else {
        db.runSync(
          'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
          [SETTING_KEYS.monthlyGoal, String(plan.monthlyGoal)],
        );
      }
      // 목표가 바뀌었으니 이번 달 달성 축하를 다시 받을 수 있게 (settingsStore.setGoal 과 같은 규칙)
      db.runSync('DELETE FROM settings WHERE key = ?', [SETTING_KEYS.goalReachedMonth]);
    }
  });
  return { categoriesAdded: plan.categories.length, entriesAdded };
}

/**
 * 데이터 전체 삭제: 기록·설정을 모두 지우고 카테고리는 기본 9개로 되돌린다
 * (사용자가 만든 것 삭제 · 이름·이모지·순서 초기화). 트랜잭션 하나라 실패하면 아무것도 지워지지 않는다
 */
export function deleteAllData(): void {
  const db = getDb();
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM entries');
    db.runSync('DELETE FROM settings');
    db.runSync('DELETE FROM categories');
    CURRENT_DEFAULT_CATEGORIES.forEach((c, i) => {
      db.runSync(
        'INSERT INTO categories (name, emoji, sort_order, is_default) VALUES (?, ?, ?, 1)',
        [c.name, c.emoji, i],
      );
    });
  });
}
