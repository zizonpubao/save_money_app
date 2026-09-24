import { useEffect, useRef } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { type GoalProgress } from '@/src/features/goal';
import { numeric, useTheme } from '@/src/theme';
import { formatWon } from '@/src/utils/money';

type Props = {
  goal: number;
  progress: GoalProgress;
  /** (M4) 비율이 바뀐 뒤 차오르기 시작할 때까지(ms). 저장 연출에서는 t0+280 */
  delay?: number;
  /** (M4) 목표를 처음 넘긴 저장 횟수. 이 값이 함께 커진 변화는 더 탄력 있는 스프링으로 끝까지 차오른다 */
  reachedTick?: number;
  /** (M4) 동작 줄이기: 스프링 대신 300ms 로 */
  reduceMotion?: boolean;
};

/**
 * 홈 카드의 월 목표 진행 바 + 그 아래 한 줄.
 * - 왼쪽: "목표 300,000원" (caption, 회색)
 * - 오른쪽 끝: "62%" (bodyStrong, primary). 달성 후에도 "104%" 처럼 % 가 남고, 앞에 "+12,000원 초과"
 * 채움 비율이 바뀔 때마다 스프링으로 따라간다 → 목표를 넘기는 저장에서는 끝까지 차오른다.
 * 목표를 넘어도 바는 가득에서 멈추고, 넘은 금액은 % 와 문구로만 보여준다.
 */
export function GoalProgressBar({
  goal,
  progress,
  delay = 0,
  reachedTick = 0,
  reduceMotion = false,
}: Props) {
  const { colors, type, sp, radius, size, motion } = useTheme();
  const fill = useSharedValue(progress.ratio);
  const seenReached = useRef(reachedTick);

  useEffect(() => {
    const reached = reachedTick !== seenReached.current;
    seenReached.current = reachedTick;
    // 바가 트랙 끝을 넘어 튀어도 트랙(overflow hidden)과 아래 clamp 가 가득에서 멈춰 보이게 한다
    const move = reduceMotion
      ? withTiming(progress.ratio, { duration: motion.reducedBarMs })
      : withSpring(progress.ratio, reached ? motion.springBarGoal : motion.springBar);
    fill.value = delay > 0 ? withDelay(delay, move) : move;
  }, [progress.ratio, reachedTick, delay, reduceMotion, fill, motion]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.min(1, Math.max(0, fill.value)) * 100}%`,
  }));

  return (
    // 위 간격은 쓰는 쪽(SummaryCard 의 목표 구획)이 정한다
    <View>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="월 목표 진행률"
        accessibilityValue={{ min: 0, max: 100, now: Math.min(100, progress.percent) }}
        style={{
          height: size.bar,
          borderRadius: radius.pill,
          backgroundColor: colors.primarySoft,
          overflow: 'hidden',
        }}>
        <Animated.View
          style={[
            { height: '100%', borderRadius: radius.pill, backgroundColor: colors.primary },
            fillStyle,
          ]}
        />
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginTop: sp.sm,
        }}>
        <Text style={[type.caption, numeric, { color: colors.textMuted }]}>
          목표 {formatWon(goal)}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: sp.xs }}>
          {progress.over > 0 ? (
            <Text style={[type.caption, numeric, { color: colors.textMuted }]}>
              +{formatWon(progress.over)} 초과
            </Text>
          ) : null}
          <Text style={[type.bodyStrong, numeric, { color: colors.primary }]}>
            {progress.percent}%
          </Text>
        </View>
      </View>
    </View>
  );
}
