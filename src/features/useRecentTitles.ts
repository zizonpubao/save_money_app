import { useState } from 'react';

import { getRecentTitles, type RecentTitle } from '@/src/db';

/** (M4) 입력 시트 빠른 입력 칩 개수 (PRD 3~5개 중 5) */
export const QUICK_ENTRY_LIMIT = 5;

/**
 * 빠른 입력 칩 목록. 입력 시트가 열릴 때(마운트) 한 번 읽는다.
 * enabled 가 false(수정 모드)면 읽지 않는다. 읽기가 실패해도 시트는 열려야 하므로 빈 목록으로 둔다.
 */
export function useRecentTitles(enabled: boolean): RecentTitle[] {
  const [items] = useState<RecentTitle[]>(() => {
    if (!enabled) return [];
    try {
      return getRecentTitles(QUICK_ENTRY_LIMIT);
    } catch {
      return [];
    }
  });
  return items;
}
