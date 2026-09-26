import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useEffect, useRef, useState, type PropsWithChildren } from 'react';
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

import { AmountPresetChips } from '@/src/components/AmountPresetChips';
import { CategoryChips } from '@/src/components/CategoryChips';
import { QuickEntryChips } from '@/src/components/QuickEntryChips';
import type { Category, RecentTitle } from '@/src/db';
import type { useEntryForm } from '@/src/features/useEntryForm';
import { numeric, size, useTheme } from '@/src/theme';
import { entryDateBounds, formatKoDate, fromDate, toDate } from '@/src/utils/date';
import { chipTapHaptic } from '@/src/utils/haptics';

type Props = PropsWithChildren<{
  form: ReturnType<typeof useEntryForm>;
  categories: Category[];
  /** 열리자마자 금액 키패드를 띄울지 (신규 입력 모달에서 true) */
  autoFocusAmount?: boolean;
  /** (M4) 빠른 입력 칩. 비어 있으면 줄째로 숨긴다 (수정 화면은 넘기지 않는다) */
  recent?: RecentTitle[];
  /** 스크롤 끝에 더 비워 둘 여백. Android 에서 내비게이션 바(제스처 바)에 마지막 필드가 가리지 않게 (iOS 는 0) */
  bottomInset?: number;
}>;

/**
 * 기록 입력 필드 묶음. (빠른 입력) → 금액 → 항목명 → 카테고리 → 날짜 → 메모 순.
 * children 은 폼 아래(예: 삭제 버튼)에 붙는다. 신규/수정 화면이 공유한다.
 */
export function EntryForm({
  form,
  categories,
  autoFocusAmount = false,
  recent = [],
  bottomInset = 0,
  children,
}: Props) {
  const { colors, type, fs, sp, radius, isDark, motion } = useTheme();
  const [pickerOpen, setPickerOpen] = useState(false);
  const { values } = form;
  const amountRef = useRef<TextInput>(null);

  // (M4.5) iOS pageSheet 모달에서는 autoFocus 가 키패드를 못 띄울 때가 있어, 잠깐 뒤 한 번 더 포커스한다.
  // 이미 포커스돼 있으면 아무 일도 없다. 수정 화면(autoFocusAmount 없음)은 기존 값 확인이 먼저라 건너뛴다
  useEffect(() => {
    if (!autoFocusAmount) return;
    const timer = setTimeout(() => amountRef.current?.focus?.(), motion.focusDelayMs);
    return () => clearTimeout(timer);
  }, [autoFocusAmount, motion.focusDelayMs]);

  // 작년 1월 1일 ~ 오늘. 범위 밖 기존 기록은 날짜 칸에 그대로 보이고, 피커만 범위 안에서 연다(고르기 전엔 데이터 불변)
  const bounds = entryDateBounds();
  const minimumDate = toDate(bounds.min);
  const maximumDate = toDate(bounds.max);

  const onDateChange = (event: DateTimePickerEvent, selected?: Date) => {
    // 취소는 event.type === 'dismissed' 로 와서 아무것도 바꾸지 않는다
    if (event.type === 'set' && selected) form.setDate(fromDate(selected));
  };

  /**
   * iOS: 날짜 행 아래 휠을 펼치고 접는다.
   * Android: 컴포넌트로 그리면 다시 그려질 때마다(onChange 가 새 함수) 다이얼로그가 또 뜨는 문제가 있어,
   * 라이브러리가 권하는 명령형 API 로 한 번만 연다. 다이얼로그는 선택·취소하면 스스로 닫힌다
   */
  const onDatePress = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: toDate(values.date),
        mode: 'date',
        minimumDate,
        maximumDate,
        onChange: onDateChange,
      });
      return;
    }
    setPickerOpen((v) => !v);
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
      // Android(edge-to-edge)는 키보드가 창을 줄여 주지 않을 수 있어 높이로 비킨다. 이미 줄었으면 겹침이 0 이라 무해하다
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ padding: sp.md, gap: sp.md, paddingBottom: sp.xl + bottomInset }}>
        {recent.length > 0 ? (
          <View>
            <Text style={labelStyle}>최근 항목</Text>
            <QuickEntryChips items={recent} categories={categories} onPress={form.applyRecent} />
          </View>
        ) : null}

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
              ref={amountRef}
              testID="amount-input"
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
          <View style={{ marginTop: sp.sm }}>
            <AmountPresetChips
              sign={form.presetSign}
              onToggleSign={() => {
                chipTapHaptic();
                form.togglePresetSign();
              }}
              onPress={(preset) => {
                chipTapHaptic();
                form.applyPreset(preset);
              }}
            />
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
            onPress={onDatePress}
            testID="date-field"
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
              display="spinner"
              locale="ko-KR"
              minimumDate={minimumDate}
              maximumDate={maximumDate}
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
