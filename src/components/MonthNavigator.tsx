import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { RangeMode } from '@/src/features/rangeMode';
import { useTheme } from '@/src/theme';
import { formatKoMonth, formatKoYear } from '@/src/utils/date';

type Props = {
  /** 월 모드 'YYYY-MM' / 년 모드 'YYYY' */
  period: string;
  mode?: RangeMode;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
};

/** `‹ 2026년 9월 ›` / `‹ 2026년 ›` 기간 이동. 끝에 닿으면 화살표를 비활성으로 흐리게 둔다. */
export function MonthNavigator({ period, mode = 'month', canPrev, canNext, onPrev, onNext }: Props) {
  const { colors, type, sp, size } = useTheme();
  const isYear = mode === 'year';

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
      {arrow('‹', canPrev, onPrev, isYear ? '이전 해' : '이전 달')}
      <Text style={[type.heading, { color: colors.text }]}>
        {isYear ? formatKoYear(period) : formatKoMonth(period)}
      </Text>
      {arrow('›', canNext, onNext, isYear ? '다음 해' : '다음 달')}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: { alignItems: 'center', justifyContent: 'center' },
});
