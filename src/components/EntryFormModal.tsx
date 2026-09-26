import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { EntryForm } from '@/src/components/EntryForm';
import type { Category, EntryInput } from '@/src/db';
import { useEntryForm } from '@/src/features/useEntryForm';
import { useRecentTitles } from '@/src/features/useRecentTitles';
import { size, useTheme } from '@/src/theme';

type Props = {
  visible: boolean;
  categories: Category[];
  /** 저장 버튼. 부모가 실제 저장 + 닫기를 담당한다. */
  onSubmit: (input: EntryInput) => void;
  onClose: () => void;
  /**
   * (M4, iOS) 시트가 화면에서 완전히 내려간 뒤 한 번. 홈은 "저장으로 닫힘"일 때 여기서 축하 연출을 시작한다 (t0).
   * Android 에는 이 이벤트가 없어 부르는 쪽이 안전 타이머로 폴백한다.
   */
  onDismissed?: () => void;
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
  onDismissed,
  initial = null,
  title = '기록 추가',
}: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      testID="entry-form-modal"
      onRequestClose={onClose}
      onDismiss={() => {
        onDismissed?.();
        onClose();
      }}>
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
  // 빠른 입력 칩은 새 기록에만. 열릴 때마다 새로 마운트되므로 방금 저장한 항목도 다음에 바로 보인다
  const recent = useRecentTitles(initial === null);

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
      <EntryForm form={form} categories={categories} recent={recent} autoFocusAmount />
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
});
