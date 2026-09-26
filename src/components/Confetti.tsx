import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import {
  confettiFrame,
  confettiSchedule,
  makeConfettiPieces,
  type ConfettiPalette,
  type ConfettiPiece,
} from '@/src/features/celebration';
import { useTheme } from '@/src/theme';

type Props = {
  /** 터짐 횟수 (0이면 그리지 않는다). mid 1번 · big 3번(조각 크게·빠르게, 세 번째는 넓게) */
  bursts: number;
  /** 한 번 터질 때 조각 수 (플랜의 layers.confettiPerBurst) */
  perBurst: number;
  /** 조각 배치 시드 (저장 시각) */
  seed: number;
  /** 동작 줄이기 설정이 켜져 있으면 그리지 않는다 */
  reduceMotion?: boolean;
  /** 터지는 점 (부모 기준 pt, 보통 카드 가운데). 아직 못 쟀으면 부모 위쪽 가운데 */
  origin?: ConfettiOrigin | null;
  /** 색 섞기. 목표 달성은 good 50% */
  palette?: ConfettiPalette;
};

export type ConfettiOrigin = { x: number; y: number };

type PieceProps = { piece: ConfettiPiece; color: string; at: number; ms: number; big: boolean };

function Piece({ piece, color, at, ms, big }: PieceProps) {
  const { size } = useTheme();
  const scale = big ? size.confettiScaleBig : 1;
  const width = size.confettiWidth * scale;
  const height = size.confettiHeight * scale;
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(at, withTiming(1, { duration: ms, easing: Easing.linear }));
  }, [t, at, ms]);

  const animatedStyle = useAnimatedStyle(() => {
    const f = confettiFrame(piece, t.value);
    return {
      // 터지기 전(2·3번째 터짐 대기 중)에는 가운데에 뭉쳐 보이지 않게 숨긴다
      opacity: t.value === 0 ? 0 : f.opacity,
      transform: [{ translateX: f.x }, { translateY: f.y }, { rotate: `${f.rotate}deg` }],
    };
  });

  return (
    <Animated.View
      testID="confetti-piece"
      style={[
        styles.piece,
        {
          width,
          height,
          marginLeft: -width / 2,
          marginTop: -height / 2,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}

/**
 * (M4) 저장 컨페티. 마운트하면 origin 점에서 사방으로 터졌다가 떨어지며 사라진다 (t0 기준 80ms 에 첫 터짐, big 은 180·300 에 더).
 * 언제 걷을지는 부모(CelebrationLayer)가 정한다 — 연출마다 key 로 새로 마운트된다.
 * 스크롤 목록 안에 두면 목록 위쪽 바깥으로 튄 조각이 잘리므로, 화면 전체를 덮는 오버레이로 그린다. 터치는 막지 않는다.
 */
export function Confetti({
  bursts,
  perBurst,
  seed,
  reduceMotion = false,
  origin = null,
  palette = 'default',
}: Props) {
  const { colors } = useTheme();

  const groups = useMemo(
    () =>
      confettiSchedule(bursts).map((burst, i) => ({
        burst,
        // 터짐마다 다른 시드로 모양을 바꾼다
        pieces: makeConfettiPieces(perBurst, seed + i * 7919, burst.spread, palette, burst.big),
      })),
    [bursts, perBurst, seed, palette],
  );
  // (B 방향) 숲 초록 · 새싹 연두 · 버터 노랑 · 주황. 자리(0~3)는 pickColor 가 정한다 — 목표 달성은 2(good) 50% · 0 25% · 3 25%
  const colorOf = [colors.primary, colors.grass2, colors.good, colors.warn];

  if (reduceMotion || groups.length === 0) return null;

  return (
    <View pointerEvents="none" testID="confetti" style={StyleSheet.absoluteFill}>
      <View style={[styles.origin, origin ? { left: origin.x, top: origin.y } : styles.fallback]}>
        {groups.map(({ burst, pieces }, g) =>
          pieces.map((p, i) => (
            <Piece
              key={`${g}-${i}`}
              piece={p}
              color={colorOf[p.color] ?? colors.primary}
              at={burst.at}
              ms={burst.ms}
              big={burst.big}
            />
          )),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // 터지는 한 점. 조각은 이 점을 기준으로 transform 만 바꾼다
  origin: { position: 'absolute', width: 0, height: 0 },
  fallback: { top: 0, left: '50%' },
  piece: { position: 'absolute', left: 0, top: 0 },
});
