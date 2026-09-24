import { addDays, monthRange, nowIso, today, yearRange } from '@/src/utils/date';

import { getDb } from './database';
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
