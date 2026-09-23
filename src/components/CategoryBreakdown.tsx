import { StyleSheet, Text, View } from 'react-native';

import type { CategoryBar } from '@/src/features/monthlyStats';
import { numeric, useTheme } from '@/src/theme';
import { formatWon } from '@/src/utils/money';

type Props = { rows: CategoryBar[] };

/** 카테고리별 합계. 많은 순, 미분류는 맨 뒤. 비율 바 + 금액 + %. */
export function CategoryBreakdown({ rows }: Props) {
  const { colors, type, fs, sp, radius, size } = useTheme();

  return (
    <View style={{ gap: sp.md }}>
      {rows.map((row) => (
        <View key={row.key} style={{ gap: sp.sm }}>
          <View style={styles.head}>
            <Text style={{ fontSize: fs.md, marginRight: sp.sm }}>{row.emoji}</Text>
            <Text numberOfLines={1} style={[type.body, styles.name, { color: colors.text }]}>
              {row.name}
            </Text>
            <Text style={[type.bodyStrong, numeric, { color: colors.text }]}>
              {formatWon(row.total)}
            </Text>
            <Text style={[type.note, numeric, { color: colors.textMuted, marginLeft: sp.sm }]}>
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
});
