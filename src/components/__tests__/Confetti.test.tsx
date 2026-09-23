import { act, render, screen } from '@testing-library/react-native';

import { Confetti } from '@/src/components/Confetti';

describe('Confetti (M4)', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('마운트할 때(지난 저장)는 터지지 않는다', async () => {
    await render(<Confetti tick={3} count={20} seed={1} />);
    expect(screen.queryAllByTestId('confetti-piece')).toHaveLength(0);
  });

  it('저장(tick 증가)하면 count 개 조각이 그려진다: 1만원 이상 20개 · 5만원 이상 40개', async () => {
    const { rerender } = await render(<Confetti tick={0} count={20} seed={1} />);
    await rerender(<Confetti tick={1} count={20} seed={1} />);
    expect(screen.getAllByTestId('confetti-piece')).toHaveLength(20);
    await rerender(<Confetti tick={2} count={40} seed={2} />);
    expect(screen.getAllByTestId('confetti-piece')).toHaveLength(40);
  });

  it('1만원 미만(count 0)은 그리지 않는다', async () => {
    const { rerender } = await render(<Confetti tick={0} count={0} seed={1} />);
    await rerender(<Confetti tick={1} count={0} seed={1} />);
    expect(screen.queryByTestId('confetti')).toBeNull();
  });

  it('동작 줄이기가 켜져 있으면 그리지 않는다', async () => {
    const { rerender } = await render(<Confetti tick={0} count={40} seed={1} reduceMotion />);
    await rerender(<Confetti tick={1} count={40} seed={1} reduceMotion />);
    expect(screen.queryAllByTestId('confetti-piece')).toHaveLength(0);
  });

  it('0.8초 뒤에는 사라진다', async () => {
    jest.useFakeTimers();
    const { rerender } = await render(<Confetti tick={0} count={20} seed={1} />);
    await rerender(<Confetti tick={1} count={20} seed={1} />);
    expect(screen.getAllByTestId('confetti-piece')).toHaveLength(20);
    await act(async () => {
      jest.advanceTimersByTime(800);
    });
    expect(screen.queryByTestId('confetti')).toBeNull();
  });
});
