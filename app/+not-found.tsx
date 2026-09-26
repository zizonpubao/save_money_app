import { Link, Stack } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { Screen } from '@/src/components/Screen';
import { useTheme } from '@/src/theme';

export default function NotFoundScreen() {
  const { colors, type, sp } = useTheme();
  return (
    <>
      <Stack.Screen options={{ title: '없는 화면' }} />
      <Screen style={styles.center}>
        {/* 기록 수정의 "찾을 수 없음" 과 같은 빈 상태 모양: bodyStrong 한 줄 + label primary 텍스트 버튼(44pt) */}
        <Text style={[type.bodyStrong, { color: colors.text }]}>이 화면은 존재하지 않습니다</Text>
        <Link href="/" style={{ marginTop: sp.sm, paddingVertical: sp.smd }}>
          <Text style={[type.label, { color: colors.primary }]}>홈으로 가기</Text>
        </Link>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
