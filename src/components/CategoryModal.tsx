import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Category } from '@/src/db';
import { requestDeleteCategory, saveCategory } from '@/src/features/categoryActions';
import {
  CATEGORY_NAME_MAX,
  categoryErrorMessage,
  validateCategoryInput,
} from '@/src/features/categoryForm';
import { size, useTheme } from '@/src/theme';

type Props = {
  visible: boolean;
  /** 고칠 카테고리. null 이면 새로 추가 */
  category: Category | null;
  onClose: () => void;
};

/** (M5) 카테고리 추가·편집 모달. 월 목표 모달과 같은 pageSheet + 취소/저장 헤더 */
export function CategoryModal({ visible, category, onClose }: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onDismiss={onClose}>
      {/* 열 때마다 새로 마운트돼 입력이 고칠 카테고리 값으로 초기화된다 */}
      <CategoryModalBody key={category?.id ?? 'new'} category={category} onClose={onClose} />
    </Modal>
  );
}

function CategoryModalBody({ category, onClose }: Omit<Props, 'visible'>) {
  const { colors, type, fs, sp, radius } = useTheme();
  const [emoji, setEmoji] = useState(category?.emoji ?? '');
  const [name, setName] = useState(category?.name ?? '');
  const error = validateCategoryInput({ name, emoji });
  const canSave = error === null;
  const hint = categoryErrorMessage(error);

  const save = () => {
    if (!canSave) return;
    if (saveCategory(category?.id ?? null, { name, emoji })) onClose();
  };

  const field = { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.md };

  return (
    <View testID="category-modal" style={[styles.flex, { backgroundColor: colors.bg }]}>
      <View
        style={[
          styles.header,
          { paddingHorizontal: sp.md, paddingVertical: sp.xs, backgroundColor: colors.card },
        ]}>
        <Pressable onPress={onClose} hitSlop={sp.sm} style={styles.headerSide}>
          <Text style={[type.body, { color: colors.textMuted }]}>취소</Text>
        </Pressable>
        <Text style={[styles.headerTitle, type.bodyStrong, { color: colors.text }]}>
          {category ? '카테고리 편집' : '카테고리 추가'}
        </Text>
        <Pressable
          onPress={save}
          disabled={!canSave}
          hitSlop={sp.sm}
          accessibilityRole="button"
          accessibilityLabel="카테고리 저장"
          accessibilityState={{ disabled: !canSave }}
          style={[styles.headerSide, styles.headerRight]}>
          <Text style={[type.action, { color: canSave ? colors.primary : colors.textMuted }]}>
            저장
          </Text>
        </Pressable>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: sp.md, gap: sp.md, paddingBottom: sp.xl }}>
        <View style={[styles.fields, { gap: sp.smd }]}>
          <View>
            <Text style={[type.caption, { color: colors.textMuted, marginBottom: sp.xs }]}>
              이모지
            </Text>
            <TextInput
              value={emoji}
              onChangeText={setEmoji}
              placeholder="☕"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="카테고리 이모지"
              autoFocus={category === null}
              style={[
                styles.input,
                field,
                {
                  width: size.emojiInput,
                  minHeight: size.touch,
                  fontSize: fs.lg,
                  color: colors.text,
                  textAlign: 'center',
                  paddingVertical: sp.sm,
                },
              ]}
            />
          </View>
          <View style={styles.flex}>
            <Text style={[type.caption, { color: colors.textMuted, marginBottom: sp.xs }]}>
              이름
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="예: 편의점"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="카테고리 이름"
              returnKeyType="done"
              onSubmitEditing={save}
              maxLength={CATEGORY_NAME_MAX * 2}
              style={[
                styles.input,
                field,
                type.body,
                { color: colors.text, minHeight: size.touch, paddingHorizontal: sp.md, paddingVertical: sp.sm },
              ]}
            />
          </View>
        </View>

        <Text style={[type.note, { color: hint ? colors.danger : colors.textMuted }]}>
          {hint ?? '이모지는 1~2자, 이름은 다른 카테고리와 겹치지 않게 적어 주세요.'}
        </Text>

        {category ? (
          <View style={{ gap: sp.xs, marginTop: sp.sm }}>
            <Pressable
              onPress={() => requestDeleteCategory(category, onClose)}
              disabled={category.isDefault}
              accessibilityRole="button"
              accessibilityLabel="카테고리 삭제"
              accessibilityState={{ disabled: category.isDefault }}
              style={({ pressed }) => [
                styles.deleteButton,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  minHeight: size.touch,
                  paddingVertical: sp.smd,
                  opacity: category.isDefault ? 0.4 : pressed ? 0.7 : 1,
                },
              ]}>
              <Text style={[type.bodyStrong, { color: colors.danger }]}>카테고리 삭제</Text>
            </Pressable>
            {category.isDefault ? (
              <Text style={[type.caption, { color: colors.textMuted }]}>
                기본 카테고리는 삭제할 수 없습니다. 이름과 이모지는 바꿀 수 있습니다.
              </Text>
            ) : null}
          </View>
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
  fields: { flexDirection: 'row', alignItems: 'flex-end' },
  input: { borderWidth: 1 },
  deleteButton: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
