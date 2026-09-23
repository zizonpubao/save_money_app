import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState, type PropsWithChildren } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { CategoryChips } from '@/src/components/CategoryChips';
import type { Category } from '@/src/db';
import type { useEntryForm } from '@/src/features/useEntryForm';
import { numeric, size, useTheme } from '@/src/theme';
import { formatKoDate, fromDate, toDate } from '@/src/utils/date';

type Props = PropsWithChildren<{
  form: ReturnType<typeof useEntryForm>;
  categories: Category[];
  /** 열리자마자 금액 키패드를 띄울지 (신규 입력 모달에서 true) */
  autoFocusAmount?: boolean;
}>;

/**
 * 기록 입력 필드 묶음. 금액 → 항목명 → 카테고리 → 날짜 → 메모 순.
 * children 은 폼 아래(예: 삭제 버튼)에 붙는다. 신규/수정 화면이 공유한다.
 */
export function EntryForm({ form, categories, autoFocusAmount = false, children }: Props) {
  const { colors, type, fs, sp, radius, isDark } = useTheme();
  const [pickerOpen, setPickerOpen] = useState(false);
  const { values } = form;

  const onDateChange = (event: DateTimePickerEvent, selected?: Date) => {
    // Android 는 다이얼로그라 선택/취소 후 닫아야 하고, iOS 휠은 계속 열어둔다
    if (Platform.OS === 'android') setPickerOpen(false);
    if (event.type === 'set' && selected) form.setDate(fromDate(selected));
  };

  const fieldStyle = {
    ...type.body,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: sp.md,
    paddingVertical: sp.smd,
    color: colors.text,
  } as const;

  const labelStyle = { ...type.caption, color: colors.textMuted, marginBottom: sp.xs } as const;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ padding: sp.md, gap: sp.md, paddingBottom: sp.xl }}>
        <View>
          <Text style={labelStyle}>금액</Text>
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
              value={values.amountText}
              onChangeText={form.setAmountText}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              autoFocus={autoFocusAmount}
              returnKeyType="done"
              maxLength={13}
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

        <View>
          <Text style={labelStyle}>항목</Text>
          <TextInput
            value={values.title}
            onChangeText={form.setTitle}
            placeholder="예: 아메리카노"
            placeholderTextColor={colors.textMuted}
            returnKeyType="done"
            maxLength={40}
            style={[styles.input, fieldStyle]}
          />
        </View>

        <View>
          <Text style={labelStyle}>카테고리</Text>
          <CategoryChips
            categories={categories}
            selectedId={values.categoryId}
            onSelect={form.selectCategory}
          />
        </View>

        <View>
          <Text style={labelStyle}>날짜</Text>
          <Pressable
            onPress={() => setPickerOpen((v) => !v)}
            accessibilityRole="button"
            style={[styles.input, fieldStyle]}>
            <Text style={[type.body, { color: pickerOpen ? colors.primary : colors.text }]}>
              {formatKoDate(values.date)}
            </Text>
          </Pressable>
          {pickerOpen ? (
            <DateTimePicker
              value={toDate(values.date)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              locale="ko-KR"
              maximumDate={new Date()}
              themeVariant={isDark ? 'dark' : 'light'}
              onChange={onDateChange}
            />
          ) : null}
        </View>

        <View>
          <Text style={labelStyle}>메모</Text>
          <TextInput
            value={values.memo}
            onChangeText={form.setMemo}
            placeholder="선택 사항"
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={200}
            style={[styles.input, styles.memo, fieldStyle]}
          />
        </View>

        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  amountRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  amountInput: { flex: 1 },
  input: { borderWidth: 1, minHeight: size.touch },
  memo: { minHeight: size.memoMin, textAlignVertical: 'top' },
});
