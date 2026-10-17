import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { numFace, numeric, useTheme } from '@/src/theme';
import { fitFontSize } from '@/src/utils/fitText';
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
  // 숫자 줄의 폭(카드 안쪽 폭). 재기 전(0)에는 원래 크기
  const [numberWidth, setNumberWidth] = useState(0);
  const onNumberLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w !== numberWidth) setNumberWidth(w);
  };
  const fontSize = fitFontSize(formatWon(total), numberWidth, type.display.fontSize ?? 40);
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderRadius: radius.lg, padding: sp.lg }]}>
      {/* 홈 카드와 같은 모양: caption 회색 라벨 → display primary 숫자 → 회색 보조 한 줄 */}
      <Text style={[type.caption, { color: colors.textMuted }]}>{title}</Text>
      {/* 년 합계는 9자리까지 갈 수 있어 한 줄에 맞춰 줄인다. adjustsFontSizeToFit 은 iOS 에서 4pt 까지 줄어드는 버그가 있어
          fitFontSize 로 직접 정한다 (src/utils/fitText.ts) */}
      <Text
        onLayout={onNumberLayout}
        style={[type.display, numeric, { fontSize, color: colors.primary, marginTop: sp.xs }]}
        numberOfLines={1}>
        {formatWon(total)}
      </Text>
      <Text style={[type.note, numeric, numFace.regular, { color: colors.textMuted, marginTop: sp.sm }]}>
        기록 {count}건 · {averageLabel} {formatWon(average)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {},
});
