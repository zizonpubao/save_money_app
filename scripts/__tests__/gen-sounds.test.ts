/// <reference types="node" />
// 테스트만 Node fs 로 파일을 읽는다 (앱 tsconfig 는 jest 타입만 싣는다)
import { readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * scripts/gen-sounds.mjs 가 만든 assets/sounds/*.wav 규격 확인 (DESIGN 효과음 규격).
 * 파일을 다시 만들려면: node scripts/gen-sounds.mjs
 */
const DIR = join(__dirname, '..', '..', 'assets', 'sounds');

const LENGTH_MS = { tap: 100, ding: 250, tada: 340, fanfare: 400 } as const;

describe('효과음 파일 (gen-sounds)', () => {
  it.each(Object.entries(LENGTH_MS))('%s.wav: 16kHz mono PCM16 · %ims · 20KB 이하', (name, ms) => {
    const file = join(DIR, `${name}.wav`);
    expect(statSync(file).size).toBeLessThanOrEqual(20 * 1024);
    const buf = readFileSync(file);
    expect(buf.toString('ascii', 0, 4)).toBe('RIFF');
    expect(buf.toString('ascii', 8, 12)).toBe('WAVE');
    expect(buf.readUInt16LE(20)).toBe(1); // PCM
    expect(buf.readUInt16LE(22)).toBe(1); // mono
    expect(buf.readUInt32LE(24)).toBe(16000);
    expect(buf.readUInt16LE(34)).toBe(16);
    expect(buf.readUInt32LE(40)).toBe((16000 * 2 * ms) / 1000);
  });

  it.each(Object.keys(LENGTH_MS))('%s.wav: 피크 -6 dBFS 이하, 끝 샘플은 0 (클릭 잡음 방지)', (name) => {
    const buf = readFileSync(join(DIR, `${name}.wav`));
    let peak = 0;
    for (let i = 44; i < buf.length; i += 2) peak = Math.max(peak, Math.abs(buf.readInt16LE(i)));
    expect(peak).toBeLessThanOrEqual(16384);
    expect(peak).toBeGreaterThan(16000);
    expect(buf.readInt16LE(buf.length - 2)).toBe(0);
  });
});
