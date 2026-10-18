import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { size, sp, useTheme } from '@/src/theme';

type Props = {
  onPress: () => void;
  /** 저장할 수 없는 상태(form.canSave false). 흐리게 두고 눌러도 아무 일도 없다 */
  disabled: boolean;
};

/**
 * 키패드가 내려가 있을 때 버튼 아래 끝 = 화면 아래 safe area 위 sp.md.
 * 입력 시트(pageSheet)와 기록 수정 화면 모두 바닥이 화면 바닥과 같아 이 값을 그대로 쓴다
 */
function restBottom(safeBottom: number): number {
  return safeBottom + sp.md;
}

/**
 * 폼 스크롤 끝에 더 비워 둘 여백(EntryForm 의 bottomInset). 맨 아래 칸(메모·삭제 버튼)이 버튼에 가리지 않게
 * 버튼 높이 + 버튼 아래 여백만큼. safe area 를 이미 포함하므로 Android 내비게이션 바 여백을 따로 더하지 않는다
 */
export function useFloatingSaveClearance(): number {
  const insets = useSafeAreaInsets();
  return restBottom(insets.bottom) + size.floatingSave;
}

/**
 * 입력 시트·기록 수정 오른쪽 아래 떠 있는 "저장" 알약 버튼. 키패드가 올라오면 키패드 윗변 sp.sm 위에 붙어 같이 움직인다.
 * 부모 화면의 맨 마지막 자식으로 둔다 (absolute).
 */
export function FloatingSaveButton({ onPress, disabled }: Props) {
  const { colors, type, radius, shadow, motion } = useTheme();
  const insets = useSafeAreaInsets();
  // Android 는 edge-to-edge(시트·화면이 내비게이션 바 밑까지)라 translucent 로 맞춘다.
  // false 면 reanimated 가 앱 루트에 상태바·내비 바만큼 여백을 넣고, 키보드 높이에서 내비 바를 빼 버린다
  const keyboard = useAnimatedKeyboard({
    isStatusBarTranslucentAndroid: true,
    isNavigationBarTranslucentAndroid: true,
  });
  const rest = restBottom(insets.bottom);

  // 키보드 높이는 화면 바닥부터 잰 값(iOS 는 입력 액세서리 바 "완료" 포함)이고 home indicator 영역을 덮는다.
  // 그래서 키패드가 올라온 위치 = height + sp.sm, 쉬는 위치 = safe area + sp.md. 그 차이만큼만 올리고
  // 키보드가 safe area 보다 낮은 동안(열리기 시작·닫히기 끝)은 쉬는 자리에 머문다
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -Math.max(0, keyboard.height.value + sp.sm - rest) }],
  }));

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.anchor, { right: sp.md, bottom: rest }, animatedStyle]}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        testID="floating-save"
        accessibilityRole="button"
        accessibilityLabel="저장"
        accessibilityState={{ disabled }}
        style={({ pressed }) => [
          styles.button,
          shadow.fab,
          {
            backgroundColor: colors.primary,
            shadowColor: colors.shadow,
            borderRadius: radius.pill,
            minHeight: size.floatingSave,
            paddingHorizontal: sp.xl,
            // 비활성은 다른 비활성 컨트롤(기간 화살표·카테고리 순서)과 같은 0.3 으로 흐리게
            opacity: disabled ? 0.3 : 1,
            transform: [{ scale: pressed ? motion.savePress : 1 }],
          },
        ]}>
        <Text style={[type.action, { color: colors.onPrimary }]}>저장</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  anchor: { position: 'absolute' },
  button: { alignItems: 'center', justifyContent: 'center' },
});
