import { fireEvent, render, screen } from '@testing-library/react-native';

import { DailyBarChart } from '@/src/components/DailyBarChart';
import type { DailyTotal } from '@/src/db';
import { axisDays, buildDailyBars } from '@/src/features/monthlyStats';

/** 실제 화면과 같은 경로(buildDailyBars/axisDays)로 props 를 만든다. 2026-01 은 31일. */
async function renderChart(month: string, totals: DailyTotal[] = []) {
  await render(<DailyBarChart bars={buildDailyBars(month, totals)} axis={axisDays(month)} />);
}

const TOTALS: DailyTotal[] = [
  { date: '2026-01-05', total: 3000 },
  { date: '2026-01-23', total: 12000 },
];

describe('DailyBarChart (일별 막대 그래프)', () => {
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
