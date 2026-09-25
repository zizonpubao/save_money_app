import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Category } from '@/src/db';
import { size, useTheme } from '@/src/theme';

type Props = {
  category: Category;
  onPress: (category: Category) => void;
  /** 위·아래 화살표. 맨 위의 ↑ · 맨 아래의 ↓ 는 비활성 */
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  isLast?: boolean;
};

/**
 * (M5) 설정 "카테고리" 한 줄: 이모지 · 이름 · "기본" 표시 · 위/아래 화살표.
 * 순서 변경은 길게 눌러 끌기 대신 화살표 버튼으로 (라이브러리 없이, 누를 곳이 분명하게).
 * 행 모양(여백·구분선·높이)은 SettingsRow 와 같다
 */
export function CategoryRow({
  category,
  onPress,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  isLast = false,
}: Props) {
  const { colors, type, sp, fs } = useTheme();
  const arrow = (name: 'chevron-up' | 'chevron-down', label: string, enabled: boolean, onMove: () => void) => (
    <Pressable
      onPress={onMove}
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityLabel={`${category.name} ${label}`}
      accessibilityState={{ disabled: !enabled }}
      style={({ pressed }) => [styles.arrow, { opacity: !enabled ? 0.3 : pressed ? 0.7 : 1 }]}>
      <Ionicons name={name} size={fs.lg} color={colors.textMuted} />
    </Pressable>
  );

  return (
    <View
      testID="category-row"
      style={[
        styles.row,
        {
          backgroundColor: colors.card,
          minHeight: size.touch,
          paddingRight: sp.xs,
          borderBottomColor: colors.divider,
          borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
        },
      ]}>
      <Pressable
        onPress={() => onPress(category)}
        accessibilityRole="button"
        accessibilityLabel={`${category.name} 편집`}
        style={({ pressed }) => [
          styles.main,
          { paddingLeft: sp.md, paddingVertical: sp.smd, gap: sp.sm, opacity: pressed ? 0.7 : 1 },
        ]}>
        <Text style={{ fontSize: fs.lg }}>{category.emoji}</Text>
        <Text style={[type.body, styles.name, { color: colors.text }]} numberOfLines={1}>
          {category.name}
        </Text>
        {category.isDefault ? (
          <Text style={[type.caption, { color: colors.textMuted }]}>기본</Text>
        ) : null}
      </Pressable>
      {arrow('chevron-up', '위로', canMoveUp, onMoveUp)}
      {arrow('chevron-down', '아래로', canMoveDown, onMoveDown)}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  name: { flexShrink: 1 },
  arrow: { width: size.touch, height: size.touch, alignItems: 'center', justifyContent: 'center' },
});
