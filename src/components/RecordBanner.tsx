import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { celebrationMessage } from '@/src/features/goal';
import type { PersonalBest } from '@/src/features/personalBest';
import { motion, useTheme } from '@/src/theme';

/** 축하 문구를 띄워 두는 시간 (ms). 등장(t0+300) 뒤부터 센다 */
const SHOW_MS = 1500;

type Props = {
  best: PersonalBest;
  /** 이번 저장으로 월 목표를 처음 넘겼는지. 개인 최고보다 우선한다. */
  goalReached?: boolean;
  /** (M4) 이번 저장으로 새로 넘은 누적 이정표(원). 목표 달성 다음, 개인 최고보다 우선한다. */
  milestone?: number | null;
  /** 저장 횟수. 이 값이 바뀔 때마다 다시 띄운다. */
  celebrateTick: number;
  /** (M4) 동작 줄이기: 이동·크기 변화 없이 투명도로만 등장 */
  reduceMotion?: boolean;
};

type Entrance = 'drop' | 'pop' | 'fade';

/** 등장 모션 (t0+300 시작, 400ms 안): 목표는 위에서 튕겨 내려오고, 이정표·최고는 작게 시작해 넘쳤다 돌아온다 */
function Banner({ message, entrance }: { message: string; entrance: Entrance }) {
  const { colors, type, sp, radius } = useTheme();
  const opacity = useSharedValue(0);
  const offsetY = useSharedValue(entrance === 'drop' ? -20 : 0);
  const scale = useSharedValue(entrance === 'pop' ? 0.8 : 1);

  useEffect(() => {
    const at = motion.bannerAt;
    if (entrance === 'fade') {
      opacity.value = withDelay(at, withTiming(1, { duration: motion.reducedBannerMs }));
      return;
    }
    if (entrance === 'drop') {
      opacity.value = withDelay(at, withTiming(1, { duration: motion.bannerFadeGoalMs }));
      offsetY.value = withDelay(at, withSpring(0, motion.springBannerDrop));
      return;
    }
    opacity.value = withDelay(at, withTiming(1, { duration: motion.bannerFadeMs }));
    scale.value = withDelay(at, withSpring(1, motion.springBannerPop));
  }, [entrance, opacity, offsetY, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: offsetY.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View
      testID="record-banner"
      style={[
        styles.banner,
        { backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: sp.smd },
        animatedStyle,
      ]}>
      <Text style={[type.label, { color: colors.primary }]}>{message}</Text>
    </Animated.View>
  );
}

/**
 * 저장 직후 목표 달성·누적 이정표·개인 최고 갱신 때만 카드 아래에 한 줄. 한 저장에 하나만 (목표 > 이정표 > 최고).
 * 홈은 입력 시트가 다 내려간 순간(t0)에 저장을 화면에 반영하므로 tick 도 그때 바뀐다. 1.5초 머문 뒤 사라진다.
 */
export function RecordBanner({
  best,
  goalReached = false,
  milestone = null,
  celebrateTick,
  reduceMotion = false,
}: Props) {
  // 이미 지나간(숨긴) 저장 횟수. 새 저장이 오면 tick 이 더 커져서 다시 보인다.
  // 마운트 시점의 tick 으로 시작해, 탭을 다시 열었다고 지난 문구가 되살아나지 않게 한다.
  const [dismissed, setDismissed] = useState(celebrateTick);

  useEffect(() => {
    if (celebrateTick === 0) return;
    const timer = setTimeout(() => setDismissed(celebrateTick), motion.bannerAt + SHOW_MS);
    return () => clearTimeout(timer);
  }, [celebrateTick]);

  const message = celebrateTick > dismissed ? celebrationMessage(goalReached, best, milestone) : null;
  if (!message) return null;

  const entrance: Entrance = reduceMotion ? 'fade' : goalReached ? 'drop' : 'pop';
  // key 에 tick 을 넣어 연달아 저장하면 등장 모션을 처음부터 다시 한다
  return <Banner key={celebrateTick} message={message} entrance={entrance} />;
}

const styles = StyleSheet.create({
  banner: { alignItems: 'center' },
});
