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
  /** (M3.6) 잔디 농도 1~4단계. 옅은 새싹색 → primary 초록 4단계 (4 = primary). 1단계는 기록 없는 날(divider)과 구분되게 */
  grass1: string;
  grass2: string;
  grass3: string;
  grass4: string;
  /**
   * (M4 → B 방향) 컨페티 조각 색. 버터 노랑 — 목표 달성 컨페티의 절반을 맡는다.
   * 메인 초록(primary)과 겹치지 않게 초록에서 뺐다. 넓은 면적·글자에는 쓰지 않는다
   */
  good: string;
  /**
   * (B 방향) 강조 주황. 면으로만 쓴다 — 🔥 칩 바탕 · 컨페티. 글자색으로는 대비가 모자라 쓰지 않는다.
   * 위에 올리는 글자는 onWarn
   */
  warn: string;
  /** (B 방향) warn 면 위 글자색 */
  onWarn: string;
  /** (B 방향) 목표 달성 순간 카드에 번졌다 빠지는 옅은 주황 틴트. 위의 primary·textMuted 글자 대비 4.5 이상 */
  warnSoft: string;
  /**
   * (B 방향) 잔디 오늘 칸 테두리. primary 로 두면 가장 진한 칸(grass4 = primary)에서 사라져서 글자 톤으로.
   * 칸 안쪽 grass4 와는 3:1 이 안 되지만 테두리 바깥이 card 와 14:1 이라 모양으로 읽힌다
   */
  todayRing: string;
  /** (폴리싱) 떠 있는 것(FAB·원탭 메뉴)의 그림자 색. 다크에서 text(밝은 색)를 쓰면 흰 번짐이 생겨 검정으로 */
  shadow: string;
};

/*
 * (B 방향 "따뜻한 저금통") 크림 바탕 + 숲 초록 메인 + 주황 강조(면에만) + 갈색 톤 글자 (라이트).
 * 다크는 중성 차콜 + 생생한 초록·주황 (갈색 다크가 "썩은 나무" 같다는 피드백으로 교체).
 * 대비는 WCAG 2.x 로 계산한 값 (src/utils/__tests__/themeContrast.test.ts 가 지킨다).
 */
export const lightColors: ColorTokens = {
  bg: '#FAF6EF',
  card: '#FFFFFF',
  // bg 위 14.0
  text: '#2B2520',
  // bg 위 5.35 · card 위 5.76 (진단서의 #7A6F64 는 bg 위 4.55 로 경계라 한 단계 진하게)
  textMuted: '#6F645A',
  // card 위 5.37 · bg 위 4.99 · 흰 글자 5.37
  primary: '#23794B',
  onPrimary: '#FFFFFF',
  primarySoft: '#E3F1E8',
  // primarySoft 위 5.59 (primary 는 4.61)
  onPrimarySoft: '#1A6B40',
  // card 위 5.21 · bg 위 4.84
  danger: '#CE2C31',
  border: '#EAE2D6',
  divider: '#F1EBE1',
  grassFuture: '#FAF6EF',
  grass1: '#B6DCC1',
  grass2: '#7FC096',
  grass3: '#4C9E70',
  grass4: '#23794B',
  good: '#EDB83D',
  // 면 전용. onWarn 글자 6.16
  warn: '#F28C28',
  onWarn: '#2B2520',
  // primary 글자 4.61 · textMuted 4.94
  warnSoft: '#FDEBD6',
  todayRing: '#2B2520',
  shadow: '#2B2520',
};

export const darkColors: ColorTokens = {
  // (사용자 피드백 "갈색 다크 = 썩은 나무") 갈색 검정 → 아주 살짝 차가운 중성 차콜. 순수 검정은 쓰지 않는다
  bg: '#131517',
  // bg 와 1.13 — 카드가 한 단계 밝다
  card: '#1E2125',
  // bg 위 16.5 · card 위 14.6
  text: '#F2F3F4',
  // card 위 6.20 · bg 위 7.02
  textMuted: '#9BA1A8',
  // 생생한 초록. card 위 8.62 · bg 위 9.76
  primary: '#3DD68C',
  // 밝은 초록 위 흰 글자는 대비가 모자라 어두운 글자로 (9.76). danger 위에 얹어도 6.06
  onPrimary: '#131517',
  primarySoft: '#163526',
  // primarySoft 위 8.38 (primary 는 7.12)
  onPrimarySoft: '#6BE3A6',
  // card 위 5.35
  danger: '#FF5C61',
  // card 와 1.50
  border: '#393E45',
  // 카드보다 한 단계 밝은 구분선 (card 와 1.25)
  divider: '#2E3237',
  // 라이트처럼 미래 칸은 bg 와 같은 "움푹한" 칸
  grassFuture: '#131517',
  // 기록 없는 날(divider)과 1.42 로 구분되게 채도를 올린 1단계. 단계 사이 1.65~1.72
  grass1: '#1A5236',
  grass2: '#227A4E',
  grass3: '#2BA366',
  grass4: '#3DD68C',
  good: '#F5CB4A',
  // 면 전용. onWarn 글자 8.97
  warn: '#FF9F43',
  onWarn: '#131517',
  // primary 글자 7.20 · textMuted 5.18
  warnSoft: '#42290F',
  todayRing: '#F2F3F4',
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
  /** (B 방향) 36 → 40: 숫자 폰트(Outfit)로 바꾸며 주인공 숫자를 한 단계 키운다 */
  xxl: 40,
} as const;

export const radius = {
  /** (홈 폴리싱) 잔디 칸처럼 16pt 이하 작은 면 */
  xs: 4,
  /** 세그먼트 토글 안 칸. (B 방향) 8 → 12: 바깥 md(16) − 안쪽 여백 sp.xs(4) 로 모서리가 겹쳐 보이게 */
  sm: 12,
  /** 입력·버튼·행 묶음·배너. (B 방향) 12 → 16 */
  md: 16,
  /** 카드. (B 방향) 16 → 22 — 둥근 저금통 느낌 */
  lg: 22,
  /** 알약 모양 (칩) */
  pill: 999,
} as const;

export type TypeToken = Pick<TextStyle, 'fontSize' | 'fontWeight' | 'lineHeight' | 'fontFamily'>;

/**
 * (B 방향) 숫자 전용 라틴 폰트 Outfit — 굵기별 파일이 따로라 fontWeight 대신 fontFamily 이름으로 고른다.
 * app/_layout.tsx 가 useFonts 로 이 이름 그대로 로드한다. 한글(“원”·“누적”)은 글꼴에 없어서 시스템 폰트로 자동 대체된다.
 * 금액·숫자 텍스트에만 쓴다 — 한글 위주 문장(오늘의 한 줄·배너·설정 값)은 시스템 폰트 그대로.
 */
export const numFont = {
  regular: 'Outfit_400Regular',
  semibold: 'Outfit_600SemiBold',
  bold: 'Outfit_700Bold',
  extrabold: 'Outfit_800ExtraBold',
} as const;

/**
 * 숫자 폰트 얼굴. typeScale 스타일 뒤에 같은 굵기로 덧붙인다 — 예: [type.bodyStrong, numeric, numFace.semibold].
 * fontWeight 를 파일 굵기와 같게 둬서 폰트 로드 실패 때도 시스템 폰트가 같은 굵기로 대신 그린다
 * (Android 는 요청 굵기와 파일 굵기가 같으면 가짜 굵게를 입히지 않는다)
 */
export const numFace = {
  regular: { fontFamily: numFont.regular, fontWeight: '400' },
  semibold: { fontFamily: numFont.semibold, fontWeight: '600' },
  bold: { fontFamily: numFont.bold, fontWeight: '700' },
  extrabold: { fontFamily: numFont.extrabold, fontWeight: '800' },
} as const satisfies Record<string, TextStyle>;

/**
 * 타이포 스케일. 크기·굵기·행간을 한 덩어리로 쓴다.
 * 위계: display(절약액) > title > heading > action/bodyStrong > body > label/note > caption
 * (B 방향) display·title 은 숫자에만 쓰여서 숫자 폰트를 넣었다. 행간은 Outfit 의 글자 높이(1.26em)보다 크게 — Android 잘림 방지
 */
export const typeScale = {
  /** 이번 달 절약액 같은 주인공 숫자 (40 × 1.26 = 50.4 → 행간 52) */
  display: { fontSize: fs.xxl, fontWeight: '800', lineHeight: 52, fontFamily: numFont.extrabold },
  /** 금액 입력값 (28 × 1.26 = 35.3 → 36) */
  title: { fontSize: fs.xl, fontWeight: '700', lineHeight: 36, fontFamily: numFont.bold },
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

/**
 * 금액·날짜처럼 자리를 맞춰야 하는 숫자에 함께 쓴다.
 * includeFontPadding: Android 글꼴의 위아래 여백을 빼서 큰 숫자·칩 글자가 세로 가운데에 오게 한다 (iOS 는 무시)
 */
export const numeric: TextStyle = { fontVariant: ['tabular-nums'], includeFontPadding: false };

export type ShadowToken = Pick<
  ViewStyle,
  'shadowOpacity' | 'shadowRadius' | 'shadowOffset' | 'elevation'
>;

/**
 * 그림자는 "떠 있어야 하는 것"에만. 색은 쓰는 쪽에서 `shadowColor: colors.shadow` 로 준다.
 * 카드·행·칩은 그림자 없이 배경색 대비로만 구분한다.
 */
export const shadow = {
  // Android 는 shadow* 를 무시하고 elevation 으로만 그림자를 그린다 (색은 shadowColor 를 따라 다크에서도 검정)
  fab: { shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  sheet: { shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: -2 }, elevation: 8 },
} as const satisfies Record<string, ShadowToken>;

/**
 * 화면 위를 덮는 층. Android 는 elevation 이 있는 뷰(FAB)를 zIndex 와 상관없이 위에 그리므로,
 * 축하 오버레이는 떠 있는 것들(shadow.*)보다 높은 elevation 을 함께 준다. 배경 없는 뷰라 그림자는 생기지 않는다
 */
export const layer = {
  overlay: { zIndex: 2, elevation: 12 },
} as const satisfies Record<string, Pick<ViewStyle, 'zIndex' | 'elevation'>>;

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
