import { formatNumber, formatWon, parseWon } from '../money';

describe('formatWon', () => {
  it('천 단위 콤마와 원 단위를 붙인다', () => {
    expect(formatWon(4500)).toBe('4,500원');
    expect(formatWon(1234567)).toBe('1,234,567원');
  });

  it('1,000 미만은 콤마 없이 표시한다', () => {
    expect(formatWon(0)).toBe('0원');
    expect(formatWon(999)).toBe('999원');
  });

  it('소수점은 버리고 음수는 부호를 유지한다', () => {
    expect(formatWon(4500.9)).toBe('4,500원');
    expect(formatWon(-12000)).toBe('-12,000원');
  });

  it('유효하지 않은 숫자는 0원으로 처리한다', () => {
    expect(formatWon(Number.NaN)).toBe('0원');
  });
});

describe('formatNumber', () => {
  it('단위 없이 콤마만 넣는다', () => {
    expect(formatNumber(4500)).toBe('4,500');
    expect(formatNumber(0)).toBe('0');
  });
});

describe('parseWon', () => {
  it('콤마가 포함된 문자열을 정수로 바꾼다', () => {
    expect(parseWon('4,500')).toBe(4500);
    expect(parseWon('1,234,567')).toBe(1234567);
  });

  it('원 기호, 공백, 문자를 무시한다', () => {
    expect(parseWon('4500원')).toBe(4500);
    expect(parseWon(' 4 500 ')).toBe(4500);
    expect(parseWon('₩12,000')).toBe(12000);
  });

  it('숫자가 없으면 0을 돌려준다', () => {
    expect(parseWon('')).toBe(0);
    expect(parseWon('abc')).toBe(0);
  });

  it('formatWon 과 왕복 변환이 된다', () => {
    expect(parseWon(formatWon(98765))).toBe(98765);
  });
});
