import { formatQuote, QUOTE_MAX_CHARS, QUOTES, quoteOfDay } from '@/src/features/quotes';
import { addDays } from '@/src/utils/date';

describe('quotes (절약 명언)', () => {
  it('30개 이상이고 같은 문장이 없다', () => {
    expect(QUOTES.length).toBeGreaterThanOrEqual(30);
    const texts = QUOTES.map((q) => q.text);
    expect(new Set(texts).size).toBe(texts.length);
  });

  it('빈 문장·빈 출처가 없다', () => {
    for (const q of QUOTES) {
      expect(q.text.trim()).not.toBe('');
      if (q.source !== undefined) expect(q.source.trim()).not.toBe('');
    }
  });

  it('출처까지 합쳐 40자 이하 (카드에서 2줄 안)', () => {
    expect(QUOTE_MAX_CHARS).toBe(40);
    for (const q of QUOTES) {
      expect(formatQuote(q).length).toBeLessThanOrEqual(QUOTE_MAX_CHARS);
    }
  });

  it('같은 날에는 늘 같은 명언 (하루 고정)', () => {
    expect(quoteOfDay('2026-09-24')).toBe(quoteOfDay('2026-09-24'));
  });

  it('목록 길이만큼 이어진 날에는 같은 명언이 다시 나오지 않는다', () => {
    const seen = new Set<string>();
    for (let i = 0; i < QUOTES.length; i += 1) {
      seen.add(quoteOfDay(addDays('2026-09-01', i)).text);
    }
    expect(seen.size).toBe(QUOTES.length);
  });

  it('출처가 있으면 "문장 — 출처", 격언은 문장만', () => {
    expect(formatQuote({ text: '티끌 모아 태산.', source: '속담' })).toBe('티끌 모아 태산. — 속담');
    expect(formatQuote({ text: '적게 쓰는 날이 쌓인다.' })).toBe('적게 쓰는 날이 쌓인다.');
  });
});
