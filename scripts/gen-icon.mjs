// SaveLog 앱 아이콘·스플래시를 만든다. 원본: 초록 그라데이션 바탕 위 크림 돼지 저금통 + 주황 동전 (AI 생성 1장).
// 원본 디코딩만 ffmpeg 로 하고 (webp·png 아무거나), 나머지는 Node 기본 모듈로 한다 (PNG 인코딩은 zlib).
// 실행: node scripts/gen-icon.mjs [원본 경로]   (기본 assets/logo/icon-source.*) → assets/images/*.png
// - icon.png (1024², RGB): iOS·기본 아이콘. 원본 그대로 (둥근 모서리는 OS 가 깎는다, 알파 없음)
// - android-icon-foreground.png (1024², RGBA): 바탕을 빼낸 돼지만. 런처가 원·물방울 등으로 가리므로
//   가운데 안전 영역(108dp 중 지름 66dp ≈ 반지름 313px) 안에 들어가게 줄인다
// - android-icon-background.png (1024², RGB): 원본 바탕 그라데이션을 다시 그린 것
// - android-icon-monochrome.png (1024², RGBA): 전경과 같은 알파 + 흰색 (테마 아이콘은 런처가 알파만 보고 다시 칠한다)
// - splash-icon.png (1024², RGBA): 아이콘 전체에 iOS 처럼 둥근 모서리(22.37%)를 씌운 것. 크림 스플래시 바탕 위에
//   크림 돼지만 두면 안 보여서 초록 아이콘째로 둔다
// - favicon.png (48², RGB): 웹용
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SIZE = 1024;
/**
 * 전경 돼지가 가운데에서 가장 멀리 닿는 거리(px). 안전 영역 반지름(313px)까지 채우면
 * 원형 마스크에서 동전이 테두리에 붙어 보여서 여백을 둔다
 */
const FG_RADIUS = 250;
/** 안전 영역 반지름: 108dp 캔버스 중 지름 66dp */
const SAFE_RADIUS = (SIZE * 66) / 108 / 2;
/** iOS 아이콘 모서리 반지름 비율 */
const CORNER = 0.2237;
/** 한 픽셀을 4×4 로 나눠 가장자리를 부드럽게 (안티에일리어싱) */
const SUB = 4;

function findSource() {
  if (process.argv[2]) return process.argv[2];
  for (const ext of ['png', 'webp', 'jpg']) {
    const path = join(ROOT, 'assets', 'logo', `icon-source.${ext}`);
    if (existsSync(path)) return path;
  }
  throw new Error('원본이 없습니다: assets/logo/icon-source.(png|webp|jpg)');
}

/** 원본을 size² RGB 로 줄여 읽는다 (원본은 정사각형) */
function decode(src, size) {
  const out = spawnSync(
    'ffmpeg',
    ['-v', 'error', '-i', src, '-vf', `scale=${size}:${size}:flags=lanczos`, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'],
    { maxBuffer: 64 * 1024 * 1024 },
  );
  if (out.status !== 0 || out.stdout.length !== size * size * 3) {
    throw new Error(`ffmpeg 디코딩 실패: ${out.error ?? out.stderr.toString()}`);
  }
  return out.stdout;
}

/** 3×3 연립방정식 (가우스 소거) */
function solve3(m, v) {
  const a = m.map((row, i) => [...row, v[i]]);
  for (let c = 0; c < 3; c += 1) {
    let p = c;
    for (let r = c + 1; r < 3; r += 1) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
    [a[c], a[p]] = [a[p], a[c]];
    for (let r = 0; r < 3; r += 1) {
      if (r === c) continue;
      const f = a[r][c] / a[c][c];
      for (let k = c; k < 4; k += 1) a[r][k] -= f * a[c][k];
    }
  }
  return a.map((row, i) => row[3] / row[i]);
}

/**
 * 바탕 그라데이션을 채널마다 c0 + c1·u + c2·v (u, v 는 0~1 좌표) 로 맞춘다.
 * 돼지는 가운데에 있으므로 바깥 테두리 띠(폭 10%)만 바탕으로 보고 최소제곱으로 푼다.
 */
function fitBackground(rgb, size) {
  const band = Math.round(size * 0.1);
  const m = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const v = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (x >= band && x < size - band && y >= band && y < size - band) continue;
      const f = [1, x / size, y / size];
      for (let i = 0; i < 3; i += 1) {
        for (let j = 0; j < 3; j += 1) m[i][j] += f[i] * f[j];
        for (let c = 0; c < 3; c += 1) v[c][i] += f[i] * rgb[(y * size + x) * 3 + c];
      }
    }
  }
  return [0, 1, 2].map((c) => solve3(m, v[c]));
}

const bgAt = (fit, c, u, v) => fit[c][0] + fit[c][1] * u + fit[c][2] * v;
const luma = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/**
 * 초록 바탕을 빼고 돼지만 남긴다 (RGBA). 크림·주황은 R ≥ G, 바탕·그림자 초록은 G ≫ R 이라서
 * R−G 값이 바탕(그 자리 그라데이션 값)과 크림(+4) 사이 어디쯤인지로 덮임을 정한다.
 * - 바탕보다 어두운 픽셀은 땅 그림자로 보고 버린다
 * - 반투명 가장자리는 바탕색을 빼서 초록 테두리가 남지 않게 한다
 * - 돼지 안의 어두운 틈(동전 구멍 등)이 뚫리지 않게, 테두리와 이어지지 않은 빈 곳은 다시 채운다
 */
function cutOut(rgb, size, fit) {
  const FG_DIFF = 4;
  const alpha = new Float64Array(size * size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = y * size + x;
      const [r, g, b] = [rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2]];
      const u = x / size;
      const v = y / size;
      const br = bgAt(fit, 0, u, v);
      const bg = bgAt(fit, 1, u, v);
      const bb = bgAt(fit, 2, u, v);
      if (luma(r, g, b) <= luma(br, bg, bb)) continue;
      const a = clamp((r - g - (br - bg)) / (FG_DIFF - (br - bg)), 0, 1);
      alpha[i] = a < 0.08 ? 0 : a;
    }
  }
  // 테두리에서 이어진 빈 곳(덮임 0.5 미만)만 진짜 바탕
  const outside = new Uint8Array(size * size);
  const stack = [];
  for (let k = 0; k < size; k += 1) stack.push(k, (size - 1) * size + k, k * size, k * size + size - 1);
  while (stack.length) {
    const i = stack.pop();
    if (outside[i] || alpha[i] >= 0.5) continue;
    outside[i] = 1;
    const x = i % size;
    if (x > 0) stack.push(i - 1);
    if (x < size - 1) stack.push(i + 1);
    if (i >= size) stack.push(i - size);
    if (i < size * (size - 1)) stack.push(i + size);
  }
  const out = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i += 1) {
    const a = outside[i] ? alpha[i] : Math.max(alpha[i], 1);
    if (a === 0) continue;
    const u = (i % size) / size;
    const v = Math.floor(i / size) / size;
    for (let c = 0; c < 3; c += 1) {
      const pure = (rgb[i * 3 + c] - (1 - a) * bgAt(fit, c, u, v)) / a;
      out[i * 4 + c] = Math.round(clamp(pure, 0, 255));
    }
    out[i * 4 + 3] = Math.round(a * 255);
  }
  return out;
}

/** 알파가 있는 픽셀의 상자 중심과, 그 중심에서 가장 먼 픽셀까지 거리 */
function measure(rgba, size) {
  let [x0, y0, x1, y1] = [size, size, -1, -1];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (rgba[(y * size + x) * 4 + 3] === 0) continue;
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  }
  const cx = (x0 + x1 + 1) / 2;
  const cy = (y0 + y1 + 1) / 2;
  let far = 0;
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      if (rgba[(y * size + x) * 4 + 3] !== 0) far = Math.max(far, Math.hypot(x + 0.5 - cx, y + 0.5 - cy));
    }
  }
  return { cx, cy, far };
}

/** 작은 RGBA 를 size² 투명 캔버스 위 (left, top) 에 붙인다 */
function place(small, n, size, left, top) {
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      const tx = x + left;
      const ty = y + top;
      if (tx < 0 || ty < 0 || tx >= size || ty >= size) continue;
      small.copy(out, (ty * size + tx) * 4, (y * n + x) * 4, (y * n + x + 1) * 4);
    }
  }
  return out;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([len, body, crc]);
}

/** 8비트 PNG. channels 3 = RGB(색 형식 2), 4 = RGBA(색 형식 6). 줄마다 필터 0(없음) */
function encodePng(size, channels, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = channels === 4 ? 6 : 2;
  const stride = size * channels;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** 둥근 사각형(모서리 반지름 CORNER) 안쪽 덮임 0~1 */
function squircleCover(x, y, size) {
  const r = size * CORNER;
  let hits = 0;
  for (let sy = 0; sy < SUB; sy += 1) {
    for (let sx = 0; sx < SUB; sx += 1) {
      const px = x + (sx + 0.5) / SUB;
      const py = y + (sy + 0.5) / SUB;
      const dx = Math.max(r - px, px - (size - r), 0);
      const dy = Math.max(r - py, py - (size - r), 0);
      if (dx * dx + dy * dy <= r * r) hits += 1;
    }
  }
  return hits / (SUB * SUB);
}

const src = findSource();
const full = decode(src, SIZE);
const fit = fitBackground(full, SIZE);

// 전경: 원본 크기에서 잰 돼지 크기로 배율을 정하고, 그 배율로 다시 디코딩해서 바탕을 뺀 뒤 가운데에 놓는다
const probe = measure(cutOut(full, SIZE, fit), SIZE);
const scale = FG_RADIUS / probe.far;
const n = Math.round(SIZE * scale);
const smallRgb = decode(src, n);
const small = cutOut(smallRgb, n, fitBackground(smallRgb, n));
const foreground = place(small, n, SIZE, Math.round(SIZE / 2 - probe.cx * scale), Math.round(SIZE / 2 - probe.cy * scale));
let reach = 0;
for (let i = 0; i < SIZE * SIZE; i += 1) {
  if (foreground[i * 4 + 3] === 0) continue;
  reach = Math.max(reach, Math.hypot((i % SIZE) + 0.5 - SIZE / 2, Math.floor(i / SIZE) + 0.5 - SIZE / 2));
}
if (reach > SAFE_RADIUS) throw new Error(`전경이 안전 영역을 벗어납니다: ${reach.toFixed(1)}px > ${SAFE_RADIUS.toFixed(1)}px`);

const monochrome = Buffer.from(foreground);
for (let i = 0; i < SIZE * SIZE; i += 1) monochrome.fill(255, i * 4, i * 4 + 3);

const background = Buffer.alloc(SIZE * SIZE * 3);
for (let y = 0; y < SIZE; y += 1) {
  for (let x = 0; x < SIZE; x += 1) {
    for (let c = 0; c < 3; c += 1) {
      background[(y * SIZE + x) * 3 + c] = Math.round(clamp(bgAt(fit, c, x / SIZE, y / SIZE), 0, 255));
    }
  }
}

const splash = Buffer.alloc(SIZE * SIZE * 4);
for (let y = 0; y < SIZE; y += 1) {
  for (let x = 0; x < SIZE; x += 1) {
    const i = y * SIZE + x;
    full.copy(splash, i * 4, i * 3, i * 3 + 3);
    splash[i * 4 + 3] = Math.round(255 * squircleCover(x, y, SIZE));
  }
}

const FILES = {
  'icon.png': encodePng(SIZE, 3, full),
  'android-icon-foreground.png': encodePng(SIZE, 4, foreground),
  'android-icon-background.png': encodePng(SIZE, 3, background),
  'android-icon-monochrome.png': encodePng(SIZE, 4, monochrome),
  'splash-icon.png': encodePng(SIZE, 4, splash),
  'favicon.png': encodePng(48, 3, decode(src, 48)),
};

const outDir = join(ROOT, 'assets', 'images');
mkdirSync(outDir, { recursive: true });
console.log(`원본 ${src} · 전경 배율 ${scale.toFixed(3)} · 가운데에서 최대 ${reach.toFixed(1)}px (안전 ${SAFE_RADIUS.toFixed(1)}px)`);
for (const [name, bytes] of Object.entries(FILES)) {
  writeFileSync(join(outDir, name), bytes);
  console.log(`${name} ${bytes.length} bytes`);
}
