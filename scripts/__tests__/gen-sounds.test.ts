/// <reference types="node" />
// 테스트만 Node fs 로 파일을 읽는다 (앱 tsconfig 는 jest 타입만 싣는다)
import { readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * scripts/gen-sounds.mjs 가 만든 assets/sounds/*.wav 규격 확인 (22.05kHz · 40KB 이하 · 피크 -1 dBFS, big 의 hit 만 -0.5 dBFS,
 * 입력 버튼 타격음 딸깍·톡은 -6 dBFS · 150ms 이하, 빼기 띵-동은 -10 dBFS · 300ms 이하).
 * 금액 칩 동전 녹음(coin-classic · coin-spin)은 이 스크립트가 만들지 않는다. 맨 아래 블록에서 형식만 본다.
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
  'coin-low': 260,
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
  'coin-low': -10 + 20 * Math.log10(1.2), // −10 dBFS 의 120% (아이폰 피드백)
  toggle: -6,
  pop: -6,
};

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

  it.each(['toggle', 'pop'] as const)('%s.wav (입력 버튼): 150ms 이하', (name) => {
    expect(LENGTH_MS[name]).toBeLessThanOrEqual(150);
  });

  it('coin-low.wav (빼기 "띵-동"): 두 음이라 조금 길지만 300ms 이하, 둘째 음(70ms~)이 첫 음보다 늦게 다시 커진다', () => {
    expect(LENGTH_MS['coin-low']).toBeLessThanOrEqual(300);
    const data = samples('coin-low');
    // 첫 음 솔이 잦아든 60~69ms 보다 둘째 음 레가 들어온 75~90ms 가 크다 → 내려가는 두 음
    expect(peakIn(data, 75, 90)).toBeGreaterThan(peakIn(data, 60, 69));
  });

  it.each(['toggle', 'pop'] as const)('%s.wav: attack 이 즉각적이다 (첫 3ms 안에 피크의 절반 이상)', (name) => {
    const data = samples(name);
    const peak = peakIn(data, 0, LENGTH_MS[name]);
    expect(peakIn(data, 0, 3)).toBeGreaterThanOrEqual(peak * 0.5);
  });

  it('toggle.wav: 25ms 뒤 두 번째 클릭이 다시 커진다 ("딸깍")', () => {
    const data = samples('toggle');
    expect(peakIn(data, 25, 30)).toBeGreaterThan(peakIn(data, 18, 24) * 2);
  });
});

/** 금액 칩 동전 소리. Pixabay 녹음을 다듬어 넣은 파일이라(assets/sounds/CREDITS.md) 합성 규격과 다르다 */
describe('동전 녹음 파일 (설정에서 고르는 2개)', () => {
  const RECORDINGS = { 'coin-classic': 600, 'coin-spin': 900 } as const;
  /** 파일별 피크(dBFS). 짤랑은 에너지가 꽉 찬 녹음이라 3.5dB 낮췄고, 이후 아이폰 피드백 "여전히 너무 커"로 짤랑만 70% → 다시 80% 로 낮췄다 (빙글은 "딱 적당해") */
  const REC_PEAK_DB = { 'coin-classic': -12.5, 'coin-spin': -4 } as const;
  const REC_RATE = 44100;

  it.each(Object.entries(RECORDINGS))('%s.wav: 44.1kHz mono PCM16 · %ims · 정한 피크 근처', (name, ms) => {
    const buf = readFileSync(join(DIR, `${name}.wav`));
    expect(buf.toString('ascii', 0, 4)).toBe('RIFF');
    expect(buf.toString('ascii', 8, 12)).toBe('WAVE');
    expect(buf.readUInt16LE(20)).toBe(1); // PCM
    expect(buf.readUInt16LE(22)).toBe(1); // mono
    expect(buf.readUInt32LE(24)).toBe(REC_RATE);
    expect(buf.readUInt16LE(34)).toBe(16);
    expect(buf.toString('ascii', 36, 40)).toBe('data');
    expect(buf.readUInt32LE(40)).toBe(Math.round((REC_RATE * ms) / 1000) * 2);
    let peak = 0;
    for (let i = 44; i < buf.length; i += 2) peak = Math.max(peak, Math.abs(buf.readInt16LE(i)));
    const db = 20 * Math.log10(peak / 32767);
    const target = REC_PEAK_DB[name as keyof typeof REC_PEAK_DB];
    expect(db).toBeLessThanOrEqual(target + 0.5);
    expect(db).toBeGreaterThanOrEqual(target - 0.5);
  });

  it('합성 동전(coin.wav)은 더 없다', () => {
    expect(() => statSync(join(DIR, 'coin.wav'))).toThrow();
  });
});

/**
 * 아이폰 스피커로 들리는 크기 맞춤 (피드백 "−는 너무 작고 +는 너무 커").
 * 폰 스피커는 300Hz 아래를 거의 못 내므로 350Hz 1차 고역 통과를 두 번 건 뒤 50ms 창 RMS 최고값(dB)으로 비교한다.
 * (ffmpeg highpass=f=350 두 번 + astats RMS peak 로 잰 값과 같은 방식)
 */
describe('입력 버튼 소리 크기 균형 (스피커 기준)', () => {
  function readWav(name: string): { rate: number; data: number[] } {
    const buf = readFileSync(join(DIR, `${name}.wav`));
    const rate = buf.readUInt32LE(24);
    const data: number[] = [];
    for (let i = 44; i < buf.length; i += 2) data.push(buf.readInt16LE(i) / 32768);
    return { rate, data };
  }

  function speakerDb(name: string): number {
    const { rate, data } = readWav(name);
    let x = data;
    for (let pass = 0; pass < 2; pass += 1) {
      const rc = 1 / (2 * Math.PI * 350);
      const a = rc / (rc + 1 / rate);
      const out: number[] = new Array<number>(x.length).fill(0);
      for (let i = 1; i < x.length; i += 1) out[i] = a * ((out[i - 1] ?? 0) + (x[i] ?? 0) - (x[i - 1] ?? 0));
      x = out;
    }
    const win = Math.round(rate * 0.05);
    let best = 0;
    for (let start = 0; start + win <= x.length; start += Math.round(win / 4)) {
      let sum = 0;
      for (let i = start; i < start + win; i += 1) sum += (x[i] ?? 0) ** 2;
      best = Math.max(best, Math.sqrt(sum / win));
    }
    return 20 * Math.log10(best);
  }

  // 처음엔 스피커 기준 같은 크기(3dB 이내)로 맞췄지만, 아이폰에서 귀로 들어 보니 녹음마다 크게 들리는 정도가 달랐다.
  // 피드백 "마이너스 20% 키우고, 짤랑 30% 줄이고 다시 20% 더, 빙글은 딱 적당해" 를 반영한 스피커 기준 크기를 지킨다 (±1dB)
  // 값은 이 파일의 speakerDb(JS 1차 필터)로 잰 것 — ffmpeg 측정과 0.5~1dB 다를 수 있다
  const EAR_TUNED_DB = { 'coin-classic': -25.5, 'coin-spin': -19.5, 'coin-low': -18.8 } as const;

  it.each(Object.entries(EAR_TUNED_DB))('%s.wav: 아이폰에서 귀로 맞춘 스피커 기준 크기 %sdB 근처', (name, db) => {
    expect(Math.abs(speakerDb(name) - db)).toBeLessThanOrEqual(1);
  });

  it('− "띵-동"이 두 + 동전보다 크다 (예전 "−는 너무 작고 +는 너무 커" 가 다시 생기지 않게)', () => {
    expect(speakerDb('coin-low')).toBeGreaterThan(speakerDb('coin-classic'));
    expect(speakerDb('coin-low')).toBeGreaterThan(speakerDb('coin-spin'));
  });
});
