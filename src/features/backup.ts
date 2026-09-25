import { assertValidEntryInput, type Category, type Entry } from '@/src/db';
import { isValidDateString, nowIso } from '@/src/utils/date';

import { categoryErrorMessage, validateCategoryInput } from './categoryForm';

/** 백업 JSON 의 app 값. 다른 앱 파일을 복원하지 않게 이 값이 다르면 거부한다 */
export const BACKUP_APP = 'savelog';
/** 지금 내보내는 형식 버전. 1 은 settings 가 없던 형식이라 복원만 받는다 */
export const BACKUP_VERSION = 2;

export type BackupCategory = {
  id: number;
  name: string;
  emoji: string;
  sortOrder: number;
  isDefault: boolean;
};

export type BackupEntry = {
  id: number;
  date: string;
  title: string;
  amount: number;
  categoryId: number | null;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BackupSettings = { monthlyGoal: number | null };

/** PRD "백업 JSON 형식" version 2 */
export type BackupV2 = {
  app: typeof BACKUP_APP;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  settings: BackupSettings;
  categories: BackupCategory[];
  entries: BackupEntry[];
};

/** 전체 데이터를 백업 JSON 객체로. exportedAt 은 로컬 시간대가 붙은 ISO (예: 2026-09-23T13:58:00+09:00) */
export function buildBackup(
  categories: readonly Category[],
  entries: readonly Entry[],
  settings: BackupSettings,
  exportedAt: string = nowIso(),
): BackupV2 {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt,
    settings: { monthlyGoal: settings.monthlyGoal },
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      emoji: c.emoji,
      sortOrder: c.sortOrder,
      isDefault: c.isDefault,
    })),
    entries: entries.map((e) => ({
      id: e.id,
      date: e.date,
      title: e.title,
      amount: e.amount,
      categoryId: e.categoryId,
      memo: e.memo,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    })),
  };
}

/** 'savelog-backup-2026-09-25.json' */
export function backupFileName(date: string): string {
  return `savelog-backup-${date}.json`;
}

/** 덮어쓰기 직전 자동 백업: 같은 날 여러 번 해도 겹치지 않게 시각까지 ('savelog-autobackup-2026-09-25-135800.json') */
export function autoBackupFileName(stamp: string): string {
  return `savelog-autobackup-${stamp}.json`;
}

// ---------- 복원 검증 ----------

/** 검증을 통과한 카테고리. id 가 없거나 숫자가 아니면 null (기록과 이을 수 없지만 카테고리 자체는 복원한다) */
export type ValidCategory = {
  id: number | null;
  name: string;
  emoji: string;
  sortOrder: number;
  isDefault: boolean;
};

export type ValidBackup = {
  version: 1 | 2;
  categories: ValidCategory[];
  entries: BackupEntry[];
  /** 백업 안의 설정. version 1 처럼 settings 가 없으면 null */
  settings: BackupSettings | null;
  /** 규칙에 어긋나 건너뛴 기록 수 */
  skippedEntries: number;
  /** 이름·이모지가 비었거나 너무 길거나 이름이 겹쳐 건너뛴 카테고리 수 */
  skippedCategories: number;
  /**
   * 백업 안의 카테고리 id → 이름. 이름이 겹쳐 건너뛴 카테고리의 id 도 먼저 나온 같은 이름으로 이어 둔다
   * (그 id 를 쓰던 기록이 미분류로 떨어지지 않게)
   */
  categoryNameById: Map<number, string>;
};

export type ValidateResult =
  | { ok: true; errors: string[]; data: ValidBackup }
  | { ok: false; errors: string[]; data: null };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function fail(message: string): ValidateResult {
  return { ok: false, errors: [message], data: null };
}

/** 월 목표: 1원 이상 정수만, 그 밖(없음·0·소수·문자)은 목표 없음 */
function parseMonthlyGoal(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null;
}

/**
 * 한 기록을 검증한다. 틀리면 이유 문자열, 맞으면 정리한 기록.
 * 금액·항목명은 addEntry 와 같은 assertValidEntryInput 규칙, 날짜는 'YYYY-MM-DD' 엄격 파싱
 */
function validateEntry(raw: unknown, index: number): BackupEntry | string {
  if (!isRecord(raw)) return '기록 형식이 아닙니다';
  const { date, title, amount } = raw;
  if (typeof date !== 'string' || !isValidDateString(date)) return '날짜 형식이 틀렸습니다';
  if (typeof title !== 'string') return '항목명이 없습니다';
  if (typeof amount !== 'number') return '금액이 숫자가 아닙니다';
  try {
    assertValidEntryInput({ date, title, amount, categoryId: null, memo: null });
  } catch (e) {
    return e instanceof Error ? e.message : '기록 검증 실패';
  }
  // 시각은 부가 정보라 틀려도 기록을 버리지 않는다. 같은 파일을 다시 넣어도 같은 값이 나오게 날짜로 채운다
  const fallbackTime = `${date}T00:00:00`;
  const createdAt = nonEmptyString(raw.createdAt) ?? fallbackTime;
  return {
    id: typeof raw.id === 'number' ? raw.id : index + 1,
    date,
    title,
    amount,
    categoryId: typeof raw.categoryId === 'number' ? raw.categoryId : null,
    memo: typeof raw.memo === 'string' ? raw.memo : null,
    createdAt,
    updatedAt: nonEmptyString(raw.updatedAt) ?? createdAt,
  };
}

/**
 * JSON.parse 한 값을 백업으로 검증한다.
 * - 파일 전체 거부(ok: false): app 이 'savelog' 가 아님 · version 이 1·2 가 아님 · categories/entries 가 배열이 아님
 * - 행 건너뜀(ok: true, 건수 집계): 기록은 금액 1 이상 정수 · 항목명 · 날짜, 카테고리는 이름·이모지 문자열 · 길이(이름 12자 · 이모지 2자)와 이름 중복
 */
export function validateBackup(raw: unknown): ValidateResult {
  if (!isRecord(raw) || raw.app !== BACKUP_APP) {
    return fail('SaveLog 백업 파일이 아닙니다');
  }
  const version = raw.version;
  if (version !== 1 && version !== 2) {
    return fail(`지원하지 않는 백업 버전입니다 (${String(version)})`);
  }
  if (!Array.isArray(raw.categories) || !Array.isArray(raw.entries)) {
    return fail('백업 파일에 카테고리·기록 목록이 없습니다');
  }

  const errors: string[] = [];
  const categories: ValidCategory[] = [];
  const categoryNameById = new Map<number, string>();
  const seenNames = new Set<string>();
  let skippedCategories = 0;

  raw.categories.forEach((item: unknown, index: number) => {
    const name = isRecord(item) ? nonEmptyString(item.name) : null;
    const emoji = isRecord(item) ? nonEmptyString(item.emoji) : null;
    if (!isRecord(item) || name === null || emoji === null) {
      skippedCategories += 1;
      errors.push(`카테고리 ${index + 1}번째: 이름·이모지가 없습니다`);
      return;
    }
    // 편집 화면과 같은 규칙(이름 12자 · 이모지 2자). 파일로 긴 이름이 들어와 칩·목록이 깨지지 않게
    const invalid = categoryErrorMessage(validateCategoryInput({ name, emoji }));
    if (invalid !== null) {
      skippedCategories += 1;
      errors.push(`카테고리 ${index + 1}번째: ${invalid}`);
      return;
    }
    const id = typeof item.id === 'number' && Number.isInteger(item.id) ? item.id : null;
    if (id !== null && !categoryNameById.has(id)) categoryNameById.set(id, name);
    if (seenNames.has(name)) {
      skippedCategories += 1;
      errors.push(`카테고리 ${index + 1}번째: 이름이 겹칩니다 (${name})`);
      return;
    }
    seenNames.add(name);
    categories.push({
      id,
      name,
      emoji,
      sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : index,
      isDefault: item.isDefault === true,
    });
  });

  const entries: BackupEntry[] = [];
  let skippedEntries = 0;
  raw.entries.forEach((item: unknown, index: number) => {
    const result = validateEntry(item, index);
    if (typeof result === 'string') {
      skippedEntries += 1;
      errors.push(`기록 ${index + 1}번째: ${result}`);
      return;
    }
    entries.push(result);
  });

  const settings =
    version === 2 && isRecord(raw.settings)
      ? { monthlyGoal: parseMonthlyGoal(raw.settings.monthlyGoal) }
      : null;

  return {
    ok: true,
    errors,
    data: {
      version,
      categories,
      entries,
      settings,
      skippedEntries,
      skippedCategories,
      categoryNameById,
    },
  };
}

/** 복원 선택 알림 본문: "기록 123건, 카테고리 10개. 건너뜀 2건" (건너뜀이 없으면 뒤 문장 없음) */
export function restoreSummary(data: ValidBackup): string {
  const base = `기록 ${data.entries.length}건, 카테고리 ${data.categories.length}개.`;
  const skipped = data.skippedEntries + data.skippedCategories;
  return skipped > 0 ? `${base} 건너뜀 ${skipped}건` : base;
}
