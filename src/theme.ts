import { useColorScheme, type TextStyle, type ViewStyle } from 'react-native';

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
  /** 컨트롤 테두리 (입력 필드, 칩, 토글) */
  border: string;
  /** 카드 안쪽 구분선 (목록 행 사이, 헤더 아래). (M3.6) 잔디의 기록 없는 날 칸 */
  divider: string;
  /** (M3.6) 잔디의 아직 오지 않은 날 칸. divider 보다 한 단계 연하다 */
  grassFuture: string;
  /** (M3.6) 잔디 농도 1~4단계. primarySoft → primary 사이를 4등분 (4 = primary) */
  grass1: string;
  grass2: string;
  grass3: string;
  grass4: string;
  /** (M4) 컨페티 조각 색. primary·primarySoft 와 함께 4색으로 쓴다. 넓은 면적·글자에는 쓰지 않는다 */
  good: string;
  warn: string;
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
  divider: '#EDEFF2',
  grassFuture: '#F5F6F8',
  grass1: '#BACFF9',
  grass2: '#8CAFF5',
  grass3: '#5D8FF1',
  grass4: '#2F6FED',
  good: '#30A46C',
  warn: '#F5A524',
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
  divider: '#2E333C',
  // (M4) 라이트처럼 미래 칸은 bg 와 같은 "움푹한" 칸으로. 기존 #22262D 는 기록 없는 날(divider)과 구분이 안 됐다
  grassFuture: '#0F1115',
  grass1: '#2E436F',
  grass2: '#3D5C9A',
  grass3: '#4C74C4',
  grass4: '#5B8DEF',
  good: '#4CC38A',
  warn: '#FFB224',
};

/** 간격 토큰 (px) — 4의 배수만 */
export const sp = {
  xs: 4,
  sm: 8,
  /** 8과 16 사이: 행 세로 패딩, 버튼 높이 맞춤 */
  smd: 12,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

/** 폰트 크기 토큰 (typeScale 이 우선, 이모지·단위 글자 등 예외에만 직접 사용) */
export const fs = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 36,
} as const;

export const radius = {
  /** (홈 폴리싱) 잔디 칸처럼 16pt 이하 작은 면 */
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  /** 알약 모양 (칩) */
  pill: 999,
} as const;

export type TypeToken = Pick<TextStyle, 'fontSize' | 'fontWeight' | 'lineHeight'>;

/**
 * 타이포 스케일. 크기·굵기·행간을 한 덩어리로 쓴다.
 * 위계: display(절약액) > title > heading > action/bodyStrong > body > label/note > caption
 */
export const typeScale = {
  /** 이번 달 절약액 같은 주인공 숫자 */
  display: { fontSize: fs.xxl, fontWeight: '800', lineHeight: 42 },
  /** 화면 제목, 금액 입력값 */
  title: { fontSize: fs.xl, fontWeight: '700', lineHeight: 34 },
  /** 카드·섹션 제목 */
  heading: { fontSize: fs.lg, fontWeight: '700', lineHeight: 26 },
  /** 헤더의 저장 같은 주요 액션 */
  action: { fontSize: fs.md, fontWeight: '700', lineHeight: 22 },
  /** 강조 본문 (금액, 카드 라벨, 버튼) */
  bodyStrong: { fontSize: fs.md, fontWeight: '600', lineHeight: 22 },
  /** 기본 본문 (항목명, 입력값) */
  body: { fontSize: fs.md, fontWeight: '400', lineHeight: 22 },
  /** 섹션 헤더 날짜, 작은 버튼 */
  label: { fontSize: fs.sm, fontWeight: '600', lineHeight: 20 },
  /** 보조 문장 (섹션 합계, 기록 건수·평균) */
  note: { fontSize: fs.sm, fontWeight: '400', lineHeight: 20 },
  /** 필드 라벨, 메모 미리보기 */
  caption: { fontSize: fs.xs, fontWeight: '400', lineHeight: 16 },
} as const satisfies Record<string, TypeToken>;

/** 금액·날짜처럼 자리를 맞춰야 하는 숫자에 함께 쓴다 */
export const numeric: TextStyle = { fontVariant: ['tabular-nums'] };

export type ShadowToken = Pick<
  ViewStyle,
  'shadowOpacity' | 'shadowRadius' | 'shadowOffset' | 'elevation'
>;

/**
 * 그림자는 "떠 있어야 하는 것"에만. 색은 쓰는 쪽에서 `shadowColor: colors.text` 로 준다.
 * 카드·행·칩은 그림자 없이 배경색 대비로만 구분한다.
 */
export const shadow = {
  fab: { shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  sheet: { shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: -2 }, elevation: 8 },
} as const satisfies Record<string, ShadowToken>;

/** 크기 토큰 (px) */
export const size = {
  /** 최소 터치 영역 = 목록 행·버튼 최소 높이 */
  touch: 44,
  /** FAB 지름 / 모달 헤더 좌우 액션 폭 */
  fab: 56,
  fabIcon: 30,
  headerAction: 56,
  /** 스와이프 삭제 버튼 폭 */
  swipeAction: 88,
  /** 메모 입력 최소 높이 */
  memoMin: 80,
  /** 월/년 세그먼트 토글 최소 폭 */
  toggleMin: 120,
  /** (M3) 일별 막대 그래프 영역 높이 */
  barTrack: 120,
  /** (M3) 금액이 아주 작은 날도 보이도록 하는 막대 최소 높이 */
  barMin: 2,
  /** (M3) 막대 그래프 축 라벨 폭. 막대 한 칸보다 넓어서 칸 가운데 기준으로 양옆에 걸친다 */
  axisLabel: 28,
  /** (M3) 카테고리 비율 바 / (M3.5) 목표 진행 바 두께 */
  bar: 10,
  /** (M3.6) 잔디 오늘 칸 테두리 두께 */
  todayRing: 2,
  /** (M3.6 → 홈 폴리싱) 잔디 칸 높이. 너비는 폭을 7등분 — 6줄 달이어도 목록이 첫 화면에 3행 보이게 낮게 둔다 */
  grassCell: 16,
  /** (M3.6) 이모지 적립 줄 한 칸 (정사각형). 이모지 글자 크기는 fs.md */
  emojiCell: 24,
  /** (홈 폴리싱) 카드 아래 정보 칩(연속 기록일·누적·이모지 적립) 최소 높이 = emojiCell + sp.xs * 2 */
  statChip: 32,
  /** (M4) 저장 컨페티 한 조각 (가로 × 세로 사각형) */
  confettiWidth: 6,
  confettiHeight: 10,
} as const;

export type Theme = {
  colors: ColorTokens;
  isDark: boolean;
  sp: typeof sp;
  fs: typeof fs;
  radius: typeof radius;
  type: typeof typeScale;
  shadow: typeof shadow;
  size: typeof size;
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
    type: typeScale,
    shadow,
    size,
  };
}
