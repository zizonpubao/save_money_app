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
  /** (M5) 되돌릴 수 없는 동작(데이터 전체 삭제). 이름을 danger 색으로 — 색만이 아니라 문구로도 알린다 */
  danger?: boolean;
  /** (M5) 이름 색을 primary 로 (예: "카테고리 추가") */
  accent?: boolean;
};

/** 설정 행: 왼쪽 이름 · 오른쪽 값 · 꺾쇠. 누르면 편집 화면(모달)을 연다. */
export function SettingsRow({ label, value, onPress, isLast = false, danger = false, accent = false }: Props) {
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
      <Text
        numberOfLines={1}
        style={[
          type.body,
          styles.label,
          { color: danger ? colors.danger : accent ? colors.primary : colors.text },
        ]}>
        {label}
      </Text>
      {value ? (
        <Text
          numberOfLines={1}
          style={[
            type.note,
            numeric,
            styles.value,
            { color: colors.textMuted, marginLeft: sp.sm, marginRight: sp.xs },
          ]}>
          {value}
        </Text>
      ) : null}
      <Ionicons name="chevron-forward" size={fs.md} color={colors.textMuted} />
    </Pressable>
  );
}

type InfoProps = {
  label: string;
  value: string;
  isLast?: boolean;
};

/** (M5) 보기 전용 행: 왼쪽 이름 · 오른쪽 회색 값 (예: 버전). 누를 수 없어 꺾쇠가 없다 */
export function SettingsInfoRow({ label, value, isLast = false }: InfoProps) {
  const { colors, type, sp } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${label} ${value}`}
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
      <Text numberOfLines={1} style={[type.body, styles.label, { color: colors.text }]}>
        {label}
      </Text>
      <Text
        numberOfLines={1}
        style={[type.note, numeric, styles.value, { color: colors.textMuted, marginLeft: sp.sm }]}>
        {value}
      </Text>
    </View>
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
  /** 고르는 칩(테마)의 선택 상태. 선택 칩은 primary 채움 + onPrimary 글자. 미리 듣기처럼 누르기만 하는 칩은 비워 둔다 */
  selected?: boolean;
};

type ChipsProps = {
  /** 칩 위 행 이름 (예: "테마"). 없으면 위 스위치 행에 붙은 칩 줄 */
  label?: string;
  chips: readonly SettingsChip[];
  /** 위 스위치가 꺼져 있으면 칩을 흐리게 하고 누를 수 없게 한다 */
  disabled?: boolean;
  /** 칩 아래 회색 안내 한 줄 */
  note?: string;
  isLast?: boolean;
  testID?: string;
};

/**
 * (M4) 스위치 아래 "미리 듣기·느껴 보기" 칩 줄. 행 여백·구분선은 SettingsRow 와 같다.
 * label 이 있으면 이름 한 줄 + 고르는 칩 줄(테마)로 혼자 한 행이 된다
 */
export function SettingsChipsRow({
  label,
  chips,
  disabled = false,
  note,
  isLast = false,
  testID,
}: ChipsProps) {
  const { colors, type, sp, radius } = useTheme();
  return (
    <View
      testID={testID}
      style={{
        backgroundColor: colors.card,
        paddingHorizontal: sp.md,
        // 이름이 있으면 SettingsRow 와 같은 위 여백. 없으면 위 스위치 행의 아래 여백을 이어 쓴다
        paddingTop: label ? sp.smd : 0,
        paddingBottom: sp.smd,
        borderBottomColor: colors.divider,
        borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
        gap: sp.sm,
      }}>
      {label ? (
        <Text numberOfLines={1} style={[type.body, { color: colors.text }]}>
          {label}
        </Text>
      ) : null}
      <View style={[styles.chips, { gap: sp.sm, opacity: disabled ? 0.4 : 1 }]}>
        {chips.map((chip) => (
          <Pressable
            key={chip.label}
            onPress={chip.onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={chip.accessibilityLabel}
            accessibilityState={{ disabled, selected: chip.selected }}
            // 눌림은 다른 칩(빠른 입력·금액 칩)과 같은 opacity 0.7
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: chip.selected ? colors.primary : colors.card,
                borderColor: chip.selected ? colors.primary : colors.border,
                borderRadius: radius.pill,
                paddingHorizontal: sp.md,
                minHeight: size.touch,
                opacity: pressed ? 0.7 : 1,
              },
            ]}>
            <Text style={[type.note, { color: chip.selected ? colors.onPrimary : colors.text }]}>
              {chip.label}
            </Text>
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
  // 값이 길면 이름보다 먼저 줄어 말줄임 (이름은 flex 1 로 남은 폭)
  value: { flexShrink: 1, maxWidth: '60%' },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { borderWidth: 1, justifyContent: 'center' },
});
