import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { GOAL_PRESETS, presetLabel } from '@/src/features/goal';
import { useGoalForm } from '@/src/features/useGoalForm';
import { numeric, size, useTheme } from '@/src/theme';

type Props = {
  visible: boolean;
  /** 지금 목표. 모달을 열면 이 값으로 입력이 채워진다. */
  current: number | null;
  onSave: (goal: number) => void;
  onClear: () => void;
  onClose: () => void;
};

/** 월 목표 금액 입력 모달. 기록 입력 모달과 같은 pageSheet + 취소/저장 헤더. */
export function GoalModal({ visible, current, onSave, onClear, onClose }: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onDismiss={onClose}>
      {/* 열릴 때마다 새로 마운트돼 입력이 지금 목표로 초기화된다 */}
      <GoalModalBody current={current} onSave={onSave} onClear={onClear} onClose={onClose} />
    </Modal>
  );
}

function GoalModalBody({ current, onSave, onClear, onClose }: Omit<Props, 'visible'>) {
  const { colors, type, fs, sp, radius } = useTheme();
  const form = useGoalForm(current);

  return (
    <View style={[styles.flex, { backgroundColor: colors.bg }]}>
      <View
        style={[
          styles.header,
          { paddingHorizontal: sp.md, paddingVertical: sp.xs, backgroundColor: colors.card },
        ]}>
        <Pressable onPress={onClose} hitSlop={sp.sm} style={styles.headerSide}>
          <Text style={[type.body, { color: colors.textMuted }]}>취소</Text>
        </Pressable>
        <Text style={[styles.headerTitle, type.bodyStrong, { color: colors.text }]}>월 목표</Text>
        <Pressable
          onPress={() => onSave(form.amount)}
          disabled={!form.canSave}
          hitSlop={sp.sm}
          accessibilityRole="button"
          style={[styles.headerSide, styles.headerRight]}>
          <Text style={[type.action, { color: form.canSave ? colors.primary : colors.textMuted }]}>
            저장
          </Text>
        </Pressable>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: sp.md, gap: sp.md, paddingBottom: sp.xl }}>
        <View>
          <Text style={[type.caption, { color: colors.textMuted, marginBottom: sp.xs }]}>
            한 달에 아끼고 싶은 금액
          </Text>
          <View
            style={[
              styles.amountRow,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: radius.md,
                paddingHorizontal: sp.md,
              },
            ]}>
            <TextInput
              value={form.amountText}
              onChangeText={form.setAmountText}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              autoFocus
              returnKeyType="done"
              maxLength={13}
              accessibilityLabel="월 목표 금액"
              style={[
                styles.amountInput,
                type.title,
                numeric,
                { color: colors.text, paddingVertical: sp.smd },
              ]}
            />
            <Text style={{ color: colors.textMuted, fontSize: fs.lg }}>원</Text>
          </View>
        </View>

        <View style={[styles.chips, { gap: sp.sm }]}>
          {GOAL_PRESETS.map((preset) => {
            const selected = form.amount === preset;
            return (
              <Pressable
                key={preset}
                onPress={() => form.pickPreset(preset)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected ? colors.primary : colors.card,
                    borderColor: selected ? colors.primary : colors.border,
                    borderRadius: radius.pill,
                    paddingHorizontal: sp.md,
                    paddingVertical: sp.sm,
                  },
                ]}>
                <Text style={[type.note, { color: selected ? colors.onPrimary : colors.text }]}>
                  {presetLabel(preset)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[type.note, { color: colors.textMuted }]}>
          홈 카드에 이번 달 진행률이 보입니다. 목표를 넘기는 저장에서 한 번 축하합니다.
        </Text>

        {current !== null ? (
          <Pressable
            onPress={onClear}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.clearButton,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: radius.md,
                minHeight: size.touch,
                paddingVertical: sp.smd,
                marginTop: sp.sm,
                opacity: pressed ? 0.7 : 1,
              },
            ]}>
            <Text style={[type.bodyStrong, { color: colors.danger }]}>목표 없애기</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // 탭 화면 헤더(headerShadowVisible: false)처럼 선 없이 card 바탕으로만 본문(bg)과 나눈다
  header: { flexDirection: 'row', alignItems: 'center' },
  // 취소·저장 터치 영역 44pt
  headerSide: { width: size.headerAction, minHeight: size.touch, justifyContent: 'center' },
  headerRight: { alignItems: 'flex-end' },
  headerTitle: { flex: 1, textAlign: 'center' },
  amountRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  amountInput: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { borderWidth: 1, justifyContent: 'center', minHeight: size.touch },
  clearButton: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
