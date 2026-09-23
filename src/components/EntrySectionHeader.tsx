import { StyleSheet, Text, View } from 'react-native';

import { numeric, useTheme } from '@/src/theme';
import { MONTH_FORMAT, formatKoDate, formatKoMonth } from '@/src/utils/date';
import { formatWon } from '@/src/utils/money';

type Props = {
  /** 'YYYY-MM-DD'(일별) 또는 'YYYY-MM'(월별) 섹션 key */
  sectionKey: string;
  total: number;
};

/** 섹션 헤더: 왼쪽 날짜(또는 월), 오른쪽 섹션 합계 */
export function EntrySectionHeader({ sectionKey, total }: Props) {
  const { colors, type, sp } = useTheme();
  // key 길이로 월별('YYYY-MM') / 일별('YYYY-MM-DD') 을 구분한다
  const label =
    sectionKey.length === MONTH_FORMAT.length ? formatKoMonth(sectionKey) : formatKoDate(sectionKey);
  return (
    <View
      style={[styles.row, { paddingTop: sp.md, paddingBottom: sp.sm, backgroundColor: colors.bg }]}>
      <Text style={[type.label, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[type.note, numeric, { color: colors.textMuted }]}>{formatWon(total)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
