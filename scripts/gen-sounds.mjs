// 저장 축하 효과음 5개를 합성한다 (DESIGN "저장 축하 연출" 효과음 · 아이폰 피드백 "밋밋·안 들림" 반영).
// Node 기본 모듈만 쓴다. 실행: node scripts/gen-sounds.mjs → assets/sounds/*.wav
// 형식: WAV PCM16 mono 22.05kHz, 각 40KB 이하. 음을 겹쳐 합성 → 전체 앞뒤 5ms 페이드(클릭 제거) → 마지막에 피크 -1 dBFS 로 정규화.
// 노이즈는 시드 고정 난수라 다시 돌려도 같은 파일이 나온다.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 22050;
const NYQUIST = RATE / 2;
const PEAK = 10 ** (-1 / 20); // -1 dBFS ≈ 0.891
const FADE_S = 0.005;

const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;
const C6 = 1046.5;

/** 길이(ms)만큼 빈 버퍼. 샘플 수 = round(RATE × 길이) — 테스트도 같은 식으로 확인한다 */
function buffer(ms) {
  return new Float64Array(Math.round((RATE * ms) / 1000));
}

/**
 * 파형 한 주기 값. 삼각파·사각파는 나이퀴스트 아래 홀수 배음만 더해 만든다(에일리어싱 잡음 방지).
 * mix 는 사각파 비율(0 = 순수 삼각파).
 */
function wave(kind, phase, freq, mix = 0) {
  if (kind === 'sine') return Math.sin(phase);
  let tri = 0;
  let sq = 0;
  for (let k = 1; k * freq < NYQUIST * 0.9; k += 2) {
    const sign = ((k - 1) / 2) % 2 === 0 ? 1 : -1;
    tri += (sign / (k * k)) * Math.sin(k * phase);
    if (mix > 0) sq += Math.sin(k * phase) / k;
  }
  tri *= 8 / (Math.PI * Math.PI);
  sq *= 4 / Math.PI;
  return (1 - mix) * tri + mix * sq;
}

/**
 * 음 하나를 buf 에 더한다.
 * freq 는 Hz 또는 시간→Hz 함수(위상 누적이라 주파수가 바뀌어도 파형이 끊기지 않는다).
 * 포락선 = 어택(선형) × 지수 감쇠(tau) × 끝 release 구간 선형 감소. 음이 버퍼 끝을 넘으면 잘린다.
 */
function tone(buf, { at, dur, freq, amp, tau, attack = 0.002, release = 0.01, kind = 'sine', mix = 0 }) {
  const start = Math.round(at * RATE);
  const n = Math.min(Math.round(dur * RATE), buf.length - start);
  let phase = 0;
  for (let i = 0; i < n; i += 1) {
    const t = i / RATE;
    const f = typeof freq === 'function' ? freq(t) : freq;
    phase += (2 * Math.PI * f) / RATE;
    const env =
      Math.min(1, t / attack) * Math.exp(-t / tau) * Math.min(1, (dur - t) / release);
    buf[start + i] += amp * env * wave(kind, phase, f, mix);
  }
}

/** 짧은 노이즈 버스트("팝"의 타격). 이웃 샘플 차분으로 저음을 덜어 또렷한 클릭이 된다 */
function noise(buf, { at, dur, amp, tau, seed }) {
  let state = seed >>> 0;
  const rand = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32 - 0.5;
  };
  const start = Math.round(at * RATE);
  const n = Math.min(Math.round(dur * RATE), buf.length - start);
  let prev = 0;
  for (let i = 0; i < n; i += 1) {
    const t = i / RATE;
    const white = rand();
    buf[start + i] += amp * (white - prev) * Math.exp(-t / tau);
    prev = white;
  }
}

/** 앞뒤 5ms 페이드(첫·끝 샘플 0) 후 피크를 -1 dBFS 로. 페이드를 먼저 해야 정규화 뒤 피크가 정확하다 */
function finish(buf) {
  const fade = Math.round(FADE_S * RATE);
  const last = buf.length - 1;
  for (let i = 0; i <= fade; i += 1) {
    const g = i / fade;
    buf[i] *= g;
    buf[last - i] *= g;
  }
  const max = buf.reduce((m, v) => Math.max(m, Math.abs(v)), 0) || 1;
  for (let i = 0; i < buf.length; i += 1) buf[i] = (buf[i] / max) * PEAK;
  return buf;
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

/** "팝" 90ms: 700 → 320 Hz 지수 하강 + 한 옥타브 위 배음(폰 스피커에서 잘 들리게) + 3ms 노이즈 타격 */
function tap() {
  const buf = buffer(90);
  const pitch = (t) => 320 + 380 * Math.exp(-t / 0.015);
  tone(buf, { at: 0, dur: 0.09, freq: pitch, amp: 1, tau: 0.028, attack: 0.001, release: 0.015 });
  tone(buf, { at: 0, dur: 0.09, freq: (t) => 2 * pitch(t), amp: 0.35, tau: 0.018, attack: 0.001 });
  noise(buf, { at: 0, dur: 0.003, amp: 1.2, tau: 0.0012, seed: 7 });
  return finish(buf);
}

/** 종 320ms: 1320 Hz + 2.4배·3.9배 비조화 배음(작게, 더 빨리 사라짐). 비브라토 없이 맑게 */
function ding() {
  const buf = buffer(320);
  const common = { at: 0, dur: 0.32, attack: 0.002, release: 0.04 };
  tone(buf, { ...common, freq: 1320, amp: 1, tau: 0.13 });
  tone(buf, { ...common, freq: 1320 * 2.4, amp: 0.3, tau: 0.05 });
  tone(buf, { ...common, freq: 1320 * 3.9, amp: 0.15, tau: 0.025 });
  return finish(buf);
}

/** 짠 380ms: 도·미·솔 삼각파 상행(각 90ms, 앞 음이 살짝 겹쳐 울림) + 마지막 음에 4~6kHz 반짝임 3개 */
function tada() {
  const buf = buffer(380);
  const note = { kind: 'triangle', attack: 0.004, release: 0.02 };
  tone(buf, { ...note, at: 0, dur: 0.11, freq: C5, amp: 1, tau: 0.08 });
  tone(buf, { ...note, at: 0.09, dur: 0.11, freq: E5, amp: 1, tau: 0.08 });
  tone(buf, { ...note, at: 0.18, dur: 0.2, freq: G5, amp: 1, tau: 0.12, release: 0.05 });
  // 옥타브 위를 얹어 삼각파의 뭉툭함을 덜어 준다
  tone(buf, { at: 0.18, dur: 0.2, freq: G5 * 2, amp: 0.2, tau: 0.08, attack: 0.004, release: 0.05 });
  const sparkle = { dur: 0.1, attack: 0.001, tau: 0.03, release: 0.02 };
  tone(buf, { ...sparkle, at: 0.18, freq: 4186, amp: 0.22 });
  tone(buf, { ...sparkle, at: 0.21, freq: 5274, amp: 0.18 });
  tone(buf, { ...sparkle, at: 0.24, freq: 5920, amp: 0.14 });
  return finish(buf);
}

/** 팡파르 450ms: 도·미·솔·높은 도 상행 → 높은 도에서 도·미·솔 화음을 200ms 유지 후 감쇠. 사각파 20% 로 밝게 */
function fanfare() {
  const buf = buffer(450);
  const brass = { kind: 'triangle', mix: 0.2, attack: 0.005, release: 0.012 };
  const step = 0.065;
  tone(buf, { ...brass, at: 0, dur: step + 0.01, freq: C5, amp: 1, tau: 0.2 });
  tone(buf, { ...brass, at: step, dur: step + 0.01, freq: E5, amp: 1, tau: 0.2 });
  tone(buf, { ...brass, at: step * 2, dur: step + 0.01, freq: G5, amp: 1, tau: 0.2 });
  // 마지막 음(0.195s~): 높은 도 + 화음. 200ms 동안 거의 유지(tau 길게)하다 끝 55ms 에 내려간다
  const chordAt = step * 3;
  const hold = { ...brass, at: chordAt, dur: 0.45 - chordAt, tau: 0.6, release: 0.07 };
  tone(buf, { ...hold, freq: C6, amp: 1 });
  tone(buf, { ...hold, freq: G5, amp: 0.45 });
  tone(buf, { ...hold, freq: E5, amp: 0.4 });
  tone(buf, { ...hold, freq: C5, amp: 0.35 });
  return finish(buf);
}

/**
 * 쾅 420ms (big): "쿵" 타격 → 밝은 화음 찍기 → 반짝임 종. 12,000원(mid) 짠보다 한 단계 센 소리.
 * - 0~70ms: 사인 110 → 60 Hz 하강 + 8ms 노이즈. 폰 스피커는 100Hz 아래가 거의 안 나와 2·3배 배음을 얹어 "쿵"이 들리게 한다
 * - 40ms~: C5·E5·G5·C6 사각파 20% 섞은 삼각파 화음, 120ms 안에 거의 사라진다(꼬리만 180ms 까지 남겨 종과 끊기지 않게)
 * - 180ms~: 4~7kHz 반짝임 종 3개가 40ms 간격으로
 * 노이즈를 크게 두면 정규화 피크가 노이즈 한 샘플에 맞춰져 화음이 작아지므로 작게 둔다
 */
function hit() {
  const buf = buffer(420);
  const drop = (t) => 60 + 50 * Math.exp(-t / 0.02);
  const thump = { at: 0, dur: 0.07, attack: 0.001, release: 0.015 };
  tone(buf, { ...thump, freq: drop, amp: 1, tau: 0.04 });
  tone(buf, { ...thump, freq: (t) => 2 * drop(t), amp: 0.6, tau: 0.03 });
  tone(buf, { ...thump, freq: (t) => 3 * drop(t), amp: 0.35, tau: 0.02 });
  noise(buf, { at: 0, dur: 0.008, amp: 0.6, tau: 0.003, seed: 11 });

  const chord = { kind: 'triangle', mix: 0.2, at: 0.04, dur: 0.14, attack: 0.002, tau: 0.045, release: 0.03 };
  tone(buf, { ...chord, freq: C5, amp: 0.4 });
  tone(buf, { ...chord, freq: E5, amp: 0.35 });
  tone(buf, { ...chord, freq: G5, amp: 0.35 });
  tone(buf, { ...chord, freq: C6, amp: 0.4 });

  const bell = { dur: 0.16, attack: 0.001, release: 0.03 };
  tone(buf, { ...bell, at: 0.18, freq: 4699, amp: 0.28, tau: 0.06 });
  tone(buf, { ...bell, at: 0.22, freq: 5588, amp: 0.22, tau: 0.05 });
  tone(buf, { ...bell, at: 0.26, freq: 6645, amp: 0.18, tau: 0.04 });
  return finish(buf);
}

const SOUNDS = { tap, ding, tada, hit, fanfare };

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sounds');
mkdirSync(outDir, { recursive: true });
for (const [name, make] of Object.entries(SOUNDS)) {
  const file = join(outDir, `${name}.wav`);
  const bytes = wav(make());
  writeFileSync(file, bytes);
  console.log(`${name}.wav ${bytes.length} bytes`);
}
