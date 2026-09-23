import { fireEvent, render, screen } from '@testing-library/react-native';

import { MonthStatsCard } from '@/src/components/MonthStatsCard';
import { SummaryCard } from '@/src/components/SummaryCard';

describe('SummaryCard (홈 상단 카드)', () => {
  it('이번 달 절약액을 콤마·원 형식으로 크게 보여준다', async () => {
    await render(<SummaryCard todayTotal={0} monthTotal={1234567} celebrateTick={0} />);
    expect(screen.getByText('1,234,567원')).toBeOnTheScreen();
  });

  it('오늘 행: 왼쪽 "오늘 · 날짜", 오른쪽 금액 (읽기는 "오늘 4,500원 · 날짜" 한 번에)', async () => {
    await render(<SummaryCard todayTotal={4500} monthTotal={10000} celebrateTick={0} />);
    expect(screen.getByText(/^오늘 · \d{4}년 \d{1,2}월 \d{1,2}일/)).toBeOnTheScreen();
    expect(screen.getByText('4,500원')).toBeOnTheScreen();
    expect(screen.getByLabelText(/^오늘 4,500원 · \d{4}년/)).toBeOnTheScreen();
  });

  it('이번 달 절약액이 0이면 "0원" 으로 보인다', async () => {
    await render(<SummaryCard todayTotal={0} monthTotal={0} celebrateTick={0} />);
    // 큰 숫자와 오늘 금액 둘 다 0원
    expect(screen.getAllByText('0원')).toHaveLength(2);
  });
});

describe('SummaryCard — 월 목표 (M3.5)', () => {
  it('목표가 없으면 진행 바 대신 "목표를 정하면 진행률이 보여요 →" 한 줄', async () => {
    await render(<SummaryCard todayTotal={0} monthTotal={186000} celebrateTick={0} goal={null} />);
    expect(screen.getByText('목표를 정하면 진행률이 보여요 →')).toBeOnTheScreen();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('목표 없음 문구를 탭하면 onGoalPress 가 불린다 (설정 탭으로)', async () => {
    const onGoalPress = jest.fn();
    await render(
      <SummaryCard
        todayTotal={0}
        monthTotal={0}
        celebrateTick={0}
        goal={null}
        onGoalPress={onGoalPress}
      />,
    );
    await fireEvent.press(screen.getByText('목표를 정하면 진행률이 보여요 →'));
    expect(onGoalPress).toHaveBeenCalledTimes(1);
  });

  it('목표가 있으면 진행 바와 "목표 300,000원 · 62%" 를 보여준다', async () => {
    await render(<SummaryCard todayTotal={0} monthTotal={186000} celebrateTick={0} goal={300000} />);
    expect(screen.getByText('목표 300,000원 · 62%')).toBeOnTheScreen();
    expect(screen.getByRole('progressbar')).toBeOnTheScreen();
    expect(screen.queryByText('목표를 정하면 진행률이 보여요 →')).toBeNull();
  });

  it('목표를 넘으면 100% 에서 멈추지 않고 "달성! +12,000원 초과" 로 보여준다', async () => {
    await render(<SummaryCard todayTotal={0} monthTotal={312000} celebrateTick={0} goal={300000} />);
    expect(screen.getByText('목표 300,000원 · 달성! +12,000원 초과')).toBeOnTheScreen();
    // 바는 가득(100)에서 멈춘다
    expect(screen.getByRole('progressbar').props.accessibilityValue).toMatchObject({ now: 100 });
  });

  it('달성 틴트 신호(goalReachedTick)가 와도 카드 내용은 그대로 그려진다', async () => {
    const { rerender } = await render(
      <SummaryCard todayTotal={0} monthTotal={290000} celebrateTick={0} goal={300000} />,
    );
    await rerender(
      <SummaryCard
        todayTotal={0}
        monthTotal={312000}
        celebrateTick={1}
        goal={300000}
        goalReachedTick={1}
      />,
    );
    // 큰 숫자는 카운트업 중이라 보지 않고, 목표 줄이 새 합계로 바뀌었는지만 본다
    expect(screen.getByText('목표 300,000원 · 달성! +12,000원 초과')).toBeOnTheScreen();
    expect(screen.getByRole('progressbar').props.accessibilityValue).toMatchObject({ now: 100 });
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
