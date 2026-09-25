import {
  buildCelebrationPlan,
  cardHitPeak,
  CONFETTI_BURSTS_BIG,
  CONFETTI_BURSTS_MID,
  CONFETTI_COUNT,
  celebrationTier,
  confettiFrame,
  confettiSchedule,
  flashPulses,
  floatingLabelText,
  makeConfettiPieces,
  NO_EVENTS,
  shakeSteps,
  type CelebrationEvents,
} from '@/src/features/celebration';
import { motion } from '@/src/theme';

describe('celebrationTier (M4 금액 구간)', () => {
  it.each([
    [1, 'base'],
    [3999, 'base'],
    [4000, 'mid'],
    [19999, 'mid'],
    [20000, 'big'],
    [1000000, 'big'],
  ] as const)('%i원 → %s', (amount, tier) => {
    expect(celebrationTier(amount)).toBe(tier);
  });

  it('구간별 컨페티 수: 4천원 미만 0 · 4천원 이상 32 · 2만원 이상 24 × 3 = 72', () => {
    expect(CONFETTI_COUNT).toEqual({ base: 0, mid: 32, big: 72 });
    expect(CONFETTI_COUNT.big).toBeLessThanOrEqual(72);
  });

  it('mid 는 타격(t0+80)에 한 번 800ms — t0+880 에 끝난다 (그대로)', () => {
    expect(CONFETTI_BURSTS_MID.map((b) => [b.at, b.ms, b.spread, b.big])).toEqual([[80, 800, 0, false]]);
    expect(confettiSchedule(1)).toEqual(CONFETTI_BURSTS_MID);
    expect(confettiSchedule(0)).toEqual([]);
  });

  it('big 은 타격 +0/+100/+220 에 3번, 모두 t0+1000 에 함께 끝나고 3번째만 좌우 30° 더 넓게', () => {
    expect(CONFETTI_BURSTS_BIG.map((b) => [b.at, b.ms, b.spread, b.big])).toEqual([
      [80, 920, 0, true],
      [180, 820, 0, true],
      [300, 700, 30, true],
    ]);
    for (const b of CONFETTI_BURSTS_BIG) expect(b.at + b.ms).toBe(1000);
    expect(confettiSchedule(3)).toBe(CONFETTI_BURSTS_BIG);
  });
});

describe('makeConfettiPieces', () => {
  it('요청한 수만큼 만들고, 같은 시드면 같은 배치다', () => {
    const a = makeConfettiPieces(20, 1727150400000);
    expect(a).toHaveLength(20);
    expect(makeConfettiPieces(20, 1727150400000)).toEqual(a);
  });

  it('시드(저장 시각)가 다르면 배치가 달라진다', () => {
    expect(makeConfettiPieces(20, 1)).not.toEqual(makeConfettiPieces(20, 2));
  });

  it('카드 가운데(±8)에서 위쪽 반원(-160°~-20°)으로 사방에 터지고, 색은 4색 순번 중 하나', () => {
    const pieces = makeConfettiPieces(40, 42);
    for (const p of pieces) {
      expect(Math.abs(p.x0)).toBeLessThanOrEqual(8);
      expect([0, 1, 2, 3]).toContain(p.color);
      const angle = (Math.atan2(p.vy, p.vx) * 180) / Math.PI;
      expect(angle).toBeGreaterThanOrEqual(-160);
      expect(angle).toBeLessThanOrEqual(-20);
      expect(p.fall).toBeGreaterThan(0);
      expect(p.fall).toBeLessThanOrEqual(140);
    }
    // 방사형: 왼쪽·오른쪽으로 가는 조각이 둘 다 있다
    expect(pieces.some((p) => p.vx < 0)).toBe(true);
    expect(pieces.some((p) => p.vx > 0)).toBe(true);
  });

  it('어느 조각도 위로 60pt 를 넘게 튀지 않고, 끝에는 140pt 안쪽 아래에 있다', () => {
    for (const seed of [1, 42, 1727150400000]) {
      for (const p of makeConfettiPieces(40, seed)) {
        const ys = Array.from({ length: 201 }, (_, i) => confettiFrame(p, i / 200).y);
        expect(Math.min(...ys)).toBeGreaterThanOrEqual(-60);
        expect(confettiFrame(p, 1).y).toBeLessThanOrEqual(140);
      }
    }
  });

  it('0개면 빈 목록', () => {
    expect(makeConfettiPieces(0, 1)).toEqual([]);
  });

  it('big: 각도 -170°~-10° · 초속 1.3배 (208~416) — 기본보다 옆으로 넓고 빠르게 튄다', () => {
    const pieces = makeConfettiPieces(300, 3, 0, 'default', true);
    const angles = pieces.map((p) => (Math.atan2(p.vy, p.vx) * 180) / Math.PI);
    const speeds = pieces.map((p) => Math.hypot(p.vx, p.vy));
    for (const a of angles) {
      expect(a).toBeGreaterThanOrEqual(-170);
      expect(a).toBeLessThanOrEqual(-10);
    }
    expect(angles.some((a) => a < -160 || a > -20)).toBe(true);
    expect(Math.min(...speeds)).toBeGreaterThanOrEqual(160 * 1.3 - 1e-9);
    expect(Math.max(...speeds)).toBeLessThanOrEqual(320 * 1.3 + 1e-9);
    expect(Math.max(...speeds)).toBeGreaterThan(320);
  });

  it('big 3번째 터짐(spread 30)은 -170°~-10° 밖까지 더 넓게 퍼진다', () => {
    const angles = makeConfettiPieces(300, 9, 30, 'default', true).map(
      (p) => (Math.atan2(p.vy, p.vx) * 180) / Math.PI,
    );
    // atan2 는 -180 아래를 +180 쪽으로 감으므로 범위 밖으로 나간 조각이 있는지만 본다
    expect(angles.some((a) => a < -170 || a > -10)).toBe(true);
  });

  it('spread 20 이면 각도 범위가 좌우로 20° 더 벌어진다 (-180°~0°)', () => {
    const pieces = makeConfettiPieces(200, 7, 20);
    const angles = pieces.map((p) => (Math.atan2(p.vy, p.vx) * 180) / Math.PI);
    for (const a of angles) {
      expect(a).toBeGreaterThanOrEqual(-180);
      expect(a).toBeLessThanOrEqual(0);
    }
    // 기본 범위(-160~-20) 밖으로 나간 조각이 있다
    expect(angles.some((a) => a < -160 || a > -20)).toBe(true);
  });

  it('목표 달성 팔레트는 good 50% · primary 25% · warn 25% (primarySoft 없음)', () => {
    const pieces = makeConfettiPieces(2000, 11, 0, 'goal');
    const share = (c: number) => pieces.filter((p) => p.color === c).length / pieces.length;
    expect(share(2)).toBeCloseTo(0.5, 1);
    expect(share(0)).toBeCloseTo(0.25, 1);
    expect(share(3)).toBeCloseTo(0.25, 1);
    expect(share(1)).toBe(0);
  });
});

describe('confettiFrame', () => {
  // 오른쪽 위 45°로 초속 200 에 가까운 조각
  const piece = { x0: 5, vx: 140, vy: -140, fall: 120, rot0: 30, spin: 360, color: 0 as const };

  it('시작은 기준점, 불투명', () => {
    const f = confettiFrame(piece, 0);
    expect(f.x).toBe(5);
    expect(f.y).toBeCloseTo(0);
    expect(f.rotate).toBe(30);
    expect(f.opacity).toBe(1);
  });

  it('처음엔 (vx, vy) 방향으로 튀어 나간다 (방사형)', () => {
    const f = confettiFrame(piece, 0.01);
    const angle = (Math.atan2(f.y, f.x - piece.x0) * 180) / Math.PI;
    expect(angle).toBeCloseTo(-45, 0);
  });

  it('위로 튀어 올랐다가 끝에는 fall 만큼 아래에서 투명해지고, 가로는 vx/2 까지만 간다', () => {
    const ys = Array.from({ length: 101 }, (_, i) => confettiFrame(piece, i / 100).y);
    expect(Math.min(...ys)).toBeLessThan(0);
    const end = confettiFrame(piece, 1);
    expect(end.y).toBeCloseTo(120);
    expect(end.x).toBeCloseTo(5 + 70);
    expect(end.rotate).toBe(390);
    expect(end.opacity).toBe(0);
  });

  it('떨어질수록 빨라진다 (중력)', () => {
    const dy1 = confettiFrame(piece, 0.8).y - confettiFrame(piece, 0.7).y;
    const dy2 = confettiFrame(piece, 1).y - confettiFrame(piece, 0.9).y;
    expect(dy2).toBeGreaterThan(dy1);
  });
});

describe('buildCelebrationPlan (등급 + 사건 → 연출 플랜)', () => {
  const ev = (over: Partial<CelebrationEvents>): CelebrationEvents => ({ ...NO_EVENTS, ...over });

  it('base: 글로우 1겹 · 컨페티·플래시 없음 · Medium · tap · heading · 배너 없음', () => {
    expect(buildCelebrationPlan('base', NO_EVENTS)).toEqual({
      tier: 'base',
      layers: {
        confettiBursts: 0,
        confettiPerBurst: 0,
        glowRings: 1,
        flash: false,
        shake: false,
        numberHit: 1.15,
        goal: false,
        streak: false,
      },
      haptics: 'base',
      sound: 'tap',
      label: 'heading',
      banner: null,
    });
  });

  it('mid: base 에 컨페티 32개 1번 · 글로우 2겹을 더하고 tada · title', () => {
    const plan = buildCelebrationPlan('mid', NO_EVENTS);
    expect(plan.layers).toMatchObject({
      confettiBursts: 1,
      confettiPerBurst: 32,
      glowRings: 2,
      flash: false,
      shake: false,
      numberHit: 1.15,
    });
    expect([plan.haptics, plan.sound, plan.label, plan.banner]).toEqual(['mid', 'tada', 'title', null]);
  });

  it('big: 컨페티 24개씩 3번 · 플래시 · 흔들림 · 숫자 1.25 · Heavy 3연타 · hit · display', () => {
    const plan = buildCelebrationPlan('big', NO_EVENTS);
    expect(plan.layers).toMatchObject({
      confettiBursts: 3,
      confettiPerBurst: 24,
      glowRings: 2,
      flash: true,
      shake: true,
      numberHit: 1.25,
    });
    expect([plan.haptics, plan.sound, plan.label]).toEqual(['big', 'hit', 'display']);
  });

  it('목표 달성은 base 금액이어도 big + 목표 층, 햅틱·소리·배너 모두 목표 것 하나', () => {
    const plan = buildCelebrationPlan('base', ev({ goal: true }));
    expect(plan.tier).toBe('big');
    expect(plan.layers).toMatchObject({ goal: true, flash: true, shake: true, confettiBursts: 3 });
    expect([plan.haptics, plan.sound, plan.banner]).toEqual(['goal', 'fanfare', 'goal']);
  });

  it('이정표는 최소 big, 소리 ding, 배너 이정표', () => {
    const plan = buildCelebrationPlan('base', ev({ milestone: true }));
    expect([plan.tier, plan.haptics, plan.sound, plan.banner]).toEqual(['big', 'big', 'ding', 'milestone']);
    expect(plan.layers.goal).toBe(false);
  });

  it('최고 기록은 최소 mid, 소리는 올린 등급 것 (base → mid 의 tada)', () => {
    const plan = buildCelebrationPlan('base', ev({ best: true }));
    expect([plan.tier, plan.haptics, plan.sound, plan.banner]).toEqual(['mid', 'mid', 'tada', 'best']);
  });

  it('최고 기록 + big 금액은 big 그대로 (바닥은 내리지 않는다)', () => {
    const plan = buildCelebrationPlan('big', ev({ best: true }));
    expect([plan.tier, plan.sound, plan.banner]).toEqual(['big', 'hit', 'best']);
  });

  it('🔥 증가는 등급을 바꾸지 않고 칩 층만 켠다', () => {
    const plan = buildCelebrationPlan('base', ev({ streak: true }));
    expect(plan.tier).toBe('base');
    expect(plan.layers.streak).toBe(true);
    expect([plan.haptics, plan.sound, plan.banner]).toEqual(['base', 'tap', null]);
  });

  it('하나만 규칙: 목표 > 이정표 > 최고 — 다 겹쳐도 배너·소리·햅틱은 목표 것 하나', () => {
    const plan = buildCelebrationPlan('mid', ev({ goal: true, milestone: true, best: true, streak: true }));
    expect([plan.banner, plan.sound, plan.haptics]).toEqual(['goal', 'fanfare', 'goal']);
    expect(plan.layers.streak).toBe(true);
  });

  it('이정표 + 최고: 이정표가 이긴다', () => {
    const plan = buildCelebrationPlan('mid', ev({ milestone: true, best: true }));
    expect([plan.tier, plan.banner, plan.sound, plan.haptics]).toEqual(['big', 'milestone', 'ding', 'big']);
  });

  it('아래 등급의 층은 위 등급의 부분집합이다 (컨페티·글로우·숫자 오버슈트가 줄지 않는다)', () => {
    const [b, m, g] = (['base', 'mid', 'big'] as const).map((t) => buildCelebrationPlan(t, NO_EVENTS).layers);
    expect(b.confettiBursts).toBeLessThanOrEqual(m.confettiBursts);
    expect(m.confettiBursts).toBeLessThanOrEqual(g.confettiBursts);
    expect(b.glowRings).toBeLessThanOrEqual(m.glowRings);
    expect(m.numberHit).toBeLessThanOrEqual(g.numberHit);
  });
});

describe('질리지 않게 (시드)', () => {
  it('카드 타격 최고값은 1.06~1.08 사이, 1.08 을 넘지 않는다 (base·mid)', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      for (const tier of ['base', 'mid'] as const) {
        const peak = cardHitPeak(1727150400000 + seed * 997, tier);
        expect(peak).toBeGreaterThanOrEqual(1.06);
        expect(peak).toBeLessThanOrEqual(1.08);
      }
    }
  });

  it('big 카드 타격은 1.09 고정 — 358pt 카드가 390pt 화면 폭 안 (1.10 이면 394pt 로 넘친다)', () => {
    expect(cardHitPeak(1, 'big')).toBe(1.09);
    expect(cardHitPeak(2, 'big')).toBe(1.09);
    expect(Math.round(358 * cardHitPeak(1, 'big'))).toBeLessThanOrEqual(390);
  });

  it('플로팅 라벨은 금액이 주인공, 꼬리말만 돈다: "+4,500원" · "+4,500원 적립" · "+4,500원 아꼈다"', () => {
    const labels = new Set(Array.from({ length: 60 }, (_, i) => floatingLabelText(4500, 'base', i * 131)));
    expect([...labels].sort()).toEqual(['+4,500원', '+4,500원 아꼈다', '+4,500원 적립']);
  });

  it('big 은 꼬리말 대신 🔥', () => {
    expect(floatingLabelText(55000, 'big', 1)).toBe('+55,000원 🔥');
    expect(floatingLabelText(55000, 'big', 2)).toBe('+55,000원 🔥');
  });
});

describe('big 강화: 흔들림 · 플래시 2번 · 1초 상한', () => {
  it('흔들림은 ±3pt 로 4번, 30ms 씩 합 120ms, 제자리(0)에서 끝난다', () => {
    const steps = shakeSteps();
    expect(steps).toEqual([
      { to: 3, ms: 30 },
      { to: -3, ms: 30 },
      { to: 3, ms: 30 },
      { to: 0, ms: 30 },
    ]);
    expect(steps.reduce((sum, step) => sum + step.ms, 0)).toBe(motion.shake.ms);
  });

  it('플래시는 2번: 타격에 14%(다크 18%) 120ms → 타격 +220 에 8%(다크 10%) 100ms', () => {
    expect(flashPulses(false)).toEqual([
      { at: 80, peak: 0.14, inMs: 40, outMs: 80 },
      { at: 300, peak: 0.08, inMs: 30, outMs: 70 },
    ]);
    expect(flashPulses(true).map((p) => p.peak)).toEqual([0.18, 0.1]);
    const [a, b] = flashPulses(false);
    expect(a.at + a.inMs + a.outMs).toBeLessThan(b.at);
  });

  it('big 의 마지막 요소(컨페티 3번 · 라벨)는 t0+1000 에 끝나고, 오버레이도 그때 걷는다', () => {
    const ends = [
      ...CONFETTI_BURSTS_BIG.map((b) => b.at + b.ms),
      motion.labelAt + motion.labelMsBig,
      ...flashPulses(false).map((p) => p.at + p.inMs + p.outMs),
      motion.hitAt + motion.shake.ms,
    ];
    expect(Math.max(...ends)).toBe(1000);
    expect(motion.layerMs).toBe(1000);
  });
});
