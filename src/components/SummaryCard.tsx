import { useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { AnimatedWon } from '@/src/components/AnimatedWon';
import { GoalProgressBar } from '@/src/components/GoalProgressBar';
import { goalProgress } from '@/src/features/goal';
import { numeric, useTheme } from '@/src/theme';
import { formatKoDate, formatKoMonth, thisMonth, today } from '@/src/utils/date';
import { formatWon } from '@/src/utils/money';

/** 목표 달성 틴트: 빠르게 번졌다가 천천히 빠진다. 합계 0.8초. */
const TINT_IN_MS = 200;
const TINT_OUT_MS = 600;

type Props = {
  todayTotal: number;
  monthTotal: number;
  /** 값이 바뀔 때마다 스케일 펄스를 재생한다 (0이면 재생 안 함) */
  celebrateTick: number;
  /** 월 목표(원). 없으면 진행 바 대신 "목표를 정하면…" 안내 한 줄 */
  goal?: number | null;
  /** 목표를 처음 넘긴 저장 횟수. 값이 커질 때 카드 배경 틴트를 재생한다. */
  goalReachedTick?: number;
  /** 목표가 없을 때 안내 줄을 탭하면 (설정 탭으로 이동) */
  onGoalPress?: () => void;
};

/** 홈 상단 카드: 이번 달 절약액(크게), 월 목표 진행 바, 오늘 절약액(작게) */
export function SummaryCard({
  todayTotal,
  monthTotal,
  celebrateTick,
  goal = null,
  goalReachedTick = 0,
  onGoalPress,
}: Props) {
  const { colors, type, sp, radius, size } = useTheme();
  const scale = useSharedValue(1);
  const tint = useSharedValue(0);
  // 마운트 시점의 tick 에서 시작해, 탭을 다시 그렸다고 지난 달성 틴트가 재생되지 않게 한다.
  const seenGoalTick = useRef(goalReachedTick);

  useEffect(() => {
    if (celebrateTick === 0) return;
    scale.value = withSequence(
      withSpring(1.06, { damping: 9, stiffness: 420 }),
      withSpring(1, { damping: 14, stiffness: 220 }),
    );
  }, [celebrateTick, scale]);

  useEffect(() => {
    if (goalReachedTick <= seenGoalTick.current) return;
    seenGoalTick.current = goalReachedTick;
    tint.value = withSequence(
      withTiming(1, { duration: TINT_IN_MS }),
      withTiming(0, { duration: TINT_OUT_MS }),
    );
  }, [goalReachedTick, tint]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const tintStyle = useAnimatedStyle(() => ({ opacity: tint.value }));
  const progress = useMemo(() => goalProgress(monthTotal, goal), [monthTotal, goal]);

  return (
    <Animated.View
      style={[
        animatedStyle,
        { backgroundColor: colors.card, borderRadius: radius.lg, padding: sp.lg },
      ]}>
      {/* 달성 틴트는 내용 뒤에 깐 primarySoft 층의 투명도로 낸다 (글자 위를 덮지 않게 맨 앞 자식) */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: colors.primarySoft, borderRadius: radius.lg },
          tintStyle,
        ]}
      />
      <Text style={[type.note, { color: colors.textMuted }]}>{formatKoMonth(thisMonth())}</Text>
      <Text style={[type.bodyStrong, { color: colors.text, marginTop: sp.sm }]}>이번 달 절약</Text>
      <AnimatedWon
        value={monthTotal}
        style={[type.display, numeric, { color: colors.primary, marginTop: sp.xs }]}
      />
      {goal !== null && progress !== null ? (
        <GoalProgressBar goal={goal} progress={progress} />
      ) : (
        <Pressable
          onPress={onGoalPress}
          disabled={!onGoalPress}
          accessibilityRole="link"
          style={({ pressed }) => [
            styles.goalHint,
            { minHeight: size.touch, marginTop: sp.xs, opacity: pressed ? 0.7 : 1 },
          ]}>
          <Text style={[type.label, { color: colors.primary }]}>목표를 정하면 진행률이 보여요 →</Text>
        </Pressable>
      )}
      <Text style={[type.note, numeric, { color: colors.textMuted, marginTop: sp.sm }]}>
        오늘 {formatWon(todayTotal)} · {formatKoDate(today())}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  goalHint: { justifyContent: 'center', alignSelf: 'flex-start' },
});
