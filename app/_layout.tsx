import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { initDatabase } from '@/src/db';
import { sp, typeScale, useTheme } from '@/src/theme';

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
        <Text style={[styles.errorBody, { color: colors.textMuted }]}>{db.error.message}</Text>
      </View>
    );
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const { isDark, colors } = useTheme();
  // 내비게이션 기본 테마 색을 앱 토큰으로 바꾼다. 화면 전환 중 비치는 바탕·기본 헤더(없는 화면)가
  // React Navigation 기본색(다크 거의 검정 · 라이트 회색)이 아니라 bg·card 로 보이게
  const navTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.bg,
        card: colors.card,
        text: colors.text,
        border: colors.divider,
      },
    };
  }, [isDark, colors]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider value={navTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="entry/[id]"
            options={{
              title: '기록 수정',
              headerBackButtonDisplayMode: 'minimal',
              // 탭 레이아웃과 같은 헤더 색
              headerStyle: { backgroundColor: colors.card },
              headerTintColor: colors.primary,
              headerTitleStyle: { color: colors.text },
              headerShadowVisible: false,
              contentStyle: { backgroundColor: colors.bg },
            }}
          />
        </Stack>
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: sp.lg, gap: sp.sm },
  errorTitle: typeScale.heading,
  errorBody: typeScale.note,
});
