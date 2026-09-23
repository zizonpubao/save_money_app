import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

import { AnimatedWon } from '@/src/components/AnimatedWon';
import { useTheme } from '@/src/theme';
import { formatKoDate, today } from '@/src/utils/date';
import { formatWon } from '@/src/utils/money';

type Props = {
  todayTotal: number;
  monthTotal: number;
  /** 값이 바뀔 때마다 스케일 펄스를 재생한다 (0이면 재생 안 함) */
  celebrateTick: number;
};

/** 홈 상단 카드: 오늘 날짜, 오늘 절약액(크게), 이번 달 누적(작게) */
export function TodayCard({ todayTotal, monthTotal, celebrateTick }: Props) {
  const { colors, fs, sp, radius } = useTheme();
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
      <Text style={{ color: colors.textMuted, fontSize: fs.sm }}>{formatKoDate(today())}</Text>
      <Text style={[styles.label, { color: colors.text, fontSize: fs.md, marginTop: sp.sm }]}>
        오늘 절약액
      </Text>
      <AnimatedWon
        value={todayTotal}
        style={[styles.amount, { color: colors.primary, fontSize: fs.xxl, marginTop: sp.xs }]}
      />
      <Text style={{ color: colors.textMuted, fontSize: fs.sm, marginTop: sp.sm }}>
        이번 달 누적 {formatWon(monthTotal)}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {},
  label: { fontWeight: '600' },
  amount: { fontWeight: '800', fontVariant: ['tabular-nums'] },
});
