import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  CONFETTI_MS,
  confettiFrame,
  makeConfettiPieces,
  type ConfettiPiece,
} from '@/src/features/celebration';
import { useTheme } from '@/src/theme';

type Props = {
  /** 저장 성공 횟수. 이 값이 커질 때마다 한 번 터진다 (마운트 시점의 값으로는 터지지 않는다) */
  tick: number;
  /** 조각 수. 0이면 그리지 않는다 (1만원 미만 저장) */
  count: number;
  /** 조각 배치 시드 (저장 시각) */
  seed: number;
  /** 동작 줄이기 설정이 켜져 있으면 그리지 않는다 */
  reduceMotion?: boolean;
  /** 터지는 점 (부모 기준 pt, 보통 카드 가운데). 아직 못 쟀으면 부모 위쪽 가운데 */
  origin?: ConfettiOrigin | null;
};

export type ConfettiOrigin = { x: number; y: number };

function Piece({ piece, color }: { piece: ConfettiPiece; color: string }) {
  const { size } = useTheme();
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withTiming(1, { duration: CONFETTI_MS, easing: Easing.linear });
  }, [t]);

  const animatedStyle = useAnimatedStyle(() => {
    const f = confettiFrame(piece, t.value);
    return {
      opacity: f.opacity,
      transform: [{ translateX: f.x }, { translateY: f.y }, { rotate: `${f.rotate}deg` }],
    };
  });

  return (
    <Animated.View
      testID="confetti-piece"
      style={[
        styles.piece,
        {
          width: size.confettiWidth,
          height: size.confettiHeight,
          marginLeft: -size.confettiWidth / 2,
          marginTop: -size.confettiHeight / 2,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}

/**
 * (M4) 저장 컨페티. origin 점에서 사방으로 터졌다가 떨어지며 0.8초 안에 사라진다.
 * 스크롤 목록 안에 두면 목록 위쪽 바깥으로 튄 조각이 잘리므로, 화면 전체를 덮는 오버레이로 그린다
 * (부모의 마지막 형제로 두고 origin 은 부모 기준 좌표). 터치는 막지 않는다.
 */
export function Confetti({ tick, count, seed, reduceMotion = false, origin = null }: Props) {
  const { colors } = useTheme();
  // 이미 끝난 저장 횟수. 마운트 시점 값으로 시작해 탭을 다시 그렸다고 지난 컨페티가 다시 터지지 않게 한다
  const [finished, setFinished] = useState(tick);

  useEffect(() => {
    if (tick === 0) return;
    const timer = setTimeout(() => setFinished(tick), CONFETTI_MS);
    return () => clearTimeout(timer);
  }, [tick]);

  const pieces = useMemo(() => makeConfettiPieces(count, seed), [count, seed]);
  const palette = [colors.primary, colors.primarySoft, colors.good, colors.warn];

  if (reduceMotion || count <= 0 || tick <= finished) return null;

  return (
    <View pointerEvents="none" testID="confetti" style={[StyleSheet.absoluteFill, styles.overlay]}>
      <View style={[styles.origin, origin ? { left: origin.x, top: origin.y } : styles.fallback]}>
        {pieces.map((p, i) => (
          // key 에 tick 을 넣어 연달아 저장해도 새 조각으로 처음부터 다시 재생한다
          <Piece key={`${tick}-${i}`} piece={p} color={palette[p.color] ?? colors.primary} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // 조각이 목록·칩 위로 떨어져도 가려지지 않게 형제들보다 한 층 위
  overlay: { zIndex: 1 },
  // 터지는 한 점. 조각은 이 점을 기준으로 transform 만 바꾼다
  origin: { position: 'absolute', width: 0, height: 0 },
  fallback: { top: 0, left: '50%' },
  piece: { position: 'absolute', left: 0, top: 0 },
});
