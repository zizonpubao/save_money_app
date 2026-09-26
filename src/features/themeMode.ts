import { Appearance } from 'react-native';

import { getSetting, SETTING_KEYS } from '@/src/db';

/** 앱 테마. system 은 iOS 설정(라이트/다크)을 따른다 */
export type ThemeMode = 'system' | 'light' | 'dark';

/** 설정 탭 칩 순서 */
export const THEME_MODES: readonly ThemeMode[] = ['system', 'light', 'dark'];

export const THEME_MODE_LABELS: Record<ThemeMode, string> = {
  system: '시스템',
  light: '라이트',
  dark: '다크',
};

/** settings `theme_mode` 값. 없거나 모르는 값이면 system */
export function parseThemeMode(value: string | null): ThemeMode {
  return value === 'light' || value === 'dark' ? value : 'system';
}

/** 저장해 둔 테마. DB 를 읽지 못하면 system */
export function readThemeMode(): ThemeMode {
  try {
    return parseThemeMode(getSetting(SETTING_KEYS.themeMode));
  } catch {
    return 'system';
  }
}

/**
 * 앱 전체 색 모드를 바꾼다. useColorScheme() 을 쓰는 useTheme · 내비게이션 테마 · StatusBar 가 모두 따라온다.
 * RN 0.86 은 null 대신 'unspecified' 로 시스템 설정 따르기로 돌아간다
 */
export function applyThemeMode(mode: ThemeMode): void {
  Appearance.setColorScheme(mode === 'system' ? 'unspecified' : mode);
}
