import { useEffect, useRef, useState } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import { Easing, useAnimatedReaction, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { formatWon } from '@/src/utils/money';

type Props = {
  value: number;
  /** 값이 바뀔 때 카운트업 시간(ms). 기본 600 */
  duration?: number;
  /**
   * 마운트할 때 이 값에서 value 까지 굴러간다 (하루 첫 오픈의 0 → 월 합계).
   * 없으면 첫 렌더는 애니메이션 없이 바로 value 를 보여준다.
   */
  from?: number;
  /** from 에서 굴러가는 첫 카운트업 시간(ms). 기본은 duration */
  fromDuration?: number;
  style?: StyleProp<TextStyle>;
};

/**
 * 값이 바뀌면 이전 값 → 새 값으로 숫자가 굴러가는 원화 텍스트.
 * 저장 직후 카운트업과 하루 첫 오픈 카운트업이 같은 컴포넌트를 쓴다.
 */
export function AnimatedWon({ value, duration = 600, from, fromDuration, style }: Props) {
  const progress = useSharedValue(from ?? value);
  const [display, setDisplay] = useState(from ?? value);
  const mounted = useRef(false);

  useEffect(() => {
    const ms = mounted.current ? duration : (fromDuration ?? duration);
    mounted.current = true;
    progress.value = withTiming(value, { duration: ms, easing: Easing.out(Easing.cubic) });
  }, [value, duration, fromDuration, progress]);

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
