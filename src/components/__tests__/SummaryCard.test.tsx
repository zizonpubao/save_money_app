import { render, screen } from '@testing-library/react-native';

import { MonthStatsCard } from '@/src/components/MonthStatsCard';
import { SummaryCard } from '@/src/components/SummaryCard';

describe('SummaryCard (홈 상단 카드)', () => {
  it('이번 달 절약액을 콤마·원 형식으로 크게 보여준다', async () => {
    await render(<SummaryCard todayTotal={0} monthTotal={1234567} celebrateTick={0} />);
    expect(screen.getByText('1,234,567원')).toBeOnTheScreen();
  });

  it('오늘 절약액을 "오늘 4,500원 · 날짜" 형식으로 보여준다', async () => {
    await render(<SummaryCard todayTotal={4500} monthTotal={10000} celebrateTick={0} />);
    expect(screen.getByText(/^오늘 4,500원 · \d{4}년/)).toBeOnTheScreen();
  });

  it('이번 달 절약액이 0이면 "0원" 으로 보인다', async () => {
    await render(<SummaryCard todayTotal={0} monthTotal={0} celebrateTick={0} />);
    expect(screen.getByText('0원')).toBeOnTheScreen();
  });
});

describe('MonthStatsCard (월별 요약 카드)', () => {
  it('월 총 절약액을 콤마·원 형식으로 보여준다', async () => {
    await render(<MonthStatsCard total={120000} count={7} average={4000} />);
    expect(screen.getByText('120,000원')).toBeOnTheScreen();
  });

  it('기록 건수와 하루 평균을 한 줄로 보여준다', async () => {
    await render(<MonthStatsCard total={120000} count={7} average={4000} />);
    expect(screen.getByText('기록 7건 · 하루 평균 4,000원')).toBeOnTheScreen();
  });

  it('년 모드에서는 제목과 평균 문구를 바꿔 "월 평균" 으로 보여준다', async () => {
    await render(
      <MonthStatsCard
        total={1200000}
        count={40}
        average={100000}
        title="이 해 절약"
        averageLabel="월 평균"
      />,
    );
    expect(screen.getByText('이 해 절약')).toBeOnTheScreen();
    expect(screen.getByText('기록 40건 · 월 평균 100,000원')).toBeOnTheScreen();
  });
});
