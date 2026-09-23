import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { RangeMode } from '@/src/store/entryStore';
import { size, useTheme } from '@/src/theme';

type Props = {
  mode: RangeMode;
  onChange: (mode: RangeMode) => void;
};

const OPTIONS: { value: RangeMode; label: string }[] = [
  { value: 'month', label: '월' },
  { value: 'year', label: '년' },
];

/** 목록 범위 월 / 년 세그먼트 토글 */
export function RangeToggle({ mode, onChange }: Props) {
  const { colors, type, sp, radius } = useTheme();
  return (
    <View
      style={[
        styles.track,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: radius.md,
          padding: sp.xs,
        },
      ]}>
      {OPTIONS.map((o) => {
        const active = o.value === mode;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[
              styles.segment,
              {
                backgroundColor: active ? colors.primary : 'transparent',
                borderRadius: radius.sm,
                paddingVertical: sp.sm,
              },
            ]}>
            <Text style={[type.label, { color: active ? colors.onPrimary : colors.textMuted }]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderWidth: 1, alignSelf: 'flex-end', minWidth: size.toggleMin },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
