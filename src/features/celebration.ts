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
  return Array.from({ length: Math.max(0, Math.floor(count)) }, () => {
    const angle = (between(ANGLE_MIN, ANGLE_MAX) * Math.PI) / 180;
    const speed = between(SPEED_MIN, SPEED_MAX);
    return {
      x0: between(-JITTER, JITTER),
      vx: speed * Math.cos(angle),
      vy: speed * Math.sin(angle),
      fall: between(FALL_MIN, FALL_MAX),
      rot0: between(0, 360),
      spin: between(-SPIN_MAX, SPIN_MAX),
      color: Math.min(3, Math.floor(rand() * 4)) as ConfettiColor,
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
