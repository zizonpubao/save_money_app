import { fireEvent, render, screen } from '@testing-library/react-native';

import { BarChart } from '@/src/components/BarChart';
import type { DailyTotal, MonthlyTotal } from '@/src/db';
import {
  axisDays,
  buildDailyBars,
  buildMonthlyBars,
  toDailyChartBars,
  toMonthlyChartBars,
} from '@/src/features/monthlyStats';

/** 실제 화면과 같은 경로(buildDailyBars/axisDays → toDailyChartBars)로 props 를 만든다. 2026-01 은 31일. */
async function renderChart(month: string, totals: DailyTotal[] = []) {
  await render(
    <BarChart bars={toDailyChartBars(buildDailyBars(month, totals), axisDays(month))} />,
  );
}

/** 년 모드: buildMonthlyBars → toMonthlyChartBars */
async function renderYearChart(year: string, totals: MonthlyTotal[] = []) {
  await render(<BarChart bars={toMonthlyChartBars(buildMonthlyBars(year, totals))} />);
}

const TOTALS: DailyTotal[] = [
  { date: '2026-01-05', total: 3000 },
  { date: '2026-01-23', total: 12000 },
];

describe('BarChart — 일별 막대 (월 모드)', () => {
  it('31일 달에는 막대 칸이 31개다', async () => {
    await renderChart('2026-01');
    expect(screen.getAllByRole('button')).toHaveLength(31);
  });

  it('평년 2월에는 막대 칸이 28개다', async () => {
    await renderChart('2026-02');
    expect(screen.getAllByRole('button')).toHaveLength(28);
  });

  it('축 라벨은 1 · 15 · 말일(31) 세 개만 보인다', async () => {
    await renderChart('2026-01');
    const labels = screen.getAllByText(/^\d+$/).map((el) => String(el.props.children));
    expect(labels).toEqual(['1', '15', '31']);
  });

  it('처음에는 툴팁이 없다', async () => {
    await renderChart('2026-01', TOTALS);
    expect(screen.queryByText(/일 · /)).toBeNull();
  });

  it('막대를 탭하면 "23일 · 12,000원" 툴팁이 뜬다', async () => {
    await renderChart('2026-01', TOTALS);
    await fireEvent.press(screen.getByLabelText('23일 12,000원'));
    expect(screen.getByText('23일 · 12,000원')).toBeOnTheScreen();
  });

  it('같은 막대를 다시 탭하면 툴팁이 닫힌다', async () => {
    await renderChart('2026-01', TOTALS);
    await fireEvent.press(screen.getByLabelText('23일 12,000원'));
    expect(screen.getByText('23일 · 12,000원')).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText('23일 12,000원'));
    expect(screen.queryByText('23일 · 12,000원')).toBeNull();
  });

  it('다른 막대를 탭하면 툴팁이 그 날로 바뀐다', async () => {
    await renderChart('2026-01', TOTALS);
    await fireEvent.press(screen.getByLabelText('23일 12,000원'));
    await fireEvent.press(screen.getByLabelText('5일 3,000원'));
    expect(screen.getByText('5일 · 3,000원')).toBeOnTheScreen();
    expect(screen.queryByText('23일 · 12,000원')).toBeNull();
  });

  it('막대가 아닌 차트 다른 곳(축 라벨)을 탭하면 툴팁이 닫힌다', async () => {
    await renderChart('2026-01', TOTALS);
    await fireEvent.press(screen.getByLabelText('23일 12,000원'));
    expect(screen.getByText('23일 · 12,000원')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('15'));
    expect(screen.queryByText('23일 · 12,000원')).toBeNull();
  });

  it('기록 없는 날(빈 트랙)도 탭하면 "0원" 툴팁이 뜬다', async () => {
    await renderChart('2026-01', TOTALS);
    await fireEvent.press(screen.getByLabelText('1일 0원'));
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
    expect(screen.getAllByRole('button')).toHaveLength(12);
  });

  it('축 라벨은 1 · 6 · 12 세 개만 보인다', async () => {
    await renderYearChart('2026');
    const labels = screen.getAllByText(/^\d+$/).map((el) => String(el.props.children));
    expect(labels).toEqual(['1', '6', '12']);
  });

  it('막대를 탭하면 "9월 · 184,000원" 툴팁이 뜨고 다시 탭하면 닫힌다', async () => {
    await renderYearChart('2026', MONTHLY);
    await fireEvent.press(screen.getByLabelText('9월 184,000원'));
    expect(screen.getByText('9월 · 184,000원')).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText('9월 184,000원'));
    expect(screen.queryByText('9월 · 184,000원')).toBeNull();
  });

  it('기록 없는 달도 탭하면 "0원" 툴팁이 뜬다', async () => {
    await renderYearChart('2026', MONTHLY);
    await fireEvent.press(screen.getByLabelText('1월 0원'));
    expect(screen.getByText('1월 · 0원')).toBeOnTheScreen();
  });
});
