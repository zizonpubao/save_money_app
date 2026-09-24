// 저장 축하 효과음 4개를 만든다 (DESIGN "저장 축하 연출" 효과음 규격).
// Node 기본 모듈만 쓴다. 실행: node scripts/gen-sounds.mjs → assets/sounds/*.wav
// 형식: WAV PCM16 mono 16kHz, 피크 -6 dBFS, 음마다 5ms 어택 + 지수 감쇠(τ = 음 길이/4), 끝 10ms 는 0 으로 페이드.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 16000;
const PEAK = 0.5; // -6 dBFS
const ATTACK_S = 0.005;
const TAIL_S = 0.01;

const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;
const C6 = 1046.5;

/**
 * 음 하나. partials 는 [주파수(Hz) 또는 시간→주파수 함수, 진폭] 목록.
 * 위상을 누적해서 주파수가 바뀌어도(급하강) 파형이 끊기지 않는다.
 */
function note(seconds, partials) {
  const n = Math.round(seconds * RATE);
  const out = new Float64Array(n);
  const tau = seconds / 4;
  for (const [freq, amp] of partials) {
    let phase = 0;
    for (let i = 0; i < n; i += 1) {
      const t = i / RATE;
      const f = typeof freq === 'function' ? freq(t) : freq;
      phase += (2 * Math.PI * f) / RATE;
      out[i] += amp * Math.sin(phase);
    }
  }
  for (let i = 0; i < n; i += 1) {
    const t = i / RATE;
    const attack = Math.min(1, t / ATTACK_S);
    out[i] *= attack * Math.exp(-t / tau);
  }
  return out;
}

/** 음을 이어 붙이고 피크를 맞춘 뒤 끝 10ms 를 0 으로 */
function render(notes) {
  const total = notes.reduce((sum, part) => sum + part.length, 0);
  const out = new Float64Array(total);
  let offset = 0;
  for (const part of notes) {
    out.set(part, offset);
    offset += part.length;
  }
  const max = out.reduce((m, v) => Math.max(m, Math.abs(v)), 0) || 1;
  const tail = Math.round(TAIL_S * RATE);
  for (let i = 0; i < total; i += 1) {
    const fromEnd = total - 1 - i;
    const fade = fromEnd < tail ? fromEnd / tail : 1;
    out[i] = (out[i] / max) * PEAK * fade;
  }
  return out;
}

function wav(samples) {
  const data = samples.length * 2;
  const buf = Buffer.alloc(44 + data);
  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(36 + data, 4);
  buf.write('WAVE', 8, 'ascii');
  buf.write('fmt ', 12, 'ascii');
  buf.writeUInt32LE(16, 16); // fmt 청크 크기
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(RATE, 24);
  buf.writeUInt32LE(RATE * 2, 28); // byte rate
  buf.writeUInt16LE(2, 32); // block align
  buf.writeUInt16LE(16, 34); // bits
  buf.write('data', 36, 'ascii');
  buf.writeUInt32LE(data, 40);
  samples.forEach((v, i) => {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), 44 + i * 2);
  });
  return buf;
}

const SOUNDS = {
  // "톡": 880 → 660 Hz 로 20ms 안에 급하강
  tap: () => render([note(0.1, [[(t) => 660 + 220 * Math.exp(-t / 0.02), 1]])]),
  // 맑은 종소리: 1320 Hz + 한 옥타브 위 2640 Hz(0.3)
  ding: () =>
    render([
      note(0.25, [
        [1320, 1],
        [2640, 0.3],
      ]),
    ]),
  // 도 → 솔
  tada: () => render([note(0.12, [[C5, 1]]), note(0.22, [[G5, 1]])]),
  // 도 · 미 · 솔 → 높은 도. 마지막 음 아래에 미·솔을 약하게 깔아 화음으로 끝난다
  fanfare: () =>
    render([
      note(0.08, [[C5, 1]]),
      note(0.08, [[E5, 1]]),
      note(0.08, [[G5, 1]]),
      note(0.16, [
        [C6, 1],
        [G5, 0.35],
        [E5, 0.25],
      ]),
    ]),
};

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sounds');
mkdirSync(outDir, { recursive: true });
for (const [name, make] of Object.entries(SOUNDS)) {
  const file = join(outDir, `${name}.wav`);
  const bytes = wav(make());
  writeFileSync(file, bytes);
  console.log(`${name}.wav ${bytes.length} bytes`);
}
