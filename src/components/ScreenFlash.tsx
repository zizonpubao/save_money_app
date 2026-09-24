import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/src/theme';

type Props = { reduceMotion?: boolean };

/**
 * (M4, big 전용) 타격 순간 화면 전체가 primary 로 한 번 번쩍. 0 → 0.10(다크 0.14) 40ms → 0 80ms, 합 120ms.
 * primarySoft 는 배경과 대비가 없어 안 보여 primary 를 쓴다 — "primary 넓은 면적 금지"의 유일한 예외 (DESIGN).
 * 불투명하게 가리지 않고 터치도 막지 않는다 (부모 오버레이가 pointerEvents none).
 */
export function ScreenFlash({ reduceMotion = false }: Props) {
  const { colors, isDark, motion } = useTheme();
  const opacity = useSharedValue(0);
  const peak = isDark ? motion.flashOpacityDark : motion.flashOpacity;

  useEffect(() => {
    opacity.value = withDelay(
      motion.hitAt,
      withSequence(
        withTiming(peak, { duration: motion.flashInMs }),
        withTiming(0, { duration: motion.flashOutMs }),
      ),
    );
  }, [opacity, peak, motion]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (reduceMotion) return null;

  return (
    <Animated.View
      testID="screen-flash"
      style={[StyleSheet.absoluteFill, { backgroundColor: colors.primary }, animatedStyle]}
    />
  );
}
