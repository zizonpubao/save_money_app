/** 정수 원화를 '4,500원' 형태로 만든다. 음수/소수는 0 이하로 내림 처리하지 않고 그대로 절삭. */
export function formatWon(amount: number): string {
  const n = Number.isFinite(amount) ? Math.trunc(amount) : 0;
  const abs = Math.abs(n);
  const withComma = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${n < 0 ? '-' : ''}${withComma}원`;
}

/** 숫자만 콤마로 묶는다 (단위 없음). 입력 필드 표시용. */
export function formatNumber(amount: number): string {
  const n = Number.isFinite(amount) ? Math.trunc(amount) : 0;
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** '4,500' / '4500원' / ' 4 500 ' 같은 입력을 정수 4500으로 바꾼다. 숫자가 없으면 0. */
export function parseWon(input: string): number {
  const digits = input.replace(/[^\d]/g, '');
  if (digits.length === 0) return 0;
  const n = Number.parseInt(digits, 10);
  return Number.isSafeInteger(n) ? n : 0;
}
