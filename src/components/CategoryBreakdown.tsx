import { StyleSheet, Text, View } from 'react-native';

import type { CategoryBar } from '@/src/features/monthlyStats';
import { numFace, numeric, size, useTheme } from '@/src/theme';
import { formatWon } from '@/src/utils/money';

type Props = { rows: CategoryBar[] };

/** 카테고리별 합계. 많은 순, 미분류는 맨 뒤. 비율 바 + 금액 + %. */
export function CategoryBreakdown({ rows }: Props) {
  const { colors, type, fs, sp, radius } = useTheme();

  return (
    <View style={{ gap: sp.md }}>
      {rows.map((row) => (
        <View key={row.key} style={{ gap: sp.sm }}>
          <View style={styles.head}>
            <Text style={{ fontSize: fs.md, marginRight: sp.sm }}>{row.emoji}</Text>
            <Text numberOfLines={1} style={[type.body, styles.name, { color: colors.text }]}>
              {row.name}
            </Text>
            <Text style={[type.bodyStrong, numeric, numFace.semibold, { color: colors.text, marginLeft: sp.sm }]}>
              {formatWon(row.total)}
            </Text>
            {/* % 칸 폭을 고정해 줄마다 금액의 오른쪽 끝이 맞는다 (5% · 100%) */}
            <Text
              style={[
                type.note,
                numeric,
                numFace.regular,
                styles.percent,
                { color: colors.textMuted, marginLeft: sp.xs },
              ]}>
              {row.percent}%
            </Text>
          </View>
          <View
            style={{
              height: size.bar,
              borderRadius: radius.pill,
              backgroundColor: colors.primarySoft,
              overflow: 'hidden',
            }}>
            <View
              style={{
                width: `${row.percent}%`,
                height: '100%',
                borderRadius: radius.pill,
                backgroundColor: colors.primary,
              }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center' },
  name: { flex: 1 },
  percent: { width: size.percentLabel, textAlign: 'right' },
});
