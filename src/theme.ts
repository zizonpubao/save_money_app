import { Platform, useColorScheme, type TextStyle, type ViewStyle } from 'react-native';

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
  /** (폴리싱) primarySoft 배경 위 글자·아이콘색. primary 는 라이트에서 대비 3.9 라 한 단계 진하게 (다크는 밝게) */
  onPrimarySoft: string;
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
  /** (폴리싱) 떠 있는 것(FAB·원탭 메뉴)의 그림자 색. 다크에서 text(밝은 색)를 쓰면 흰 번짐이 생겨 검정으로 */
  shadow: string;
};

export const lightColors: ColorTokens = {
  bg: '#F5F6F8',
  card: '#FFFFFF',
  text: '#111418',
  textMuted: '#6B7280',
  primary: '#2F6FED',
  onPrimary: '#FFFFFF',
  primarySoft: '#E8EFFD',
  // (폴리싱) primarySoft 위 대비 5.65 (primary 는 3.94)
  onPrimarySoft: '#1F56C8',
  // (폴리싱) #E5484D 는 card 위 글자 대비 3.9 → 4.5 이상으로 한 단계 진하게 (흰 글자 얹어도 5.2)
  danger: '#CE2C31',
  border: '#E5E7EB',
  divider: '#EDEFF2',
  grassFuture: '#F5F6F8',
  grass1: '#BACFF9',
  grass2: '#8CAFF5',
  grass3: '#5D8FF1',
  grass4: '#2F6FED',
  good: '#30A46C',
  warn: '#F5A524',
  shadow: '#111418',
};

export const darkColors: ColorTokens = {
  bg: '#0F1115',
  card: '#1A1D23',
  text: '#F3F4F6',
  textMuted: '#9CA3AF',
  primary: '#5B8DEF',
  onPrimary: '#FFFFFF',
  primarySoft: '#1F2A44',
  // (폴리싱) primarySoft 위 대비 5.18 (primary 는 4.41)
  onPrimarySoft: '#6E9BF2',
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
  shadow: '#000000',
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
 * 그림자는 "떠 있어야 하는 것"에만. 색은 쓰는 쪽에서 `shadowColor: colors.shadow` 로 준다.
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
  /** (M4) big 등급 컨페티 조각 배율 — 가로·세로에 곱한다 (6×10 → 8.4×14) */
  confettiScaleBig: 1.4,
  /** (M4 축하 연출) 카드 글로우 테두리 두께: 1겹째 / 2겹째 */
  glowBorder: 4,
  glowBorder2: 2,
  /** (M4.5) + 길게 누르기 원탭 저장 메뉴 폭 */
  quickMenuWidth: 240,
  /** (M5) 카테고리 편집 모달의 이모지 입력 칸 폭 (이모지 2자 + 좌우 여백) */
  emojiInput: 72,
  /** (폴리싱) 빠른 입력 칩 최대 폭. 긴 항목명은 말줄임 */
  chipMaxWidth: 200,
  /** (폴리싱) 카테고리별 합계의 % 칸 폭 ("100%" 가 들어가는 폭). 금액이 오른쪽 줄에 맞는다 */
  percentLabel: 40,
} as const;

/**
 * (M4) 저장 축하 연출 토큰 (DESIGN "저장 축하 연출" 절).
 * 시각(…At)은 모두 t0(입력 시트가 다 내려간 순간) 기준 ms. 타격은 hitAt, 이후 요소는 stagger(40) 단위로 뒤따른다.
 */
const HIT_AT = 80;
const STAGGER = 40;

export const motion = {
  /** 움츠림 크기 · 카드 타격 최고값(시드로 cardHitMin~cardHit) · 큰 숫자 오버슈트 · 칩 오버슈트 */
  shrink: 0.97,
  cardHit: 1.08,
  cardHitMin: 1.06,
  /** big 카드 타격(시드 없이 고정). 358pt 카드 × 1.09 = 390pt — 390 폭 화면 끝에 닿는 한계 (1.10 은 394 로 넘친다) */
  cardHitBig: 1.09,
  numberHit: 1.15,
  numberHitBig: 1.25,
  chipHit: 1.3,
  /** 플로팅 라벨 오버슈트 최고값: 기본 / big */
  labelHit: 1.3,
  labelHitBig: 1.4,
  stagger: STAGGER,
  /** 플로팅 라벨이 떠오르는 거리(pt) · 시작 크기: 기본 / big */
  floatRise: 40,
  floatRiseBig: 60,
  labelFrom: 0.6,
  labelFromBig: 0.5,
  /** 글로우가 카드 밖으로 퍼지는 거리(pt): 1겹째 / 2겹째 (2겹째는 화면 좌우 여백 16 안) */
  glowSpread: 12,
  glowSpread2: 16,
  /** 글로우 시작 투명도: 라이트 / 다크 */
  glowOpacity: 0.35,
  glowOpacityDark: 0.45,
  /** 화면 플래시(big) 1번째 최고 투명도: 라이트 / 다크 */
  flashOpacity: 0.14,
  flashOpacityDark: 0.18,
  /** 화면 플래시 2번째(여진) 최고 투명도: 라이트 / 다크 (다크는 1번째처럼 한 단계 높여야 보인다) */
  flash2Opacity: 0.08,
  flash2OpacityDark: 0.1,
  /** big 화면 흔들림: 홈 영역을 좌우 ±amplitude(pt) 로 4번, 합 ms (한 번 = ms / 4) */
  shake: { amplitude: 3, ms: 120 },
  springHit: { damping: 12, stiffness: 320, mass: 0.8 },
  springSettle: { damping: 18, stiffness: 200 },
  /** big 카드·숫자 settle — damping 을 낮춰 한 번 더 출렁인다 */
  springSettleBig: { damping: 13, stiffness: 200 },
  /** 목표 바: 평소 / 목표 달성 */
  springBar: { damping: 16, stiffness: 180 },
  springBarGoal: { damping: 11, stiffness: 220 },
  /** 배너 등장: 목표(위에서 튕겨 내려옴) / 이정표·최고(작게 시작해 넘쳤다 돌아옴) */
  springBannerDrop: { damping: 11, stiffness: 260 },
  springBannerPop: { damping: 10, stiffness: 300 },

  /**
   * 시트 onDismiss 가 안 오면(Android·테스트) 이 시간 뒤 t0 로 친다.
   * iOS 는 onDismiss 가 오는 게 정상이라, 시트가 내려가는 중에 먼저 치지 않게 더 기다린다
   */
  t0FallbackMs: Platform.select({ ios: 600, default: 400 }),
  /** 움츠림 끝 = 타격(햅틱·소리·카드·숫자·글로우·컨페티·플래시) */
  hitAt: HIT_AT,
  cardHitMs: 100,
  countUpMs: 600,
  labelAt: HIT_AT + STAGGER,
  labelMs: 700,
  /** big 라벨: labelAt(120) 부터 880ms → t0+1000 에 끝난다 (1초 상한) */
  labelMsBig: 880,
  labelFadeInMs: 80,
  labelFadeOutMs: 250,
  glowMs: 600,
  glow2At: HIT_AT + STAGGER * 2,
  flashInMs: 40,
  flashOutMs: 80,
  /** 2번째 플래시: 타격 + 220 (Heavy 3번째 · 컨페티 3번째와 같은 박자), 합 100ms */
  flash2At: HIT_AT + 220,
  flash2InMs: 30,
  flash2OutMs: 70,
  /** mid 컨페티 한 번 */
  confettiMs: 800,
  /** big 컨페티 3번 터짐 시각 (타격 +0 / +100 / +220) — 모두 confettiEndAt 에 함께 끝난다 */
  confettiBigAt: [HIT_AT, HIT_AT + 100, HIT_AT + 220],
  confettiEndAt: 1000,
  /** big 3번째 터짐이 좌우로 더 벌어지는 각도(도) */
  confettiBig3Spread: 30,
  /** big 컨페티 초속 배율 */
  confettiSpeedBig: 1.3,
  emojiAt: HIT_AT + STAGGER * 3,
  streakAt: HIT_AT + STAGGER * 4,
  /** 🔥 칩 흔들림 한 박(ms)과 각도 순서(도) */
  wiggleMs: 60,
  wiggle: [-6, 6, -3, 0],
  goalBarAt: HIT_AT + STAGGER * 5,
  bannerAt: 300,
  bannerFadeGoalMs: 120,
  bannerFadeMs: 100,
  /** 목표 달성 카드 틴트: 번짐 / 빠짐 (hitAt 부터 합 800ms) */
  tintInMs: 200,
  tintOutMs: 600,
  /** big·목표 Success 햅틱(피날레): 타격 + 420 — 마지막 Heavy(타격 + 220)와 200ms 떨어뜨린다 */
  finaleAt: HIT_AT + 420,
  /** 축하 햅틱 박자(타격 기준 ms): mid 의 두 번째 Heavy · big 의 Heavy 3연타("쿵쿵—쿵") */
  hapticMidAt: 80,
  hapticBigAt: [0, 90, 220],
  /** 동작 줄이기: 목표 바 · 배너 등장 */
  reducedBarMs: 300,
  reducedBannerMs: 150,
  /** 오버레이를 걷는 시각. big 컨페티·라벨이 끝나는 t0+1000 */
  layerMs: 1000,

  /** (M4.5) + 버튼 길게 누르기 인식 시간 */
  longPressMs: 500,
  /** (M4.5) 원탭 저장 메뉴가 펼쳐지고 닫히는 시간. 원탭 저장의 t0 = 메뉴가 다 닫힌 순간 */
  quickMenuMs: 150,
  /** (M4.5) 원탭 저장 메뉴 시작 크기 (→ 1) */
  quickMenuFrom: 0.9,
  /** (M4.5) 원탭 저장 메뉴 펼침 spring. quickMenuMs 안에 살짝 넘쳤다 선다 */
  springQuickMenu: { dampingRatio: 0.7 },
  /** (M4.5) iOS pageSheet 에서 autoFocus 가 안 먹을 때 금액 칸에 다시 포커스를 주는 지연 */
  focusDelayMs: 100,
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
  motion: typeof motion;
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
    motion,
  };
}
