import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { initDatabase } from '@/src/db';
import { useTheme } from '@/src/theme';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// DB 준비 전까지 스플래시 유지
SplashScreen.preventAutoHideAsync();

type DbState = { ready: true; error: null } | { ready: false; error: Error };

/** initDatabase() 는 동기 함수라 첫 렌더 전에 한 번만 실행하면 된다 (useState 초기화 함수). */
function bootDatabase(): DbState {
  try {
    initDatabase();
    return { ready: true, error: null };
  } catch (e) {
    return { ready: false, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

export default function RootLayout() {
  const [db] = useState<DbState>(bootDatabase);
  const { colors } = useTheme();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  if (!db.ready) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Text style={[styles.errorTitle, { color: colors.danger }]}>데이터베이스 초기화 실패</Text>
        <Text style={{ color: colors.textMuted }}>{db.error.message}</Text>
      </View>
    );
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const { isDark } = useTheme();

  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  errorTitle: { fontSize: 18, fontWeight: '600' },
});
