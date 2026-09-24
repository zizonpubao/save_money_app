import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

import type { EntryEmoji } from '@/src/db';
import { useTheme } from '@/src/theme';

/** 줄이 이보다 많아지면 오래된 것부터 접어 "+N" 으로 보여준다 */
export const EMOJI_MAX_LINES = 3;
/** "+N" 칸에 숫자로 쓰는 최대값. 넘으면 "999+" */
const MORE_MAX = 999;

type Props = {
  /** 이번 달 기록 이모지, 등록 순 (오래된 것 → 방금 저장한 것) */
  items: EntryEmoji[];
  /** 저장 성공 횟수. 이 값이 커진 렌더에서 처음 보는 id 만 톡 튀어 들어온다 */
  celebrateTick: number;
  /** 최대 줄 수. 넘치면 오래된 것을 "+N" 으로 접는다 (홈 칩 행은 1줄) */
  maxLines?: number;
  /** (M4) 동작 줄이기: 새 이모지를 튀기지 않고 바로 보여준다 */
  reduceMotion?: boolean;
};

/**
 * 한 줄에 몇 칸, 전부 몇 칸까지 보여줄지. 넘치면 최근 것을 남기고 앞에 "+N" 한 칸을 둔다.
 * 폭을 아직 모르면(첫 레이아웃 전) 자르지 않는다.
 */
export function visibleEmojis(
  items: readonly EntryEmoji[],
  perLine: number,
  maxLines: number = EMOJI_MAX_LINES,
): { hidden: number; shown: readonly EntryEmoji[] } {
  const capacity = perLine * maxLines;
  if (perLine <= 0 || items.length <= capacity) return { hidden: 0, shown: items };
  // "+N" 도 한 칸을 차지하므로 이모지는 capacity - 1 개만
  const keep = Math.max(0, capacity - 1);
  return { hidden: items.length - keep, shown: items.slice(items.length - keep) };
}

/** "+N" 칸에 넣을 글자. 칸 폭이 이모지 한 칸으로 고정이라 세 자리까지만 */
export function hiddenLabel(hidden: number): string {
  return hidden > MORE_MAX ? `${MORE_MAX}+` : `+${hidden}`;
}

/** 저장 직후 새 이모지 한 칸: t0+200 에 0 → 1.3 → 1 (springHit → springSettle) */
function PopIn({ children }: { children: string }) {
  const { fs, size, motion } = useTheme();
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      motion.emojiAt,
      withSequence(
        withSpring(motion.chipHit, { ...motion.springHit, overshootClamping: true }),
        withSpring(1, motion.springSettle),
      ),
    );
  }, [scale, motion]);

  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.Text
      testID="emoji-pop"
      style={[styles.cell, { width: size.emojiCell, fontSize: fs.md, lineHeight: size.emojiCell }, popStyle]}>
      {children}
    </Animated.Text>
  );
}

type Tracked = { items: EntryEmoji[]; tick: number; popId: number | null };

/**
 * 이모지 적립 줄. 이번 달 기록의 카테고리 이모지가 등록 순서대로 쌓이고 줄이 넘치면 다음 줄로.
 * 저장하면 새 이모지가 오른쪽 끝에서 톡 들어온다. 수정·삭제·다시 읽기는 애니메이션 없이 바뀐다.
 * 기록이 없으면 아무것도 그리지 않는다.
 */
export function EmojiStrip({
  items,
  celebrateTick,
  maxLines = EMOJI_MAX_LINES,
  reduceMotion = false,
}: Props) {
  const { colors, type, fs, sp, size } = useTheme();
  const [width, setWidth] = useState(0);
  // 직전 렌더의 목록·저장 횟수를 기억해 "이번 저장으로 새로 생긴 칸" 을 렌더 중에 가린다
  // (effect 에서 가리면 새 칸이 한 프레임 원래 크기로 보였다가 작아진다)
  const [tracked, setTracked] = useState<Tracked>({ items, tick: celebrateTick, popId: null });
  let popId = tracked.popId;
  if (tracked.items !== items || tracked.tick !== celebrateTick) {
    const before = new Set(tracked.items.map((e) => e.id));
    const added = items.filter((e) => !before.has(e.id));
    const saved = celebrateTick > tracked.tick;
    popId = saved && added.length > 0 ? (added[added.length - 1]?.id ?? null) : null;
    setTracked({ items, tick: celebrateTick, popId });
  }

  if (items.length === 0) return null;

  const gap = sp.xs;
  const perLine = width > 0 ? Math.max(1, Math.floor((width + gap) / (size.emojiCell + gap))) : 0;
  const { hidden, shown } = visibleEmojis(items, perLine, maxLines);
  const cellStyle = [
    styles.cell,
    { width: size.emojiCell, fontSize: fs.md, lineHeight: size.emojiCell },
  ];

  return (
    <View
      testID="emoji-strip"
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityLabel={`이번 달 기록 ${items.length}개`}
      style={[styles.wrap, { gap }]}>
      {hidden > 0 ? (
        <View style={[styles.more, { width: size.emojiCell, height: size.emojiCell }]}>
          <Text numberOfLines={1} style={[type.caption, { color: colors.textMuted }]}>
            {hiddenLabel(hidden)}
          </Text>
        </View>
      ) : null}
      {shown.map((e) =>
        e.id === popId && !reduceMotion ? (
          <PopIn key={e.id}>{e.emoji}</PopIn>
        ) : (
          <Text key={e.id} style={cellStyle}>
            {e.emoji}
          </Text>
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { textAlign: 'center' },
  more: { alignItems: 'center', justifyContent: 'center' },
});

