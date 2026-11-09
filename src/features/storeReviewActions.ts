import * as StoreReview from 'expo-store-review';

import { getEntryCount, getSetting, setSetting, SETTING_KEYS } from '@/src/db';
import { today } from '@/src/utils/date';

import { shouldRequestReview, type ReviewCheck } from './storeReview';

/**
 * 조건이 맞으면 iOS 기본 별점 창을 요청한다. 어떤 실패도 앱 흐름을 막지 않는다.
 * 날짜는 요청 직전에 적는다 — 요청 뒤에 적으면 그 사이 앱이 죽었을 때 애플 횟수(1년 3회)를 또 쓰게 된다.
 * TestFlight 에서는 isAvailableAsync 가 false 라 날짜를 적지 않는다.
 */
export async function maybeRequestStoreReview(
  trigger: Pick<ReviewCheck, 'goalReached' | 'milestone'>,
): Promise<boolean> {
  try {
    const eligible = shouldRequestReview({
      ...trigger,
      entryCount: getEntryCount(),
      lastRequestedAt: getSetting(SETTING_KEYS.reviewRequestedAt),
      today: today(),
    });
    if (!eligible) return false;
    if (!(await StoreReview.isAvailableAsync())) return false;
    if (!(await StoreReview.hasAction())) return false;
    setSetting(SETTING_KEYS.reviewRequestedAt, today());
    await StoreReview.requestReview();
    return true;
  } catch {
    return false;
  }
}
