import { StyleSheet, Text, View } from 'react-native';

import { numeric, useTheme } from '@/src/theme';
import { formatWon } from '@/src/utils/money';

type Props = {
  total: number;
  count: number;
  /** 하루 평균 (이번 달은 오늘까지 경과일, 지난 달은 그 달 전체 일수 기준) */
  average: number;
};

/** 월별 탭 상단 카드: 월 총 절약액(크게), 기록 건수·하루 평균(작게) */
export function MonthStatsCard({ total, count, average }: Props) {
  const { colors, type, sp, radius } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderRadius: radius.lg, padding: sp.lg }]}>
      <Text style={[type.bodyStrong, { color: colors.text }]}>이 달 절약</Text>
      <Text style={[type.display, numeric, { color: colors.primary, marginTop: sp.xs }]}>
        {formatWon(total)}
      </Text>
      <Text style={[type.note, numeric, { color: colors.textMuted, marginTop: sp.sm }]}>
        기록 {count}건 · 하루 평균 {formatWon(average)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {},
});
