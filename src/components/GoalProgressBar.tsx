import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { type GoalProgress } from '@/src/features/goal';
import { numeric, useTheme } from '@/src/theme';
import { formatWon } from '@/src/utils/money';

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
 * 홈 카드의 월 목표 진행 바 + 그 아래 한 줄.
 * - 왼쪽: "목표 300,000원" (caption, 회색)
 * - 오른쪽 끝: "62%" (bodyStrong, primary). 달성 후에도 "104%" 처럼 % 가 남고, 앞에 "+12,000원 초과"
 * 채움 비율이 바뀔 때마다 스프링으로 따라간다 → 목표를 넘기는 저장에서는 끝까지 차오른다.
 * 목표를 넘어도 바는 가득에서 멈추고, 넘은 금액은 % 와 문구로만 보여준다.
 */
export function GoalProgressBar({ goal, progress }: Props) {
  const { colors, type, sp, radius, size } = useTheme();
  const fill = useSharedValue(progress.ratio);

  useEffect(() => {
    fill.value = withSpring(progress.ratio, FILL_SPRING);
  }, [progress.ratio, fill]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

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
