import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet } from 'react-native';

import { shadow, size, useTheme } from '@/src/theme';

type Props = { onPress: () => void };

/** 우하단 + 플로팅 버튼 */
export function Fab({ onPress }: Props) {
  const { colors, sp } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="기록 추가"
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
