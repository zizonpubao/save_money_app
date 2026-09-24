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

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { flex: 1 },
});
