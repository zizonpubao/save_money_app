import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { Confetti } from '@/src/components/Confetti';
import { lightColors } from '@/src/theme';

describe('Confetti (M4)', () => {
  it('한 번 터지면 24개 (mid)', async () => {
    await render(<Confetti bursts={1} seed={1} />);
    expect(screen.getAllByTestId('confetti-piece')).toHaveLength(24);
  });

  it('두 번 터지면 24 + 24 = 48개 (big)', async () => {
    await render(<Confetti bursts={2} seed={2} />);
    expect(screen.getAllByTestId('confetti-piece')).toHaveLength(48);
  });

  it('origin 점(부모 기준 카드 가운데)에서 터진다', async () => {
    await render(<Confetti bursts={1} seed={1} origin={{ x: 195, y: 140 }} />);
    const point = screen.getAllByTestId('confetti-piece')[0].parent;
    expect(point).toHaveStyle({ left: 195, top: 140 });
  });

  it('터짐 0번(1만원 미만)이면 그리지 않는다', async () => {
    await render(<Confetti bursts={0} seed={1} />);
    expect(screen.queryByTestId('confetti')).toBeNull();
  });

  it('동작 줄이기가 켜져 있으면 그리지 않는다', async () => {
    await render(<Confetti bursts={2} seed={1} reduceMotion />);
    expect(screen.queryAllByTestId('confetti-piece')).toHaveLength(0);
  });

  it('목표 달성 팔레트면 good 색 조각이 가장 많다', async () => {
    await render(<Confetti bursts={2} seed={5} palette="goal" />);
    const colors = screen
      .getAllByTestId('confetti-piece')
      .map((el) => StyleSheet.flatten(el.props.style).backgroundColor);
    const good = colors.filter((c) => c === lightColors.good).length;
    expect(good).toBeGreaterThan(colors.filter((c) => c === lightColors.primary).length);
    expect(good).toBeGreaterThan(colors.filter((c) => c === lightColors.warn).length);
    expect(colors).not.toContain(lightColors.primarySoft);
  });
});
