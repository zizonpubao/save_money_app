/// <reference types="node" />
// 테스트만 Node fs·zlib 로 파일을 읽는다 (앱 tsconfig 는 jest 타입만 싣는다)
import { readFileSync } from 'fs';
import { join } from 'path';
import { inflateSync } from 'zlib';

/**
 * scripts/gen-icon.mjs 가 만든 assets/images/*.png 규격 확인 (크기 · 색 형식 · 바탕/투명).
 * 파일을 다시 만들려면: node scripts/gen-icon.mjs
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

describe('앱 아이콘 (gen-icon)', () => {
  it('icon.png: 1024² RGB, 모서리는 primary(#2F6FED) 바탕, 가운데 근처엔 흰 글자가 있다', () => {
    const png = readPng('icon.png');
    expect([png.width, png.height, png.colorType]).toEqual([1024, 1024, 2]);
    expect(pixel(png, 0, 0)).toEqual([0x2f, 0x6f, 0xed]);
    expect(pixel(png, 1023, 1023)).toEqual([0x2f, 0x6f, 0xed]);
    let white = 0;
    for (let i = 0; i < png.pixels.length; i += 3) if (png.pixels[i] === 255 && png.pixels[i + 2] === 255) white += 1;
    // 글자가 너무 얇거나 바탕을 다 덮지 않게 (10~40%)
    expect(white / (1024 * 1024)).toBeGreaterThan(0.1);
    expect(white / (1024 * 1024)).toBeLessThan(0.4);
  });

  it.each(['android-icon-foreground.png', 'android-icon-monochrome.png'])(
    '%s: 1024² RGBA 투명 바탕, 글자는 적응형 아이콘 안전 영역(가운데 지름 66%%) 안에만',
    (name) => {
      const png = readPng(name);
      expect([png.width, png.height, png.colorType]).toEqual([1024, 1024, 6]);
      const radius = (1024 * 0.66) / 2;
      let inked = 0;
      let farthest = 0;
      for (let y = 0; y < 1024; y += 1) {
        for (let x = 0; x < 1024; x += 1) {
          if (png.pixels[(y * 1024 + x) * 4 + 3] === 0) continue;
          inked += 1;
          farthest = Math.max(farthest, Math.hypot(x + 0.5 - 512, y + 0.5 - 512));
        }
      }
      expect(inked).toBeGreaterThan(0);
      expect(farthest).toBeLessThanOrEqual(radius);
    },
  );

  it('app.json: 적응형 아이콘 바탕·스플래시 바탕이 primary, 패키지·번들 ID 가 있다', () => {
    const { android, ios, plugins } = APP.expo;
    expect(android.adaptiveIcon.backgroundColor).toBe('#2F6FED');
    expect(android.package).toBe('com.zizonpubao.savelog');
    expect(android.versionCode).toBe(1);
    expect(ios.bundleIdentifier).toBe('com.zizonpubao.savelog');
    const splash = plugins.find((p: unknown) => Array.isArray(p) && p[0] === 'expo-splash-screen');
    expect(splash[1].backgroundColor).toBe('#2F6FED');
  });
});
