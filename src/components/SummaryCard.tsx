import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
/** (M3.6) 하루 첫 오픈 카운트업 0 → 월 합계 시간 */
const FIRST_OPEN_COUNT_UP_MS = 800;

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
  /** (M3.6 슬롯) 큰 숫자 위 "오늘의 한 줄". 없으면 자리도 차지하지 않는다 */
  topLine?: ReactNode;
  /** (M3.6 슬롯) 오늘 행 아래 — 이모지 적립 줄, 카드 안 잔디. 없으면 자리도 차지하지 않는다 */
  bottomExtra?: ReactNode;
  /**
   * (M3.6) 합계를 DB 에서 읽었는지. 읽기 전(스토어 기본값 0원)에는 굴리지 않고 그대로 보여주다가,
   * 읽은 뒤 첫 값은 카운트업 없이 바로 보여준다 (같은 날 두 번째 오픈은 즉시 표시).
   */
  ready?: boolean;
  /** (M3.6) 그날 첫 오픈 횟수. 1 이상이 되거나 커질 때마다 큰 숫자가 0 → 월 합계로 0.8초 카운트업 */
  firstOpenTick?: number;
};

/**
 * 홈 상단 카드. 한 카드 안에서 구획을 위→아래로 나눈다:
 * (한 줄) → 숫자(이번 달, 주인공) → 목표(진행 바 + 회색 한 줄) → 구분선 → 오늘 행 → (이모지·잔디)
 */
export function SummaryCard({
  todayTotal,
  monthTotal,
  celebrateTick,
  goal = null,
  goalReachedTick = 0,
  onGoalPress,
  topLine,
  bottomExtra,
  ready = true,
  firstOpenTick = 0,
}: Props) {
  const { colors, type, sp, radius, size } = useTheme();
  const todayLabel = formatKoDate(today());
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
  const bigNumberStyle = [type.display, numeric, { color: colors.primary, marginTop: sp.xs }];

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

      {/* ① (M3.6) 오늘의 한 줄 — 큰 숫자 위 */}
      {topLine ? <View style={{ marginBottom: sp.md }}>{topLine}</View> : null}

      {/* ② 숫자 구획: 작은 회색 라벨 + 주인공 숫자 (카드에서 display 크기는 이것 하나) */}
      <Text style={[type.caption, { color: colors.textMuted }]}>
        이번 달 절약 · {formatKoMonth(thisMonth())}
      </Text>
      {ready ? (
        // key 가 바뀌면 새로 마운트돼 from(0) 부터 다시 굴러간다 (자정 넘겨 다시 포커스된 경우 포함)
        <AnimatedWon
          key={firstOpenTick}
          value={monthTotal}
          from={firstOpenTick > 0 ? 0 : undefined}
          fromDuration={FIRST_OPEN_COUNT_UP_MS}
          style={bigNumberStyle}
        />
      ) : (
        <Text style={bigNumberStyle}>{formatWon(monthTotal)}</Text>
      )}

      {/* ③ 목표 구획: 큰 숫자와 sp.lg 띄워 별도 줄로 */}
      {goal !== null && progress !== null ? (
        <View style={{ marginTop: sp.lg }}>
          <GoalProgressBar goal={goal} progress={progress} />
        </View>
      ) : (
        <Pressable
          onPress={onGoalPress}
          disabled={!onGoalPress}
          accessibilityRole="link"
          style={({ pressed }) => [
            styles.goalHint,
            // 터치 영역(44) 안의 위아래 여백이 있어 sp.smd 만 줘도 보이는 간격은 진행 바와 비슷하다
            { minHeight: size.touch, marginTop: sp.smd, opacity: pressed ? 0.7 : 1 },
          ]}>
          <Text style={[type.label, { color: colors.primary }]}>목표를 정하면 진행률이 보여요 →</Text>
        </Pressable>
      )}

      {/* ④ 오늘 구획: 구분선 아래 한 줄 — 왼쪽 라벨·날짜, 오른쪽 금액 */}
      <View
        style={[styles.divider, { backgroundColor: colors.divider, marginTop: sp.md }]}
      />
      <View
        accessible
        accessibilityLabel={`오늘 ${formatWon(todayTotal)} · ${todayLabel}`}
        style={[styles.todayRow, { marginTop: sp.md, gap: sp.sm }]}>
        <Text style={[type.caption, styles.todayLabel, { color: colors.textMuted }]}>
          오늘 · {todayLabel}
        </Text>
        <Text style={[type.bodyStrong, numeric, { color: colors.text }]}>
          {formatWon(todayTotal)}
        </Text>
      </View>

      {/* ⑤ (M3.6) 이모지 적립 줄 · 카드 안 잔디 */}
      {bottomExtra ? <View style={{ marginTop: sp.md }}>{bottomExtra}</View> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  goalHint: { justifyContent: 'center', alignSelf: 'flex-start' },
  divider: { height: StyleSheet.hairlineWidth },
  todayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  todayLabel: { flexShrink: 1 },
});
