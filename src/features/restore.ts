import type { Category, Entry, ImportCategory, ImportEntry, ImportPlan } from '@/src/db';
import { CURRENT_DEFAULT_CATEGORIES } from '@/src/db/migrations';

import type { BackupEntry, ValidBackup } from './backup';

const DEFAULT_NAMES = new Set(CURRENT_DEFAULT_CATEGORIES.map((c) => c.name));

/** 이름이 기본 카테고리 10개 중 하나인지. 덮어쓰기 때 is_default 를 이 기준으로 정한다 */
export function isDefaultCategoryName(name: string): boolean {
  return DEFAULT_NAMES.has(name);
}

/** 병합 중복 판정 키: 날짜 · 항목명 · 금액 · 등록 시각 4개가 모두 같으면 같은 기록 */
function entryKey(e: { date: string; title: string; amount: number; createdAt: string }): string {
  return [e.date, e.title, String(e.amount), e.createdAt].join('\u0000');
}

function toImportEntry(e: BackupEntry, nameById: ReadonlyMap<number, string>): ImportEntry {
  return {
    date: e.date,
    title: e.title,
    amount: e.amount,
    // 백업 안 id 로 이름을 찾아 두면, 넣을 때 그 이름의 (새) id 로 다시 잇는다. 못 찾으면 미분류
    categoryName: e.categoryId !== null ? (nameById.get(e.categoryId) ?? null) : null,
    memo: e.memo,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

/** 백업 카테고리를 sortOrder 순(같으면 파일 순)으로 */
function sortedCategories(incoming: ValidBackup) {
  return incoming.categories
    .map((c, index) => ({ c, index }))
    .sort((a, b) => a.c.sortOrder - b.c.sortOrder || a.index - b.index)
    .map(({ c }) => c);
}

export type MergePlan = ImportPlan & {
  /** 이미 있는 기록(4개 값이 같은 것)이라 건너뛴 수. 파일 안에서 겹친 것도 포함 */
  skippedDuplicates: number;
};

/**
 * 병합 계획. 카테고리는 **이름**으로 맞추고(없으면 맨 뒤에 추가, 기존 것의 이모지·is_default 는 그대로),
 * 기록은 (date, title, amount, created_at) 가 같은 것이 이미 있으면 건너뛴다. 월 목표는 건드리지 않는다.
 * 병합으로 새로 생기는 카테고리는 사용자 카테고리(삭제 가능)로 넣는다 — 기본 이름이어도 지금 DB 에 없다면
 * 사용자가 기본 카테고리 이름을 바꾼 경우라, 기본을 하나 더 만들지 않는다
 */
export function planMerge(
  existing: { categories: readonly Category[]; entries: readonly Entry[] },
  incoming: ValidBackup,
): MergePlan {
  const existingNames = new Set(existing.categories.map((c) => c.name));
  const categories: ImportCategory[] = sortedCategories(incoming)
    .filter((c) => !existingNames.has(c.name))
    .map((c, i) => ({ name: c.name, emoji: c.emoji, sortOrder: i, isDefault: false }));

  const seen = new Set(existing.entries.map(entryKey));
  const entries: ImportEntry[] = [];
  let skippedDuplicates = 0;
  for (const e of incoming.entries) {
    const key = entryKey(e);
    if (seen.has(key)) {
      skippedDuplicates += 1;
      continue;
    }
    seen.add(key);
    entries.push(toImportEntry(e, incoming.categoryNameById));
  }
  return { categories, entries, skippedDuplicates };
}

/** 기본 카테고리 개수. 덮어쓰기 뒤에도 늘 이만큼 있게 맞춘다 (기본은 삭제 금지라 줄면 되살릴 길이 없다) */
const DEFAULT_COUNT = CURRENT_DEFAULT_CATEGORIES.length;

/**
 * 덮어쓰기 계획: 백업 내용 전부. 카테고리 순서는 백업 순서를 0부터 다시 매긴다.
 * 기본 여부: 이름이 기본 10개 중 하나면 기본, 파일에서 isDefault 인 것(이름을 바꾼 기본)도 기본.
 * 기본이 10개를 넘으면 이름이 기본 목록에 없는 것을 뒤에서부터 사용자 카테고리로 내린다.
 * 10개 미만일 때만 빠진 기본 이름을 기본 목록 순서대로 맨 뒤에 채운다 (0개·전부 걸러진 백업도 기본 10개).
 * 채우려고 기존 기본을 빼지는 않는다 — 커피→카페 로 바꾼 백업은 기본이 이미 10개라 커피를 채우지 않고 기타도 남는다
 * 월 목표는 백업에 settings 가 있을 때만(version 2) 그 값으로, 없으면(version 1) 지금 값을 둔다
 */
export function planOverwrite(incoming: ValidBackup): ImportPlan {
  const sorted = sortedCategories(incoming);
  const nameMatched = sorted.filter((c) => isDefaultCategoryName(c.name)).length;
  let renamedSlots = DEFAULT_COUNT - nameMatched;
  const categories: ImportCategory[] = sorted.map((c, i) => {
    let isDefault = isDefaultCategoryName(c.name);
    if (!isDefault && c.isDefault && renamedSlots > 0) {
      renamedSlots -= 1;
      isDefault = true;
    }
    return { name: c.name, emoji: c.emoji, sortOrder: i, isDefault };
  });

  const names = new Set(categories.map((c) => c.name));
  let defaults = categories.filter((c) => c.isDefault).length;
  for (const d of CURRENT_DEFAULT_CATEGORIES) {
    if (defaults >= DEFAULT_COUNT) break;
    if (names.has(d.name)) continue;
    categories.push({ name: d.name, emoji: d.emoji, sortOrder: categories.length, isDefault: true });
    defaults += 1;
  }

  return {
    categories,
    entries: incoming.entries.map((e) => toImportEntry(e, incoming.categoryNameById)),
    monthlyGoal: incoming.settings ? incoming.settings.monthlyGoal : undefined,
  };
}

/** 병합 완료 알림 본문 */
export function mergeResultMessage(plan: MergePlan): string {
  const added = `기록 ${plan.entries.length}건, 카테고리 ${plan.categories.length}개를 추가했습니다.`;
  return plan.skippedDuplicates > 0
    ? `${added}\n이미 있는 기록 ${plan.skippedDuplicates}건은 건너뛰었습니다.`
    : added;
}
