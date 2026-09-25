import {
  AMOUNT_PRESETS,
  applyAmountPreset,
  MAX_INPUT_AMOUNT,
  presetA11yLabel,
  presetLabel,
} from '@/src/features/amountPresets';

describe('amountPresets (M4.5 금액 프리셋 칩)', () => {
  it('칩은 3천 · 4.5천 · 1만 · 2만 · +1천 순서다', () => {
    expect(AMOUNT_PRESETS.map(presetLabel)).toEqual(['3천', '4.5천', '1만', '2만', '+1천']);
  });

  it('스크린리더 문구는 설정/더하기를 구분한다', () => {
    expect(presetA11yLabel({ kind: 'set', value: 4500 })).toBe('금액 4,500원으로');
    expect(presetA11yLabel({ kind: 'add', value: 1000 })).toBe('금액에 1,000원 더하기');
  });

  it('값 칩은 설정, 더하기 칩은 증분', () => {
    expect(applyAmountPreset(7000, { kind: 'set', value: 3000 })).toBe(3000);
    expect(applyAmountPreset(0, { kind: 'add', value: 1000 })).toBe(1000);
    expect(applyAmountPreset(4500, { kind: 'add', value: 1000 })).toBe(5500);
  });

  it('더해서 입력칸 최대를 넘으면 그대로 둔다', () => {
    expect(applyAmountPreset(MAX_INPUT_AMOUNT, { kind: 'add', value: 1000 })).toBe(MAX_INPUT_AMOUNT);
  });
});
