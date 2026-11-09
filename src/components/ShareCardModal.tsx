import { useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View, type ViewInstance } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { ShareCard } from '@/src/components/ShareCard';
import { PNG_SHARE, shareFile } from '@/src/features/backupFile';
import { toFileUri, type ShareCardData } from '@/src/features/shareCard';
import { useModalInsets } from '@/src/features/useModalInsets';
import { size, useTheme } from '@/src/theme';

type Props = {
  visible: boolean;
  data: ShareCardData;
  onClose: () => void;
};

/** 자랑 이미지 미리보기. "공유하기" 를 누르면 카드를 PNG 로 찍어 공유 시트로 보낸다 */
export function ShareCardModal({ visible, data, onClose }: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
      onDismiss={onClose}>
      <ShareCardModalBody data={data} onClose={onClose} />
    </Modal>
  );
}

function ShareCardModalBody({ data, onClose }: Omit<Props, 'visible'>) {
  const { colors, type, sp, radius } = useTheme();
  const insets = useModalInsets();
  const cardRef = useRef<ViewInstance>(null);
  const [busy, setBusy] = useState(false);

  const share = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const path = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        width: size.shareCardExportWidth,
        height: size.shareCardExportHeight,
      });
      if (!(await shareFile(toFileUri(path), PNG_SHARE))) {
        Alert.alert('공유할 수 없어요', '이 기기에서는 공유 시트를 열 수 없어요.');
      }
    } catch {
      Alert.alert('공유하지 못했어요', '잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.bg }]}>
      <View
        style={[
          styles.header,
          {
            paddingHorizontal: sp.md,
            paddingVertical: sp.xs,
            paddingTop: sp.xs + insets.top,
            backgroundColor: colors.card,
          },
        ]}>
        <Pressable onPress={onClose} hitSlop={sp.sm} accessibilityRole="button" style={styles.headerSide}>
          <Text style={[type.body, { color: colors.textMuted }]}>닫기</Text>
        </Pressable>
        <Text style={[styles.headerTitle, type.bodyStrong, { color: colors.text }]}>자랑하기</Text>
        <View style={styles.headerSide} />
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.body,
          { padding: sp.lg, gap: sp.lg, paddingBottom: sp.xl + insets.bottom },
        ]}>
        <ShareCard ref={cardRef} data={data} />
        <Pressable
          onPress={() => void share()}
          disabled={busy}
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          style={({ pressed }) => [
            styles.shareButton,
            {
              backgroundColor: colors.primary,
              borderRadius: radius.md,
              minHeight: size.floatingSave,
              opacity: busy ? 0.4 : pressed ? 0.7 : 1,
            },
          ]}>
          <Text style={[type.action, { color: colors.onPrimary }]}>공유하기</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center' },
  headerSide: { width: size.headerAction, minHeight: size.touch, justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center' },
  body: { alignItems: 'center' },
  shareButton: { alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
});
