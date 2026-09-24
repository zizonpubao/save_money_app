/**
 * (M4) 저장 축하 연출 (DESIGN "저장 축하 연출" 절).
 * 금액 구간(base < 1만 ≤ mid < 5만 ≤ big)이 기본 등급이고, 사건(목표·이정표·최고·🔥)이 등급 바닥을 올리거나 층을 더한다.
 * 아래 등급은 위 등급의 부분집합이다. 배너·소리·축하 햅틱은 한 저장에 하나씩만 (목표 > 이정표 > 최고 > 구간).
 */
import { motion } from '@/src/theme';
import { formatWon } from '@/src/utils/money';

export type CelebrationTier = 'base' | 'mid' | 'big';

export const MID_TIER_MIN = 10000;
export const BIG_TIER_MIN = 50000;

/** 저장 금액으로 이펙트 구간을 정한다. 경계값은 위 구간에 넣는다 (10,000원 = mid) */
export function celebrationTier(amount: number): CelebrationTier {
  if (amount >= BIG_TIER_MIN) return 'big';
  if (amount >= MID_TIER_MIN) return 'mid';
  return 'base';
}

/** 이번 저장에 겹친 사건 */
export type CelebrationEvents = {
  /** 이번 달 목표를 처음 넘겼다 */
  goal: boolean;
  /** 누적 이정표를 새로 넘었다 */
  milestone: boolean;
  /** 하루·월 최고 기록을 갱신했다 */
  best: boolean;
  /** 연속 기록일이 늘었다 */
  streak: boolean;
};

export const NO_EVENTS: CelebrationEvents = { goal: false, milestone: false, best: false, streak: false };

export type HapticPattern = 'base' | 'mid' | 'big' | 'goal';
export type CelebrationSound = 'tap' | 'tada' | 'hit' | 'fanfare' | 'ding';
export type CelebrationBanner = 'goal' | 'milestone' | 'best' | null;
/** 플로팅 라벨 글자 크기 (typeScale 이름) */
export type LabelSize = 'heading' | 'title' | 'display';

export type CelebrationLayers = {
  /** 컨페티 터짐 횟수 */
  confettiBursts: 0 | 1 | 2;
  /** 한 번 터질 때 조각 수 (mid 는 한 번이라 많이, big 은 두 번이라 나눠서) */
  confettiPerBurst: number;
  /** 카드 글로우 겹 수 */
  glowRings: 1 | 2;
  /** 화면 플래시 (big 전용) */
  flash: boolean;
  /** 큰 숫자 오버슈트 최고값 */
  numberHit: number;
  /** 목표 층: 바 끝까지 · 카드 틴트 · 컨페티 good 50% */
  goal: boolean;
  /** 🔥 칩 튐 + 흔들림 */
  streak: boolean;
};

export type CelebrationPlan = {
  /** 사건으로 바닥을 올린 뒤의 등급 */
  tier: CelebrationTier;
  layers: CelebrationLayers;
  haptics: HapticPattern;
  sound: CelebrationSound;
  /** 플로팅 라벨 크기 */
  label: LabelSize;
  /** 카드 아래 배너 종류. 없으면 null */
  banner: CelebrationBanner;
};

const TIER_RANK: Record<CelebrationTier, number> = { base: 0, mid: 1, big: 2 };

/** 컨페티 조각 수: mid 는 한 번만 터지니 넉넉히(32), big 은 두 번이라 24 씩 (합 48, 50 이하) */
const CONFETTI_MID = 32;
const CONFETTI_BIG_PER_BURST = 24;

function atLeast(tier: CelebrationTier, floor: CelebrationTier): CelebrationTier {
  return TIER_RANK[tier] >= TIER_RANK[floor] ? tier : floor;
}

const TIER_LAYERS: Record<CelebrationTier, Omit<CelebrationLayers, 'goal' | 'streak'>> = {
  base: { confettiBursts: 0, confettiPerBurst: 0, glowRings: 1, flash: false, numberHit: motion.numberHit },
  mid: { confettiBursts: 1, confettiPerBurst: CONFETTI_MID, glowRings: 2, flash: false, numberHit: motion.numberHit },
  big: { confettiBursts: 2, confettiPerBurst: CONFETTI_BIG_PER_BURST, glowRings: 2, flash: true, numberHit: motion.numberHitBig },
};

const TIER_SOUND: Record<CelebrationTier, CelebrationSound> = { base: 'tap', mid: 'tada', big: 'hit' };
const TIER_LABEL: Record<CelebrationTier, LabelSize> = { base: 'heading', mid: 'title', big: 'display' };

/**
 * 등급 + 사건 → 연출 플랜.
 * - 바닥: 목표 → big (+ 목표 층) / 이정표 → 최소 big / 최고 → 최소 mid / 🔥 → 등급 그대로 (칩만 튄다)
 * - 소리: 목표 fanfare > 이정표 ding > 등급 소리 base tap · mid tada · big hit (최고 기록은 올린 등급의 소리)
 * - 햅틱: 목표 패턴 > 등급 패턴 · 배너: 목표 > 이정표 > 최고
 */
export function buildCelebrationPlan(amountTier: CelebrationTier, events: CelebrationEvents): CelebrationPlan {
  let tier = amountTier;
  if (events.best) tier = atLeast(tier, 'mid');
  if (events.milestone || events.goal) tier = atLeast(tier, 'big');

  const banner: CelebrationBanner = events.goal
    ? 'goal'
    : events.milestone
      ? 'milestone'
      : events.best
        ? 'best'
        : null;
  const sound: CelebrationSound = events.goal ? 'fanfare' : events.milestone ? 'ding' : TIER_SOUND[tier];

  return {
    tier,
    layers: { ...TIER_LAYERS[tier], goal: events.goal, streak: events.streak },
    haptics: events.goal ? 'goal' : tier,
    sound,
    label: TIER_LABEL[tier],
    banner,
  };
}

/** 시드 하나로 같은 수열을 내는 32비트 난수 (mulberry32). 테스트에서 배치를 고정할 수 있다 */
function seededRandom(seed: number): () => number {
  let a = Math.trunc(seed) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 카드 타격 최고값. 시드(저장 시각)로 1.06~1.08 사이를 고른다 — 매번 똑같이 튀면 질린다 */
export function cardHitPeak(seed: number): number {
  const r = seededRandom(seed)();
  return motion.cardHitMin + (motion.cardHit - motion.cardHitMin) * r;
}

/** 플로팅 라벨 꼬리말. 금액이 항상 주인공이고 꼬리말만 돈다 */
const LABEL_TAILS = ['', ' 적립', ' 아꼈다'] as const;

/** "+4,500원" / "+4,500원 적립" / "+4,500원 아꼈다" 를 시드로 고른다. big 은 꼬리말 대신 "🔥" */
export function floatingLabelText(amount: number, tier: CelebrationTier, seed: number): string {
  const won = `+${formatWon(amount)}`;
  if (tier === 'big') return `${won} 🔥`;
  const index = Math.floor(seededRandom(seed + 1)() * LABEL_TAILS.length);
  return `${won}${LABEL_TAILS[Math.min(LABEL_TAILS.length - 1, index)]}`;
}

/** 카드 사각형 (홈 영역 기준 pt). 컨페티·라벨 원점은 가운데, 글로우는 이 사각형 그대로 */
export type CardRect = { x: number; y: number; w: number; h: number };

/** 구간별 컨페티 조각 수 (합). mid 32 한 번 · big 24 + 24 두 번. 50개를 넘지 않는다 (View 파티클 성능) */
export const CONFETTI_COUNT: Record<CelebrationTier, number> = {
  base: 0,
  mid: TIER_LAYERS.mid.confettiPerBurst * TIER_LAYERS.mid.confettiBursts,
  big: TIER_LAYERS.big.confettiPerBurst * TIER_LAYERS.big.confettiBursts,
};

/** 한 번의 터짐: 시작 시각(t0 기준 ms) · 재생 시간 · 좌우로 더 벌리는 각도 */
export type ConfettiBurst = { at: number; ms: number; spread: number };

/** 터짐 순서. 두 번째는 짧게(700ms) + 좌우 20° 더 벌려 880ms 에 끝난다 */
export const CONFETTI_BURSTS: readonly ConfettiBurst[] = [
  { at: motion.hitAt, ms: motion.confettiMs, spread: 0 },
  { at: motion.confetti2At, ms: motion.confetti2Ms, spread: motion.confetti2Spread },
];

/** 시작점: 카드 가운데에서 좌우 이 폭(pt) 안. 조각이 한 점에 겹쳐 보이지 않을 만큼만 흩는다 */
const JITTER = 8;
/** 터지는 방향(도, 오른쪽 0 · 위가 음수). 위쪽 반원에서 양 끝 20도씩 빼 좌우로 조금만 눕는다 */
const ANGLE_MIN = -160;
const ANGLE_MAX = -20;
/** 처음 속도(pt / 재생 시간 전체) 범위 */
const SPEED_MIN = 160;
const SPEED_MAX = 320;
/**
 * 끝날 때 시작점보다 아래 거리(pt) 범위. 카드 아래 목록 쪽까지 떨어진다.
 * 최고 높이 = 속도² / (4 × (낙하 + 속도)) 라 SPEED_MAX 320 · FALL_MIN 110 이면 59.5pt — 위로 60pt 를 넘지 않는다
 */
const FALL_MIN = 110;
const FALL_MAX = 140;
/** 한 번 재생하는 동안 도는 각도(도) 범위, 방향은 조각마다 무작위 */
const SPIN_MAX = 540;
/** 이 진행률부터 투명해지기 시작한다 */
const FADE_FROM = 0.6;

/** 조각 색 순번. 0 primary · 1 primarySoft · 2 good · 3 warn */
export type ConfettiColor = 0 | 1 | 2 | 3;

export type ConfettiPiece = {
  /** 시작 x (카드 가운데 기준, pt) */
  x0: number;
  /** 처음 가로 속도 (pt / 재생 시간 전체, 오른쪽 +) */
  vx: number;
  /** 처음 세로 속도 (pt / 재생 시간 전체, 아래 + — 위로 터지므로 음수) */
  vy: number;
  /** 끝날 때 시작점보다 아래 거리 (pt, 양수) */
  fall: number;
  /** 시작 각도 (도) */
  rot0: number;
  /** 재생 동안 도는 각도 (도, 음수면 반시계) */
  spin: number;
  color: ConfettiColor;
};

/** 조각 색 섞기. default 는 4색 고르게, goal 은 good 50% · primary 25% · warn 25% (목표 달성) */
export type ConfettiPalette = 'default' | 'goal';

function pickColor(r: number, palette: ConfettiPalette): ConfettiColor {
  if (palette === 'goal') return r < 0.5 ? 2 : r < 0.75 ? 0 : 3;
  return Math.min(3, Math.floor(r * 4)) as ConfettiColor;
}

/**
 * count 개 조각의 궤적. 시드는 저장 시각이라 저장할 때마다 모양이 달라진다.
 * spread(도)만큼 각도 범위를 좌우로 더 벌린다 (big 의 두 번째 터짐).
 */
export function makeConfettiPieces(
  count: number,
  seed: number,
  spread = 0,
  palette: ConfettiPalette = 'default',
): ConfettiPiece[] {
  const rand = seededRandom(seed);
  const between = (min: number, max: number) => min + (max - min) * rand();
  return Array.from({ length: Math.max(0, Math.floor(count)) }, () => {
    const angle = (between(ANGLE_MIN - spread, ANGLE_MAX + spread) * Math.PI) / 180;
    const speed = between(SPEED_MIN, SPEED_MAX);
    return {
      x0: between(-JITTER, JITTER),
      vx: speed * Math.cos(angle),
      vy: speed * Math.sin(angle),
      fall: between(FALL_MIN, FALL_MAX),
      rot0: between(0, 360),
      spin: between(-SPIN_MAX, SPIN_MAX),
      color: pickColor(rand(), palette),
    };
  });
}

export type ConfettiFrame = { x: number; y: number; rotate: number; opacity: number };

/**
 * 진행률 t(0~1)에서 조각 위치. y 는 아래가 +.
 * 세로: 처음 속도 vy 로 튀고 중력 g 로 떨어진다. y = vy·t + g·t²/2 가 t=1 에서 fall 이 되도록 g 를 정한다.
 * 가로: 공기 저항으로 점점 느려진다. x = vx·(t - t²/2) — 처음 방향은 (vx, vy) 그대로라 사방으로 터져 보이고,
 * 끝까지 가도 vx/2 만 가서 화면 밖으로 멀리 날아가지 않는다.
 * reanimated UI 스레드에서도 부르므로 worklet 이다.
 */
export function confettiFrame(piece: ConfettiPiece, t: number): ConfettiFrame {
  'worklet';
  const g = 2 * (piece.fall - piece.vy);
  const y = piece.vy * t + (g / 2) * t * t;
  const x = piece.x0 + piece.vx * (t - (t * t) / 2);
  const opacity = t <= FADE_FROM ? 1 : Math.max(0, (1 - t) / (1 - FADE_FROM));
  return {
    x,
    y,
    rotate: piece.rot0 + piece.spin * t,
    opacity,
  };
}
