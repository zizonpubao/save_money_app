import {
  categoryErrorMessage,
  countGraphemes,
  moveItem,
  validateCategoryInput,
} from '@/src/features/categoryForm';

describe('countGraphemes', () => {
  it.each([
    ['☕', 1],
    ['🛍️', 1], // 이형 선택자
    ['👍🏽', 1], // 피부색
    ['👨‍👩‍👧', 1], // ZWJ
    ['🇰🇷', 1], // 국기 = 지역 표시 문자 2개
    ['🇰🇷🇯🇵', 2],
    ['1️⃣', 1], // 키캡
    ['☕🍰', 2],
    ['가', 1],
    ['편의점', 3],
    ['', 0],
  ])('%s → %i', (text, expected) => {
    expect(countGraphemes(text)).toBe(expected);
  });
});

describe('validateCategoryInput', () => {
  it('이름·이모지가 있고 이모지 1~2자면 통과 (앞뒤 공백은 무시)', () => {
    expect(validateCategoryInput({ name: ' 편의점 ', emoji: ' 🏪 ' })).toBeNull();
    expect(validateCategoryInput({ name: '가족', emoji: '👨‍👩‍👧🛍️' })).toBeNull();
  });

  it('빈 이름·빈 이모지·이모지 3자 이상·이름 12자 초과를 막는다', () => {
    expect(validateCategoryInput({ name: '  ', emoji: '☕' })).toBe('name-empty');
    expect(validateCategoryInput({ name: '커피', emoji: '' })).toBe('emoji-empty');
    expect(validateCategoryInput({ name: '커피', emoji: '☕☕☕' })).toBe('emoji-too-long');
    expect(validateCategoryInput({ name: '가'.repeat(13), emoji: '☕' })).toBe('name-too-long');
  });

  it('길이 초과만 문구로 알린다 (빈 칸은 저장 버튼 비활성으로)', () => {
    expect(categoryErrorMessage('emoji-too-long')).toBe('이모지는 2자까지 쓸 수 있습니다');
    expect(categoryErrorMessage('name-empty')).toBeNull();
    expect(categoryErrorMessage(null)).toBeNull();
  });
});

describe('moveItem', () => {
  it('위(-1)·아래(+1)로 옆 칸과 자리를 바꾼다', () => {
    expect(moveItem([1, 2, 3], 1, -1)).toEqual([2, 1, 3]);
    expect(moveItem([1, 2, 3], 1, 1)).toEqual([1, 3, 2]);
  });

  it('끝을 넘으면 그대로 (새 배열)', () => {
    const items = [1, 2, 3];
    expect(moveItem(items, 0, -1)).toEqual([1, 2, 3]);
    expect(moveItem(items, 2, 1)).toEqual([1, 2, 3]);
    expect(moveItem(items, 0, -1)).not.toBe(items);
  });
});
