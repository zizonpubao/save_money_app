import { act, renderHook } from '@testing-library/react-native';

import { addEntry, initDatabase, resetDatabaseConnection, type EntryInput } from '@/src/db';
import { useMonthlySummary } from '@/src/features/useMonthlySummary';
import { useCategoryStore } from '@/src/store/categoryStore';
import { addMonths, monthRange, thisMonth, today } from '@/src/utils/date';

// 네비게이터 밖에서 훅을 돌리기 위해 포커스 효과를 평범한 useEffect 로 대체한다.
jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void | (() => void)) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('react').useEffect(callback, [callback]);
  },
}));

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

function firstOf(month: string): string {
  return monthRange(month).start;
}

/** renderHook 은 React 19 의 act 결과를 돌려주므로 await 로 풀어 쓴다 (useEntryForm 테스트와 동일). */
async function setup() {
  return renderHook(() => useMonthlySummary());
}

describe('useMonthlySummary', () => {
  beforeEach(() => {
    resetDatabaseConnection();
    initDatabase();
    useCategoryStore.setState({ categories: [], loaded: false });
  });

  afterAll(() => {
    resetDatabaseConnection();
  });

  describe('월 이동 경계', () => {
    it('이번 달에서 시작한다', async () => {
      const { result } = await setup();
      expect(result.current.month).toBe(THIS_MONTH);
    });

    it('기록이 없으면 이전·다음 달 모두 막힌다', async () => {
      const { result } = await setup();
      expect(result.current.canPrev).toBe(false);
      expect(result.current.canNext).toBe(false);
    });

    it('이번 달 기록만 있으면 이전 달로 갈 수 없다', async () => {
      addEntry(input({ date: today() }));
      const { result } = await setup();
      expect(result.current.canPrev).toBe(false);
    });

    it('지난달 기록이 있으면 이전 달로 갈 수 있고, 가면 다음 달이 열린다', async () => {
      addEntry(input({ date: firstOf(LAST_MONTH) }));
      const { result } = await setup();
      expect(result.current.canPrev).toBe(true);
      expect(result.current.canNext).toBe(false);

      await act(() => result.current.goPrev());
      expect(result.current.month).toBe(LAST_MONTH);
      expect(result.current.canPrev).toBe(false);
      expect(result.current.canNext).toBe(true);
    });

    it('가장 오래된 달에 닿으면 더 이상 뒤로 가지 않는다', async () => {
      addEntry(input({ date: firstOf(TWO_MONTHS_AGO) }));
      const { result } = await setup();
      await act(() => result.current.goPrev());
      await act(() => result.current.goPrev());
      expect(result.current.month).toBe(TWO_MONTHS_AGO);

      await act(() => result.current.goPrev());
      expect(result.current.month).toBe(TWO_MONTHS_AGO);
    });

    it('이번 달에서 다음 달로는 가지 않는다 (미래 불가)', async () => {
      addEntry(input({ date: today() }));
      const { result } = await setup();
      await act(() => result.current.goNext());
      expect(result.current.month).toBe(THIS_MONTH);
    });
  });

  describe('데이터', () => {
    it('보고 있는 달의 합계·건수만 센다', async () => {
      addEntry(input({ date: today(), amount: 4500 }));
      addEntry(input({ date: firstOf(LAST_MONTH), amount: 10000 }));
      const { result } = await setup();
      expect(result.current.total).toBe(4500);
      expect(result.current.count).toBe(1);
      expect(result.current.isEmpty).toBe(false);

      await act(() => result.current.goPrev());
      expect(result.current.total).toBe(10000);
      expect(result.current.count).toBe(1);
    });

    it('기록이 없는 달은 isEmpty 이고 막대는 모두 0이다', async () => {
      addEntry(input({ date: firstOf(LAST_MONTH), amount: 10000 }));
      const { result } = await setup();
      expect(result.current.isEmpty).toBe(true);
      expect(result.current.bars.every((b) => b.total === 0)).toBe(true);
      expect(result.current.categoryRows).toEqual([]);
      expect(result.current.sections).toEqual([]);
    });

    it('목록은 날짜별 섹션으로 묶인다', async () => {
      addEntry(input({ date: firstOf(THIS_MONTH), title: '첫날', amount: 1000 }));
      addEntry(input({ date: firstOf(THIS_MONTH), title: '첫날2', amount: 2000 }));
      const { result } = await setup();
      const firstSection = result.current.sections[0];
      expect(firstSection?.key).toBe(firstOf(THIS_MONTH));
      expect(firstSection?.total).toBe(3000);
    });

    it('삭제하면 합계와 목록이 바로 줄어든다', async () => {
      const created = addEntry(input({ date: today(), amount: 4500 }));
      const { result } = await setup();
      expect(result.current.total).toBe(4500);

      await act(() => result.current.remove(created.id));
      expect(result.current.total).toBe(0);
      expect(result.current.sections).toEqual([]);
    });
  });
});
