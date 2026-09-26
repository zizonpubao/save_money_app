import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type ModalInsets = { top: number; bottom: number };

/**
 * 입력·목표·빠른 금액·카테고리 모달이 비워 둘 위·아래 여백.
 * - Android: pageSheet 가 없어 풀스크린 모달이 되고, edge-to-edge 라 상태바·내비게이션 바 밑까지 그려진다
 *   → 헤더는 상태바 아래로, 스크롤 끝은 제스처 바 위로 올린다.
 * - iOS: pageSheet 시트는 이미 상태바 아래에서 시작한다. 여기서 창 기준 inset(≈59)을 더하면 헤더가 밀려 내려가므로 0.
 */
export function useModalInsets(): ModalInsets {
  const insets = useSafeAreaInsets();
  if (Platform.OS !== 'android') return { top: 0, bottom: 0 };
  return { top: insets.top, bottom: insets.bottom };
}
