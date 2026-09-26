import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  AMOUNT_PRESETS,
  presetLabel,
  presetsPreview,
  type AmountPreset,
} from '@/src/features/amountPresets';
import { useAmountPresetsForm } from '@/src/features/useAmountPresetsForm';
import { numeric, size, useTheme } from '@/src/theme';

type Props = {
  visible: boolean;
  /** 지금 프리셋. 모달을 열면 이 값으로 5칸이 채워진다 */
  current: readonly AmountPreset[];
  onSave: (values: AmountPreset[]) => void;
  /** "기본값으로": 저장한 값을 지우고 기본 5개로 돌린다 */
  onReset: () => void;
  onClose: () => void;
};

/** 기본값 안내 한 줄: "기본값 5백 · 1천 · 3천 · 5천 · 1만" */
const DEFAULT_PREVIEW = presetsPreview(AMOUNT_PRESETS);

/** 설정 "빠른 금액 버튼" 모달. GoalModal 과 같은 pageSheet + 취소/저장 헤더 */
export function AmountPresetsModal({ visible, current, onSave, onReset, onClose }: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onDismiss={onClose}>
      {/* 열릴 때마다 새로 마운트돼 5칸이 지금 값으로 초기화된다 */}
      <Body current={current} onSave={onSave} onReset={onReset} onClose={onClose} />
    </Modal>
  );
}

function Body({ current, onSave, onReset, onClose }: Omit<Props, 'visible'>) {
  const { colors, type, sp, radius } = useTheme();
  const form = useAmountPresetsForm(current);

  const save = () => {
    const values = form.submit();
    if (values) onSave(values);
  };

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
        <Text style={[styles.headerTitle, type.bodyStrong, { color: colors.text }]}>
          빠른 금액 버튼
        </Text>
        <Pressable
          onPress={save}
          hitSlop={sp.sm}
          accessibilityRole="button"
          style={[styles.headerSide, styles.headerRight]}>
          <Text style={[type.action, { color: colors.primary }]}>저장</Text>
        </Pressable>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: sp.md, gap: sp.sm, paddingBottom: sp.xl }}>
        <Text style={[type.caption, { color: colors.textMuted }]}>
          입력 시트 금액 칸 아래에 이 순서대로 보입니다
        </Text>

        {form.texts.map((text, index) => {
          const invalid = form.isInvalid(index);
          const value = form.values[index];
          return (
            <View
              key={index}
              style={[
                styles.amountRow,
                {
                  backgroundColor: colors.card,
                  borderColor: invalid ? colors.danger : colors.border,
                  borderRadius: radius.md,
                  paddingHorizontal: sp.md,
                  gap: sp.sm,
                },
              ]}>
              <Text style={[type.caption, { color: colors.textMuted }]}>{index + 1}</Text>
              <TextInput
                testID={`preset-input-${index}`}
                value={text}
                onChangeText={(t) => form.setText(index, t)}
                onBlur={form.revealErrors}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                returnKeyType="done"
                maxLength={9}
                accessibilityLabel={`빠른 금액 ${index + 1}번째`}
                style={[
                  styles.amountInput,
                  type.bodyStrong,
                  numeric,
                  { color: colors.text, paddingVertical: sp.smd },
                ]}
              />
              <Text style={[type.body, { color: colors.textMuted }]}>원</Text>
              {/* 칩에 어떻게 보일지 바로 옆에 (예: 1,500 → 1.5천) */}
              <Text style={[type.note, numeric, styles.preview, { color: colors.textMuted }]}>
                {value !== null && value !== undefined && value > 0 ? presetLabel(value) : ''}
              </Text>
            </View>
          );
        })}

        {form.errors.length > 0 ? (
          <View testID="preset-errors" style={{ gap: sp.xs }}>
            {form.errors.map((message) => (
              <Text key={message} style={[type.note, { color: colors.danger }]}>
                {message}
              </Text>
            ))}
          </View>
        ) : null}

        <Text style={[type.note, { color: colors.textMuted }]}>
          100원 단위로 100원부터 1,000,000원까지 넣을 수 있습니다. 같은 금액은 한 번만 넣습니다.
        </Text>

        <Pressable
          onPress={onReset}
          accessibilityRole="button"
          accessibilityHint={`기본값(${DEFAULT_PREVIEW})으로 돌립니다`}
          style={({ pressed }) => [
            styles.resetButton,
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
          <Text style={[type.bodyStrong, { color: colors.text }]}>기본값으로</Text>
        </Pressable>
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
  preview: { minWidth: size.touch, textAlign: 'right' },
  resetButton: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
