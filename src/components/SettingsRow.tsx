import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { numeric, size, useTheme } from '@/src/theme';

type Props = {
  label: string;
  /** 오른쪽 회색 값 (예: "300,000원" / "없음") */
  value?: string;
  onPress: () => void;
  /** 섹션 마지막 행은 아래 구분선이 없다 */
  isLast?: boolean;
};

/** 설정 행: 왼쪽 이름 · 오른쪽 값 · 꺾쇠. 누르면 편집 화면(모달)을 연다. */
export function SettingsRow({ label, value, onPress, isLast = false }: Props) {
  const { colors, type, sp, fs } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={value ? `${label} ${value}` : label}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.card,
          paddingHorizontal: sp.md,
          paddingVertical: sp.smd,
          minHeight: size.touch,
          borderBottomColor: colors.divider,
          borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
          opacity: pressed ? 0.7 : 1,
        },
      ]}>
      <Text style={[type.body, styles.label, { color: colors.text }]}>{label}</Text>
      {value ? (
        <Text style={[type.note, numeric, { color: colors.textMuted, marginRight: sp.xs }]}>
          {value}
        </Text>
      ) : null}
      <Ionicons name="chevron-forward" size={fs.md} color={colors.textMuted} />
    </Pressable>
  );
}

type SwitchProps = {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  /** 섹션 마지막 행은 아래 구분선이 없다 */
  isLast?: boolean;
};

/** (M4) 켬/끔 설정 행: 왼쪽 이름 · 오른쪽 스위치. 행 모양(여백·구분선·높이)은 SettingsRow 와 같다 */
export function SettingsSwitchRow({ label, value, onValueChange, isLast = false }: SwitchProps) {
  const { colors, type, sp } = useTheme();
  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: colors.card,
          paddingHorizontal: sp.md,
          paddingVertical: sp.smd,
          minHeight: size.touch,
          borderBottomColor: colors.divider,
          borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
        },
      ]}>
      <Text style={[type.body, styles.label, { color: colors.text }]}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: colors.primary, false: colors.border }}
      />
    </View>
  );
}

export type SettingsChip = {
  label: string;
  /** 스크린리더 이름 (예: "톡 미리 듣기") */
  accessibilityLabel: string;
  onPress: () => void;
};

type ChipsProps = {
  chips: readonly SettingsChip[];
  /** 위 스위치가 꺼져 있으면 칩을 흐리게 하고 누를 수 없게 한다 */
  disabled?: boolean;
  /** 칩 아래 회색 안내 한 줄 */
  note?: string;
  isLast?: boolean;
  testID?: string;
};

/** (M4) 스위치 아래 "미리 듣기·느껴 보기" 칩 줄. 행 여백·구분선은 SettingsRow 와 같다 */
export function SettingsChipsRow({ chips, disabled = false, note, isLast = false, testID }: ChipsProps) {
  const { colors, type, sp, radius } = useTheme();
  return (
    <View
      testID={testID}
      style={{
        backgroundColor: colors.card,
        paddingHorizontal: sp.md,
        paddingBottom: sp.smd,
        borderBottomColor: colors.divider,
        borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
        gap: sp.sm,
      }}>
      <View style={[styles.chips, { gap: sp.sm, opacity: disabled ? 0.4 : 1 }]}>
        {chips.map((chip) => (
          <Pressable
            key={chip.label}
            onPress={chip.onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={chip.accessibilityLabel}
            accessibilityState={{ disabled }}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: pressed ? colors.primarySoft : colors.card,
                borderColor: pressed ? colors.primary : colors.border,
                borderRadius: radius.pill,
                paddingHorizontal: sp.md,
                minHeight: size.touch,
              },
            ]}>
            <Text style={[type.note, { color: colors.text }]}>{chip.label}</Text>
          </Pressable>
        ))}
      </View>
      {note ? <Text style={[type.caption, { color: colors.textMuted }]}>{note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { borderWidth: 1, justifyContent: 'center' },
});
