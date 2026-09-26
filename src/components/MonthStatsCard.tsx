import { StyleSheet, Text, View } from 'react-native';

import { numeric, useTheme } from '@/src/theme';
import { formatWon } from '@/src/utils/money';

type Props = {
  total: number;
  count: number;
  /** 월 모드: 하루 평균 (이번 달은 오늘까지 경과일, 지난 달은 그 달 전체 일수 기준) / 년 모드: 월 평균 */
  average: number;
  /** 카드 제목. 기본 "이 달 절약" */
  title?: string;
  /** 평균 앞 문구. 기본 "하루 평균" */
  averageLabel?: string;
};

/** 기록 탭 상단 카드: 기간 총 절약액(크게), 기록 건수·평균(작게) */
export function MonthStatsCard({
  total,
  count,
  average,
  title = '이 달 절약',
  averageLabel = '하루 평균',
}: Props) {
  const { colors, type, sp, radius } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderRadius: radius.lg, padding: sp.lg }]}>
      {/* 홈 카드와 같은 모양: caption 회색 라벨 → display primary 숫자 → 회색 보조 한 줄 */}
      <Text style={[type.caption, { color: colors.textMuted }]}>{title}</Text>
      <Text style={[type.display, numeric, { color: colors.primary, marginTop: sp.xs }]}>
        {formatWon(total)}
      </Text>
      <Text style={[type.note, numeric, { color: colors.textMuted, marginTop: sp.sm }]}>
        기록 {count}건 · {averageLabel} {formatWon(average)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {},
});
