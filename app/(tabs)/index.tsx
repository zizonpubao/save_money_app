import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';

import { EntryFormModal } from '@/src/components/EntryFormModal';
import { EntryRow } from '@/src/components/EntryRow';
import { EntrySectionHeader } from '@/src/components/EntrySectionHeader';
import { Fab } from '@/src/components/Fab';
import { RangeToggle } from '@/src/components/RangeToggle';
import { RecordBanner } from '@/src/components/RecordBanner';
import { Screen } from '@/src/components/Screen';
import { SummaryCard } from '@/src/components/SummaryCard';
import type { Entry, EntryInput } from '@/src/db';
import { useEntryList } from '@/src/features/useEntryList';
import { useCategoryStore } from '@/src/store/categoryStore';
import { useEntryStore } from '@/src/store/entryStore';
import { useTheme } from '@/src/theme';
import { celebrateHaptic } from '@/src/utils/haptics';

const FALLBACK_EMOJI = '💰';

export default function RecordsScreen() {
  const router = useRouter();
  const { colors, type, sp, radius, size } = useTheme();
  const list = useEntryList();
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
    celebrateHaptic();
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
        contentContainerStyle={{ padding: sp.md, paddingBottom: sp.xl * 3 }}
        ListHeaderComponent={
          <View style={{ gap: sp.md, marginBottom: sp.sm }}>
            <SummaryCard
              todayTotal={list.todayTotal}
              monthTotal={list.monthTotal}
              celebrateTick={list.celebrateTick}
            />
            <RecordBanner best={list.lastRecord} celebrateTick={list.celebrateTick} />
            <RangeToggle mode={list.mode} onChange={list.setMode} />
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
              {list.mode === 'month' ? '이번 달 기록이 없어요' : '올해 기록이 없어요'}
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
});
