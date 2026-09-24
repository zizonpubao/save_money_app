import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';

import { CelebrationLayer, type CelebrationRun } from '@/src/components/CelebrationLayer';
import { DailyLine } from '@/src/components/DailyLine';
import { EmojiStrip } from '@/src/components/EmojiStrip';
import { EntryFormModal } from '@/src/components/EntryFormModal';
import { EntryRow } from '@/src/components/EntryRow';
import { EntrySectionHeader } from '@/src/components/EntrySectionHeader';
import { Fab } from '@/src/components/Fab';
import { MonthGrass } from '@/src/components/MonthGrass';
import { RecordBanner } from '@/src/components/RecordBanner';
import { ReviewCard } from '@/src/components/ReviewCard';
import { Screen } from '@/src/components/Screen';
import { StatChip } from '@/src/components/StatChip';
import { StreakChip } from '@/src/components/StreakChip';
import { SummaryCard, type CardHit } from '@/src/components/SummaryCard';
import type { Entry, EntryInput } from '@/src/db';
import { buildCelebrationPlan, cardHitPeak, type CardRect } from '@/src/features/celebration';
import { useCelebrationSound } from '@/src/features/useCelebrationSound';
import { useEntryList } from '@/src/features/useEntryList';
import { useHomeCard } from '@/src/features/useHomeCard';
import { useMonthReview } from '@/src/features/useMonthReview';
import { useReduceMotion } from '@/src/features/useReduceMotion';
import { useCategoryStore } from '@/src/store/categoryStore';
import { useEntryStore } from '@/src/store/entryStore';
import { motion, useTheme } from '@/src/theme';
import { playCelebrationHaptic, saveTapHaptic } from '@/src/utils/haptics';
import { formatWon } from '@/src/utils/money';

const FALLBACK_EMOJI = '💰';

type PendingSave = { publish: () => void; amount: number };

export default function HomeScreen() {
  const router = useRouter();
  const { colors, type, sp, radius, size } = useTheme();
  const list = useEntryList();
  const card = useHomeCard();
  const review = useMonthReview();
  const categories = useCategoryStore((s) => s.categories);
  const addDeferred = useEntryStore((s) => s.addDeferred);
  const reduceMotion = useReduceMotion();
  const playSound = useCelebrationSound();
  const [formVisible, setFormVisible] = useState(false);
  // 축하 오버레이 기준 = 홈 영역(rootRef) 기준 카드 사각형
  const rootRef = useRef<View>(null);
  const cardRef = useRef<View>(null);
  const [cardRect, setCardRect] = useState<CardRect | null>(null);
  const [run, setRun] = useState<CelebrationRun | null>(null);
  // DB 에는 저장했고 화면 반영(t0)을 기다리는 저장. "저장으로 닫힘" 플래그를 겸한다
  const pending = useRef<PendingSave | null>(null);
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelHaptic = useRef<(() => void) | null>(null);

  // 카드는 스크롤과 함께 움직이므로 배치가 바뀔 때와 t0 에 다시 잰다.
  // 시트가 떠 있는 동안에는 뒤 화면이 줄어들어 있어서, 시트가 다 내려간 뒤에 재야 글로우가 카드에 맞는다
  const measureCardRect = useCallback(() => {
    const root = rootRef.current;
    const cardView = cardRef.current;
    if (!root || !cardView) return;
    cardView.measureInWindow((cx, cy, cw, ch) => {
      root.measureInWindow((rx, ry) => {
        setCardRect({ x: cx - rx, y: cy - ry, w: cw, h: ch });
      });
    });
  }, []);

  const stopTimers = useCallback(() => {
    if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
    if (hitTimer.current) clearTimeout(hitTimer.current);
    cancelHaptic.current?.();
    fallbackTimer.current = null;
    hitTimer.current = null;
    cancelHaptic.current = null;
  }, []);

  // 홈을 떠나면 박자를 끊고, 아직 화면에 반영 못 한 저장은 연출 없이 반영한다
  useEffect(
    () => () => {
      stopTimers();
      pending.current?.publish();
      pending.current = null;
    },
    [stopTimers],
  );

  /**
   * t0 = 입력 시트가 다 내려간 순간. 저장을 화면에 반영하고(목록·합계·tick) 연출 플랜을 짠 뒤,
   * 타격(t0+80)에 햅틱·소리를 낸다. 연속 저장이면 이전 연출의 박자를 모두 끊고 새 runId 로 다시 시작한다.
   */
  const fireT0 = useCallback(() => {
    const job = pending.current;
    if (!job) return;
    pending.current = null;
    stopTimers();
    measureCardRect();

    const streakBefore = useEntryStore.getState().streak;
    job.publish();
    const s = useEntryStore.getState();
    const plan = buildCelebrationPlan(s.celebrateTier, {
      goal: s.lastGoalReached,
      milestone: s.lastMilestone !== null,
      best: s.lastRecord !== null,
      streak: s.streak > streakBefore,
    });
    setRun({ runId: s.celebrateTick, plan, amount: job.amount, seed: s.celebratedAt });
    hitTimer.current = setTimeout(() => {
      hitTimer.current = null;
      cancelHaptic.current = playCelebrationHaptic(plan.haptics);
      playSound(plan.sound);
    }, motion.hitAt);
  }, [measureCardRect, playSound, stopTimers]);

  const cardHit = useMemo<CardHit | null>(
    () =>
      run
        ? { runId: run.runId, cardHit: cardHitPeak(run.seed), numberHit: run.plan.layers.numberHit }
        : null,
    [run],
  );

  const openEntry = (entry: Entry) => {
    router.push({ pathname: '/entry/[id]', params: { id: String(entry.id) } });
  };

  const submitNew = (input: EntryInput) => {
    // 시트가 아직 위에 있는 순간: "눌렸다" 확인만 (소리 없음)
    saveTapHaptic();
    try {
      const staged = addDeferred(input);
      pending.current = { publish: staged.publish, amount: input.amount };
    } catch {
      Alert.alert('저장 실패', '잠시 후 다시 시도해 주세요.');
      return;
    }
    setFormVisible(false);
    // iOS 는 시트 onDismiss 로 t0 를 알린다. 안 오면(Android·느린 기기) 안전 타이머로 친다
    if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
    fallbackTimer.current = setTimeout(fireT0, motion.t0FallbackMs);
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
      <View ref={rootRef} style={styles.fill} collapsable={false}>
        <SectionList
          sections={list.sections}
          keyExtractor={(item) => String(item.id)}
          stickySectionHeadersEnabled={false}
          // 아래 여백 = FAB 지름 + FAB 바닥 여백 + 화면 여백 → 마지막 행이 FAB 에 가리지 않는다
          contentContainerStyle={{ padding: sp.md, paddingBottom: size.fab + sp.lg + sp.md }}
          ListHeaderComponent={
            // 구획 사이는 sp.smd 한 가지. 첫 섹션 헤더와의 간격은 헤더 자신의 paddingTop(sp.md)
            <View style={{ gap: sp.smd }}>
              {/* (M4) 지난달 회고 카드 — 매달 1~3일에만 맨 위, 닫으면 그달엔 다시 안 뜬다 (DESIGN 홈 규칙) */}
              {review.message ? <ReviewCard message={review.message} onClose={review.dismiss} /> : null}
              {/* 축하 오버레이 기준 사각형을 재려고 카드를 감싼다 (오버레이는 스크롤 밖) */}
              <View ref={cardRef} onLayout={measureCardRect} collapsable={false}>
                <SummaryCard
                  todayTotal={list.todayTotal}
                  monthTotal={list.monthTotal}
                  hit={cardHit}
                  reduceMotion={reduceMotion}
                  goal={list.monthlyGoal}
                  goalReachedTick={list.goalReachedTick}
                  onGoalPress={() => router.push('/(tabs)/settings')}
                  ready={card.loaded}
                  firstOpenTick={card.firstOpenTick}
                  // DB 를 읽기 전 기본값(0원)으로 만든 문구가 한 프레임 비쳤다 바뀌지 않게, 읽은 뒤에만 그린다
                  topLine={card.loaded ? <DailyLine text={card.line.text} /> : undefined}
                />
              </View>
              <RecordBanner
                best={list.lastRecord}
                goalReached={list.lastGoalReached}
                milestone={list.lastMilestone}
                celebrateTick={list.celebrateTick}
                reduceMotion={reduceMotion}
              />
              {/* 칩 행: 작은 정보를 한 줄에. 🔥 연속 기록일 → 누적 → 이모지 적립(남은 폭). 셋 다 없으면 줄째로 숨긴다 */}
              {card.streak > 0 || card.totalSum > 0 || card.monthEmojis.length > 0 ? (
                <View style={[styles.chipRow, { gap: sp.sm }]}>
                  <StreakChip
                    streak={card.streak}
                    celebrateTick={list.celebrateTick}
                    reduceMotion={reduceMotion}
                  />
                  {card.totalSum > 0 ? (
                    <StatChip testID="total-chip">{`누적 ${formatWon(card.totalSum)}`}</StatChip>
                  ) : null}
                  {card.monthEmojis.length > 0 ? (
                    <StatChip grow>
                      <EmojiStrip
                        items={card.monthEmojis}
                        celebrateTick={list.celebrateTick}
                        maxLines={1}
                        reduceMotion={reduceMotion}
                      />
                    </StatChip>
                  ) : null}
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
      </View>

      <Fab onPress={() => setFormVisible(true)} />

      {/* 컨페티·라벨·글로우·플래시. 스크롤 목록 안에 두면 목록 경계에서 잘리므로 화면 전체 오버레이로, FAB 보다 위에 그린다.
          Screen 의 패딩이 0 이라 좌표 기준은 rootRef 와 같다 */}
      <CelebrationLayer run={run} rect={cardRect} reduceMotion={reduceMotion} />

      <EntryFormModal
        visible={formVisible}
        categories={categories}
        onSubmit={submitNew}
        onClose={() => setFormVisible(false)}
        onDismissed={fireT0}
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
  fill: { flex: 1 },
});
