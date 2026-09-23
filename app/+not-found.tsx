import { Link, Stack } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { Screen } from '@/src/components/Screen';
import { useTheme } from '@/src/theme';

export default function NotFoundScreen() {
  const { colors, fs, sp } = useTheme();
  return (
    <>
      <Stack.Screen options={{ title: '없는 화면' }} />
      <Screen style={styles.center}>
        <Text style={{ color: colors.text, fontSize: fs.lg, fontWeight: '600' }}>
          이 화면은 존재하지 않습니다.
        </Text>
        <Link href="/" style={{ marginTop: sp.md, paddingVertical: sp.md }}>
          <Text style={{ color: colors.primary, fontSize: fs.md }}>홈으로 가기</Text>
        </Link>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
