import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import type { Category, RecentTitle } from '@/src/db';
import { entryEmoji, toCategoryMap } from '@/src/store/categoryStore';
import { size, useTheme } from '@/src/theme';
import { formatWon } from '@/src/utils/money';

type Props = {
  items: RecentTitle[];
  categories: Category[];
  onPress: (item: RecentTitle) => void;
};

/**
 * (M4) 입력 시트 맨 위 빠른 입력 칩. 최근 쓴 항목을 누르면 항목명·카테고리·금액이 채워진다.
 * 모양은 카테고리 칩(선택 안 된 상태)과 같다. 누르는 동작이라 선택 상태는 없다.
 * 기록이 없으면 줄째로 그리지 않는다.
 */
export function QuickEntryChips({ items, categories, onPress }: Props) {
  const { colors, type, sp, radius } = useTheme();
  if (items.length === 0) return null;
  const categoryMap = toCategoryMap(categories);

  return (
    <ScrollView
      horizontal
      testID="quick-entry-chips"
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="always"
      contentContainerStyle={{ gap: sp.sm }}>
      {items.map((item) => {
        const label = `${entryEmoji(item.categoryId, categoryMap)} ${item.title}`;
        return (
          <Pressable
            key={item.title}
            onPress={() => onPress(item)}
            accessibilityRole="button"
            accessibilityLabel={`${item.title} ${formatWon(item.amount)} 채우기`}
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
            <Text numberOfLines={1} style={[type.note, { color: colors.text }]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chip: { borderWidth: 1, justifyContent: 'center', minHeight: size.touch },
});
