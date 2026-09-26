import { Outfit_400Regular } from '@expo-google-fonts/outfit/400Regular';
import { Outfit_600SemiBold } from '@expo-google-fonts/outfit/600SemiBold';
import { Outfit_700Bold } from '@expo-google-fonts/outfit/700Bold';
import { Outfit_800ExtraBold } from '@expo-google-fonts/outfit/800ExtraBold';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { initDatabase } from '@/src/db';
import { numFont, sp, typeScale, useTheme } from '@/src/theme';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// DB 준비 + 숫자 폰트 로드 전까지 스플래시 유지
SplashScreen.preventAutoHideAsync();

/**
 * (B 방향) 숫자 전용 폰트 Outfit 4굵기. 이름은 theme 의 numFont 와 같다.
 * 루트 패키지(@expo-google-fonts/outfit)는 9굵기를 모두 require 해서 번들에 들어가므로 굵기별 경로로 가져온다
 */
const NUMBER_FONTS = {
  [numFont.regular]: Outfit_400Regular,
  [numFont.semibold]: Outfit_600SemiBold,
  [numFont.bold]: Outfit_700Bold,
  [numFont.extrabold]: Outfit_800ExtraBold,
};

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
  // 폰트 로드가 실패해도 앱은 연다 — 숫자는 같은 굵기의 시스템 폰트로 대신 그려진다 (numFace 의 fontWeight)
  const [fontsLoaded, fontError] = useFonts(NUMBER_FONTS);
  const fontsSettled = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (fontsSettled) SplashScreen.hideAsync();
  }, [fontsSettled]);

  // 폰트가 오기 전엔 스플래시 뒤에서 아무것도 그리지 않는다 (시스템 폰트 숫자가 번쩍 바뀌는 것 방지)
  if (!fontsSettled) return null;

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
