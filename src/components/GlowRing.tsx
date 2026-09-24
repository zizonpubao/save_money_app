import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { CardRect } from '@/src/features/celebration';
import { useTheme } from '@/src/theme';

type Props = {
  /** 카드 사각형. 못 쟀으면 그리지 않는다 */
  rect: CardRect | null;
  /** 1겹째(t0+80, 테두리 4pt, 12pt 퍼짐) / 2겹째(t0+160, 테두리 2pt, 16pt 퍼짐) */
  ring?: 1 | 2;
  reduceMotion?: boolean;
};

/**
 * (M4) 타격 순간 카드 테두리가 바깥으로 퍼지며 사라지는 빛. 카드와 같은 모서리(radius.lg)에서 시작해
 * 퍼진 만큼 모서리도 키워 모양이 카드와 나란하다. 600ms, Easing.out(quad). 마운트할 때 한 번 재생한다.
 * 카드 안에 넣으면 목록 행의 overflow 에 잘리므로 홈 오버레이(CelebrationLayer)에 그린다.
 */
export function GlowRing({ rect, ring = 1, reduceMotion = false }: Props) {
  const { colors, isDark, radius, size, motion } = useTheme();
  const spread = useSharedValue(0);
  const opacity = useSharedValue(0);
  const at = ring === 1 ? motion.hitAt : motion.glow2At;
  const maxSpread = ring === 1 ? motion.glowSpread : motion.glowSpread2;
  const peak = isDark ? motion.glowOpacityDark : motion.glowOpacity;

  useEffect(() => {
    const timing = { duration: motion.glowMs, easing: Easing.out(Easing.quad) };
    spread.value = withDelay(at, withTiming(maxSpread, timing));
    opacity.value = withDelay(at, withSequence(withTiming(peak, { duration: 0 }), withTiming(0, timing)));
  }, [spread, opacity, at, maxSpread, peak, motion]);

  const x = rect?.x ?? 0;
  const y = rect?.y ?? 0;
  const w = rect?.w ?? 0;
  const h = rect?.h ?? 0;
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    left: x - spread.value,
    top: y - spread.value,
    width: w + spread.value * 2,
    height: h + spread.value * 2,
    borderRadius: radius.lg + spread.value,
  }));

  if (reduceMotion || !rect) return null;

  return (
    <Animated.View
      testID="glow-ring"
      style={[
        styles.ring,
        { borderColor: colors.primary, borderWidth: ring === 1 ? size.glowBorder : size.glowBorder2 },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  ring: { position: 'absolute' },
});
