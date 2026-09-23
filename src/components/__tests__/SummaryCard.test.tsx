import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { MonthStatsCard } from '@/src/components/MonthStatsCard';
import { SummaryCard } from '@/src/components/SummaryCard';

describe('SummaryCard (홈 상단 카드)', () => {
  it('이번 달 절약액을 콤마·원 형식으로 크게 보여준다', async () => {
    await render(<SummaryCard todayTotal={0} monthTotal={1234567} celebrateTick={0} />);
    expect(screen.getByText('1,234,567원')).toBeOnTheScreen();
  });

  it('오늘: 큰 숫자 아래 작은 한 줄 "오늘 4,500원 · 날짜" (읽기도 같은 문장 한 번에)', async () => {
    await render(<SummaryCard todayTotal={4500} monthTotal={10000} celebrateTick={0} />);
    expect(screen.getByText(/^오늘 4,500원 · \d{4}년 \d{1,2}월 \d{1,2}일 \(.\)$/)).toBeOnTheScreen();
    expect(screen.getByLabelText(/^오늘 4,500원 · \d{4}년/)).toBeOnTheScreen();
  });

  it('이번 달 절약액이 0이면 "0원" 으로 보인다', async () => {
    await render(<SummaryCard todayTotal={0} monthTotal={0} celebrateTick={0} />);
    // 큰 숫자 0원, 오늘 줄도 0원
    expect(screen.getByText('0원')).toBeOnTheScreen();
    expect(screen.getByText(/^오늘 0원 · /)).toBeOnTheScreen();
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

  it('목표가 있으면 진행 바와 왼쪽 "목표 300,000원", 오른쪽 "62%" 를 보여준다', async () => {
    await render(<SummaryCard todayTotal={0} monthTotal={186000} celebrateTick={0} goal={300000} />);
    expect(screen.getByText('목표 300,000원')).toBeOnTheScreen();
    expect(screen.getByText('62%')).toBeOnTheScreen();
    expect(screen.queryByText(/초과/)).toBeNull();
    expect(screen.getByRole('progressbar')).toBeOnTheScreen();
    expect(screen.queryByText('목표를 정하면 진행률이 보여요 →')).toBeNull();
  });

  it('목표를 넘으면 % 가 100 에서 멈추지 않고("104%") 옆에 "+12,000원 초과" 를 보여준다', async () => {
    await render(<SummaryCard todayTotal={0} monthTotal={312000} celebrateTick={0} goal={300000} />);
    expect(screen.getByText('목표 300,000원')).toBeOnTheScreen();
    expect(screen.getByText('104%')).toBeOnTheScreen();
    expect(screen.getByText('+12,000원 초과')).toBeOnTheScreen();
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
    expect(screen.getByText('104%')).toBeOnTheScreen();
    expect(screen.getByText('+12,000원 초과')).toBeOnTheScreen();
    expect(screen.getByRole('progressbar').props.accessibilityValue).toMatchObject({ now: 100 });
  });
});

describe('SummaryCard — M3.6 슬롯', () => {
  it('슬롯을 주지 않으면 한 줄·아래 영역 없이 기존 구획만 그린다', async () => {
    await render(<SummaryCard todayTotal={0} monthTotal={1000} celebrateTick={0} />);
    expect(screen.queryByTestId('slot-top')).toBeNull();
    expect(screen.queryByTestId('slot-bottom')).toBeNull();
    expect(screen.getByText('1,000원')).toBeOnTheScreen();
  });

  it('topLine 은 큰 숫자 위, bottomExtra 는 오늘·목표 아래에 그린다', async () => {
    await render(
      <SummaryCard
        todayTotal={0}
        monthTotal={1000}
        celebrateTick={0}
        topLine={<Text testID="slot-top">한 줄</Text>}
        bottomExtra={<Text testID="slot-bottom">아래</Text>}
      />,
    );
    // 화면에 그려진 글자를 위→아래 순서로 모아 구획 순서를 본다
    const order = screen
      .getAllByText(/한 줄|이번 달 절약|^오늘 |아래/)
      .map((el) => String([el.props.children].flat().join('')));
    expect(order[0]).toBe('한 줄');
    expect(order[1]).toMatch(/^이번 달 절약/);
    expect(order[2]).toMatch(/^오늘 /);
    expect(order[3]).toBe('아래');
  });

  it('ready 전에는 합계를 그대로, 읽은 뒤 첫 값도 굴리지 않고 바로 보여준다 (같은 날 재오픈)', async () => {
    const { rerender } = await render(
      <SummaryCard todayTotal={0} monthTotal={0} celebrateTick={0} ready={false} />,
    );
    await rerender(<SummaryCard todayTotal={0} monthTotal={52000} celebrateTick={0} ready />);
    expect(screen.getByText('52,000원')).toBeOnTheScreen();
  });

  it('firstOpenTick 이 있으면 큰 숫자가 0원에서 시작한다 (하루 첫 오픈 카운트업)', async () => {
    await render(
      <SummaryCard todayTotal={0} monthTotal={52000} celebrateTick={0} firstOpenTick={1} />,
    );
    // jest 의 reanimated mock 은 카운트업 진행을 화면에 반영하지 않으므로 시작값만 본다
    expect(screen.queryByText('52,000원')).toBeNull();
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
