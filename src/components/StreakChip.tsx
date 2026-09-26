import { useEffect, useRef } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { StatChip } from '@/src/components/StatChip';
import { streakLabel } from '@/src/features/streak';
import { useTheme } from '@/src/theme';

type Props = {
  streak: number;
  /** 저장 성공 횟수. 이 값과 streak 이 같은 렌더에서 함께 커졌을 때만 튄다 (포커스 재조회·자정 넘김은 조용히) */
  celebrateTick: number;
  /** (M4) 동작 줄이기: 튐·흔들림 생략 */
  reduceMotion?: boolean;
};

/**
 * (M4) 칩 행 맨 앞 "🔥 5일째". 0이면 그리지 않는다 (끊겼다는 표시를 하지 않는다).
 * 저장으로 연속 기록일이 늘면 t0+240 에 1 → 1.3 → 1 로 튀며 불꽃처럼 좌우로 흔들린다 (−6° → +6° → −3° → 0, 각 60ms).
 */
export function StreakChip({ streak, celebrateTick, reduceMotion = false }: Props) {
  const { motion } = useTheme();
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);
  const seen = useRef({ tick: celebrateTick, streak });

  useEffect(() => {
    const prev = seen.current;
    seen.current = { tick: celebrateTick, streak };
    if (!(celebrateTick > prev.tick && streak > prev.streak)) return;
    cancelAnimation(scale);
    cancelAnimation(rotate);
    scale.value = 1;
    rotate.value = 0;
    if (reduceMotion) return;
    scale.value = withDelay(
      motion.streakAt,
      withSequence(
        withSpring(motion.chipHit, { ...motion.springHit, overshootClamping: true }),
        withSpring(1, motion.springSettle),
      ),
    );
    const beat = { duration: motion.wiggleMs, easing: Easing.inOut(Easing.quad) };
    const [a, b, c, d] = motion.wiggle;
    rotate.value = withDelay(
      motion.streakAt,
      withSequence(withTiming(a, beat), withTiming(b, beat), withTiming(c, beat), withTiming(d, beat)),
    );
  }, [celebrateTick, streak, reduceMotion, scale, rotate, motion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));

  if (streak <= 0) return null;

  return (
    <Animated.View style={animatedStyle}>
      <StatChip testID="streak-chip" tone="warn">
        {streakLabel(streak)}
      </StatChip>
    </Animated.View>
  );
}
