import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { goalLine, type GoalProgress } from '@/src/features/goal';
import { numeric, useTheme } from '@/src/theme';

type Props = {
  goal: number;
  progress: GoalProgress;
};

/**
 * 스프링 설정. duration 은 "체감" 시간이라 실제로는 1.5배(≈0.75초)가 걸린다 — DESIGN 의 1초 이내.
 * 바가 트랙 끝을 넘어 튀지 않게 overshoot 는 막는다.
 */
const FILL_SPRING = { duration: 500, dampingRatio: 0.8, overshootClamping: true } as const;

/**
 * 홈 카드의 월 목표 진행 바 + "목표 300,000원 · 62%" 한 줄.
 * 채움 비율이 바뀔 때마다 스프링으로 따라간다 → 목표를 넘기는 저장에서는 끝까지 차오른다.
 * 목표를 넘어도 바는 가득에서 멈추고, 넘은 금액은 문구("달성! +12,000원 초과")로만 보여준다.
 */
export function GoalProgressBar({ goal, progress }: Props) {
  const { colors, type, sp, radius, size } = useTheme();
  const fill = useSharedValue(progress.ratio);

  useEffect(() => {
    fill.value = withSpring(progress.ratio, FILL_SPRING);
  }, [progress.ratio, fill]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  return (
    <View style={{ marginTop: sp.md }}>
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
      <Text
        style={[
          type.note,
          numeric,
          // 달성해도 색은 바꾸지 않는다 (DESIGN: 초과분은 문구로만)
          { color: colors.textMuted, marginTop: sp.sm },
        ]}>
        {goalLine(goal, progress)}
      </Text>
    </View>
  );
}
