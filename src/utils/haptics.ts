import * as Haptics from 'expo-haptics';

/** 저장 성공 햅틱. 실패해도(시뮬레이터 등) 앱 흐름을 막지 않는다. */
export function celebrateHaptic(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
