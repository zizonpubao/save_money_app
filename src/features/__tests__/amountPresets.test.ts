import {
  AMOUNT_PRESETS,
  applyAmountPreset,
  MAX_INPUT_AMOUNT,
  presetA11yLabel,
  presetLabel,
} from '@/src/features/amountPresets';

describe('amountPresets (M4.5 금액 프리셋 칩, 누적 방식)', () => {
  it('칩은 500원 · 1천 · 3천 · 5천 · 1만 다섯 개다', () => {
    expect(AMOUNT_PRESETS.map(presetLabel)).toEqual(['500원', '1천', '3천', '5천', '1만']);
  });

  it('스크린리더 문구는 모두 "더하기" 다', () => {
    expect(presetA11yLabel(500)).toBe('금액에 500원 더하기');
    expect(presetA11yLabel(10000)).toBe('금액에 10,000원 더하기');
  });

  it('누를 때마다 지금 금액에 더한다: 빈 칸 1천 → 1,000 → 500원 → 1,500 → 1만 두 번 → 21,500', () => {
    let amount = 0;
    amount = applyAmountPreset(amount, 1000);
    expect(amount).toBe(1000);
    amount = applyAmountPreset(amount, 500);
    expect(amount).toBe(1500);
    amount = applyAmountPreset(amount, 10000);
    amount = applyAmountPreset(amount, 10000);
    expect(amount).toBe(21500);
  });

  it('더해서 입력칸 최대를 넘으면 그대로 둔다', () => {
    expect(applyAmountPreset(MAX_INPUT_AMOUNT, 500)).toBe(MAX_INPUT_AMOUNT);
    expect(applyAmountPreset(MAX_INPUT_AMOUNT - 400, 500)).toBe(MAX_INPUT_AMOUNT - 400);
    expect(applyAmountPreset(MAX_INPUT_AMOUNT - 500, 500)).toBe(MAX_INPUT_AMOUNT);
  });
});
