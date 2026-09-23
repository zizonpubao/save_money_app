import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { EntryForm } from '@/src/components/EntryForm';
import type { Category, EntryInput } from '@/src/db';
import { useEntryForm } from '@/src/features/useEntryForm';
import { size, useTheme } from '@/src/theme';

type Props = {
  visible: boolean;
  categories: Category[];
  /** 저장 버튼. 부모가 실제 저장 + 닫기를 담당한다. */
  onSubmit: (input: EntryInput) => void;
  onClose: () => void;
  /** 수정 모드로 쓸 때 초기값 */
  initial?: EntryInput | null;
  title?: string;
};

/** 신규 입력 모달 (iOS 시트 스타일). 열릴 때마다 폼이 새로 마운트되어 초기화된다. */
export function EntryFormModal({
  visible,
  categories,
  onSubmit,
  onClose,
  initial = null,
  title = '기록 추가',
}: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onDismiss={onClose}>
      <ModalBody
        categories={categories}
        onSubmit={onSubmit}
        onClose={onClose}
        initial={initial}
        title={title}
      />
    </Modal>
  );
}

type BodyProps = Omit<Props, 'visible'> & { initial: EntryInput | null; title: string };

function ModalBody({ categories, onSubmit, onClose, initial, title }: BodyProps) {
  const { colors, type, sp } = useTheme();
  const form = useEntryForm(initial);

  return (
    <View style={[styles.flex, { backgroundColor: colors.bg }]}>
      <View
        style={[
          styles.header,
          { paddingHorizontal: sp.md, paddingVertical: sp.md, borderBottomColor: colors.divider },
        ]}>
        <Pressable onPress={onClose} hitSlop={sp.sm} style={styles.headerSide}>
          <Text style={[type.body, { color: colors.textMuted }]}>취소</Text>
        </Pressable>
        <Text style={[styles.headerTitle, type.bodyStrong, { color: colors.text }]}>{title}</Text>
        <Pressable
          onPress={() => onSubmit(form.toInput())}
          disabled={!form.canSave}
          hitSlop={sp.sm}
          style={[styles.headerSide, styles.headerRight]}>
          <Text style={[type.action, { color: form.canSave ? colors.primary : colors.textMuted }]}>
            저장
          </Text>
        </Pressable>
      </View>
      <EntryForm form={form} categories={categories} autoFocusAmount />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerSide: { width: size.headerAction },
  headerRight: { alignItems: 'flex-end' },
  headerTitle: { flex: 1, textAlign: 'center' },
});
