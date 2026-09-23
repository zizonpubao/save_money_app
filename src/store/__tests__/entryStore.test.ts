import { addEntry, initDatabase, resetDatabaseConnection, type EntryInput } from '@/src/db';
import { useEntryStore } from '@/src/store/entryStore';
import { addMonths, monthRange, thisMonth, thisYear, today } from '@/src/utils/date';

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

describe('entryStore', () => {
  beforeEach(() => {
    resetDatabaseConnection();
    initDatabase();
    useEntryStore.setState({
      mode: 'month',
      oldestMonth: THIS_MONTH,
      entries: [],
      todayTotal: 0,
      monthTotal: 0,
      hasMore: false,
      celebrateTick: 0,
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

  describe('월 / 년 전환', () => {
    it('year 모드로 바꾸면 올해 전체 기록이 들어온다', () => {
      addEntry(input({ date: `${thisYear()}-01-01`, title: '연초' }));
      addEntry(input({ date: today(), title: '오늘' }));
      useEntryStore.getState().reload();
      useEntryStore.getState().setMode('year');
      expect(useEntryStore.getState().entries.map((e) => e.title)).toEqual(
        expect.arrayContaining(['연초', '오늘']),
      );
    });

    it('year 모드에서는 hasMore 가 false 다 ("이전 달 더 보기" 없음)', () => {
      addEntry(input({ date: firstOf(LAST_MONTH) }));
      useEntryStore.getState().reload();
      useEntryStore.getState().setMode('year');
      expect(useEntryStore.getState().hasMore).toBe(false);
    });

    it('month 로 되돌리면 oldestMonth 가 이번 달로 초기화된다', () => {
      addEntry(input({ date: firstOf(LAST_MONTH) }));
      useEntryStore.getState().reload();
      useEntryStore.getState().loadMore();
      useEntryStore.getState().setMode('year');
      useEntryStore.getState().setMode('month');
      expect(useEntryStore.getState().oldestMonth).toBe(THIS_MONTH);
    });

    it('같은 모드로 다시 바꾸면 아무 일도 하지 않는다', () => {
      addEntry(input({ date: firstOf(LAST_MONTH) }));
      useEntryStore.getState().reload();
      useEntryStore.getState().loadMore();
      useEntryStore.getState().setMode('month');
      expect(useEntryStore.getState().oldestMonth).toBe(LAST_MONTH);
    });

    it('year 모드에서도 이번 달 합계는 이번 달만 센다', () => {
      addEntry(input({ date: `${thisYear()}-01-01`, amount: 100000 }));
      addEntry(input({ date: today(), amount: 4500 }));
      useEntryStore.getState().setMode('year');
      expect(useEntryStore.getState().monthTotal).toBe(
        `${thisYear()}-01-01` === today() ? 104500 : 4500,
      );
    });
  });
});
