import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Confetti } from '@/src/components/Confetti';
import { FloatingLabel } from '@/src/components/FloatingLabel';
import { GlowRing } from '@/src/components/GlowRing';
import { ScreenFlash } from '@/src/components/ScreenFlash';
import {
  floatingLabelText,
  type CardRect,
  type CelebrationPlan,
} from '@/src/features/celebration';
import { motion } from '@/src/theme';

/** 저장 한 번의 연출. runId 가 커질 때마다 한 번 재생한다 */
export type CelebrationRun = {
  runId: number;
  plan: CelebrationPlan;
  /** 저장 금액 (플로팅 라벨) */
  amount: number;
  /** 저장 시각. 컨페티 모양·라벨 꼬리말 시드 */
  seed: number;
};

type Props = {
  run: CelebrationRun | null;
  /** 저장 직후(t0) 잰 카드 사각형 (이 오버레이 기준 pt) */
  rect: CardRect | null;
  /** 동작 줄이기: 파티클·플래시·라벨·글로우를 모두 생략한다 (햅틱·소리·카운트업은 홈이 따로 낸다) */
  reduceMotion?: boolean;
};

/**
 * (M4) 저장 축하 오버레이. 홈 루트 전체를 덮고(pointerEvents none, FAB 위) 한 runId 로
 * 플래시 · 글로우 1~2겹 · 컨페티 · 플로팅 라벨을 조립한다. 모든 조각은 key 에 runId 를 넣어
 * 연달아 저장하면 이전 연출을 버리고 처음부터 다시 마운트한다. 타격 후 ~900ms 뒤 통째로 걷는다.
 * 마운트 시점의 run 은 지난 연출이라 재생하지 않는다 (탭을 다시 그렸다고 되살아나지 않게).
 */
export function CelebrationLayer({ run, rect, reduceMotion = false }: Props) {
  const runId = run?.runId ?? 0;
  const [finished, setFinished] = useState(runId);

  useEffect(() => {
    if (runId === 0) return;
    const timer = setTimeout(() => setFinished(runId), motion.layerMs);
    return () => clearTimeout(timer);
  }, [runId]);

  if (!run || runId <= finished || reduceMotion) return null;

  const { plan } = run;
  const origin = rect ? { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 } : null;

  return (
    <View
      pointerEvents="none"
      testID="celebration-layer"
      style={[StyleSheet.absoluteFill, styles.layer]}>
      {plan.layers.flash ? <ScreenFlash key={`flash-${runId}`} /> : null}
      <GlowRing key={`glow1-${runId}`} rect={rect} ring={1} />
      {plan.layers.glowRings > 1 ? <GlowRing key={`glow2-${runId}`} rect={rect} ring={2} /> : null}
      <Confetti
        key={`confetti-${runId}`}
        bursts={plan.layers.confettiBursts}
        seed={run.seed}
        origin={origin}
        palette={plan.layers.goal ? 'goal' : 'default'}
      />
      <FloatingLabel
        key={`label-${runId}`}
        text={floatingLabelText(run.amount, plan.tier, run.seed)}
        size={plan.label}
        rect={rect}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // 목록·칩·FAB 보다 위
  layer: { zIndex: 2 },
});
