import { useLayoutEffect, useRef } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/src/theme';

/** 문구가 바뀔 때 나타나는 시간 (ms) */
const FADE_MS = 200;

type Props = {
  text: string;
};

/**
 * 홈 카드 큰 숫자 위 "오늘의 한 줄". 보조 문장이라 note + textMuted.
 * 카드 높이가 문구마다 흔들리지 않게 2줄까지만 보여 주고 넘치면 말줄임.
 * 문구가 바뀌면 0.2초 동안 투명 → 불투명으로 나타난다 (처음 그릴 때는 바로 보인다).
 */
export function DailyLine({ text }: Props) {
  const { colors, type } = useTheme();
  const opacity = useSharedValue(1);
  const shownText = useRef(text);

  // 새 문구가 그려지기 전에 투명으로 돌려야 "새 문구 한 프레임 → 사라짐 → 페이드" 깜빡임이 없다
  useLayoutEffect(() => {
    if (shownText.current === text) return;
    shownText.current = text;
    opacity.value = 0;
    opacity.value = withTiming(1, { duration: FADE_MS });
  }, [text, opacity]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.Text
      testID="daily-line"
      accessibilityRole="text"
      numberOfLines={2}
      ellipsizeMode="tail"
      style={[type.note, { color: colors.textMuted }, fadeStyle]}>
      {text}
    </Animated.Text>
  );
}

