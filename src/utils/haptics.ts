import * as Haptics from 'expo-haptics';

import type { PresetSign } from '@/src/features/amountPresets';
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

export type HapticKind = 'selection' | 'light' | 'soft' | 'rigid' | 'medium' | 'heavy' | 'success';

type ImpactKind = Exclude<HapticKind, 'selection' | 'success'>;

/** 누르는 순간에 enum 을 읽는다 (모듈을 불러올 때 읽으면 enum 이 없는 테스트 대역에서 import 가 깨진다) */
function impactStyle(kind: ImpactKind): Haptics.ImpactFeedbackStyle {
  const style = Haptics.ImpactFeedbackStyle;
  switch (kind) {
    case 'light':
      return style.Light;
    case 'soft':
      return style.Soft;
    case 'rigid':
      return style.Rigid;
    case 'heavy':
      return style.Heavy;
    case 'medium':
      return style.Medium;
  }
}

/** 햅틱 한 번. 꺼져 있으면 아무것도 안 한다. 실패해도(시뮬레이터 등) 앱 흐름을 막지 않는다. */
function fire(kind: HapticKind): void {
  if (!hapticsEnabled) return;
  const done =
    kind === 'selection'
      ? Haptics.selectionAsync()
      : kind === 'success'
        ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        : Haptics.impactAsync(impactStyle(kind));
  done.catch(() => {});
}

export type HapticStep = { at: number; kind: HapticKind };

/**
 * (M4 축하 연출) 패턴별 박자. at 은 타격(t0 + 80) 기준 ms.
 * - base: Medium 한 번 · mid: Medium → Heavy(80)
 * - big: Heavy 3연타 0/90/220 ("쿵쿵—쿵") + 420 Success 피날레 (마지막 Heavy 와 200ms 떨어져 겹치지 않는다)
 * - goal: big 과 같다 (목표는 소리·배너·틴트로 구분한다 — Success 가 두 번 울리지 않게)
 */
const BIG_STEPS: HapticStep[] = [
  ...motion.hapticBigAt.map((at): HapticStep => ({ at, kind: 'heavy' })),
  { at: motion.finaleAt - motion.hitAt, kind: 'success' },
];

export const HAPTIC_PATTERNS: Record<HapticPattern, readonly HapticStep[]> = {
  base: [{ at: 0, kind: 'medium' }],
  mid: [
    { at: 0, kind: 'medium' },
    { at: motion.hapticMidAt, kind: 'heavy' },
  ],
  big: BIG_STEPS,
  goal: BIG_STEPS,
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

/** 설정 탭 테마 칩을 누를 때 가벼운 틱. 금액 입력 화면 버튼은 아래 입력 버튼 햅틱을 쓴다 */
export function chipTapHaptic(): void {
  fire('selection');
}

/**
 * (입력 버튼 타격감) 금액 프리셋 칩. + 는 단단한 Rigid(동전 "짤랑"), − 는 부드러운 Soft(내려가는 "띵-동").
 * selection 은 손끝에 거의 안 느껴져 impact 로 바꿨다
 */
export function amountChipHaptic(sign: PresetSign): void {
  fire(sign === '+' ? 'rigid' : 'soft');
}

/** (입력 버튼 타격감) +/− 전환 버튼. 스위치 "딸깍" 과 같이 Light */
export function toggleHaptic(): void {
  fire('light');
}

/** (입력 버튼 타격감) 카테고리 칩. 가벼운 "톡" 과 같이 Light */
export function categoryHaptic(): void {
  fire('light');
}

/** (입력 버튼 타격감) 최근 항목 칩. 금액이 채워지는 동작이라 금액 + 칩과 같은 Rigid */
export function recentChipHaptic(): void {
  fire('rigid');
}

/** (M4.5) + 버튼 길게 누르기가 인식된 순간 */
export function longPressHaptic(): void {
  fire('medium');
}

/** 설정 탭 "진동 느껴 보기". 저장 기본 연출과 같은 Medium 한 번 */
export function previewHaptic(): void {
  fire('medium');
}
