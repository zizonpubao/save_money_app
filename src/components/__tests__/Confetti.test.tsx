import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { Confetti } from '@/src/components/Confetti';
import { lightColors, size } from '@/src/theme';

describe('Confetti (M4)', () => {
  it('한 번에 32개 (mid)', async () => {
    await render(<Confetti bursts={1} perBurst={32} seed={1} />);
    expect(screen.getAllByTestId('confetti-piece')).toHaveLength(32);
  });

  it('세 번 터지면 24 × 3 = 72개 (big)', async () => {
    await render(<Confetti bursts={3} perBurst={24} seed={2} />);
    expect(screen.getAllByTestId('confetti-piece')).toHaveLength(72);
  });

  it('big 조각은 1.4배 (6×10 → 8.4×14), mid 조각은 그대로 6×10', async () => {
    const { rerender } = await render(<Confetti bursts={3} perBurst={24} seed={2} />);
    const big = StyleSheet.flatten(screen.getAllByTestId('confetti-piece')[0].props.style);
    expect(big.width).toBeCloseTo(size.confettiWidth * 1.4);
    expect(big.height).toBeCloseTo(size.confettiHeight * 1.4);
    await rerender(<Confetti bursts={1} perBurst={32} seed={2} />);
    const mid = StyleSheet.flatten(screen.getAllByTestId('confetti-piece')[0].props.style);
    expect([mid.width, mid.height]).toEqual([size.confettiWidth, size.confettiHeight]);
  });

  it('origin 점(부모 기준 카드 가운데)에서 터진다', async () => {
    await render(<Confetti bursts={1} perBurst={32} seed={1} origin={{ x: 195, y: 140 }} />);
    const point = screen.getAllByTestId('confetti-piece')[0].parent;
    expect(point).toHaveStyle({ left: 195, top: 140 });
  });

  it('터짐 0번(4천원 미만)이면 그리지 않는다', async () => {
    await render(<Confetti bursts={0} perBurst={0} seed={1} />);
    expect(screen.queryByTestId('confetti')).toBeNull();
  });

  it('동작 줄이기가 켜져 있으면 그리지 않는다', async () => {
    await render(<Confetti bursts={3} perBurst={24} seed={1} reduceMotion />);
    expect(screen.queryAllByTestId('confetti-piece')).toHaveLength(0);
  });

  it('목표 달성 팔레트면 good 색 조각이 가장 많다', async () => {
    await render(<Confetti bursts={3} perBurst={24} seed={5} palette="goal" />);
    const colors = screen
      .getAllByTestId('confetti-piece')
      .map((el) => StyleSheet.flatten(el.props.style).backgroundColor);
    const good = colors.filter((c) => c === lightColors.good).length;
    expect(good).toBeGreaterThan(colors.filter((c) => c === lightColors.primary).length);
    expect(good).toBeGreaterThan(colors.filter((c) => c === lightColors.warn).length);
    expect(colors).not.toContain(lightColors.primarySoft);
  });
});
