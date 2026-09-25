import type { Category, Entry } from '@/src/db';

/** 엑셀이 UTF-8 로 읽게 하는 BOM. 없으면 한글이 깨진다 */
export const CSV_BOM = '\uFEFF';
export const CSV_HEADER = ['날짜', '항목', '금액', '카테고리', '메모', '생성시각'] as const;

/** 쉼표·큰따옴표·줄바꿈이 있으면 큰따옴표로 감싸고 안의 큰따옴표는 두 번 쓴다 (RFC 4180) */
export function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * 사용자가 쓴 글 칸(항목·카테고리·메모). =, +, -, @ 로 시작하면 엑셀이 수식으로 실행하므로
 * 앞에 ' 를 붙여 글자로 읽게 한다 (CSV 수식 주입 방지). 금액·날짜·시각은 앱이 만든 값이라 그대로
 */
export function csvTextField(value: string): string {
  return csvField(/^[=+\-@]/.test(value) ? `'${value}` : value);
}

/**
 * 엑셀·Numbers 에서 열 CSV. BOM + 헤더 + 기록 한 줄씩, 줄 끝은 CRLF.
 * 금액은 콤마 없는 정수(엑셀이 숫자로 읽게), 카테고리는 이름(없거나 지워졌으면 빈 칸), 메모 없으면 빈 칸.
 * 기록 순서는 받은 그대로 (getAllEntries 가 날짜 → 등록 순으로 준다)
 */
export function buildCsv(entries: readonly Entry[], categories: readonly Category[]): string {
  const nameById = new Map(categories.map((c) => [c.id, c.name]));
  const lines = [CSV_HEADER.join(',')];
  for (const e of entries) {
    const category = e.categoryId !== null ? (nameById.get(e.categoryId) ?? '') : '';
    lines.push(
      [
        csvField(e.date),
        csvTextField(e.title),
        String(e.amount),
        csvTextField(category),
        csvTextField(e.memo ?? ''),
        csvField(e.createdAt),
      ].join(','),
    );
  }
  return `${CSV_BOM}${lines.join('\r\n')}\r\n`;
}

/** 'savelog-2026-09-25.csv' */
export function csvFileName(date: string): string {
  return `savelog-${date}.csv`;
}
