import * as Haptics from 'expo-haptics';

import type { CelebrationTier } from '@/src/features/celebration';

/** 저장 성공 햅틱. 실패해도(시뮬레이터 등) 앱 흐름을 막지 않는다. */
export function celebrateHaptic(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

/** 두 번째 진동까지 간격 (ms) */
const GOAL_HAPTIC_GAP_MS = 150;

/** 월 목표 달성 햅틱. 저장 성공(Success)보다 강하게 Heavy 2연타. */
export function goalReachedHaptic(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  setTimeout(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  }, GOAL_HAPTIC_GAP_MS);
}

/** (M4) 1만원 이상 저장의 두 번째 진동까지 간격 (ms) */
const MID_TIER_GAP_MS = 120;

/**
 * (M4) 저장 금액 구간별 햅틱. 1만원 미만은 기존 Success, 1만원 이상은 Medium 2연타, 5만원 이상은 Heavy 한 번.
 * 목표 달성과 겹치면 부르지 않는다 (goalReachedHaptic 만 낸다).
 */
export function celebrateTierHaptic(tier: CelebrationTier): void {
  if (tier === 'big') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    return;
  }
  if (tier === 'mid') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }, MID_TIER_GAP_MS);
    return;
  }
  celebrateHaptic();
}

/** 막대 그래프를 쓸 때 칸(날·월)이 바뀔 때마다 주는 가벼운 틱. iOS 피커 휠과 같은 selection 햅틱. */
export function scrubTick(): void {
  Haptics.selectionAsync().catch(() => {});
}
