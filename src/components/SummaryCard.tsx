import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

import { AnimatedWon } from '@/src/components/AnimatedWon';
import { numeric, useTheme } from '@/src/theme';
import { formatKoDate, formatKoMonth, thisMonth, today } from '@/src/utils/date';
import { formatWon } from '@/src/utils/money';

type Props = {
  todayTotal: number;
  monthTotal: number;
  /** 값이 바뀔 때마다 스케일 펄스를 재생한다 (0이면 재생 안 함) */
  celebrateTick: number;
};

/** 홈 상단 카드: 이번 달 절약액(크게), 오늘 절약액(작게) */
export function SummaryCard({ todayTotal, monthTotal, celebrateTick }: Props) {
  const { colors, type, sp, radius } = useTheme();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (celebrateTick === 0) return;
    scale.value = withSequence(
      withSpring(1.06, { damping: 9, stiffness: 420 }),
      withSpring(1, { damping: 14, stiffness: 220 }),
    );
  }, [celebrateTick, scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      style={[
        styles.card,
        animatedStyle,
        { backgroundColor: colors.card, borderRadius: radius.lg, padding: sp.lg },
      ]}>
      <Text style={[type.note, { color: colors.textMuted }]}>{formatKoMonth(thisMonth())}</Text>
      <Text style={[type.bodyStrong, { color: colors.text, marginTop: sp.sm }]}>이번 달 절약</Text>
      <AnimatedWon
        value={monthTotal}
        style={[type.display, numeric, { color: colors.primary, marginTop: sp.xs }]}
      />
      <Text style={[type.note, numeric, { color: colors.textMuted, marginTop: sp.sm }]}>
        오늘 {formatWon(todayTotal)} · {formatKoDate(today())}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {},
});
