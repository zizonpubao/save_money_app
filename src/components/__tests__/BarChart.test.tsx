import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { StyleSheet } from 'react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { BarChart, indexAtX } from '@/src/components/BarChart';
import type { DailyTotal, MonthlyTotal } from '@/src/db';
import {
  axisDays,
  buildDailyBars,
  buildMonthlyBars,
  toDailyChartBars,
  toMonthlyChartBars,
} from '@/src/features/monthlyStats';
import { lightColors, size } from '@/src/theme';

jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(() => Promise.resolve()) }));

/**
 * 좌표 계산이 딱 떨어지게 칸 폭을 10pt 로 맞춘다 (31칸 → 310, 12칸 → 120).
 * 레이아웃: 툴팁 줄 0~TRACK_TOP, 막대 줄 TRACK_TOP~TRACK_BOTTOM, 그 아래 축 라벨 줄.
 */
const COL = 10;
const TRACK_TOP = 28;
const TRACK_BOTTOM = TRACK_TOP + 120;
const IN_TRACK_Y = 100;
const AXIS_Y = TRACK_BOTTOM + 8;

/** jest 에는 실제 레이아웃이 없으므로 onLayout 을 직접 흘려 넣는다 */
async function layout(count: number) {
  await fireEvent(screen.getByTestId('barchart'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: count * COL, height: 200 } },
  });
  await fireEvent(screen.getByTestId('barchart-track'), 'layout', {
    nativeEvent: { layout: { x: 0, y: TRACK_TOP, width: count * COL, height: 120 } },
  });
}

/** 칸 번호(0부터)의 가운데 x */
const xOf = (index: number) => index * COL + COL / 2;

async function tap(x: number, y: number = IN_TRACK_Y) {
  await act(async () => {
    fireGestureHandler(getByGestureTestId('barchart-tap'), [
      { state: State.BEGAN, x, y },
      { state: State.ACTIVE, x, y },
      { state: State.END, x, y },
    ]);
  });
}

/** 누른 채 xs 순서대로 좌우로 쓸고 뗀다 */
async function scrub(xs: number[]) {
  const [first, ...rest] = xs;
  await act(async () => {
    fireGestureHandler(getByGestureTestId('barchart-pan'), [
      { state: State.BEGAN, x: first, y: IN_TRACK_Y },
      { state: State.ACTIVE, x: first, y: IN_TRACK_Y },
      ...rest.map((x) => ({ x, y: IN_TRACK_Y })),
      { state: State.END, x: xs[xs.length - 1], y: IN_TRACK_Y },
    ]);
  });
}

/** 실제 화면과 같은 경로(buildDailyBars/axisDays → toDailyChartBars)로 props 를 만든다. 2026-01 은 31일. */
async function renderChart(month: string, totals: DailyTotal[] = []) {
  const bars = toDailyChartBars(buildDailyBars(month, totals), axisDays(month));
  await render(<BarChart bars={bars} />);
  await layout(bars.length);
}

/** 년 모드: buildMonthlyBars → toMonthlyChartBars */
async function renderYearChart(year: string, totals: MonthlyTotal[] = []) {
  await render(<BarChart bars={toMonthlyChartBars(buildMonthlyBars(year, totals))} />);
  await layout(12);
}

const TOTALS: DailyTotal[] = [
  { date: '2026-01-05', total: 3000 },
  { date: '2026-01-23', total: 12000 },
];

beforeEach(() => {
  jest.mocked(Haptics.selectionAsync).mockClear();
});

describe('indexAtX — 손가락 x → 칸 번호', () => {
  it('왼쪽 끝 0 은 첫 칸, width-1 은 마지막 칸', () => {
    expect(indexAtX(0, 310, 31)).toBe(0);
    expect(indexAtX(309, 310, 31)).toBe(30);
  });

  it('칸 경계에서는 오른쪽 칸으로 넘어간다', () => {
    expect(indexAtX(9.99, 310, 31)).toBe(0);
    expect(indexAtX(10, 310, 31)).toBe(1);
    expect(indexAtX(225, 310, 31)).toBe(22);
  });

  it('차트 밖으로 끌면 양 끝 칸에 머문다 (음수·폭 초과)', () => {
    expect(indexAtX(-5, 310, 31)).toBe(0);
    expect(indexAtX(310, 310, 31)).toBe(30);
    expect(indexAtX(999, 310, 31)).toBe(30);
  });

  it('년 모드 12칸도 같은 계산', () => {
    expect(indexAtX(0, 300, 12)).toBe(0);
    expect(indexAtX(210, 300, 12)).toBe(8);
    expect(indexAtX(299, 300, 12)).toBe(11);
  });

  it('폭을 아직 모르거나 칸이 없으면 -1', () => {
    expect(indexAtX(10, 0, 31)).toBe(-1);
    expect(indexAtX(10, 310, 0)).toBe(-1);
  });
});

describe('BarChart — 일별 막대 (월 모드)', () => {
  it('31일 달에는 막대 칸이 31개다', async () => {
    await renderChart('2026-01');
    expect(screen.getAllByTestId(/^bar-/)).toHaveLength(31);
  });

  it('평년 2월에는 막대 칸이 28개다', async () => {
    await renderChart('2026-02');
    expect(screen.getAllByTestId(/^bar-/)).toHaveLength(28);
  });

  it('축 라벨은 1 · 5일 단위 · 말일(31) 만 보인다 (말일에 붙은 30은 뺀다)', async () => {
    await renderChart('2026-01');
    const labels = screen.getAllByText(/^\d+$/).map((el) => String(el.props.children));
    expect(labels).toEqual(['1', '5', '10', '15', '20', '25', '31']);
  });

  it('처음에는 툴팁이 없다', async () => {
    await renderChart('2026-01', TOTALS);
    expect(screen.queryByText(/일 · /)).toBeNull();
  });

  it('막대를 탭하면 "23일 · 12,000원" 툴팁이 뜬다', async () => {
    await renderChart('2026-01', TOTALS);
    await tap(xOf(22));
    expect(screen.getByText('23일 · 12,000원')).toBeOnTheScreen();
  });

  it('같은 막대를 다시 탭하면 툴팁이 닫힌다', async () => {
    await renderChart('2026-01', TOTALS);
    await tap(xOf(22));
    expect(screen.getByText('23일 · 12,000원')).toBeOnTheScreen();
    await tap(xOf(22));
    expect(screen.queryByText('23일 · 12,000원')).toBeNull();
  });

  it('다른 막대를 탭하면 툴팁이 그 날로 바뀐다', async () => {
    await renderChart('2026-01', TOTALS);
    await tap(xOf(22));
    await tap(xOf(4));
    expect(screen.getByText('5일 · 3,000원')).toBeOnTheScreen();
    expect(screen.queryByText('23일 · 12,000원')).toBeNull();
  });

  it('막대 줄 밖(축 라벨 줄·툴팁 줄)을 탭하면 툴팁이 닫힌다', async () => {
    await renderChart('2026-01', TOTALS);
    await tap(xOf(22));
    await tap(xOf(14), AXIS_Y);
    expect(screen.queryByText('23일 · 12,000원')).toBeNull();
    await tap(xOf(22));
    expect(screen.getByText('23일 · 12,000원')).toBeOnTheScreen();
    await tap(xOf(22), TRACK_TOP / 2);
    expect(screen.queryByText('23일 · 12,000원')).toBeNull();
  });

  it('기록 없는 날(빈 트랙)도 탭하면 "0원" 툴팁이 뜬다', async () => {
    await renderChart('2026-01', TOTALS);
    await tap(xOf(0));
    expect(screen.getByText('1일 · 0원')).toBeOnTheScreen();
  });

  it('누른 채 쓸면 손가락 아래 날의 툴팁이 뜨고, 손을 떼도 남는다', async () => {
    await renderChart('2026-01', TOTALS);
    await scrub([xOf(4), xOf(10), xOf(22)]);
    expect(screen.getByText('23일 · 12,000원')).toBeOnTheScreen();
  });

  it('쓰는 중 날이 바뀔 때만 selection 햅틱이 한 번씩 울린다', async () => {
    await renderChart('2026-01', TOTALS);
    // 5일 → 5일 안에서 이동 → 23일 → 23일 안에서 이동: 울리는 건 시작 1번 + 날 바뀜 1번
    await scrub([xOf(4), xOf(4) + 2, xOf(22), xOf(22) + 3]);
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(2);
  });

  it('선택된 막대는 primary 로 칠하고, 기록 없는 날도 바닥에 얇게 보인다. 최고값 강조는 그대로', async () => {
    await renderChart('2026-01', TOTALS);
    /** 칸 안의 실제 막대(View) 스타일 */
    const fill = (key: string) => {
      const bar = screen.getByTestId(`bar-${key}`).children[0];
      if (typeof bar === 'string') throw new Error('막대 View 가 없다');
      return StyleSheet.flatten(bar.props.style);
    };
    expect(fill('2026-01-05').backgroundColor).toBe(lightColors.primarySoft);
    expect(fill('2026-01-01').height).toBe(0);

    await tap(xOf(4));
    expect(fill('2026-01-05').backgroundColor).toBe(lightColors.primary);
    expect(fill('2026-01-23').backgroundColor).toBe(lightColors.primary);

    await tap(xOf(0));
    expect(fill('2026-01-01').backgroundColor).toBe(lightColors.primary);
    expect(fill('2026-01-01').height).toBe(size.barMin);
    expect(fill('2026-01-05').backgroundColor).toBe(lightColors.primarySoft);
  });

  it('차트 밖으로 끌고 나가면 양 끝 날에 머문다', async () => {
    await renderChart('2026-01', TOTALS);
    await scrub([xOf(29), 400]);
    expect(screen.getByText('31일 · 0원')).toBeOnTheScreen();
    await scrub([xOf(1), -30]);
    expect(screen.getByText('1일 · 0원')).toBeOnTheScreen();
  });
});

const MONTHLY: MonthlyTotal[] = [
  { month: '2026-03', total: 50000 },
  { month: '2026-09', total: 184000 },
];

describe('BarChart — 월별 막대 (년 모드)', () => {
  it('막대 칸이 12개다', async () => {
    await renderYearChart('2026');
    expect(screen.getAllByTestId(/^bar-/)).toHaveLength(12);
  });

  it('축 라벨은 1~12 전부 보인다', async () => {
    await renderYearChart('2026');
    const labels = screen.getAllByText(/^\d+$/).map((el) => String(el.props.children));
    expect(labels).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']);
  });

  it('막대를 탭하면 "9월 · 184,000원" 툴팁이 뜨고 다시 탭하면 닫힌다', async () => {
    await renderYearChart('2026', MONTHLY);
    await tap(xOf(8));
    expect(screen.getByText('9월 · 184,000원')).toBeOnTheScreen();
    await tap(xOf(8));
    expect(screen.queryByText('9월 · 184,000원')).toBeNull();
  });

  it('기록 없는 달도 탭하면 "0원" 툴팁이 뜬다', async () => {
    await renderYearChart('2026', MONTHLY);
    await tap(xOf(0));
    expect(screen.getByText('1월 · 0원')).toBeOnTheScreen();
  });

  it('누른 채 쓸면 월별 칸도 따라가며 햅틱이 칸마다 울린다', async () => {
    await renderYearChart('2026', MONTHLY);
    await scrub([xOf(0), xOf(1), xOf(2)]);
    expect(screen.getByText('3월 · 50,000원')).toBeOnTheScreen();
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(3);
  });
});
