import { useMemo } from 'react';

import { useCategoryStore } from '@/src/store/categoryStore';
import { useEntryStore } from '@/src/store/entryStore';
import { today } from '@/src/utils/date';

import { UNCATEGORIZED } from './monthlyStats';
import { reviewMessage, shouldShowReview, type ReviewTop } from './review';

/**
 * (M4) 홈 맨 위 지난달 회고 카드. 재료는 entryStore 스냅숏(포커스·저장 때 다시 읽음)에서 가져온다.
 * 보여줄 날이 아니거나 닫았으면 message 가 null.
 */
export function useMonthReview(): { message: string | null; dismiss: () => void } {
  const review = useEntryStore((s) => s.review);
  const dismissedMonth = useEntryStore((s) => s.reviewDismissedMonth);
  const dismiss = useEntryStore((s) => s.dismissReview);
  const categories = useCategoryStore((s) => s.categories);
  // 날짜는 렌더마다 문자열로 비교만 한다 → 자정을 넘긴 뒤 다시 그려지면 4일에 사라진다
  const date = today();

  const message = useMemo(() => {
    if (!shouldShowReview(date, dismissedMonth, review.count)) return null;
    const found = categories.find((c) => c.id === review.topCategoryId);
    // 카테고리가 없거나 지워진 기록이 1위면 기록 탭과 같이 "📦 미분류"
    const top: ReviewTop = found
      ? { emoji: found.emoji, name: found.name }
      : { emoji: UNCATEGORIZED.emoji, name: UNCATEGORIZED.name };
    return reviewMessage(review.month, review.count, review.total, top);
  }, [date, dismissedMonth, review, categories]);

  return { message, dismiss };
}
