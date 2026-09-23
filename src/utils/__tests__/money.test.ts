import { formatAmountInput, formatNumber, formatWon, parseWon } from '../money';

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

describe('입력 중 콤마 처리 (parseWon → formatNumber)', () => {
  it('타이핑 중간 상태의 콤마를 다시 계산한다', () => {
    expect(formatNumber(parseWon('1,23'))).toBe('123');
    expect(formatNumber(parseWon('1,2345'))).toBe('12,345');
    expect(formatNumber(parseWon('12,345,6'))).toBe('123,456');
  });

  it('콤마 뒤에서 한 글자 지워도 값이 유지된다', () => {
    // '1,234' 에서 마지막 글자 삭제 → '1,23'
    expect(formatNumber(parseWon('1,23'))).toBe('123');
    // '1,234' 에서 콤마만 삭제 → '1234'
    expect(formatNumber(parseWon('1234'))).toBe('1,234');
  });

  it('앞자리 0은 정수 변환에서 사라진다', () => {
    expect(formatNumber(parseWon('0'))).toBe('0');
    expect(formatNumber(parseWon('007'))).toBe('7');
  });
});

describe('formatAmountInput', () => {
  it('숫자가 없거나 0이면 빈 문자열', () => {
    expect(formatAmountInput('')).toBe('');
    expect(formatAmountInput('0')).toBe('');
    expect(formatAmountInput('abc')).toBe('');
  });

  it('입력 중인 문자열을 콤마 형식으로 만든다', () => {
    expect(formatAmountInput('4')).toBe('4');
    expect(formatAmountInput('4500')).toBe('4,500');
    expect(formatAmountInput('4,5001')).toBe('45,001');
    expect(formatAmountInput('1,234,567')).toBe('1,234,567');
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
