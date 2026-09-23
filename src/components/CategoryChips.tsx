import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import type { Category } from '@/src/db';
import { useTheme } from '@/src/theme';

type Props = {
  categories: Category[];
  selectedId: number | null;
  onSelect: (category: Category) => void;
};

/** 가로 스크롤 카테고리 칩. 선택된 칩은 primary 로 강조. */
export function CategoryChips({ categories, selectedId, onSelect }: Props) {
  const { colors, fs, sp, radius } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="always"
      contentContainerStyle={{ gap: sp.sm }}>
      {categories.map((c) => {
        const selected = c.id === selectedId;
        return (
          <Pressable
            key={c.id}
            onPress={() => onSelect(c)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[
              styles.chip,
              {
                backgroundColor: selected ? colors.primary : colors.card,
                borderColor: selected ? colors.primary : colors.border,
                borderRadius: radius.lg,
                paddingHorizontal: sp.md,
                paddingVertical: sp.sm,
              },
            ]}>
            <Text style={{ color: selected ? colors.onPrimary : colors.text, fontSize: fs.sm }}>
              {c.emoji} {c.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chip: { borderWidth: 1 },
});
