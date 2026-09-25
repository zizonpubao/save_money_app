import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet } from 'react-native';

import { motion, shadow, size, useTheme } from '@/src/theme';

type Props = {
  onPress: () => void;
  /** (M4.5) 길게 누르기(motion.longPressMs). 인식되면 손을 떼도 onPress 는 불리지 않는다 */
  onLongPress?: () => void;
};

/** 우하단 + 플로팅 버튼 */
export function Fab({ onPress, onLongPress }: Props) {
  const { colors, sp } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={motion.longPressMs}
      accessibilityRole="button"
      accessibilityLabel="기록 추가"
      accessibilityHint={onLongPress ? '길게 누르면 최근 항목을 바로 저장합니다' : undefined}
      style={({ pressed }) => [
        styles.fab,
        {
          backgroundColor: colors.primary,
          right: sp.lg,
          bottom: sp.lg,
          opacity: pressed ? 0.85 : 1,
          shadowColor: colors.text,
        },
      ]}>
      <Ionicons name="add" size={size.fabIcon} color={colors.onPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    width: size.fab,
    height: size.fab,
    borderRadius: size.fab / 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.fab,
  },
});
