import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { numeric, useTheme } from '@/src/theme';

type Props = {
  message: string;
  onClose: () => void;
};

/**
 * (M4) 지난달 회고 카드. 매달 1~3일 홈 맨 위에 RecordBanner 와 같은 "잠깐 알림" 모양으로 한 줄.
 * 닫기 버튼은 44pt 터치 영역이지만 카드 안쪽 여백으로 파고들어 카드 높이는 배너와 같게 둔다.
 */
export function ReviewCard({ message, onClose }: Props) {
  const { colors, type, fs, sp, radius, size } = useTheme();
  return (
    <View
      testID="review-card"
      style={[
        styles.row,
        { backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: sp.smd },
      ]}>
      <Text numberOfLines={2} style={[styles.text, type.label, numeric, { color: colors.primary }]}>
        {message}
      </Text>
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="지난달 회고 닫기"
        style={({ pressed }) => [
          styles.close,
          {
            width: size.touch,
            height: size.touch,
            marginVertical: -sp.smd,
            marginRight: -sp.smd,
            opacity: pressed ? 0.7 : 1,
          },
        ]}>
        <Ionicons name="close" size={fs.lg} color={colors.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  text: { flex: 1 },
  close: { alignItems: 'center', justifyContent: 'center' },
});
