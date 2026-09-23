import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';

import { DailyLine } from '@/src/components/DailyLine';
import { EmojiStrip } from '@/src/components/EmojiStrip';
import { EntryFormModal } from '@/src/components/EntryFormModal';
import { EntryRow } from '@/src/components/EntryRow';
import { EntrySectionHeader } from '@/src/components/EntrySectionHeader';
import { Fab } from '@/src/components/Fab';
import { MonthGrass } from '@/src/components/MonthGrass';
import { RecordBanner } from '@/src/components/RecordBanner';
import { Screen } from '@/src/components/Screen';
import { StatChip } from '@/src/components/StatChip';
import { SummaryCard } from '@/src/components/SummaryCard';
import type { Entry, EntryInput } from '@/src/db';
import { useEntryList } from '@/src/features/useEntryList';
import { useHomeCard } from '@/src/features/useHomeCard';
import { useCategoryStore } from '@/src/store/categoryStore';
import { useEntryStore } from '@/src/store/entryStore';
import { useTheme } from '@/src/theme';
import { celebrateHaptic, goalReachedHaptic } from '@/src/utils/haptics';

const FALLBACK_EMOJI = '💰';

export default function HomeScreen() {
  const router = useRouter();
  const { colors, type, sp, radius, size } = useTheme();
  const list = useEntryList();
  const card = useHomeCard();
  const categories = useCategoryStore((s) => s.categories);
  const add = useEntryStore((s) => s.add);
  const [formVisible, setFormVisible] = useState(false);

  const openEntry = (entry: Entry) => {
    router.push({ pathname: '/entry/[id]', params: { id: String(entry.id) } });
  };

  const submitNew = (input: EntryInput) => {
    try {
      add(input);
    } catch {
      Alert.alert('저장 실패', '잠시 후 다시 시도해 주세요.');
      return;
    }
    // 목표를 처음 넘긴 저장이면 성공 햅틱 대신 더 강한 2연타
    if (useEntryStore.getState().lastGoalReached) goalReachedHaptic();
    else celebrateHaptic();
    setFormVisible(false);
  };

  const removeEntry = (entry: Entry) => {
    try {
      list.remove(entry.id);
    } catch {
      Alert.alert('삭제 실패', '잠시 후 다시 시도해 주세요.');
    }
  };

  return (
    <Screen style={styles.noPadding}>
      <SectionList
        sections={list.sections}
        keyExtractor={(item) => String(item.id)}
        stickySectionHeadersEnabled={false}
        // 아래 여백 = FAB 지름 + FAB 바닥 여백 + 화면 여백 → 마지막 행이 FAB 에 가리지 않는다
        contentContainerStyle={{ padding: sp.md, paddingBottom: size.fab + sp.lg + sp.md }}
        ListHeaderComponent={
          // 구획 사이는 sp.smd 한 가지. 첫 섹션 헤더와의 간격은 헤더 자신의 paddingTop(sp.md)
          <View style={{ gap: sp.smd }}>
            {/* (M4) 지난달 회고 카드 자리 — 매달 1~3일에만 맨 위, 닫기 가능 (DESIGN 홈 규칙) */}
            <SummaryCard
              todayTotal={list.todayTotal}
              monthTotal={list.monthTotal}
              celebrateTick={list.celebrateTick}
              goal={list.monthlyGoal}
              goalReachedTick={list.goalReachedTick}
              onGoalPress={() => router.push('/(tabs)/settings')}
              ready={card.loaded}
              firstOpenTick={card.firstOpenTick}
              // DB 를 읽기 전 기본값(0원)으로 만든 문구가 한 프레임 비쳤다 바뀌지 않게, 읽은 뒤에만 그린다
              topLine={card.loaded ? <DailyLine text={card.line.text} /> : undefined}
            />
            <RecordBanner
              best={list.lastRecord}
              goalReached={list.lastGoalReached}
              celebrateTick={list.celebrateTick}
            />
            {/* 칩 행: 작은 정보를 한 줄에. (M4) 🔥 연속 기록일 · 누적 칩이 이모지 칩 앞에 <StatChip> 으로 들어온다 */}
            {card.monthEmojis.length > 0 ? (
              <View style={[styles.chipRow, { gap: sp.sm }]}>
                <StatChip grow>
                  <EmojiStrip items={card.monthEmojis} celebrateTick={list.celebrateTick} maxLines={1} />
                </StatChip>
              </View>
            ) : null}
            {/* 잔디 구획: 제목 없이 요일 헤더만, 보조 카드(안쪽 sp.md·sp.smd) */}
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: radius.lg,
                paddingHorizontal: sp.md,
                paddingVertical: sp.smd,
              }}>
              <MonthGrass grass={card.grass} />
            </View>
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
                (item.categoryId !== null && list.categoryMap.get(item.categoryId)?.emoji) ||
                FALLBACK_EMOJI
              }
              isLast={index === section.data.length - 1}
              onPress={openEntry}
              onDelete={removeEntry}
            />
          </View>
        )}
        ListEmptyComponent={
          <View style={[styles.empty, { paddingVertical: sp.xl }]}>
            <Text style={[type.bodyStrong, { color: colors.text }]}>
              이번 달 기록이 없어요
            </Text>
            <Text style={[type.note, { color: colors.textMuted, marginTop: sp.xs }]}>
              오늘 참은 소비를 + 버튼으로 남겨보세요
            </Text>
          </View>
        }
        ListFooterComponent={
          list.hasMore ? (
            <Pressable
              onPress={list.loadMore}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.loadMore,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  minHeight: size.touch,
                  paddingVertical: sp.smd,
                  marginTop: sp.md,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}>
              <Text style={[type.label, { color: colors.primary }]}>이전 달 더 보기</Text>
            </Pressable>
          ) : null
        }
      />

      <Fab onPress={() => setFormVisible(true)} />

      <EntryFormModal
        visible={formVisible}
        categories={categories}
        onSubmit={submitNew}
        onClose={() => setFormVisible(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  noPadding: { padding: 0 },
  rowClip: { overflow: 'hidden' },
  empty: { alignItems: 'center' },
  loadMore: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  chipRow: { flexDirection: 'row', alignItems: 'center' },
});
