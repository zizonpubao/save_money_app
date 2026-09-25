import {
  addEntry,
  getSetting,
  initDatabase,
  resetDatabaseConnection,
  setSetting,
  SETTING_KEYS,
  type EntryInput,
} from '@/src/db';
import { computeRange, useEntryStore } from '@/src/store/entryStore';
import { useSettingsStore } from '@/src/store/settingsStore';
import { addDays, addMonths, monthRange, thisMonth, today } from '@/src/utils/date';

// 설정 조회가 실패하는 경우를 흉내 내려고 getSetting 만 갈아 끼울 수 있게 감싼다. 평소엔 실제 함수 그대로.
jest.mock('@/src/db', () => {
  const actual = jest.requireActual<typeof import('@/src/db')>('@/src/db');
  return { ...actual, getSetting: jest.fn(actual.getSetting) };
});

const THIS_MONTH = thisMonth();
const LAST_MONTH = addMonths(THIS_MONTH, -1);
const TWO_MONTHS_AGO = addMonths(THIS_MONTH, -2);

function input(over: Partial<EntryInput> = {}): EntryInput {
  return {
    date: today(),
    title: '아메리카노',
    amount: 4500,
    categoryId: null,
    memo: null,
    ...over,
  };
}

/** 그 달의 1일. 이번 달이면 오늘이 1일이 아닐 수 있으므로 합계 테스트에 쓴다. */
function firstOf(month: string): string {
  return monthRange(month).start;
}

function lastOf(month: string): string {
  return monthRange(month).end;
}

describe('computeRange', () => {
  it('oldestMonth 1일부터 기준 달 말일까지다', () => {
    expect(computeRange('2026-07', '2026-09')).toEqual({
      start: '2026-07-01',
      end: '2026-09-30',
    });
  });

  it('기준 달을 생략하면 이번 달을 쓴다', () => {
    expect(computeRange(THIS_MONTH)).toEqual(monthRange(THIS_MONTH));
  });
});

describe('entryStore', () => {
  beforeEach(() => {
    resetDatabaseConnection();
    initDatabase();
    useEntryStore.setState({
      oldestMonth: THIS_MONTH,
      entries: [],
      todayTotal: 0,
      monthTotal: 0,
      hasMore: false,
      celebrateTick: 0,
      celebrateTier: 'base',
      celebratedAt: 0,
      lastRecord: null,
      goalReachedTick: 0,
      lastGoalReached: false,
      loaded: false,
      yesterdayTotal: 0,
      dailyTotals: [],
      monthEmojis: [],
      firstOpenTick: 0,
      streak: 0,
      totalSum: 0,
      lastMilestone: null,
      review: { month: '', count: 0, total: 0, topCategoryId: null },
      reviewDismissedMonth: null,
    });
  });

  afterAll(() => {
    resetDatabaseConnection();
  });

  describe('reload', () => {
    it('오늘 합계와 이번 달 합계를 따로 집계한다', () => {
      addEntry(input({ date: today(), amount: 4500 }));
      addEntry(input({ date: firstOf(THIS_MONTH), amount: 3000 }));
      useEntryStore.getState().reload();
      const { todayTotal, monthTotal } = useEntryStore.getState();
      expect(todayTotal).toBe(firstOf(THIS_MONTH) === today() ? 7500 : 4500);
      expect(monthTotal).toBe(7500);
    });

    it('지난달 기록은 이번 달 합계에 들어가지 않는다', () => {
      addEntry(input({ date: firstOf(LAST_MONTH), amount: 100000 }));
      addEntry(input({ date: today(), amount: 4500 }));
      useEntryStore.getState().reload();
      expect(useEntryStore.getState().monthTotal).toBe(4500);
    });

    it('기본 month 모드에서는 이번 달 기록만 목록에 담는다', () => {
      addEntry(input({ date: firstOf(LAST_MONTH), title: '지난달' }));
      addEntry(input({ date: today(), title: '이번달' }));
      useEntryStore.getState().reload();
      expect(useEntryStore.getState().entries.map((e) => e.title)).toEqual(['이번달']);
    });

    it('더 오래된 기록이 있으면 hasMore 가 true 다', () => {
      addEntry(input({ date: firstOf(LAST_MONTH) }));
      useEntryStore.getState().reload();
      expect(useEntryStore.getState().hasMore).toBe(true);
    });

    it('이번 달 기록밖에 없으면 hasMore 가 false 다', () => {
      addEntry(input({ date: today() }));
      useEntryStore.getState().reload();
      expect(useEntryStore.getState().hasMore).toBe(false);
    });
  });

  describe('add / update / remove', () => {
    it('add 하면 목록과 합계가 바로 갱신된다', () => {
      useEntryStore.getState().reload();
      useEntryStore.getState().add(input({ title: '라떼', amount: 5500 }));
      const { entries, monthTotal } = useEntryStore.getState();
      expect(entries.map((e) => e.title)).toEqual(['라떼']);
      expect(monthTotal).toBe(5500);
    });

    it('add 는 celebrateTick 을 1 올린다 (홈 카드 축하 이펙트 신호)', () => {
      useEntryStore.getState().reload();
      useEntryStore.getState().add(input());
      expect(useEntryStore.getState().celebrateTick).toBe(1);
    });

    it('update 하면 목록의 금액이 바뀐다', () => {
      const created = useEntryStore.getState().add(input({ amount: 4500 }));
      useEntryStore.getState().update(created.id, input({ amount: 9000 }));
      expect(useEntryStore.getState().entries[0]?.amount).toBe(9000);
      expect(useEntryStore.getState().monthTotal).toBe(9000);
    });

    it('update 는 celebrateTick 을 올리지 않는다 (수정은 새로 절약한 게 아님)', () => {
      const created = useEntryStore.getState().add(input({ amount: 4500 }));
      const tick = useEntryStore.getState().celebrateTick;
      useEntryStore.getState().update(created.id, input({ amount: 9000 }));
      expect(useEntryStore.getState().celebrateTick).toBe(tick);
    });

    it('remove 하면 목록에서 빠지고 합계가 줄어든다', () => {
      const created = useEntryStore.getState().add(input({ amount: 4500 }));
      useEntryStore.getState().add(input({ amount: 3000 }));
      useEntryStore.getState().remove(created.id);
      expect(useEntryStore.getState().entries).toHaveLength(1);
      expect(useEntryStore.getState().monthTotal).toBe(3000);
    });

    it('remove 는 celebrateTick 을 올리지 않는다', () => {
      const created = useEntryStore.getState().add(input());
      const tick = useEntryStore.getState().celebrateTick;
      useEntryStore.getState().remove(created.id);
      expect(useEntryStore.getState().celebrateTick).toBe(tick);
    });

    it('(M4) addDeferred 는 DB 에 바로 저장하고, 화면 반영(목록·합계·tick)은 publish 때 한다', () => {
      const { entry, publish } = useEntryStore.getState().addDeferred(input({ amount: 12000 }));
      expect(entry.id).toBeGreaterThan(0);
      // 시트가 내려가기 전: 스토어는 그대로
      expect(useEntryStore.getState()).toMatchObject({ entries: [], monthTotal: 0, celebrateTick: 0 });
      // DB 에는 이미 있어서 다시 읽으면 보인다 (앱이 그 사이 꺼져도 기록은 남는다)
      publish();
      expect(useEntryStore.getState()).toMatchObject({
        monthTotal: 12000,
        celebrateTick: 1,
        celebrateTier: 'mid',
      });
      expect(useEntryStore.getState().entries).toHaveLength(1);
    });
  });

  describe('금액 구간 이펙트 (M4 celebrateTier)', () => {
    it.each([
      [3999, 'base'],
      [4000, 'mid'],
      [19999, 'mid'],
      [20000, 'big'],
      [55000, 'big'],
    ] as const)('%i원 저장 → %s', (amount, tier) => {
      useEntryStore.getState().add(input({ amount }));
      expect(useEntryStore.getState().celebrateTier).toBe(tier);
      expect(useEntryStore.getState().celebratedAt).toBeGreaterThan(0);
    });

    it('수정 저장은 구간을 바꾸지 않는다 (이펙트 없음)', () => {
      const created = useEntryStore.getState().add(input({ amount: 3500 }));
      useEntryStore.getState().update(created.id, input({ amount: 60000 }));
      expect(useEntryStore.getState().celebrateTier).toBe('base');
    });
  });

  describe('개인 최고 갱신 (lastRecord)', () => {
    /** 지난달에 하루 10,000원짜리 날을 count 개 만든다 (비교 대상 만들기) */
    function seedLastMonth(days: string[]): void {
      days.forEach((date) => addEntry(input({ date, amount: 10000 })));
    }

    it('첫 기록은 비교 대상이 없어 최고로 치지 않는다', () => {
      useEntryStore.getState().add(input({ amount: 999999 }));
      expect(useEntryStore.getState().lastRecord).toBeNull();
    });

    it('역대 하루 최고를 넘기면 day 다', () => {
      // 지난달 두 날 = 월 합계 20,000 / 하루 최고 10,000
      seedLastMonth([firstOf(LAST_MONTH), lastOf(LAST_MONTH)]);
      useEntryStore.getState().add(input({ date: today(), amount: 15000 }));
      expect(useEntryStore.getState().lastRecord).toBe('day');
    });

    it('하루 최고와 동점이면 갱신이 아니다', () => {
      seedLastMonth([firstOf(LAST_MONTH), lastOf(LAST_MONTH)]);
      useEntryStore.getState().add(input({ date: today(), amount: 10000 }));
      expect(useEntryStore.getState().lastRecord).toBeNull();
    });

    it('하루와 한 달을 동시에 넘기면 월이 우선이다', () => {
      // 지난달 한 날 = 월 합계 10,000 / 하루 최고 10,000
      seedLastMonth([firstOf(LAST_MONTH)]);
      useEntryStore.getState().add(input({ date: today(), amount: 20000 }));
      expect(useEntryStore.getState().lastRecord).toBe('month');
    });

    it('하루 최고를 이미 넘긴 뒤 같은 날 또 저장하면 다시 뜨지 않는다', () => {
      seedLastMonth([firstOf(LAST_MONTH), lastOf(LAST_MONTH)]);
      useEntryStore.getState().add(input({ date: today(), amount: 15000 }));
      expect(useEntryStore.getState().lastRecord).toBe('day');

      useEntryStore.getState().add(input({ date: today(), amount: 1000 }));
      expect(useEntryStore.getState().lastRecord).toBeNull();
    });

    it('월 최고를 이미 넘긴 뒤 또 저장하면 다시 뜨지 않는다', () => {
      seedLastMonth([firstOf(LAST_MONTH)]);
      useEntryStore.getState().add(input({ date: today(), amount: 20000 }));
      expect(useEntryStore.getState().lastRecord).toBe('month');

      useEntryStore.getState().add(input({ date: today(), amount: 1000 }));
      expect(useEntryStore.getState().lastRecord).toBeNull();
    });

    it('과거 날짜로 넣은 기록은 축하하지 않는다', () => {
      seedLastMonth([firstOf(LAST_MONTH), lastOf(LAST_MONTH)]);
      useEntryStore.getState().add(input({ date: firstOf(TWO_MONTHS_AGO), amount: 999999 }));
      expect(useEntryStore.getState().lastRecord).toBeNull();
    });

    it('수정·삭제는 lastRecord 를 지운다', () => {
      seedLastMonth([firstOf(LAST_MONTH)]);
      const created = useEntryStore.getState().add(input({ date: today(), amount: 20000 }));
      expect(useEntryStore.getState().lastRecord).toBe('month');

      useEntryStore.getState().update(created.id, input({ date: today(), amount: 30000 }));
      expect(useEntryStore.getState().lastRecord).toBeNull();

      useEntryStore.getState().remove(created.id);
      expect(useEntryStore.getState().lastRecord).toBeNull();
    });
  });

  describe('월 목표 달성 (M3.5)', () => {
    function setGoal(goal: number): void {
      setSetting(SETTING_KEYS.monthlyGoal, String(goal));
    }

    it('이번 저장으로 목표를 처음 넘기면 goalReachedTick 이 오르고 이번 달을 축하한 달로 기록한다', () => {
      setGoal(10000);
      useEntryStore.getState().add(input({ amount: 4500 }));
      expect(useEntryStore.getState()).toMatchObject({ goalReachedTick: 0, lastGoalReached: false });

      useEntryStore.getState().add(input({ amount: 6000 }));
      expect(useEntryStore.getState()).toMatchObject({ goalReachedTick: 1, lastGoalReached: true });
      expect(getSetting(SETTING_KEYS.goalReachedMonth)).toBe(THIS_MONTH);
    });

    it('목표와 딱 같아지는 저장도 달성이다', () => {
      setGoal(10000);
      useEntryStore.getState().add(input({ amount: 10000 }));
      expect(useEntryStore.getState().lastGoalReached).toBe(true);
    });

    it('이미 넘긴 뒤 더 쌓는 저장은 다시 축하하지 않는다 (월 1회)', () => {
      setGoal(10000);
      useEntryStore.getState().add(input({ amount: 12000 }));
      useEntryStore.getState().add(input({ amount: 1000 }));
      expect(useEntryStore.getState()).toMatchObject({ goalReachedTick: 1, lastGoalReached: false });
    });

    it('이번 달 축하 기록이 남아 있으면(목표 그대로) 새로 넘어도 다시 뜨지 않는다', () => {
      setSetting(SETTING_KEYS.goalReachedMonth, THIS_MONTH);
      setGoal(10000);
      useEntryStore.getState().add(input({ amount: 12000 }));
      expect(useEntryStore.getState()).toMatchObject({ goalReachedTick: 0, lastGoalReached: false });
    });

    it('목표를 올린 뒤 다시 넘기면 새 목표로 다시 축하한다', () => {
      useSettingsStore.getState().setGoal(10000);
      useEntryStore.getState().add(input({ amount: 12000 }));
      expect(useEntryStore.getState().goalReachedTick).toBe(1);

      useSettingsStore.getState().setGoal(20000);
      useEntryStore.getState().add(input({ amount: 9000 }));
      expect(useEntryStore.getState()).toMatchObject({ goalReachedTick: 2, lastGoalReached: true });
      expect(getSetting(SETTING_KEYS.goalReachedMonth)).toBe(THIS_MONTH);
    });

    it('이미 넘긴 금액보다 낮은 목표로 바꾸면 이펙트 없이 초과만 된다', () => {
      useSettingsStore.getState().setGoal(10000);
      useEntryStore.getState().add(input({ amount: 12000 }));

      useSettingsStore.getState().setGoal(5000);
      useEntryStore.getState().add(input({ amount: 1000 }));
      expect(useEntryStore.getState()).toMatchObject({ goalReachedTick: 1, lastGoalReached: false });
    });

    it('설정 조회가 실패해도 저장은 성공하고 축하만 건너뛴다', () => {
      setGoal(10000);
      jest.mocked(getSetting).mockImplementation(() => {
        throw new Error('settings 조회 실패');
      });
      try {
        const created = useEntryStore.getState().add(input({ amount: 12000 }));
        expect(created.amount).toBe(12000);
        expect(useEntryStore.getState()).toMatchObject({
          monthTotal: 12000,
          celebrateTick: 1,
          goalReachedTick: 0,
          lastGoalReached: false,
        });
      } finally {
        jest.mocked(getSetting).mockImplementation(
          jest.requireActual<typeof import('@/src/db')>('@/src/db').getSetting,
        );
      }
    });

    it('지난달에 축하한 기록은 이번 달 달성을 막지 않는다', () => {
      setSetting(SETTING_KEYS.goalReachedMonth, LAST_MONTH);
      setGoal(10000);
      useEntryStore.getState().add(input({ amount: 12000 }));
      expect(useEntryStore.getState().lastGoalReached).toBe(true);
    });

    it('목표가 없으면 아무리 많이 저장해도 달성이 아니다', () => {
      useEntryStore.getState().add(input({ amount: 999999 }));
      expect(useEntryStore.getState()).toMatchObject({ goalReachedTick: 0, lastGoalReached: false });
      expect(getSetting(SETTING_KEYS.goalReachedMonth)).toBeNull();
    });

    it('지난달 날짜로 넣은 기록은 이번 달 목표를 채우지 않는다', () => {
      setGoal(10000);
      useEntryStore.getState().add(input({ date: firstOf(LAST_MONTH), amount: 50000 }));
      expect(useEntryStore.getState().lastGoalReached).toBe(false);
    });

    it('수정으로 목표를 넘겨도 이펙트가 없다 (수정은 새로 절약한 게 아님)', () => {
      setGoal(10000);
      const created = useEntryStore.getState().add(input({ amount: 4500 }));
      useEntryStore.getState().update(created.id, input({ amount: 20000 }));
      expect(useEntryStore.getState()).toMatchObject({ goalReachedTick: 0, lastGoalReached: false });
    });

    it('수정·삭제는 lastGoalReached 를 지운다 (tick 은 그대로)', () => {
      setGoal(10000);
      const created = useEntryStore.getState().add(input({ amount: 12000 }));
      expect(useEntryStore.getState().lastGoalReached).toBe(true);
      useEntryStore.getState().remove(created.id);
      expect(useEntryStore.getState()).toMatchObject({ goalReachedTick: 1, lastGoalReached: false });
    });
  });

  describe('loadMore', () => {
    it('한 번 부르면 지난달 기록이 목록에 붙는다', () => {
      addEntry(input({ date: firstOf(LAST_MONTH), title: '지난달' }));
      addEntry(input({ date: today(), title: '이번달' }));
      useEntryStore.getState().reload();
      useEntryStore.getState().loadMore();
      expect(useEntryStore.getState().entries.map((e) => e.title)).toEqual(['이번달', '지난달']);
      expect(useEntryStore.getState().oldestMonth).toBe(LAST_MONTH);
    });

    it('두 번 부르면 두 달 전까지 붙고 더 볼 게 없으면 hasMore 가 false 가 된다', () => {
      addEntry(input({ date: firstOf(TWO_MONTHS_AGO), title: '두달전' }));
      useEntryStore.getState().reload();
      useEntryStore.getState().loadMore();
      useEntryStore.getState().loadMore();
      expect(useEntryStore.getState().entries.map((e) => e.title)).toEqual(['두달전']);
      expect(useEntryStore.getState().hasMore).toBe(false);
    });

    it('더 볼 기록이 없으면 아무 일도 하지 않는다', () => {
      addEntry(input({ date: today() }));
      useEntryStore.getState().reload();
      useEntryStore.getState().loadMore();
      expect(useEntryStore.getState().oldestMonth).toBe(THIS_MONTH);
    });
  });

  describe('홈 활기 데이터 (M3.6)', () => {
    it('reload 는 어제 합계·이번 달 일별 합계·이모지를 함께 읽고 loaded 가 된다', () => {
      const coffee = addEntry(input({ date: today(), amount: 4500, categoryId: 1 }));
      addEntry(input({ date: addDays(today(), -1), amount: 3000 }));
      useEntryStore.getState().reload();
      const s = useEntryStore.getState();
      expect(s.loaded).toBe(true);
      expect(s.yesterdayTotal).toBe(3000);
      expect(s.dailyTotals).toContainEqual({ date: today(), total: 4500 });
      expect(s.monthEmojis.map((e) => e.id)).toContain(coffee.id);
    });

    it('저장하면 새 이모지가 목록 끝에 붙고, 삭제하면 빠진다 (같은 재조회 경로)', () => {
      useEntryStore.getState().reload();
      const first = useEntryStore.getState().add(input({ categoryId: 1 }));
      const second = useEntryStore.getState().add(input({ categoryId: null }));
      expect(useEntryStore.getState().monthEmojis.map((e) => e.id)).toEqual([first.id, second.id]);
      expect(useEntryStore.getState().monthEmojis.at(-1)?.emoji).toBe('📦');
      useEntryStore.getState().remove(second.id);
      expect(useEntryStore.getState().monthEmojis.map((e) => e.id)).toEqual([first.id]);
    });
  });

  describe('연속 기록일 · 누적 (M4)', () => {
    it('reload 는 연속 기록일과 누적 합계를 함께 읽는다', () => {
      addEntry(input({ date: addDays(today(), -1), amount: 3000 }));
      addEntry(input({ date: addDays(today(), -2), amount: 4000 }));
      addEntry(input({ date: firstOf(TWO_MONTHS_AGO), amount: 100000 }));
      useEntryStore.getState().reload();
      // 오늘 기록이 없어도 어제까지 이어졌으면 유지
      expect(useEntryStore.getState().streak).toBe(2);
      expect(useEntryStore.getState().totalSum).toBe(107000);
    });

    it('오늘 저장하면 연속 기록일이 늘어난다', () => {
      addEntry(input({ date: addDays(today(), -1) }));
      useEntryStore.getState().reload();
      useEntryStore.getState().add(input({ date: today() }));
      expect(useEntryStore.getState().streak).toBe(2);
    });
  });

  describe('누적 이정표 (M4)', () => {
    it('10만원을 처음 넘는 저장에서 이정표를 알리고 settings 에 적는다', () => {
      addEntry(input({ date: firstOf(LAST_MONTH), amount: 95500 }));
      useEntryStore.getState().add(input({ amount: 4000 }));
      expect(useEntryStore.getState().lastMilestone).toBeNull();
      useEntryStore.getState().add(input({ amount: 500 }));
      expect(useEntryStore.getState().lastMilestone).toBe(100000);
      expect(getSetting(SETTING_KEYS.milestoneReached)).toBe('100000');
      // 이미 넘은 뒤 더 쌓는 저장은 조용히
      useEntryStore.getState().add(input({ amount: 500 }));
      expect(useEntryStore.getState().lastMilestone).toBeNull();
    });

    it('지워서 누적이 줄었다가 다시 넘어도 재축하하지 않는다', () => {
      const big = useEntryStore.getState().add(input({ amount: 100000 }));
      expect(useEntryStore.getState().lastMilestone).toBe(100000);
      useEntryStore.getState().remove(big.id);
      expect(useEntryStore.getState().lastMilestone).toBeNull();
      useEntryStore.getState().add(input({ amount: 120000 }));
      expect(useEntryStore.getState().lastMilestone).toBeNull();
    });

    it('한 번에 여러 이정표를 넘으면 가장 큰 것 하나만 적는다', () => {
      useEntryStore.getState().add(input({ amount: 1200000 }));
      expect(useEntryStore.getState().lastMilestone).toBe(1000000);
      expect(getSetting(SETTING_KEYS.milestoneReached)).toBe('1000000');
    });

    it('수정은 이정표를 알리지 않는다', () => {
      const created = useEntryStore.getState().add(input({ amount: 4500 }));
      useEntryStore.getState().update(created.id, input({ amount: 200000 }));
      expect(useEntryStore.getState().lastMilestone).toBeNull();
      expect(getSetting(SETTING_KEYS.milestoneReached)).toBeNull();
    });
  });

  describe('지난달 회고 재료 (M4)', () => {
    it('reload 는 지난달 건수·합계·금액 1위 카테고리를 읽는다', () => {
      addEntry(input({ date: firstOf(LAST_MONTH), amount: 4500, categoryId: 1 }));
      addEntry(input({ date: lastOf(LAST_MONTH), amount: 4500, categoryId: 1 }));
      addEntry(input({ date: lastOf(LAST_MONTH), amount: 6000, categoryId: 2 }));
      addEntry(input({ date: today(), amount: 50000, categoryId: 2 }));
      useEntryStore.getState().reload();
      expect(useEntryStore.getState().review).toEqual({
        month: LAST_MONTH,
        count: 3,
        total: 15000,
        topCategoryId: 1,
      });
    });

    it('지난달 기록이 없으면 0건', () => {
      addEntry(input({ date: today() }));
      useEntryStore.getState().reload();
      expect(useEntryStore.getState().review).toMatchObject({ month: LAST_MONTH, count: 0 });
    });

    it('dismissReview 는 지난달을 닫은 달로 적고, 다시 읽어도 유지된다', () => {
      useEntryStore.getState().dismissReview();
      expect(useEntryStore.getState().reviewDismissedMonth).toBe(LAST_MONTH);
      expect(getSetting(SETTING_KEYS.reviewDismissedMonth)).toBe(LAST_MONTH);
      useEntryStore.setState({ reviewDismissedMonth: null });
      useEntryStore.getState().reload();
      expect(useEntryStore.getState().reviewDismissedMonth).toBe(LAST_MONTH);
    });
  });

  describe('openHome — 하루 첫 오픈 (M3.6)', () => {
    it('last_open_date 키가 없으면(첫 설치) 첫 오픈: 카운트업 신호가 오르고 오늘 날짜를 적는다', () => {
      expect(getSetting(SETTING_KEYS.lastOpenDate)).toBeNull();
      useEntryStore.getState().openHome();
      expect(useEntryStore.getState().firstOpenTick).toBe(1);
      expect(useEntryStore.getState().loaded).toBe(true);
      expect(getSetting(SETTING_KEYS.lastOpenDate)).toBe(today());
    });

    it('같은 날 다시 포커스하면 카운트업 신호가 그대로다', () => {
      useEntryStore.getState().openHome();
      useEntryStore.getState().openHome();
      expect(useEntryStore.getState().firstOpenTick).toBe(1);
    });

    it('마지막 오픈이 어제면 첫 오픈으로 보고 오늘로 바꿔 적는다', () => {
      setSetting(SETTING_KEYS.lastOpenDate, addDays(today(), -1));
      useEntryStore.getState().openHome();
      expect(useEntryStore.getState().firstOpenTick).toBe(1);
      expect(getSetting(SETTING_KEYS.lastOpenDate)).toBe(today());
    });

    it('오늘 이미 열었으면(앱 재시작) 카운트업 없이 합계만 읽는다', () => {
      setSetting(SETTING_KEYS.lastOpenDate, today());
      addEntry(input({ amount: 7000 }));
      useEntryStore.getState().openHome();
      expect(useEntryStore.getState()).toMatchObject({ firstOpenTick: 0, monthTotal: 7000 });
    });
  });
});
