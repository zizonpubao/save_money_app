/**
 * (M4) 금액 구간별 저장 이펙트.
 * - base (1만원 미만): 기존 Success 햅틱 + 카운트업 + 펄스
 * - mid (1만원 이상): Medium 햅틱 2연타 + 컨페티 20개
 * - big (5만원 이상): Heavy 햅틱 + 컨페티 40개 + 큰 숫자 스케일 1.1
 * 목표 달성과 겹치면 햅틱은 목표 것만 낸다 (홈 화면이 고른다).
 */
export type CelebrationTier = 'base' | 'mid' | 'big';

export const MID_TIER_MIN = 10000;
export const BIG_TIER_MIN = 50000;

/** 저장 금액으로 이펙트 구간을 정한다. 경계값은 위 구간에 넣는다 (10,000원 = mid) */
export function celebrationTier(amount: number): CelebrationTier {
  if (amount >= BIG_TIER_MIN) return 'big';
  if (amount >= MID_TIER_MIN) return 'mid';
  return 'base';
}

/** 구간별 컨페티 조각 수 */
export const CONFETTI_COUNT: Record<CelebrationTier, number> = { base: 0, mid: 20, big: 40 };

/** 컨페티 전체 재생 시간 (ms). 1초를 넘지 않는다 (DESIGN 모션 규칙) */
export const CONFETTI_MS = 800;

/** 시작점: 카드 상단 가운데에서 좌우 이 폭(pt) 안 */
const SPREAD = 60;
/** 날아가며 옆으로 더 흘러가는 폭(pt) */
const DRIFT = 40;
/** 위로 튀어 오르는 높이(pt) 범위 */
const RISE_MIN = 40;
const RISE_MAX = 90;
/** 시작점보다 아래로 떨어지는 거리(pt) 범위. 카드 안에서 사라진다 */
const FALL_MIN = 80;
const FALL_MAX = 160;
/** 한 번 재생하는 동안 도는 각도(도) 범위, 방향은 조각마다 무작위 */
const SPIN_MAX = 540;
/** 이 진행률부터 투명해지기 시작한다 */
const FADE_FROM = 0.6;

/** 조각 색 순번. 0 primary · 1 primarySoft · 2 good · 3 warn */
export type ConfettiColor = 0 | 1 | 2 | 3;

export type ConfettiPiece = {
  /** 시작 x (카드 가운데 기준, pt) */
  x0: number;
  /** 끝날 때까지 옆으로 더 가는 거리 (pt) */
  drift: number;
  /** 최고점까지 올라가는 높이 (pt, 양수) */
  rise: number;
  /** 끝날 때 시작점보다 아래 거리 (pt, 양수) */
  fall: number;
  /** 시작 각도 (도) */
  rot0: number;
  /** 재생 동안 도는 각도 (도, 음수면 반시계) */
  spin: number;
  color: ConfettiColor;
};

/** 시드 하나로 같은 수열을 내는 32비트 난수 (mulberry32). 테스트에서 조각 배치를 고정할 수 있다 */
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

/** count 개 조각의 궤적. 시드는 저장 시각이라 저장할 때마다 모양이 달라진다 */
export function makeConfettiPieces(count: number, seed: number): ConfettiPiece[] {
  const rand = seededRandom(seed);
  const between = (min: number, max: number) => min + (max - min) * rand();
  return Array.from({ length: Math.max(0, Math.floor(count)) }, () => ({
    x0: between(-SPREAD, SPREAD),
    drift: between(-DRIFT, DRIFT),
    rise: between(RISE_MIN, RISE_MAX),
    fall: between(FALL_MIN, FALL_MAX),
    rot0: between(0, 360),
    spin: between(-SPIN_MAX, SPIN_MAX),
    color: Math.min(3, Math.floor(rand() * 4)) as ConfettiColor,
  }));
}

export type ConfettiFrame = { x: number; y: number; rotate: number; opacity: number };

/**
 * 진행률 t(0~1)에서 조각 위치. y 는 아래가 +.
 * 포물선 y = a(t - p)² - rise 가 t=0 에서 0, t=1 에서 fall 이 되도록 꼭짓점 p 와 a 를 정한다
 * (위로 튀었다가 중력으로 점점 빨리 떨어진다).
 * reanimated UI 스레드에서도 부르므로 worklet 이다.
 */
export function confettiFrame(piece: ConfettiPiece, t: number): ConfettiFrame {
  'worklet';
  const r = Math.sqrt(piece.rise / (piece.rise + piece.fall));
  const peak = r / (1 + r);
  const a = piece.rise / (peak * peak);
  const y = a * (t - peak) * (t - peak) - piece.rise;
  const opacity = t <= FADE_FROM ? 1 : Math.max(0, (1 - t) / (1 - FADE_FROM));
  return {
    x: piece.x0 + piece.drift * t,
    y,
    rotate: piece.rot0 + piece.spin * t,
    opacity,
  };
}
