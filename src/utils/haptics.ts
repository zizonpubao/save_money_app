import * as Haptics from 'expo-haptics';

import type { HapticPattern } from '@/src/features/celebration';
import { motion } from '@/src/theme';

/**
 * 앱 전체 햅틱 스위치. 설정 탭 "햅틱" 토글(settings `haptics_enabled`)을 settingsStore 가 읽어 넣는다.
 * 모든 햅틱이 아래 fire() 한 곳을 지나므로 여기서만 검사한다.
 */
let hapticsEnabled = true;

export function setHapticsEnabled(enabled: boolean): void {
  hapticsEnabled = enabled;
}

export function isHapticsEnabled(): boolean {
  return hapticsEnabled;
}

export type HapticKind = 'selection' | 'medium' | 'heavy' | 'success';

/** 햅틱 한 번. 꺼져 있으면 아무것도 안 한다. 실패해도(시뮬레이터 등) 앱 흐름을 막지 않는다. */
function fire(kind: HapticKind): void {
  if (!hapticsEnabled) return;
  const done =
    kind === 'selection'
      ? Haptics.selectionAsync()
      : kind === 'success'
        ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        : Haptics.impactAsync(
            kind === 'heavy' ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium,
          );
  done.catch(() => {});
}

export type HapticStep = { at: number; kind: HapticKind };

/**
 * (M4 축하 연출) 패턴별 박자. at 은 타격(t0 + 80) 기준 ms.
 * - base: Medium 한 번 · mid: Medium → Heavy(80) · big: Heavy 3연타 0/90/220 ("쿵쿵—쿵")
 * - goal: big 3연타 + t0+480 Success 피날레 (impact 와 같은 박자에 겹치지 않는다)
 */
const BIG_STEPS: HapticStep[] = motion.hapticBigAt.map((at) => ({ at, kind: 'heavy' }));

export const HAPTIC_PATTERNS: Record<HapticPattern, readonly HapticStep[]> = {
  base: [{ at: 0, kind: 'medium' }],
  mid: [
    { at: 0, kind: 'medium' },
    { at: motion.hapticMidAt, kind: 'heavy' },
  ],
  big: BIG_STEPS,
  goal: [...BIG_STEPS, { at: motion.goalSuccessAt - motion.hitAt, kind: 'success' }],
};

/**
 * 축하 햅틱 패턴을 지금(타격 순간)부터 재생한다. 돌려받은 함수로 남은 박자를 취소한다
 * (연속 저장 때 새 연출이 이전 박자를 끊는다).
 */
export function playCelebrationHaptic(pattern: HapticPattern): () => void {
  const timers: ReturnType<typeof setTimeout>[] = [];
  for (const step of HAPTIC_PATTERNS[pattern]) {
    if (step.at === 0) fire(step.kind);
    else timers.push(setTimeout(() => fire(step.kind), step.at));
  }
  return () => timers.forEach(clearTimeout);
}

/** 저장 버튼을 누른 순간 "눌렸다" 확인. 축하 패턴과 별개 */
export function saveTapHaptic(): void {
  fire('selection');
}

/** 막대 그래프를 쓸 때 칸(날·월)이 바뀔 때마다 주는 가벼운 틱. iOS 피커 휠과 같은 selection 햅틱. */
export function scrubTick(): void {
  fire('selection');
}
