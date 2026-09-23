import { nowIso } from '@/src/utils/date';

import { getDb } from './database';
import {
  toCategory,
  toEntry,
  type Category,
  type CategoryRow,
  type Entry,
  type EntryInput,
  type EntryRow,
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

// ---------- entries: 쓰기 ----------

/** 폼이 이미 막지만, 백업 복원(M5) 등 다른 경로도 같은 함수를 쓰므로 쿼리 계층에서 한 번 더 막는다. */
function assertValidEntryInput(input: EntryInput): void {
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
