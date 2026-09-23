import { useRouter } from 'expo-router';
import { Alert, SectionList, StyleSheet, Text, View } from 'react-native';

import { CategoryBreakdown } from '@/src/components/CategoryBreakdown';
import { DailyBarChart } from '@/src/components/DailyBarChart';
import { EntryRow } from '@/src/components/EntryRow';
import { EntrySectionHeader } from '@/src/components/EntrySectionHeader';
import { MonthNavigator } from '@/src/components/MonthNavigator';
import { MonthStatsCard } from '@/src/components/MonthStatsCard';
import { Screen } from '@/src/components/Screen';
import type { Entry } from '@/src/db';
import { useMonthlySummary } from '@/src/features/useMonthlySummary';
import { useTheme } from '@/src/theme';

const FALLBACK_EMOJI = '💰';

export default function MonthlyScreen() {
  const router = useRouter();
  const { colors, type, sp, radius } = useTheme();
  const monthly = useMonthlySummary();

  const openEntry = (entry: Entry) => {
    router.push({ pathname: '/entry/[id]', params: { id: String(entry.id) } });
  };

  const removeEntry = (entry: Entry) => {
    try {
      monthly.remove(entry.id);
    } catch {
      Alert.alert('삭제 실패', '잠시 후 다시 시도해 주세요.');
    }
  };

  const card = { backgroundColor: colors.card, borderRadius: radius.lg, padding: sp.lg };

  return (
    <Screen style={styles.noPadding}>
      <SectionList
        sections={monthly.sections}
        keyExtractor={(item) => String(item.id)}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ padding: sp.md, paddingBottom: sp.xl }}
        ListHeaderComponent={
          <View style={{ gap: sp.md, marginBottom: sp.sm }}>
            <MonthNavigator
              month={monthly.month}
              canPrev={monthly.canPrev}
              canNext={monthly.canNext}
              onPrev={monthly.goPrev}
              onNext={monthly.goNext}
            />
            <MonthStatsCard
              total={monthly.total}
              count={monthly.count}
              average={monthly.average}
            />
            {monthly.isEmpty ? (
              <View style={[styles.empty, { paddingVertical: sp.xl }]}>
                <Text style={[type.bodyStrong, { color: colors.text }]}>이 달엔 기록이 없어요</Text>
                <Text style={[type.note, { color: colors.textMuted, marginTop: sp.xs }]}>
                  기록 탭의 + 버튼으로 남기면 여기에 쌓여요
                </Text>
              </View>
            ) : (
              <>
                <View style={card}>
                  <Text style={[type.bodyStrong, { color: colors.text, marginBottom: sp.sm }]}>
                    일별
                  </Text>
                  {/* key=달: 월을 옮기면 새로 마운트돼 열려 있던 툴팁이 닫힌다 */}
                  <DailyBarChart key={monthly.month} bars={monthly.bars} axis={monthly.axis} />
                </View>
                <View style={card}>
                  <Text style={[type.bodyStrong, { color: colors.text, marginBottom: sp.md }]}>
                    카테고리별
                  </Text>
                  <CategoryBreakdown rows={monthly.categoryRows} />
                </View>
              </>
            )}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <EntrySectionHeader sectionKey={section.key} total={section.total} />
        )}
        renderItem={({ item, index, section }) => (
          <View
            style={[
              index === 0 && { borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md },
              index === section.data.length - 1 && {
                borderBottomLeftRadius: radius.md,
                borderBottomRightRadius: radius.md,
              },
              styles.rowClip,
            ]}>
            <EntryRow
              entry={item}
              emoji={
                (item.categoryId !== null && monthly.categoryMap.get(item.categoryId)?.emoji) ||
                FALLBACK_EMOJI
              }
              isLast={index === section.data.length - 1}
              onPress={openEntry}
              onDelete={removeEntry}
            />
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  noPadding: { padding: 0 },
  rowClip: { overflow: 'hidden' },
  empty: { alignItems: 'center' },
});
