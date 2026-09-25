/** (M5) 카테고리 편집 폼 규칙 (순수 함수) */

export const CATEGORY_NAME_MAX = 12;
/** 이모지 칸 최대 글자 수. "글자" 는 화면에 보이는 한 덩어리(👨‍👩‍👧 · 🛍️ 도 1자) */
export const CATEGORY_EMOJI_MAX = 2;

function isJoiner(cp: number): boolean {
  return cp === 0x200d;
}

/** 앞 글자에 붙어 한 덩어리가 되는 코드 포인트: 이형 선택자 · 피부색 · 키캡 · 태그 · 결합 부호 */
function isExtender(cp: number): boolean {
  return (
    cp === 0xfe0f ||
    cp === 0xfe0e ||
    (cp >= 0x1f3fb && cp <= 0x1f3ff) ||
    cp === 0x20e3 ||
    (cp >= 0xe0020 && cp <= 0xe007f) ||
    (cp >= 0x0300 && cp <= 0x036f)
  );
}

function isRegionalIndicator(cp: number): boolean {
  return cp >= 0x1f1e6 && cp <= 0x1f1ff;
}

/**
 * 화면에 보이는 글자 수. TextInput maxLength 는 UTF-16 단위라 🛍️(2단위)·가족 이모지(8단위)를 잘못 센다.
 * Hermes 에 Intl.Segmenter 가 없을 수 있어 이모지에 필요한 규칙(ZWJ · 이형 선택자 · 피부색 · 국기 쌍)만 직접 센다
 */
export function countGraphemes(text: string): number {
  let count = 0;
  let joinNext = false;
  let pendingFlag = false;
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    if (isJoiner(cp)) {
      joinNext = true;
      continue;
    }
    if (isExtender(cp)) continue;
    if (joinNext) {
      joinNext = false;
      continue;
    }
    if (isRegionalIndicator(cp)) {
      // 국기는 지역 표시 문자 두 개가 한 글자
      if (pendingFlag) {
        pendingFlag = false;
        continue;
      }
      pendingFlag = true;
      count += 1;
      continue;
    }
    pendingFlag = false;
    count += 1;
  }
  return count;
}

export type CategoryFormError = 'name-empty' | 'name-too-long' | 'emoji-empty' | 'emoji-too-long';

/** 저장할 수 있으면 null, 아니면 첫 번째 문제 */
export function validateCategoryInput(input: { name: string; emoji: string }): CategoryFormError | null {
  const name = input.name.trim();
  const emoji = input.emoji.trim();
  if (!name) return 'name-empty';
  if (countGraphemes(name) > CATEGORY_NAME_MAX) return 'name-too-long';
  if (!emoji) return 'emoji-empty';
  if (countGraphemes(emoji) > CATEGORY_EMOJI_MAX) return 'emoji-too-long';
  return null;
}

/** 폼 아래 안내 문구 (빈 칸은 저장 버튼 비활성으로만 알린다) */
export function categoryErrorMessage(error: CategoryFormError | null): string | null {
  switch (error) {
    case 'name-too-long':
      return `이름은 ${CATEGORY_NAME_MAX}자까지 쓸 수 있습니다`;
    case 'emoji-too-long':
      return `이모지는 ${CATEGORY_EMOJI_MAX}자까지 쓸 수 있습니다`;
    default:
      return null;
  }
}

/** ids 에서 index 자리를 delta(−1 위 / +1 아래) 만큼 옮긴 새 배열. 끝을 넘으면 그대로 */
export function moveItem<T>(items: readonly T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta;
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) return [...items];
  const next = [...items];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved as T);
  return next;
}
