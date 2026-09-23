import { addEntry, initDatabase, resetDatabaseConnection, type EntryInput } from '@/src/db';
import { computeRange, useEntryStore } from '@/src/store/entryStore';
import { addMonths, monthRange, thisMonth, today } from '@/src/utils/date';

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
  it('month 모드는 oldestMonth 1일부터 기준 달 말일까지다', () => {
    expect(computeRange('month', '2026-07', '2026-09')).toEqual({
      start: '2026-07-01',
      end: '2026-09-30',
    });
  });

  it('year 모드는 기준 달이 속한 해 전체다', () => {
    expect(computeRange('year', '2026-07', '2026-09')).toEqual({
      start: '2026-01-01',
      end: '2026-12-31',
    });
  });

  it('기준 달을 생략하면 이번 달을 쓴다', () => {
    expect(computeRange('month', THIS_MONTH)).toEqual(monthRange(THIS_MONTH));
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
      lastRecord: null,
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
});
