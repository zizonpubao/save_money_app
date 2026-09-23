import { useColorScheme } from 'react-native';

export type ColorTokens = {
  bg: string;
  card: string;
  text: string;
  textMuted: string;
  primary: string;
  /** primary 배경 위에 올리는 글자색 */
  onPrimary: string;
  /** primary 를 옅게 깐 배경 (선택 강조, 카드 포인트) */
  primarySoft: string;
  danger: string;
  border: string;
};

export const lightColors: ColorTokens = {
  bg: '#F5F6F8',
  card: '#FFFFFF',
  text: '#111418',
  textMuted: '#6B7280',
  primary: '#2F6FED',
  onPrimary: '#FFFFFF',
  primarySoft: '#E8EFFD',
  danger: '#E5484D',
  border: '#E5E7EB',
};

export const darkColors: ColorTokens = {
  bg: '#0F1115',
  card: '#1A1D23',
  text: '#F3F4F6',
  textMuted: '#9CA3AF',
  primary: '#5B8DEF',
  onPrimary: '#FFFFFF',
  primarySoft: '#1F2A44',
  danger: '#F2555A',
  border: '#2A2E36',
};

/** 간격 토큰 (px) */
export const sp = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

/** 폰트 크기 토큰 */
export const fs = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 36,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
} as const;

export type Theme = {
  colors: ColorTokens;
  isDark: boolean;
  sp: typeof sp;
  fs: typeof fs;
  radius: typeof radius;
};

/** 시스템 색상 모드에 따라 테마 토큰을 돌려준다. */
export function useTheme(): Theme {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return {
    colors: isDark ? darkColors : lightColors,
    isDark,
    sp,
    fs,
    radius,
  };
}
