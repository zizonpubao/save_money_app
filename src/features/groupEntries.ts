import type { Entry } from '@/src/db/types';
import { toMonth } from '@/src/utils/date';

/** SectionList 한 섹션 = 하루(월 모드) 또는 한 달(년 모드) */
export type EntrySection = {
  /** 'YYYY-MM-DD'(일별) 또는 'YYYY-MM'(월별) — SectionList 섹션 key 겸 헤더 표시용 */
  key: string;
  /** 섹션 합계 (원) */
  total: number;
  data: Entry[];
};

/** 금액 합계. 정수 원 단위. */
export function sumAmounts(entries: readonly Entry[]): number {
  return entries.reduce((acc, e) => acc + e.amount, 0);
}

/**
 * 기록을 keyOf 가 돌려주는 값으로 묶는다. 섹션은 최신 날짜부터, 섹션 안은 date DESC → id DESC(최근 등록 순).
 * 입력 순서에 의존하지 않도록 정렬은 여기서 다시 한다. key 는 date 의 접두어라 정렬 순서가 그대로 유지된다.
 */
function groupEntries(entries: readonly Entry[], keyOf: (entry: Entry) => string): EntrySection[] {
  const sorted = [...entries].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return b.id - a.id;
  });

  const sections: EntrySection[] = [];
  for (const entry of sorted) {
    const key = keyOf(entry);
    const last = sections[sections.length - 1];
    if (last && last.key === key) {
      last.data.push(entry);
      last.total += entry.amount;
    } else {
      sections.push({ key, total: entry.amount, data: [entry] });
    }
  }
  return sections;
}

/** 날짜별 섹션 (월 모드). key = 'YYYY-MM-DD' */
export function groupEntriesByDate(entries: readonly Entry[]): EntrySection[] {
  return groupEntries(entries, (e) => e.date);
}

/** 월별 섹션 (년 모드). key = 'YYYY-MM' */
export function groupEntriesByMonth(entries: readonly Entry[]): EntrySection[] {
  return groupEntries(entries, (e) => toMonth(e.date));
}
