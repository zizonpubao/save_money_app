import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { flashPulses } from '@/src/features/celebration';
import { useTheme } from '@/src/theme';

type Props = { reduceMotion?: boolean };

/**
 * (M4, big 전용) 화면 전체가 primary 로 두 번 번쩍: 타격(t0+80)에 0.14(다크 0.18) 120ms →
 * t0+300 에 0.08(다크 0.10) 100ms 여진. 한 View 에 한 줄 시퀀스로 건다(사이 공백은 0 유지).
 * primarySoft 는 배경과 대비가 없어 안 보여 primary 를 쓴다 — "primary 넓은 면적 금지"의 유일한 예외 (DESIGN).
 * 불투명하게 가리지 않고 터치도 막지 않는다 (부모 오버레이가 pointerEvents none).
 */
export function ScreenFlash({ reduceMotion = false }: Props) {
  const { colors, isDark } = useTheme();
  const opacity = useSharedValue(0);

  useEffect(() => {
    const pulses = flashPulses(isDark);
    const first = pulses[0];
    if (!first) return;
    const steps = pulses.flatMap((p, i) => {
      const prev = pulses[i - 1];
      const gap = prev ? p.at - (prev.at + prev.inMs + prev.outMs) : 0;
      return [
        ...(gap > 0 ? [withTiming(0, { duration: gap })] : []),
        withTiming(p.peak, { duration: p.inMs }),
        withTiming(0, { duration: p.outMs }),
      ];
    });
    opacity.value = withDelay(first.at, withSequence(...steps));
  }, [opacity, isDark]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (reduceMotion) return null;

  return (
    <Animated.View
      testID="screen-flash"
      style={[StyleSheet.absoluteFill, { backgroundColor: colors.primary }, animatedStyle]}
    />
  );
}
