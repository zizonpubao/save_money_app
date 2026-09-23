import { formatWon } from '@/src/utils/money';

import { goalProgress } from './goal';
import { formatQuote, quoteOfDay } from './quotes';

/** 목표의 이 비율 이상이면(100% 미만) "목표까지 N원" 을 가장 먼저 보여준다 */
export const GOAL_NEAR_RATIO = 0.8;

/** 환산 사다리 한 칸 */
export type LadderItem = {
  name: string;
  price: number;
  /** 세는 단위: 잔, 마리, 켤레 … */
  unit: string;
  emoji: string;
};

/**
 * 이번 달 합계를 물건으로 바꿔 보여주는 사다리 (10단계, 가격 오름차순).
 * 합계 이하인 가장 비싼 칸 하나를 골라 몇 개인지 센다 (소수 버림).
 */
export const CONVERSION_LADDER: readonly LadderItem[] = [
  { name: '커피', price: 4500, unit: '잔', emoji: '☕' },
  { name: '영화', price: 15000, unit: '편', emoji: '🎬' },
  { name: '치킨', price: 20000, unit: '마리', emoji: '🍗' },
  { name: '배달', price: 25000, unit: '번', emoji: '🛵' },
  { name: '운동화', price: 90000, unit: '켤레', emoji: '👟' },
  { name: '에어팟', price: 250000, unit: '개', emoji: '🎧' },
  { name: '호캉스', price: 300000, unit: '번', emoji: '🏨' },
  { name: '아이패드', price: 700000, unit: '대', emoji: '📱' },
  { name: '항공권', price: 900000, unit: '장', emoji: '✈️' },
  { name: '노트북', price: 1500000, unit: '대', emoji: '💻' },
];

export type DailyLineKind = 'goalNear' | 'vsYesterday' | 'conversion' | 'quote';

export type DailyLine = { kind: DailyLineKind; text: string };

export type DailyLineInput = {
  todayTotal: number;
  yesterdayTotal: number;
  monthTotal: number;
  /** 월 목표(원). 없으면 null */
  goal: number | null;
  /** 오늘 'YYYY-MM-DD'. 문구 변형을 고르는 시드 */
  date: string;
};

/**
 * 문자열 → 0 이상 정수 (djb2). 같은 날짜면 기기와 상관없이 늘 같은 값이 나온다.
 * salt 를 붙여 우선순위마다 다른 변형이 골라지게 한다 (모든 줄이 같은 칸 번호를 쓰지 않게).
 */
export function seedOf(text: string): number {
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash * 33) ^ text.charCodeAt(i)) >>> 0;
  }
  // djb2 는 끝 글자(salt)만 다르면 아래 비트가 같이 움직인다. 그대로 % 2 하면
  // 종류 선택과 표현 선택이 같은 비트에 묶이므로, 한 번 더 섞어 윗 비트를 아래로 내린다
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x45d9f3b);
  hash ^= hash >>> 13;
  return hash >>> 0;
}

/** 날짜 시드로 변형 하나를 고른다. 같은 날·같은 salt 면 늘 같은 것 */
export function pickBySeed<T>(options: readonly [T, ...T[]], date: string, salt: string): T {
  return options[seedOf(`${date}:${salt}`) % options.length] ?? options[0];
}

/** 합계 이하인 가장 비싼 칸과 개수. 가장 싼 칸(커피)보다 적으면 null */
export function convertAmount(total: number): { item: LadderItem; count: number } | null {
  for (let i = CONVERSION_LADDER.length - 1; i >= 0; i -= 1) {
    const item = CONVERSION_LADDER[i];
    if (item && total >= item.price) {
      return { item, count: Math.floor(total / item.price) };
    }
  }
  return null;
}

/**
 * 홈 카드 큰 숫자 위 "오늘의 한 줄". 위에서부터 처음 맞는 한 가지를 보여준다.
 * 1. 목표 근접(80% 이상 100% 미만) → "목표까지 38,000원"
 * 2. 오늘 기록 없음 → 절약 명언 (하루 하나 고정)
 * 3. 오늘 기록 있음 → 어제 대비("어제보다 +4,500원") / 환산("= 치킨 3마리 🍗") 을 날짜 시드로 번갈아.
 *    어제 기록이 없거나 어제보다 적으면 환산, 환산할 수 없으면(4,500원 미만) 어제 대비
 * 4. 그 외(둘 다 못 만들 때) → 절약 명언
 * 목표 달성 후는 따로 두지 않는다. 카드의 목표 줄("달성! +N원 초과")이 이미 보여 주므로 2~4 규칙을 따른다.
 * 같은 순위 안의 표현은 날짜 시드로 바뀐다. 이모지는 환산 줄에만, 한 줄에 하나.
 */
export function dailyLine(input: DailyLineInput): DailyLine {
  const { todayTotal, yesterdayTotal, monthTotal, goal, date } = input;
  const progress = goalProgress(monthTotal, goal);
  const quote: DailyLine = { kind: 'quote', text: formatQuote(quoteOfDay(date)) };

  if (progress && !progress.reached && monthTotal >= (goal ?? 0) * GOAL_NEAR_RATIO) {
    const left = formatWon(progress.remaining);
    return {
      kind: 'goalNear',
      text: pickBySeed([`목표까지 ${left}`, `목표까지 ${left} 남았어요`], date, 'goalNear'),
    };
  }

  if (todayTotal <= 0) return quote;

  const vsYesterday = vsYesterdayLine(todayTotal, yesterdayTotal, date);
  const conversion = conversionLine(monthTotal, date);
  const preferred = pickBySeed(['vsYesterday', 'conversion'] as const, date, 'todayKind');
  const first = preferred === 'vsYesterday' ? vsYesterday : conversion;
  const second = preferred === 'vsYesterday' ? conversion : vsYesterday;
  return first ?? second ?? quote;
}

/**
 * 어제 기록이 없으면 비교할 수 없으므로 null.
 * 어제보다 적은 날도 null 이다. 덜 아낀 걸 짚는 문구는 채찍이 되므로 환산·명언에 넘긴다
 */
function vsYesterdayLine(todayTotal: number, yesterdayTotal: number, date: string): DailyLine | null {
  if (yesterdayTotal <= 0) return null;
  const diff = todayTotal - yesterdayTotal;
  if (diff < 0) return null;
  const amount = formatWon(diff);
  const options: [string, ...string[]] =
    diff > 0
      ? [`어제보다 +${amount}`, `어제보다 ${amount} 더 아꼈어요`]
      : ['어제와 같아요', '어제와 같은 금액이에요'];
  return { kind: 'vsYesterday', text: pickBySeed(options, date, 'vsYesterday') };
}

/** 이번 달 합계가 커피 한 잔 값보다 적으면 null */
function conversionLine(monthTotal: number, date: string): DailyLine | null {
  const converted = convertAmount(monthTotal);
  if (!converted) return null;
  const { item, count } = converted;
  const what = `${item.name} ${count}${item.unit}`;
  return {
    kind: 'conversion',
    text: pickBySeed(
      [`= ${what} ${item.emoji}`, `${what}만큼 지켰어요 ${item.emoji}`],
      date,
      'conversion',
    ),
  };
}

