/// <reference types="node" />
// 테스트만 Node fs 로 파일을 읽는다 (앱 tsconfig 는 jest 타입만 싣는다)
import { readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * scripts/gen-sounds.mjs 가 만든 assets/sounds/*.wav 규격 확인 (22.05kHz · 40KB 이하 · 피크 -1 dBFS, big 의 hit 만 -0.5 dBFS,
 * 입력 버튼 타격음 4개는 -6 dBFS · 150ms 이하, 찰랑거리는 coin 만 300ms 이하).
 * 파일을 다시 만들려면: node scripts/gen-sounds.mjs
 */
const DIR = join(__dirname, '..', '..', 'assets', 'sounds');

const RATE = 22050;
const LENGTH_MS = {
  tap: 90,
  ding: 320,
  tada: 380,
  hit: 520,
  fanfare: 450,
  coin: 260,
  'coin-low': 110,
  toggle: 60,
  pop: 70,
} as const;
/** 파일별 피크(dBFS). hit(big)만 한 단계 크게, 입력 버튼 타격음은 연타해도 덜 피곤하게 작게 */
const PEAK_DB: Record<keyof typeof LENGTH_MS, number> = {
  tap: -1,
  ding: -1,
  tada: -1,
  hit: -0.5,
  fanfare: -1,
  coin: -6,
  'coin-low': -6,
  toggle: -6,
  pop: -6,
};
const TAP_SOUNDS = ['coin', 'coin-low', 'toggle', 'pop'] as const;

function samples(name: string): number[] {
  const buf = readFileSync(join(DIR, `${name}.wav`));
  const out: number[] = [];
  for (let i = 44; i < buf.length; i += 2) out.push(buf.readInt16LE(i));
  return out;
}

function peakIn(data: number[], fromMs: number, toMs: number): number {
  const from = Math.round((RATE * fromMs) / 1000);
  const to = Math.round((RATE * toMs) / 1000);
  return data.slice(from, to).reduce((m, v) => Math.max(m, Math.abs(v)), 0);
}

describe('효과음 파일 (gen-sounds)', () => {
  it.each(Object.entries(LENGTH_MS))('%s.wav: 22.05kHz mono PCM16 · %ims · 40KB 이하', (name, ms) => {
    const file = join(DIR, `${name}.wav`);
    expect(statSync(file).size).toBeLessThanOrEqual(40 * 1024);
    const buf = readFileSync(file);
    expect(buf.toString('ascii', 0, 4)).toBe('RIFF');
    expect(buf.toString('ascii', 8, 12)).toBe('WAVE');
    expect(buf.readUInt16LE(20)).toBe(1); // PCM
    expect(buf.readUInt16LE(22)).toBe(1); // mono
    expect(buf.readUInt32LE(24)).toBe(RATE);
    expect(buf.readUInt16LE(34)).toBe(16);
    expect(buf.readUInt32LE(40)).toBe(Math.round((RATE * ms) / 1000) * 2);
  });

  it.each(Object.entries(PEAK_DB))('%s.wav: 피크 %s dBFS 로 정규화, 첫·끝 샘플은 0 (앞뒤 페이드로 클릭 제거)', (name, db) => {
    const buf = readFileSync(join(DIR, `${name}.wav`));
    const target = Math.round(10 ** (db / 20) * 32767);
    let peak = 0;
    for (let i = 44; i < buf.length; i += 2) peak = Math.max(peak, Math.abs(buf.readInt16LE(i)));
    expect(peak).toBeLessThanOrEqual(target + 1);
    expect(peak).toBeGreaterThanOrEqual(target - 1);
    expect(buf.readInt16LE(44)).toBe(0);
    expect(buf.readInt16LE(buf.length - 2)).toBe(0);
  });

  it('hit.wav: 첫 110ms "쿵"이 가장 크고(피크가 이 안), 200ms 두 번째 화음 뒤에도 소리가 이어진다', () => {
    const buf = readFileSync(join(DIR, 'hit.wav'));
    const at = (ms: number) => 44 + Math.round((RATE * ms) / 1000) * 2;
    const peakIn = (fromMs: number, toMs: number) => {
      let peak = 0;
      for (let i = at(fromMs); i < at(toMs); i += 2) peak = Math.max(peak, Math.abs(buf.readInt16LE(i)));
      return peak;
    };
    const thump = peakIn(0, 110);
    expect(thump).toBeGreaterThanOrEqual(Math.round(10 ** (-0.5 / 20) * 32767) - 1);
    // 두 번째 화음(200ms~)이 또렷이 들린다: 쿵의 절반 이상
    expect(peakIn(200, 260)).toBeGreaterThan(thump * 0.5);
    expect(peakIn(300, 400)).toBeGreaterThan(0);
  });

  it.each(['coin-low', 'toggle', 'pop'] as const)('%s.wav (입력 버튼): 150ms 이하', (name) => {
    expect(LENGTH_MS[name]).toBeLessThanOrEqual(150);
  });

  it('coin.wav: 찰랑거리는 여운 때문에 조금 길지만 300ms 이하 (연타해도 겹침이 과하지 않게)', () => {
    expect(LENGTH_MS.coin).toBeLessThanOrEqual(300);
  });

  it.each(['coin', 'toggle', 'pop'] as const)('%s.wav: attack 이 즉각적이다 (첫 3ms 안에 피크의 절반 이상)', (name) => {
    const data = samples(name);
    const peak = peakIn(data, 0, LENGTH_MS[name]);
    expect(peakIn(data, 0, 3)).toBeGreaterThanOrEqual(peak * 0.5);
  });

  it('coin.wav: 낮은 음이다 — 기본음이 1.2kHz 아래 (예전 2.5kHz 는 "얇고 높아 스트레스" 피드백)', () => {
    const data = samples('coin');
    // 5~30ms 구간 0 교차 수로 주 주파수를 어림한다 (f ≈ 교차 수 / 2 / 구간 길이)
    const from = Math.round((RATE * 5) / 1000);
    const to = Math.round((RATE * 30) / 1000);
    let crossings = 0;
    for (let i = from + 1; i < to; i += 1) {
      if (Math.sign(data[i] ?? 0) !== Math.sign(data[i - 1] ?? 0)) crossings += 1;
    }
    const hz = crossings / 2 / 0.025;
    expect(hz).toBeLessThan(1200);
    expect(hz).toBeGreaterThan(500);
  });

  it('coin.wav: 동전 여러 개가 이어져 160ms 뒤에도 마지막 동전이 들린다 ("찰랑찰랑")', () => {
    const data = samples('coin');
    const peak = peakIn(data, 0, LENGTH_MS.coin);
    expect(peakIn(data, 160, 200)).toBeGreaterThan(peak * 0.1);
  });

  it('toggle.wav: 25ms 뒤 두 번째 클릭이 다시 커진다 ("딸깍")', () => {
    const data = samples('toggle');
    expect(peakIn(data, 25, 30)).toBeGreaterThan(peakIn(data, 18, 24) * 2);
  });
});
