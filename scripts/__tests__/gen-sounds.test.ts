/// <reference types="node" />
// 테스트만 Node fs 로 파일을 읽는다 (앱 tsconfig 는 jest 타입만 싣는다)
import { readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * scripts/gen-sounds.mjs 가 만든 assets/sounds/*.wav 규격 확인 (22.05kHz · 40KB 이하 · 피크 -1 dBFS).
 * 파일을 다시 만들려면: node scripts/gen-sounds.mjs
 */
const DIR = join(__dirname, '..', '..', 'assets', 'sounds');

const RATE = 22050;
const LENGTH_MS = { tap: 90, ding: 320, tada: 380, fanfare: 450 } as const;
/** -1 dBFS = 0.891 × 32767 */
const PEAK = Math.round(10 ** (-1 / 20) * 32767);

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

  it.each(Object.keys(LENGTH_MS))('%s.wav: 피크 -1 dBFS 로 정규화, 첫·끝 샘플은 0 (5ms 페이드로 클릭 제거)', (name) => {
    const buf = readFileSync(join(DIR, `${name}.wav`));
    let peak = 0;
    for (let i = 44; i < buf.length; i += 2) peak = Math.max(peak, Math.abs(buf.readInt16LE(i)));
    expect(peak).toBeLessThanOrEqual(PEAK + 1);
    expect(peak).toBeGreaterThanOrEqual(PEAK - 1);
    expect(buf.readInt16LE(44)).toBe(0);
    expect(buf.readInt16LE(buf.length - 2)).toBe(0);
  });
});
