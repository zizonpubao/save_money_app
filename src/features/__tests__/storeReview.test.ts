import * as StoreReview from 'expo-store-review';

import {
  addEntry,
  getEntryCount,
  getSetting,
  initDatabase,
  resetDatabaseConnection,
  setSetting,
  SETTING_KEYS,
} from '@/src/db';
import { shouldRequestReview, type ReviewCheck } from '@/src/features/storeReview';
import { maybeRequestStoreReview } from '@/src/features/storeReviewActions';
import { addDays, today } from '@/src/utils/date';

const TODAY = '2026-11-09';

function check(over: Partial<ReviewCheck> = {}): ReviewCheck {
  return { goalReached: true, milestone: null, entryCount: 5, lastRequestedAt: null, today: TODAY, ...over };
}

describe('shouldRequestReview', () => {
  it('월 목표를 처음 달성한 저장이면 요청한다', () => {
    expect(shouldRequestReview(check())).toBe(true);
  });

  it('누적 이정표를 넘긴 저장이면 요청한다', () => {
    expect(shouldRequestReview(check({ goalReached: false, milestone: 100000 }))).toBe(true);
  });

  it('두 사건이 모두 없으면 요청하지 않는다', () => {
    expect(shouldRequestReview(check({ goalReached: false, milestone: null }))).toBe(false);
  });

  it('기록이 5건 미만이면 요청하지 않는다', () => {
    expect(shouldRequestReview(check({ entryCount: 4 }))).toBe(false);
    expect(shouldRequestReview(check({ entryCount: 5 }))).toBe(true);
  });

  it('마지막 요청 뒤 119일이면 쉬고 120일이면 다시 요청한다', () => {
    expect(shouldRequestReview(check({ lastRequestedAt: addDays(TODAY, -119) }))).toBe(false);
    expect(shouldRequestReview(check({ lastRequestedAt: addDays(TODAY, -120) }))).toBe(true);
  });

  it('요청한 날짜가 망가졌으면 요청한 적 없는 것으로 본다', () => {
    expect(shouldRequestReview(check({ lastRequestedAt: 'abc' }))).toBe(true);
  });

  it('요청한 날짜가 오늘보다 미래면(기기 시계 변경) 요청하지 않는다', () => {
    expect(shouldRequestReview(check({ lastRequestedAt: addDays(TODAY, 3) }))).toBe(false);
  });
});

describe('maybeRequestStoreReview', () => {
  const trigger = { goalReached: true, milestone: null };

  function addEntries(count: number) {
    for (let i = 0; i < count; i += 1) {
      addEntry({ date: today(), title: `기록${i}`, amount: 1000, categoryId: null, memo: null });
    }
  }

  beforeEach(() => {
    resetDatabaseConnection();
    initDatabase();
    jest.mocked(StoreReview.isAvailableAsync).mockReset().mockResolvedValue(true);
    jest.mocked(StoreReview.hasAction).mockReset().mockResolvedValue(true);
    jest.mocked(StoreReview.requestReview).mockReset().mockResolvedValue(undefined);
  });

  afterAll(() => resetDatabaseConnection());

  it('조건이 맞으면 요청하고 오늘 날짜를 적는다', async () => {
    addEntries(5);
    expect(getEntryCount()).toBe(5);
    await expect(maybeRequestStoreReview(trigger)).resolves.toBe(true);
    expect(StoreReview.requestReview).toHaveBeenCalledTimes(1);
    expect(getSetting(SETTING_KEYS.reviewRequestedAt)).toBe(today());
  });

  it('한 번 요청하면 120일 안에는 다시 요청하지 않는다', async () => {
    addEntries(5);
    await maybeRequestStoreReview(trigger);
    await expect(maybeRequestStoreReview(trigger)).resolves.toBe(false);
    expect(StoreReview.requestReview).toHaveBeenCalledTimes(1);
  });

  it('기록이 모자라면 네이티브를 부르지 않는다', async () => {
    addEntries(4);
    await expect(maybeRequestStoreReview(trigger)).resolves.toBe(false);
    expect(StoreReview.isAvailableAsync).not.toHaveBeenCalled();
    expect(getSetting(SETTING_KEYS.reviewRequestedAt)).toBeNull();
  });

  it.each([
    ['isAvailableAsync', StoreReview.isAvailableAsync],
    ['hasAction', StoreReview.hasAction],
  ])('%s 가 false 면 요청하지 않고 날짜도 적지 않는다', async (_, mock) => {
    addEntries(5);
    jest.mocked(mock).mockResolvedValue(false);
    await expect(maybeRequestStoreReview(trigger)).resolves.toBe(false);
    expect(StoreReview.requestReview).not.toHaveBeenCalled();
    expect(getSetting(SETTING_KEYS.reviewRequestedAt)).toBeNull();
  });

  it('네이티브가 실패해도 던지지 않는다', async () => {
    addEntries(5);
    jest.mocked(StoreReview.requestReview).mockRejectedValue(new Error('no'));
    await expect(maybeRequestStoreReview(trigger)).resolves.toBe(false);
  });

  it('이전 요청이 120일 지났으면 날짜를 새로 적는다', async () => {
    addEntries(5);
    setSetting(SETTING_KEYS.reviewRequestedAt, addDays(today(), -120));
    await expect(maybeRequestStoreReview(trigger)).resolves.toBe(true);
    expect(getSetting(SETTING_KEYS.reviewRequestedAt)).toBe(today());
  });
});
