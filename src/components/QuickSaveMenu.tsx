import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { withSpring, withTiming } from 'react-native-reanimated';

import type { Category, RecentTitle } from '@/src/db';
import { entryEmoji, toCategoryMap } from '@/src/store/categoryStore';
import { motion, numeric, shadow, size, useTheme } from '@/src/theme';
import { formatWon } from '@/src/utils/money';

type Props = {
  items: RecentTitle[];
  categories: Category[];
  reduceMotion?: boolean;
  /** 항목을 누름 = 모달 없이 바로 저장 */
  onPick: (item: RecentTitle) => void;
  /** 메뉴 밖을 누르거나 쓸기 시작함 */
  onClose: () => void;
};

// FAB 쪽(오른쪽 아래) 모서리에서 위로 펼쳐지고, 닫힐 때 같은 모서리로 접힌다.
// 부모가 메뉴를 빼면 reanimated 가 exiting 을 끝까지 그린 뒤 치운다 (원탭 저장의 t0 = 이 150ms 직후)
const SPRING_OPEN = { ...motion.springQuickMenu, duration: motion.quickMenuMs };
const FADE = { duration: motion.quickMenuMs };

function entering() {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ scale: motion.quickMenuFrom }] },
    animations: {
      opacity: withTiming(1, FADE),
      transform: [{ scale: withSpring(1, SPRING_OPEN) }],
    },
  };
}

function exiting() {
  'worklet';
  return {
    initialValues: { opacity: 1, transform: [{ scale: 1 }] },
    animations: {
      opacity: withTiming(0, FADE),
      transform: [{ scale: withTiming(motion.quickMenuFrom, FADE) }],
    },
  };
}

/** 동작 줄이기: 크기 변화 없이 나타나고 사라지기만 */
function fadeIn() {
  'worklet';
  return { initialValues: { opacity: 0 }, animations: { opacity: withTiming(1, FADE) } };
}

function fadeOut() {
  'worklet';
  return { initialValues: { opacity: 1 }, animations: { opacity: withTiming(0, FADE) } };
}

/**
 * (M4.5) + 버튼을 길게 누르면 FAB 위에 뜨는 원탭 저장 메뉴. 최근 항목(최대 4개)을 누르면 바로 저장된다.
 * 뒤쪽 전체를 투명한 막으로 덮어, 메뉴 밖을 누르거나 쓸기 시작하면(FAB 짧은 탭 포함) 닫는다.
 * 루트가 Fragment 라 두 조각이 홈 Screen 의 직계 자식이 된다 (exiting 이 부모 없이 바로 돈다).
 */
export function QuickSaveMenu({ items, categories, reduceMotion = false, onPick, onClose }: Props) {
  const { colors, type, sp, radius } = useTheme();
  const categoryMap = toCategoryMap(categories);

  return (
    <>
      <Pressable
        testID="quick-save-backdrop"
        accessibilityLabel="메뉴 닫기"
        onPressIn={onClose}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View
        testID="quick-save-menu"
        accessibilityRole="menu"
        entering={reduceMotion ? fadeIn : entering}
        exiting={reduceMotion ? fadeOut : exiting}
        style={[
          styles.card,
          {
            right: sp.lg,
            bottom: sp.lg + size.fab + sp.sm,
            backgroundColor: colors.card,
            borderRadius: radius.lg,
            paddingVertical: sp.xs,
            shadowColor: colors.shadow,
          },
        ]}>
        <Text
          style={[
            type.caption,
            { color: colors.textMuted, paddingHorizontal: sp.md, paddingVertical: sp.xs },
          ]}>
          누르면 바로 저장
        </Text>
        {items.map((item, index) => {
          const emoji = entryEmoji(item.categoryId, categoryMap);
          return (
            <Pressable
              key={item.title}
              testID="quick-save-row"
              onPress={() => onPick(item)}
              accessibilityRole="menuitem"
              accessibilityLabel={`${item.title} ${formatWon(item.amount)} 바로 저장`}
              style={({ pressed }) => [
                styles.row,
                {
                  paddingHorizontal: sp.md,
                  gap: sp.sm,
                  opacity: pressed ? 0.7 : 1,
                  borderTopColor: colors.divider,
                  borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                },
              ]}>
              <View style={styles.emoji}>
                <Text style={type.body}>{emoji}</Text>
              </View>
              <Text numberOfLines={1} style={[styles.title, type.body, { color: colors.text }]}>
                {item.title}
              </Text>
              <Text style={[type.bodyStrong, numeric, { color: colors.text }]}>
                {formatWon(item.amount)}
              </Text>
            </Pressable>
          );
        })}
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: size.quickMenuWidth,
    // FAB 쪽 모서리를 기준으로 커지고 작아진다
    transformOrigin: 'bottom right',
    ...shadow.fab,
  },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: size.touch },
  emoji: { width: size.emojiCell, alignItems: 'center' },
  title: { flex: 1 },
});
