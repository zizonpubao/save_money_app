import { useRef } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';

import type { Entry } from '@/src/db';
import { numFace, numeric, useTheme } from '@/src/theme';
import { formatWon } from '@/src/utils/money';

type Props = {
  entry: Entry;
  emoji: string;
  onPress: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
  /** 섹션의 마지막 행이면 하단 구분선을 뺀다 */
  isLast?: boolean;
};

/** 목록 한 줄. 탭 → 수정, 왼쪽 스와이프 → 삭제(확인 알림). */
export function EntryRow({ entry, emoji, onPress, onDelete, isLast = false }: Props) {
  const { colors, type, fs, sp, size } = useTheme();
  const swipeRef = useRef<SwipeableMethods>(null);

  const confirmDelete = () => {
    Alert.alert('기록 삭제', `"${entry.title}" ${formatWon(entry.amount)} 기록을 삭제할까요?`, [
      { text: '취소', style: 'cancel', onPress: () => swipeRef.current?.close() },
      { text: '삭제', style: 'destructive', onPress: () => onDelete(entry) },
    ]);
  };

  const renderRightActions = () => (
    <Pressable
      onPress={confirmDelete}
      style={[styles.action, { backgroundColor: colors.danger, width: size.swipeAction }]}>
      <Text style={[type.bodyStrong, { color: colors.onPrimary }]}>삭제</Text>
    </Pressable>
  );

  return (
    <ReanimatedSwipeable
      ref={swipeRef}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={renderRightActions}>
      <Pressable
        onPress={() => onPress(entry)}
        style={({ pressed }) => [
          styles.row,
          {
            backgroundColor: pressed ? colors.bg : colors.card,
            minHeight: size.touch,
            paddingHorizontal: sp.md,
            paddingVertical: sp.smd,
            borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
            borderBottomColor: colors.divider,
          },
        ]}>
        <Text style={{ fontSize: fs.lg, marginRight: sp.smd }}>{emoji}</Text>
        <View style={styles.body}>
          <Text numberOfLines={1} style={[type.body, { color: colors.text }]}>
            {entry.title}
          </Text>
          {entry.memo ? (
            <Text numberOfLines={1} style={[type.caption, { color: colors.textMuted }]}>
              {entry.memo}
            </Text>
          ) : null}
        </View>
        {/* 긴 항목명이 말줄임될 때 금액에 붙지 않게 sp.sm 띄운다 */}
        <Text style={[type.bodyStrong, numeric, numFace.semibold, { color: colors.text, marginLeft: sp.sm }]}>
          {formatWon(entry.amount)}
        </Text>
      </Pressable>
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  // 항목명(22)·메모(16) 줄 높이만으로 충분해 따로 간격을 두지 않는다
  body: { flex: 1 },
  action: { justifyContent: 'center', alignItems: 'center' },
});
