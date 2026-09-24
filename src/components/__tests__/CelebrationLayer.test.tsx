import { act, render, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { CelebrationLayer, type CelebrationRun } from '@/src/components/CelebrationLayer';
import { FloatingLabel } from '@/src/components/FloatingLabel';
import { GlowRing } from '@/src/components/GlowRing';
import { ScreenFlash } from '@/src/components/ScreenFlash';
import {
  buildCelebrationPlan,
  NO_EVENTS,
  type CardRect,
  type CelebrationTier,
} from '@/src/features/celebration';
import { lightColors, motion, size, typeScale } from '@/src/theme';

const RECT: CardRect = { x: 16, y: 20, w: 358, h: 250 };

function run(runId: number, tier: CelebrationTier, amount: number, seed = runId * 1000): CelebrationRun {
  return { runId, plan: buildCelebrationPlan(tier, NO_EVENTS), amount, seed };
}

describe('FloatingLabel', () => {
  it('문구를 primary 로, 카드 가운데 높이에 그린다', async () => {
    await render(<FloatingLabel text="+4,500원 적립" size="heading" rect={RECT} />);
    const label = screen.getByTestId('floating-label');
    expect(label).toHaveTextContent('+4,500원 적립');
    expect(label).toHaveStyle({
      color: lightColors.primary,
      left: 16,
      width: 358,
      top: 20 + 125 - typeScale.heading.lineHeight / 2,
    });
  });

  it.each([
    ['heading', 20],
    ['title', 28],
    ['display', 36],
  ] as const)('등급별 크기: %s → %ipt', async (labelSize, fontSize) => {
    await render(<FloatingLabel text="+1원" size={labelSize} rect={RECT} />);
    expect(screen.getByTestId('floating-label')).toHaveStyle({ fontSize });
  });

  it('동작 줄이기면 그리지 않는다', async () => {
    await render(<FloatingLabel text="+4,500원" size="heading" rect={RECT} reduceMotion />);
    expect(screen.queryByTestId('floating-label')).toBeNull();
  });
});

describe('GlowRing', () => {
  it('1겹째는 테두리 4pt · 2겹째는 2pt, 색은 primary', async () => {
    await render(
      <>
        <GlowRing rect={RECT} ring={1} />
        <GlowRing rect={RECT} ring={2} />
      </>,
    );
    const [first, second] = screen.getAllByTestId('glow-ring');
    expect(first).toHaveStyle({ borderWidth: size.glowBorder, borderColor: lightColors.primary });
    expect(second).toHaveStyle({ borderWidth: size.glowBorder2 });
  });

  it('카드 사각형을 못 쟀으면 그리지 않는다', async () => {
    await render(<GlowRing rect={null} />);
    expect(screen.queryByTestId('glow-ring')).toBeNull();
  });

  it('동작 줄이기면 그리지 않는다', async () => {
    await render(<GlowRing rect={RECT} reduceMotion />);
    expect(screen.queryByTestId('glow-ring')).toBeNull();
  });
});

describe('ScreenFlash', () => {
  it('화면 전체를 primary 로 덮는다 (불투명도는 애니메이션이 0.10 까지만)', async () => {
    await render(<ScreenFlash />);
    expect(screen.getByTestId('screen-flash')).toHaveStyle({
      position: 'absolute',
      top: 0,
      bottom: 0,
      backgroundColor: lightColors.primary,
    });
    expect(motion.flashOpacity).toBeLessThanOrEqual(0.1);
  });

  it('동작 줄이기면 그리지 않는다', async () => {
    await render(<ScreenFlash reduceMotion />);
    expect(screen.queryByTestId('screen-flash')).toBeNull();
  });
});

describe('CelebrationLayer (한 runId 로 조립)', () => {
  afterEach(() => jest.useRealTimers());

  it('마운트 시점의 run(지난 연출)은 재생하지 않는다', async () => {
    await render(<CelebrationLayer run={run(3, 'big', 55000)} rect={RECT} />);
    expect(screen.queryByTestId('celebration-layer')).toBeNull();
  });

  it('big: 플래시 · 글로우 2겹 · 컨페티 48 · display 라벨 "🔥" 을 터치를 막지 않는 오버레이 하나에', async () => {
    const { rerender } = await render(<CelebrationLayer run={null} rect={RECT} />);
    await rerender(<CelebrationLayer run={run(1, 'big', 55000)} rect={RECT} />);
    const layer = screen.getByTestId('celebration-layer');
    expect(layer.props.pointerEvents).toBe('none');
    expect(layer).toHaveStyle({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 });
    expect(within(layer).getByTestId('screen-flash')).toBeOnTheScreen();
    expect(within(layer).getAllByTestId('glow-ring')).toHaveLength(2);
    expect(within(layer).getAllByTestId('confetti-piece')).toHaveLength(48);
    expect(within(layer).getByTestId('floating-label')).toHaveTextContent('+55,000원 🔥');
    expect(within(layer).getByTestId('floating-label')).toHaveStyle({ fontSize: 36 });
  });

  it('base: 글로우 1겹 + heading 라벨만 (컨페티·플래시 없음)', async () => {
    const { rerender } = await render(<CelebrationLayer run={null} rect={RECT} />);
    await rerender(<CelebrationLayer run={run(1, 'base', 4500)} rect={RECT} />);
    expect(screen.getAllByTestId('glow-ring')).toHaveLength(1);
    expect(screen.queryByTestId('confetti')).toBeNull();
    expect(screen.queryByTestId('screen-flash')).toBeNull();
    expect(screen.getByTestId('floating-label')).toHaveTextContent(/^\+4,500원/);
    expect(screen.getByTestId('floating-label')).toHaveStyle({ fontSize: 20 });
  });

  it('연속 저장: 새 runId 가 오면 이전 조각을 버리고 새로 조립한다 (48 + 48 이 아니라 mid 32)', async () => {
    const { rerender } = await render(<CelebrationLayer run={null} rect={RECT} />);
    await rerender(<CelebrationLayer run={run(1, 'big', 55000)} rect={RECT} />);
    const firstLabel = screen.getByTestId('floating-label');
    await rerender(<CelebrationLayer run={run(2, 'mid', 12000)} rect={RECT} />);
    expect(screen.getAllByTestId('confetti-piece')).toHaveLength(32);
    expect(screen.queryByTestId('screen-flash')).toBeNull();
    expect(screen.getAllByTestId('floating-label')).toHaveLength(1);
    // key 에 runId 가 들어 있어 라벨이 새로 마운트됐다
    expect(screen.getByTestId('floating-label')).not.toBe(firstLabel);
    expect(screen.getByTestId('floating-label')).toHaveTextContent(/^\+12,000원/);
  });

  it(`타격 후 ~${motion.layerMs}ms 가 지나면 통째로 걷는다`, async () => {
    jest.useFakeTimers();
    const { rerender } = await render(<CelebrationLayer run={null} rect={RECT} />);
    await rerender(<CelebrationLayer run={run(1, 'big', 55000)} rect={RECT} />);
    expect(screen.getByTestId('celebration-layer')).toBeOnTheScreen();
    await act(async () => {
      jest.advanceTimersByTime(motion.layerMs);
    });
    expect(screen.queryByTestId('celebration-layer')).toBeNull();
  });

  it('동작 줄이기면 아무것도 그리지 않는다', async () => {
    const { rerender } = await render(<CelebrationLayer run={null} rect={RECT} reduceMotion />);
    await rerender(<CelebrationLayer run={run(1, 'big', 55000)} rect={RECT} reduceMotion />);
    expect(screen.queryByTestId('celebration-layer')).toBeNull();
  });

  it('카드를 아직 못 쟀으면 글로우는 빼고 라벨은 화면 위쪽에', async () => {
    const { rerender } = await render(<CelebrationLayer run={null} rect={null} />);
    await rerender(<CelebrationLayer run={run(1, 'mid', 12000)} rect={null} />);
    expect(screen.queryByTestId('glow-ring')).toBeNull();
    const label = screen.getByTestId('floating-label');
    expect(StyleSheet.flatten(label.props.style)).toMatchObject({ left: 0, right: 0 });
  });
});
