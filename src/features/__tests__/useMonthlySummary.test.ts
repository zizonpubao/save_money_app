import { act, renderHook } from '@testing-library/react-native';

import { addEntry, initDatabase, resetDatabaseConnection, type EntryInput } from '@/src/db';
import { useMonthlySummary } from '@/src/features/useMonthlySummary';
import { useCategoryStore } from '@/src/store/categoryStore';
import {
  addMonths,
  addYears,
  daysInMonth,
  monthOfYear,
  monthRange,
  thisMonth,
  thisYear,
  toYear,
  today,
} from '@/src/utils/date';

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
const THIS_YEAR = thisYear();
const LAST_YEAR = addYears(THIS_YEAR, -1);
/** 올해 1월 1일 — 항상 오늘 이전이라 올해 기록으로 안전하게 쓸 수 있다 */
const NEW_YEAR = `${THIS_YEAR}-01-01`;

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

    it('지난달로 옮기면 막대 칸 수와 목록이 그 달 것으로 바뀐다', async () => {
      addEntry(input({ date: today(), amount: 4500 }));
      addEntry(input({ date: firstOf(LAST_MONTH), amount: 10000 }));
      const { result } = await setup();
      await act(() => result.current.goPrev());
      expect(result.current.bars).toHaveLength(daysInMonth(LAST_MONTH));
      expect(result.current.bars[0]?.total).toBe(10000);
      expect(result.current.sections.map((s) => s.key)).toEqual([firstOf(LAST_MONTH)]);
    });

    it('지난달로 옮기면 하루 평균은 그 달 전체 일수로 나눈다', async () => {
      addEntry(input({ date: firstOf(LAST_MONTH), amount: 90000 }));
      const { result } = await setup();
      await act(() => result.current.goPrev());
      expect(result.current.average).toBe(Math.round(90000 / daysInMonth(LAST_MONTH)));
    });

    it('이전 달에 갔다가 다음 달로 돌아오면 이번 달 데이터로 돌아온다', async () => {
      addEntry(input({ date: today(), amount: 4500 }));
      addEntry(input({ date: firstOf(LAST_MONTH), amount: 10000 }));
      const { result } = await setup();
      await act(() => result.current.goPrev());
      await act(() => result.current.goNext());
      expect(result.current.month).toBe(THIS_MONTH);
      expect(result.current.total).toBe(4500);
      expect(result.current.canNext).toBe(false);
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

  describe('년 모드 (RangeToggle)', () => {
    it('년으로 바꾸면 막대 12개 · 월별 섹션이 된다', async () => {
      addEntry(input({ date: NEW_YEAR, amount: 1000 }));
      addEntry(input({ date: today(), amount: 4500 }));
      const { result } = await setup();
      await act(() => result.current.setMode('year'));

      expect(result.current.mode).toBe('year');
      expect(result.current.period).toBe(THIS_YEAR);
      expect(result.current.bars).toHaveLength(12);
      expect(result.current.bars.map((b) => b.label)).toEqual(
        Array.from({ length: 12 }, (_, i) => `${i + 1}월`),
      );
      // 섹션 key 가 'YYYY-MM' 이면 EntrySectionHeader 가 월 헤더로 그린다
      expect(result.current.sections.every((sec) => sec.key.length === 'YYYY-MM'.length)).toBe(true);
      expect(result.current.sections.map((sec) => sec.key)).toContain(`${THIS_YEAR}-01`);
    });

    it('년 요약은 그 해 전체 합계·건수이고 지난해 기록은 섞이지 않는다', async () => {
      addEntry(input({ date: NEW_YEAR, amount: 1000 }));
      addEntry(input({ date: today(), amount: 4500 }));
      addEntry(input({ date: `${LAST_YEAR}-12-31`, amount: 99000 }));
      const { result } = await setup();
      await act(() => result.current.setMode('year'));
      expect(result.current.total).toBe(5500);
      expect(result.current.count).toBe(2);
    });

    it('올해 월 평균은 이번 달까지 경과 개월 수로 나눈다', async () => {
      addEntry(input({ date: NEW_YEAR, amount: 120000 }));
      const { result } = await setup();
      await act(() => result.current.setMode('year'));
      expect(result.current.average).toBe(Math.round(120000 / monthOfYear(today())));
    });

    it('카테고리별 합계도 그 해 전체로 센다', async () => {
      addEntry(input({ date: NEW_YEAR, amount: 1000 }));
      addEntry(input({ date: today(), amount: 4500 }));
      const { result } = await setup();
      await act(() => result.current.setMode('year'));
      expect(result.current.categoryRows.map((r) => r.total)).toEqual([5500]);
    });

    it('지난해 기록이 있으면 이전 해로 가고, 지난해 월 평균은 12로 나눈다', async () => {
      addEntry(input({ date: `${LAST_YEAR}-06-15`, amount: 120000 }));
      const { result } = await setup();
      await act(() => result.current.setMode('year'));
      expect(result.current.canPrev).toBe(true);
      expect(result.current.canNext).toBe(false);

      await act(() => result.current.goPrev());
      expect(result.current.year).toBe(LAST_YEAR);
      expect(result.current.total).toBe(120000);
      expect(result.current.average).toBe(10000);
      expect(result.current.bars[5]?.total).toBe(120000);
      expect(result.current.bars[5]?.isMax).toBe(true);
      expect(result.current.canPrev).toBe(false);
      expect(result.current.canNext).toBe(true);
    });

    it('가장 오래된 해보다 앞으로, 올해보다 뒤로는 가지 않는다', async () => {
      addEntry(input({ date: `${LAST_YEAR}-06-15` }));
      const { result } = await setup();
      await act(() => result.current.setMode('year'));
      await act(() => result.current.goNext());
      expect(result.current.year).toBe(THIS_YEAR);

      await act(() => result.current.goPrev());
      await act(() => result.current.goPrev());
      expect(result.current.year).toBe(LAST_YEAR);
    });

    it('기록이 없는 해는 isEmpty 이고 막대는 12개 모두 0, 카테고리·목록은 비어 있다', async () => {
      addEntry(input({ date: `${LAST_YEAR}-06-15` }));
      const { result } = await setup();
      await act(() => result.current.setMode('year'));
      expect(result.current.isEmpty).toBe(true);
      expect(result.current.bars).toHaveLength(12);
      expect(result.current.bars.every((b) => b.total === 0)).toBe(true);
      expect(result.current.categoryRows).toEqual([]);
      expect(result.current.sections).toEqual([]);
    });

    it('보던 달의 해로 들어가고, 월로 돌아오면 보던 달로 돌아온다', async () => {
      addEntry(input({ date: firstOf(TWO_MONTHS_AGO) }));
      const { result } = await setup();
      await act(() => result.current.goPrev());
      await act(() => result.current.goPrev());
      await act(() => result.current.setMode('year'));
      expect(result.current.year).toBe(toYear(TWO_MONTHS_AGO));

      await act(() => result.current.setMode('month'));
      expect(result.current.mode).toBe('month');
      expect(result.current.month).toBe(TWO_MONTHS_AGO);
      expect(result.current.bars).toHaveLength(daysInMonth(TWO_MONTHS_AGO));
    });

    it('지난해로 옮긴 뒤 월로 돌아오면 그 해 12월을 보여준다', async () => {
      addEntry(input({ date: `${LAST_YEAR}-06-15` }));
      const { result } = await setup();
      await act(() => result.current.setMode('year'));
      await act(() => result.current.goPrev());
      await act(() => result.current.setMode('month'));
      expect(result.current.month).toBe(`${LAST_YEAR}-12`);
      // 날짜별 섹션으로 돌아온다 (12월엔 기록이 없어 비어 있음)
      expect(result.current.sections).toEqual([]);
    });

    it('같은 모드를 다시 누르면 아무 일도 없다 (보던 기간·데이터 그대로)', async () => {
      addEntry(input({ date: firstOf(LAST_MONTH) }));
      const { result } = await setup();
      await act(() => result.current.goPrev());
      const barsBefore = result.current.bars;

      await act(() => result.current.setMode('month'));
      expect(result.current.mode).toBe('month');
      expect(result.current.month).toBe(LAST_MONTH);
      // 상태를 건드리지 않았으므로 막대 배열도 같은 참조 그대로다
      expect(result.current.bars).toBe(barsBefore);

      await act(() => result.current.setMode('year'));
      const yearBars = result.current.bars;
      await act(() => result.current.setMode('year'));
      expect(result.current.year).toBe(toYear(LAST_MONTH));
      expect(result.current.bars).toBe(yearBars);
    });

    it('년 모드에서 삭제하면 그 해 합계가 바로 줄어든다', async () => {
      const created = addEntry(input({ date: NEW_YEAR, amount: 1000 }));
      addEntry(input({ date: today(), amount: 4500 }));
      const { result } = await setup();
      await act(() => result.current.setMode('year'));
      await act(() => result.current.remove(created.id));
      expect(result.current.mode).toBe('year');
      expect(result.current.total).toBe(4500);
    });
  });
});
