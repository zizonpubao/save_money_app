import { useEffect, useRef, useState } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import {
  Easing,
  useAnimatedReaction,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
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
  /** (M4) 값이 바뀐 뒤 카운트업을 시작하기까지 기다리는 시간(ms). 저장 연출의 타격(t0+80)에 맞춘다. 마운트 카운트업에는 쓰지 않는다 */
  delay?: number;
  style?: StyleProp<TextStyle>;
};

/**
 * 값이 바뀌면 이전 값 → 새 값으로 숫자가 굴러가는 원화 텍스트.
 * 저장 직후 카운트업과 하루 첫 오픈 카운트업이 같은 컴포넌트를 쓴다.
 */
export function AnimatedWon({ value, duration = 600, from, fromDuration, delay = 0, style }: Props) {
  const progress = useSharedValue(from ?? value);
  const [display, setDisplay] = useState(from ?? value);
  const mounted = useRef(false);

  useEffect(() => {
    const changed = mounted.current;
    const ms = changed ? duration : (fromDuration ?? duration);
    mounted.current = true;
    const roll = withTiming(value, { duration: ms, easing: Easing.out(Easing.cubic) });
    progress.value = changed && delay > 0 ? withDelay(delay, roll) : roll;
  }, [value, duration, fromDuration, delay, progress]);

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
