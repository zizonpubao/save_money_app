import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import {
  AMOUNT_PRESETS,
  presetA11yLabel,
  presetLabel,
  type AmountPreset,
} from '@/src/features/amountPresets';
import { numeric, size, useTheme } from '@/src/theme';

type Props = { onPress: (preset: AmountPreset) => void };

/**
 * (M4.5) 금액 칸 바로 아래 프리셋 칩 한 줄: 500원 · 1천 · 3천 · 5천 · 1만. 누를 때마다 금액에 더한다.
 * 모양은 카테고리 칩(선택 안 된 상태)과 같고, 누르는 동작이라 선택 상태가 없다.
 * 키패드가 떠 있어도 첫 탭이 바로 먹도록 keyboardShouldPersistTaps="always".
 */
export function AmountPresetChips({ onPress }: Props) {
  const { colors, type, sp, radius } = useTheme();
  return (
    <ScrollView
      horizontal
      testID="amount-preset-chips"
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="always"
      contentContainerStyle={{ gap: sp.sm }}>
      {AMOUNT_PRESETS.map((preset) => (
        <Pressable
          key={preset}
          onPress={() => onPress(preset)}
          accessibilityRole="button"
          accessibilityLabel={presetA11yLabel(preset)}
          style={({ pressed }) => [
            styles.chip,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: radius.pill,
              paddingHorizontal: sp.md,
              paddingVertical: sp.sm,
              opacity: pressed ? 0.7 : 1,
            },
          ]}>
          <Text style={[type.note, numeric, { color: colors.text }]}>{presetLabel(preset)}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chip: { borderWidth: 1, justifyContent: 'center', minHeight: size.touch },
});
