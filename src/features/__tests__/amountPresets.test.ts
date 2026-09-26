import {
  AMOUNT_PRESETS,
  applyAmountPreset,
  MAX_INPUT_AMOUNT,
  parseAmountPresets,
  PRESET_ERRORS,
  presetA11yLabel,
  presetLabel,
  presetsPreview,
  serializeAmountPresets,
  togglePresetSign,
  validatePresets,
} from '@/src/features/amountPresets';

describe('amountPresets (M4.5 금액 프리셋 칩, 누적 방식)', () => {
  it('기본 칩은 5백 · 1천 · 3천 · 5천 · 1만 다섯 개다', () => {
    expect(AMOUNT_PRESETS.map(presetLabel)).toEqual(['5백', '1천', '3천', '5천', '1만']);
    expect(presetsPreview(AMOUNT_PRESETS)).toBe('5백 · 1천 · 3천 · 5천 · 1만');
  });

  describe('presetLabel 경계', () => {
    it.each([
      [100, '1백'],
      [500, '5백'],
      [900, '9백'],
      [1000, '1천'],
      [1500, '1.5천'],
      [9900, '9.9천'],
      [10000, '1만'],
      [25000, '2.5만'],
      [1000000, '100만'],
    ])('%i → %s', (value, label) => {
      expect(presetLabel(value)).toBe(label);
    });

    it('소수는 첫째 자리까지 버린다 (12,300 → 1.2만, 19,900 → 1.9만). 실제보다 크게 보이지 않게', () => {
      expect(presetLabel(12300)).toBe('1.2만');
      expect(presetLabel(19900)).toBe('1.9만');
    });

    it('부동소수 오차로 한 칸 내려가지 않는다 (1,100 → 1.1천, 3,300 → 3.3천, 110,000 → 11만)', () => {
      expect(presetLabel(1100)).toBe('1.1천');
      expect(presetLabel(3300)).toBe('3.3천');
      expect(presetLabel(110000)).toBe('11만');
    });

    it('100 미만은 단위 없이 원 (검증이 막지만 방어)', () => {
      expect(presetLabel(50)).toBe('50원');
    });
  });

  it('스크린리더 문구는 부호에 따라 "더하기" / "빼기" 다', () => {
    expect(presetA11yLabel(500)).toBe('금액에 500원 더하기');
    expect(presetA11yLabel(10000, '+')).toBe('금액에 10,000원 더하기');
    expect(presetA11yLabel(500, '-')).toBe('금액에 500원 빼기');
  });

  it('부호 토글: + ↔ −', () => {
    expect(togglePresetSign('+')).toBe('-');
    expect(togglePresetSign('-')).toBe('+');
  });

  it('누를 때마다 지금 금액에 더한다: 빈 칸 1천 → 1,000 → 5백 → 1,500 → 1만 두 번 → 21,500', () => {
    let amount = 0;
    amount = applyAmountPreset(amount, 1000);
    expect(amount).toBe(1000);
    amount = applyAmountPreset(amount, 500);
    expect(amount).toBe(1500);
    amount = applyAmountPreset(amount, 10000);
    amount = applyAmountPreset(amount, 10000);
    expect(amount).toBe(21500);
  });

  it('− 면 빼고, 0 미만이면 0 에서 멈춘다', () => {
    expect(applyAmountPreset(4500, 1000, '-')).toBe(3500);
    expect(applyAmountPreset(1000, 1000, '-')).toBe(0);
    expect(applyAmountPreset(500, 1000, '-')).toBe(0);
    expect(applyAmountPreset(0, 500, '-')).toBe(0);
  });

  it('더해서 입력칸 최대를 넘으면 그대로 둔다', () => {
    expect(applyAmountPreset(MAX_INPUT_AMOUNT, 500)).toBe(MAX_INPUT_AMOUNT);
    expect(applyAmountPreset(MAX_INPUT_AMOUNT - 400, 500)).toBe(MAX_INPUT_AMOUNT - 400);
    expect(applyAmountPreset(MAX_INPUT_AMOUNT - 500, 500)).toBe(MAX_INPUT_AMOUNT);
  });
});

describe('validatePresets (설정 빠른 금액 버튼)', () => {
  it('기본값과 사용자 순서(정렬 안 함)는 통과한다', () => {
    expect(validatePresets(AMOUNT_PRESETS)).toEqual({ ok: true, errors: [] });
    expect(validatePresets([10000, 100, 1000000, 2500, 700])).toEqual({ ok: true, errors: [] });
  });

  it('정확히 5개: 4개·6개·빈 칸(null)은 개수 문구 하나만', () => {
    expect(validatePresets([500, 1000, 3000, 5000])).toEqual({ ok: false, errors: [PRESET_ERRORS.count] });
    expect(validatePresets([500, 1000, 3000, 5000, 10000, 20000]).errors).toEqual([PRESET_ERRORS.count]);
    // 빈 칸을 0 으로 보지 않는다 — 범위 문구가 먼저 뜨면 헷갈린다
    expect(validatePresets([500, null, 3000, 5000, 10000]).errors).toEqual([PRESET_ERRORS.count]);
  });

  it('범위: 100 미만·1,000,000 초과는 안 된다 (100 · 1,000,000 은 된다)', () => {
    expect(validatePresets([100, 1000, 3000, 5000, 1000000]).ok).toBe(true);
    expect(validatePresets([0, 1000, 3000, 5000, 10000]).errors).toEqual([PRESET_ERRORS.range]);
    expect(validatePresets([500, 1000, 3000, 5000, 1000100]).errors).toEqual([PRESET_ERRORS.range]);
  });

  it('100원 단위가 아니면 "100원 단위로 입력해 주세요"', () => {
    const result = validatePresets([550, 1000, 3000, 5000, 10000]);
    expect(result).toEqual({ ok: false, errors: ['100원 단위로 입력해 주세요'] });
  });

  it('정수가 아니면 정수 문구', () => {
    expect(validatePresets([500.5, 1000, 3000, 5000, 10000]).errors).toEqual([PRESET_ERRORS.integer]);
  });

  it('중복은 안 된다', () => {
    expect(validatePresets([500, 1000, 1000, 5000, 10000]).errors).toEqual([PRESET_ERRORS.duplicate]);
  });

  it('여러 규칙이 틀리면 규칙마다 한 번씩, 정해진 순서로', () => {
    expect(validatePresets([50, 150, 150, 2000000, 10000]).errors).toEqual([
      PRESET_ERRORS.range,
      PRESET_ERRORS.unit,
      PRESET_ERRORS.duplicate,
    ]);
  });
});

describe('parseAmountPresets / serializeAmountPresets (settings 값)', () => {
  it('저장한 JSON 배열을 순서 그대로 읽는다', () => {
    const raw = serializeAmountPresets([2000, 100, 50000, 700, 1000000]);
    expect(raw).toBe('[2000,100,50000,700,1000000]');
    expect(parseAmountPresets(raw)).toEqual([2000, 100, 50000, 700, 1000000]);
  });

  it.each([
    ['없음', null],
    ['JSON 아님', 'abc'],
    ['배열 아님', '{"a":1}'],
    ['개수 틀림', '[500,1000]'],
    ['숫자 아님', '["500",1000,3000,5000,10000]'],
    ['규칙 위반(단위)', '[550,1000,3000,5000,10000]'],
  ])('%s → 기본값', (_, raw) => {
    expect(parseAmountPresets(raw)).toEqual([...AMOUNT_PRESETS]);
  });
});
