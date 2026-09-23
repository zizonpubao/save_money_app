import { useEffect, useState } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import { Easing, useAnimatedReaction, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { formatWon } from '@/src/utils/money';

type Props = {
  value: number;
  /** 카운트업 시간(ms). 기본 600 */
  duration?: number;
  style?: StyleProp<TextStyle>;
};

/**
 * 값이 바뀌면 이전 값 → 새 값으로 숫자가 굴러가는 원화 텍스트.
 * 첫 렌더에서는 애니메이션 없이 바로 표시한다.
 */
export function AnimatedWon({ value, duration = 600, style }: Props) {
  const progress = useSharedValue(value);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    progress.value = withTiming(value, { duration, easing: Easing.out(Easing.cubic) });
  }, [value, duration, progress]);

  useAnimatedReaction(
    () => Math.round(progress.value),
    (current, previous) => {
      if (current !== previous) {
        scheduleOnRN(setDisplay, current);
      }
    },
  );

  return <Text style={style}>{formatWon(display)}</Text>;
}
