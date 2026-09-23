import * as Haptics from 'expo-haptics';

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

/** 막대 그래프를 쓸 때 칸(날·월)이 바뀔 때마다 주는 가벼운 틱. iOS 피커 휠과 같은 selection 햅틱. */
export function scrubTick(): void {
  Haptics.selectionAsync().catch(() => {});
}
