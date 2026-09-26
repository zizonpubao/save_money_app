// SaveLog 앱 아이콘·스플래시를 그린다. 모양: primary(#2F6FED) 바탕 위 흰 "₩" (W 한 획 + 가로줄 두 개).
// Node 기본 모듈만 쓴다 (PNG 인코딩은 zlib 의 deflateSync·crc32). 실행: node scripts/gen-icon.mjs → assets/images/*.png
// - icon.png (1024², RGB): iOS·기본 아이콘. 바탕을 끝까지 채운다 (둥근 모서리는 OS 가 깎는다)
// - android-icon-foreground.png / android-icon-monochrome.png (1024², RGBA): 투명 바탕 + 흰 글자만.
//   런처가 원·물방울 등으로 가리므로 글자는 가운데 안전 영역(지름 66%) 안에 작게 둔다. 바탕색은 app.json adaptiveIcon.backgroundColor
// - splash-icon.png (1024², RGBA): 투명 + 흰 글자. 스플래시 바탕색(primary)은 app.json expo-splash-screen 설정
// - favicon.png (48², RGB): 웹용
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateSync } from 'node:zlib';

/** src/theme.ts lightColors.primary 와 같은 값 */
const PRIMARY = [0x2f, 0x6f, 0xed];
const WHITE = [0xff, 0xff, 0xff];
/** 한 픽셀을 4×4 로 나눠 가장자리를 부드럽게 (안티에일리어싱) */
const SUB = 4;

/**
 * "₩" 모양. 단위 좌표: 글자 폭 1 × 높이 1 (y 는 아래로).
 * W 는 굵은 선(둥근 끝) 4개, 가로줄 두 개는 W 보다 양옆으로 조금 나온 사각형.
 */
const STROKE = 0.13;
const W_POINTS = [
  [0, 0],
  [0.24, 1],
  [0.5, 0.34],
  [0.76, 1],
  [1, 0],
];
const BARS = [
  { y: 0.4, h: 0.09 },
  { y: 0.6, h: 0.09 },
];
const BAR_OVERHANG = 0.1;

/** 점 p 와 선분 ab 사이 거리 */
function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/** 단위 좌표 (u, v) 가 글자 안인가 */
function insideWon(u, v) {
  for (let i = 0; i < W_POINTS.length - 1; i += 1) {
    const [ax, ay] = W_POINTS[i];
    const [bx, by] = W_POINTS[i + 1];
    if (distToSegment(u, v, ax, ay, bx, by) <= STROKE / 2) return true;
  }
  return BARS.some(
    (bar) => u >= -BAR_OVERHANG && u <= 1 + BAR_OVERHANG && Math.abs(v - bar.y) <= bar.h / 2,
  );
}

/**
 * size² 캔버스에 글자를 그려 픽셀별 덮임(0~1)을 돌려준다. glyph 는 글자 폭(px), 글자는 한가운데.
 * 둥근 끝이 위아래로 같은 만큼(획 두께의 절반) 나와서 단위 상자를 가운데 두면 글자도 가운데다.
 */
function renderCoverage(size, glyph) {
  const cover = new Float64Array(size * size);
  const left = (size - glyph) / 2;
  const top = (size - glyph) / 2;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let hits = 0;
      for (let sy = 0; sy < SUB; sy += 1) {
        for (let sx = 0; sx < SUB; sx += 1) {
          const u = (x + (sx + 0.5) / SUB - left) / glyph;
          const v = (y + (sy + 0.5) / SUB - top) / glyph;
          if (insideWon(u, v)) hits += 1;
        }
      }
      cover[y * size + x] = hits / (SUB * SUB);
    }
  }
  return cover;
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

/** 바탕을 primary 로 채우고 흰 글자를 덮임만큼 섞는다 (RGB) */
function solidIcon(size, glyph) {
  const cover = renderCoverage(size, glyph);
  const px = Buffer.alloc(size * size * 3);
  for (let i = 0; i < cover.length; i += 1) {
    for (let c = 0; c < 3; c += 1) {
      px[i * 3 + c] = Math.round(PRIMARY[c] + (WHITE[c] - PRIMARY[c]) * cover[i]);
    }
  }
  return encodePng(size, 3, px);
}

/** 투명 바탕 + 흰 글자 (RGBA, 덮임 = 알파) */
function glyphOnly(size, glyph) {
  const cover = renderCoverage(size, glyph);
  const px = Buffer.alloc(size * size * 4);
  for (let i = 0; i < cover.length; i += 1) {
    px[i * 4] = WHITE[0];
    px[i * 4 + 1] = WHITE[1];
    px[i * 4 + 2] = WHITE[2];
    px[i * 4 + 3] = Math.round(255 * cover[i]);
  }
  return encodePng(size, 4, px);
}

const FILES = {
  // 글자 폭 = 캔버스의 50% (가로줄이 양옆으로 10% 더 나와 60%)
  'icon.png': () => solidIcon(1024, 512),
  // 적응형 아이콘 안전 영역(지름 66% ≈ 676px) 안: 글자 폭 36%(가로줄 포함 ≈ 44%)
  'android-icon-foreground.png': () => glyphOnly(1024, 368),
  'android-icon-monochrome.png': () => glyphOnly(1024, 368),
  // 스플래시는 가운데 작은 로고 (resizeMode contain, imageWidth 기본 200)
  'splash-icon.png': () => glyphOnly(1024, 512),
  'favicon.png': () => solidIcon(48, 24),
};

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'images');
mkdirSync(outDir, { recursive: true });
for (const [name, make] of Object.entries(FILES)) {
  const bytes = make();
  writeFileSync(join(outDir, name), bytes);
  console.log(`${name} ${bytes.length} bytes`);
}
