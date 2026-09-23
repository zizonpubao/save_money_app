import { useEffect, useRef } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

import { StatChip } from '@/src/components/StatChip';
import { streakLabel } from '@/src/features/streak';

/** 저장으로 연속 기록일이 늘었을 때 칩이 커지는 크기 */
const GROW_TO = 1.15;

type Props = {
  streak: number;
  /** 저장 성공 횟수. 이 값과 streak 이 같은 렌더에서 함께 커졌을 때만 튄다 (포커스 재조회·자정 넘김은 조용히) */
  celebrateTick: number;
};

/** (M4) 칩 행 맨 앞 "🔥 5일째". 0이면 그리지 않는다 (끊겼다는 표시를 하지 않는다) */
export function StreakChip({ streak, celebrateTick }: Props) {
  const scale = useSharedValue(1);
  const seen = useRef({ tick: celebrateTick, streak });

  useEffect(() => {
    const prev = seen.current;
    seen.current = { tick: celebrateTick, streak };
    if (celebrateTick > prev.tick && streak > prev.streak) {
      scale.value = withSequence(
        withSpring(GROW_TO, { damping: 10, stiffness: 360 }),
        withSpring(1, { damping: 14, stiffness: 220 }),
      );
    }
  }, [celebrateTick, streak, scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (streak <= 0) return null;

  return (
    <Animated.View style={animatedStyle}>
      <StatChip testID="streak-chip">{streakLabel(streak)}</StatChip>
    </Animated.View>
  );
}
