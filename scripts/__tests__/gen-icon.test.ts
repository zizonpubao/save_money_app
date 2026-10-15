/// <reference types="node" />
// 테스트만 Node fs·zlib 로 파일을 읽는다 (앱 tsconfig 는 jest 타입만 싣는다)
import { readFileSync } from 'fs';
import { join } from 'path';
import { inflateSync } from 'zlib';

import { lightColors } from '../../src/theme';

/**
 * scripts/gen-icon.mjs 가 만든 assets/images/*.png 규격 확인 (크기 · 색 형식 · 바탕/투명 · 안전 영역).
 * 파일을 다시 만들려면: node scripts/gen-icon.mjs (원본 assets/logo/icon-source.*, ffmpeg 필요)
 */
const DIR = join(__dirname, '..', '..', 'assets', 'images');
const APP = JSON.parse(readFileSync(join(__dirname, '..', '..', 'app.json'), 'utf8'));

type Png = { width: number; height: number; colorType: number; channels: number; pixels: Buffer };

/** 필터 0(gen-icon 이 쓰는 방식)만 읽는 작은 PNG 해독기 */
function readPng(name: string): Png {
  const buf = readFileSync(join(DIR, name));
  expect(buf.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const colorType = buf[25];
  const channels = colorType === 6 ? 4 : 3;
  const idat: Buffer[] = [];
  for (let at = 8; at < buf.length; ) {
    const len = buf.readUInt32BE(at);
    if (buf.toString('ascii', at + 4, at + 8) === 'IDAT') idat.push(buf.subarray(at + 8, at + 8 + len));
    at += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    expect(raw[y * (stride + 1)]).toBe(0);
    raw.copy(pixels, y * stride, y * (stride + 1) + 1, (y + 1) * (stride + 1));
  }
  return { width, height, colorType, channels, pixels };
}

const pixel = (png: Png, x: number, y: number) =>
  [...png.pixels.subarray((y * png.width + x) * png.channels, (y * png.width + x + 1) * png.channels)];

const CORNERS = [
  [0, 0],
  [1023, 0],
  [0, 1023],
  [1023, 1023],
];

/** 초록 바탕인가 (G 가 R·B 보다 확실히 크다) */
const isGreen = ([r, g, b]: number[]) => g > r + 40 && g > b + 20;

/** 적응형 아이콘 안전 영역: 108dp 캔버스 중 지름 66dp */
const SAFE_RADIUS = (1024 * 66) / 108 / 2;

describe('앱 아이콘 (gen-icon)', () => {
  it('icon.png: 1024² RGB(알파 없음), 네 모서리까지 초록 바탕, 가운데엔 크림 돼지가 있다', () => {
    const png = readPng('icon.png');
    expect([png.width, png.height, png.colorType]).toEqual([1024, 1024, 2]);
    for (const [x, y] of CORNERS) expect(isGreen(pixel(png, x, y))).toBe(true);
    const [r, g, b] = pixel(png, 512, 560);
    expect(Math.min(r, g, b)).toBeGreaterThan(180);
  });

  it('favicon.png: 48² RGB, 모서리는 초록 바탕', () => {
    const png = readPng('favicon.png');
    expect([png.width, png.height, png.colorType]).toEqual([48, 48, 2]);
    expect(isGreen(pixel(png, 0, 0))).toBe(true);
  });

  it('android-icon-background.png: 1024² RGB 초록 그라데이션 (왼쪽 위가 오른쪽 아래보다 밝다)', () => {
    const png = readPng('android-icon-background.png');
    expect([png.width, png.height, png.colorType]).toEqual([1024, 1024, 2]);
    for (const [x, y] of CORNERS) expect(isGreen(pixel(png, x, y))).toBe(true);
    expect(pixel(png, 0, 0)[1]).toBeGreaterThan(pixel(png, 1023, 1023)[1]);
  });

  it.each(['android-icon-foreground.png', 'android-icon-monochrome.png'])(
    '%s: 1024² RGBA 투명 바탕, 그림은 적응형 아이콘 안전 영역(가운데 지름 66dp/108dp) 안에만',
    (name) => {
      const png = readPng(name);
      expect([png.width, png.height, png.colorType]).toEqual([1024, 1024, 6]);
      for (const [x, y] of CORNERS) expect(pixel(png, x, y)[3]).toBe(0);
      let inked = 0;
      let farthest = 0;
      for (let y = 0; y < 1024; y += 1) {
        for (let x = 0; x < 1024; x += 1) {
          if (png.pixels[(y * 1024 + x) * 4 + 3] === 0) continue;
          inked += 1;
          farthest = Math.max(farthest, Math.hypot(x + 0.5 - 512, y + 0.5 - 512));
        }
      }
      // 너무 작게 줄어들지도 않게 (캔버스의 10% 이상)
      expect(inked / (1024 * 1024)).toBeGreaterThan(0.1);
      expect(farthest).toBeLessThanOrEqual(SAFE_RADIUS);
    },
  );

  it('android-icon-monochrome.png: 그림 부분은 모두 흰색', () => {
    const png = readPng('android-icon-monochrome.png');
    for (let i = 0; i < png.pixels.length; i += 4) {
      if (png.pixels[i + 3] === 0) continue;
      expect([png.pixels[i], png.pixels[i + 1], png.pixels[i + 2]]).toEqual([255, 255, 255]);
    }
  });

  it('splash-icon.png: 1024² RGBA, 둥근 모서리 밖은 투명, 가운데는 불투명', () => {
    const png = readPng('splash-icon.png');
    expect([png.width, png.height, png.colorType]).toEqual([1024, 1024, 6]);
    for (const [x, y] of CORNERS) expect(pixel(png, x, y)[3]).toBe(0);
    expect(pixel(png, 512, 512)[3]).toBe(255);
    expect(pixel(png, 512, 0)[3]).toBe(255);
  });

  it('app.json: 적응형 아이콘 바탕은 primary, 스플래시 바탕은 크림 bg, 패키지·번들 ID 가 있다', () => {
    const { android, ios, plugins } = APP.expo;
    expect(android.adaptiveIcon.backgroundColor).toBe(lightColors.primary.toUpperCase());
    expect(android.adaptiveIcon.backgroundImage).toBe('./assets/images/android-icon-background.png');
    expect(android.package).toBe('com.zizonpubao.savelog');
    expect(android.versionCode).toBe(1);
    expect(ios.bundleIdentifier).toBe('com.zizonpubao.savelog');
    const splash = plugins.find((p: unknown) => Array.isArray(p) && p[0] === 'expo-splash-screen');
    expect(splash[1].backgroundColor).toBe(lightColors.bg.toUpperCase());
  });
});
