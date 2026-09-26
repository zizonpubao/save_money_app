import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { Alert, SectionList, StyleSheet, Text, View } from 'react-native';

import { BarChart } from '@/src/components/BarChart';
import { CategoryBreakdown } from '@/src/components/CategoryBreakdown';
import { EntryRow } from '@/src/components/EntryRow';
import { EntrySectionHeader } from '@/src/components/EntrySectionHeader';
import { MonthNavigator } from '@/src/components/MonthNavigator';
import { MonthStatsCard } from '@/src/components/MonthStatsCard';
import { RangeToggle } from '@/src/components/RangeToggle';
import { Screen } from '@/src/components/Screen';
import type { Entry } from '@/src/db';
import type { EntrySection } from '@/src/features/groupEntries';
import { useMonthlySummary } from '@/src/features/useMonthlySummary';
import type { RangeMode } from '@/src/features/rangeMode';
import { entryEmoji } from '@/src/store/categoryStore';
import { useTheme } from '@/src/theme';

/** 기록 탭 (라우트 이름은 monthly 그대로). 월 / 년 단위 통계와 그 기간 전체 목록. */
export default function RecordsScreen() {
  const router = useRouter();
  const { colors, type, sp, radius } = useTheme();
  const monthly = useMonthlySummary();
  const listRef = useRef<SectionList<Entry, EntrySection>>(null);
  const isYear = monthly.mode === 'year';

  // 모드를 바꾸면 요약 카드부터 다시 보이게 맨 위로 올린다
  const changeMode = (next: RangeMode) => {
    monthly.setMode(next);
    listRef.current?.getScrollResponder()?.scrollTo({ y: 0, animated: false });
  };

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
        ref={listRef}
        sections={monthly.sections}
        keyExtractor={(item) => String(item.id)}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ padding: sp.md, paddingBottom: sp.xl }}
        ListHeaderComponent={
          // 구획 사이는 홈과 같은 sp.smd 한 가지
          <View style={{ gap: sp.smd }}>
            <RangeToggle mode={monthly.mode} onChange={changeMode} />
            <MonthNavigator
              period={monthly.period}
              mode={monthly.mode}
              canPrev={monthly.canPrev}
              canNext={monthly.canNext}
              onPrev={monthly.goPrev}
              onNext={monthly.goNext}
            />
            <MonthStatsCard
              total={monthly.total}
              count={monthly.count}
              average={monthly.average}
              title={isYear ? '이 해 절약' : '이 달 절약'}
              averageLabel={isYear ? '월 평균' : '하루 평균'}
            />
            {monthly.isEmpty ? (
              <View style={[styles.empty, { paddingVertical: sp.xl }]}>
                <Text style={[type.bodyStrong, { color: colors.text }]}>
                  {isYear ? '이 해엔 기록이 없어요' : '이 달엔 기록이 없어요'}
                </Text>
                <Text style={[type.note, { color: colors.textMuted, marginTop: sp.xs }]}>
                  홈 탭의 + 버튼으로 남기면 여기에 쌓여요
                </Text>
              </View>
            ) : (
              <>
                <View style={card}>
                  <Text style={[type.bodyStrong, { color: colors.text, marginBottom: sp.sm }]}>
                    {isYear ? '월별' : '일별'}
                  </Text>
                  {/* key=모드+기간: 모드를 바꾸거나 기간을 옮기면 새로 마운트돼 열려 있던 툴팁이 닫힌다 */}
                  <BarChart key={`${monthly.mode}-${monthly.period}`} bars={monthly.bars} />
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
              emoji={entryEmoji(item.categoryId, monthly.categoryMap)}
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
