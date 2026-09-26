import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import {
  presetA11yLabel,
  presetLabel,
  type AmountPreset,
  type PresetSign,
} from '@/src/features/amountPresets';
import { useSettingsStore } from '@/src/store/settingsStore';
import { numeric, size, useTheme } from '@/src/theme';

type Props = {
  sign: PresetSign;
  onToggleSign: () => void;
  onPress: (preset: AmountPreset) => void;
};

/** 화면에 보이는 부호. 빼기는 하이픈보다 넓은 수학 기호(U+2212)라 + 와 폭이 비슷하다 */
const SIGN_TEXT: Record<PresetSign, string> = { '+': '+', '-': '−' };

/**
 * (M4.5) 금액 칸 바로 아래 프리셋 칩 한 줄: [+] 5백 · 1천 · 3천 · 5천 · 1만.
 * 맨 앞 부호 칩을 누르면 − 가 되고, 그동안 금액 칩은 뺀다. − 상태는 선택 칩처럼 primary 로 채워
 * 글자 하나만이 아니라 채움으로도 알린다. 금액 칩 값은 설정 탭 "빠른 금액 버튼" 에서 바꾼다(스토어).
 * 키패드가 떠 있어도 첫 탭이 바로 먹도록 keyboardShouldPersistTaps="always".
 */
export function AmountPresetChips({ sign, onToggleSign, onPress }: Props) {
  const { colors, type, sp, radius } = useTheme();
  const presets = useSettingsStore((s) => s.amountPresets);
  const minus = sign === '-';

  const chipBase = {
    borderRadius: radius.pill,
    paddingHorizontal: sp.md,
    paddingVertical: sp.sm,
  } as const;

  return (
    <ScrollView
      horizontal
      testID="amount-preset-chips"
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="always"
      contentContainerStyle={{ gap: sp.sm }}>
      <Pressable
        testID="preset-sign-chip"
        onPress={onToggleSign}
        accessibilityRole="button"
        accessibilityLabel={minus ? '빼기 모드' : '더하기 모드'}
        accessibilityHint={minus ? '누르면 더하기로 바꿉니다' : '누르면 빼기로 바꿉니다'}
        accessibilityState={{ selected: minus }}
        style={({ pressed }) => [
          styles.chip,
          styles.signChip,
          chipBase,
          {
            backgroundColor: minus ? colors.primary : colors.card,
            borderColor: minus ? colors.primary : colors.border,
            opacity: pressed ? 0.7 : 1,
          },
        ]}>
        <Text style={[type.bodyStrong, { color: minus ? colors.onPrimary : colors.text }]}>
          {SIGN_TEXT[sign]}
        </Text>
      </Pressable>
      {presets.map((preset, index) => (
        <Pressable
          // 값이 같아도(검증이 막지만) 자리가 다르면 다른 칩이다
          key={`${index}-${preset}`}
          onPress={() => onPress(preset)}
          accessibilityRole="button"
          accessibilityLabel={presetA11yLabel(preset, sign)}
          style={({ pressed }) => [
            styles.chip,
            chipBase,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
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
  signChip: { minWidth: size.touch, alignItems: 'center' },
});
