import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { CardRect, LabelSize } from '@/src/features/celebration';
import { numFace, numeric, useTheme } from '@/src/theme';

type Props = {
  /** "+4,500원 적립" 같은 문구 (floatingLabelText) */
  text: string;
  /** 등급별 글자 크기: base heading · mid title · big display */
  size: LabelSize;
  /** 카드 사각형. 가운데에서 떠오른다. 아직 못 쟀으면 화면 위쪽 가운데 */
  rect: CardRect | null;
  /** big: 더 높이(60pt)·더 오래(880ms, t0+1000 끝)·더 크게(0.5 → 1.4 → 1) 튄다 */
  big?: boolean;
  reduceMotion?: boolean;
};

/**
 * (M4) 저장 금액이 카드 가운데에서 톡 튀어 위로 떠오르며 사라지는 라벨.
 * t0+120 시작, 700ms: 위로 40pt(Easing.out cubic) · 크기 0.6 → 1.3 → 1(springHit → springSettle) ·
 * 투명도 0 → 1(80ms) → 유지 → 마지막 250ms 에 0. 마운트할 때 한 번 재생한다.
 * big 은 60pt · 880ms · 0.5 → 1.4 → 1.
 */
export function FloatingLabel({ text, size, rect, big = false, reduceMotion = false }: Props) {
  const { colors, type, sp, motion } = useTheme();
  const from = big ? motion.labelFromBig : motion.labelFrom;
  const peak = big ? motion.labelHitBig : motion.labelHit;
  const riseTo = big ? motion.floatRiseBig : motion.floatRise;
  const duration = big ? motion.labelMsBig : motion.labelMs;
  const rise = useSharedValue(0);
  const scale = useSharedValue<number>(from);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const at = motion.labelAt;
    const hold = duration - motion.labelFadeInMs - motion.labelFadeOutMs;
    rise.value = withDelay(
      at,
      withTiming(-riseTo, { duration, easing: Easing.out(Easing.cubic) }),
    );
    scale.value = withDelay(
      at,
      withSequence(
        withSpring(peak, { ...motion.springHit, overshootClamping: true }),
        withSpring(1, motion.springSettle),
      ),
    );
    opacity.value = withDelay(
      at,
      withSequence(
        withTiming(1, { duration: motion.labelFadeInMs }),
        withTiming(1, { duration: hold }),
        withTiming(0, { duration: motion.labelFadeOutMs }),
      ),
    );
  }, [rise, scale, opacity, motion, peak, riseTo, duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: rise.value }, { scale: scale.value }],
  }));

  if (reduceMotion) return null;

  const font = type[size];
  // 숫자 폰트: display(800)·title(700) 은 typeScale 에 이미 들어 있고, base 의 heading(700) 만 덧붙인다
  const face = size === 'heading' ? numFace.bold : null;
  const lineHeight = font.lineHeight ?? 0;
  const place = rect
    ? { left: rect.x, width: rect.w, top: rect.y + rect.h / 2 - lineHeight / 2 }
    : { left: 0, right: 0, top: sp.xl };

  return (
    <Animated.Text
      testID="floating-label"
      numberOfLines={1}
      style={[styles.label, place, font, numeric, face, { color: colors.primary }, animatedStyle]}>
      {text}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  label: { position: 'absolute', textAlign: 'center' },
});
