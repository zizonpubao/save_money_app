import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/src/theme';
import { formatKoMonth } from '@/src/utils/date';

type Props = {
  /** 'YYYY-MM' */
  month: string;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
};

/** `‹ 2026년 9월 ›` 월 이동. 끝에 닿으면 화살표를 비활성으로 흐리게 둔다. */
export function MonthNavigator({ month, canPrev, canNext, onPrev, onNext }: Props) {
  const { colors, type, sp, size } = useTheme();

  const arrow = (label: string, enabled: boolean, onPress: () => void, hint: string) => (
    <Pressable
      onPress={onPress}
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityLabel={hint}
      accessibilityState={{ disabled: !enabled }}
      style={({ pressed }) => [
        styles.arrow,
        { minWidth: size.touch, minHeight: size.touch, opacity: pressed ? 0.7 : 1 },
      ]}>
      <Text style={[type.title, { color: enabled ? colors.text : colors.border }]}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={[styles.row, { paddingVertical: sp.sm }]}>
      {arrow('‹', canPrev, onPrev, '이전 달')}
      <Text style={[type.heading, { color: colors.text }]}>{formatKoMonth(month)}</Text>
      {arrow('›', canNext, onNext, '다음 달')}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: { alignItems: 'center', justifyContent: 'center' },
});
