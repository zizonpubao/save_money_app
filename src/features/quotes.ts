import { dayNumber } from '@/src/utils/date';

/** 절약·절제·습관에 관한 한 줄. source 가 없으면 출처를 특정하기 어려운 격언이다. */
export type Quote = {
  text: string;
  source?: string;
};

/**
 * 홈 "오늘의 한 줄" 마지막 순위에 쓰는 명언. 서버 없이 앱에 넣어 둔다.
 * 출처가 분명한 것만 이름을 달고, 널리 돌지만 출처가 흐린 말은 격언(source 없음)으로 둔다.
 * 훈계·경고보다 담담한 문장 위주로 고른다.
 */
export const QUOTES: readonly Quote[] = [
  { text: '작은 지출을 조심하라. 작은 구멍이 큰 배를 가라앉힌다.', source: '프랭클린' },
  { text: '부자가 되고 싶다면 버는 것만큼 아끼는 것도 생각하라.', source: '프랭클린' },
  { text: '절약은 그 자체로 큰 수입이다.', source: '키케로' },
  { text: '쓰고 남은 돈을 저축하지 말고, 저축하고 남은 돈을 써라.', source: '워런 버핏' },
  { text: '가격은 내는 것이고, 가치는 얻는 것이다.', source: '워런 버핏' },
  { text: '만족할 줄 아는 사람이 부자다.', source: '노자, 『도덕경』' },
  { text: '만족할 줄 알면 욕되지 않고, 멈출 줄 알면 위태롭지 않다.', source: '노자' },
  { text: '천 리 길도 발밑에서 시작한다.', source: '노자, 『도덕경』' },
  { text: '검약해서 잘못되는 사람은 드물다.', source: '공자, 『논어』' },
  { text: '예는 사치하기보다 차라리 검소한 편이 낫다.', source: '공자, 『논어』' },
  { text: '검소함으로 덕을 기른다.', source: '제갈량, 「계자서」' },
  { text: '재산 대신 두 글자를 남긴다. 근(勤)과 검(儉).', source: '정약용' },
  { text: '검소함은 덕의 바탕이고, 사치는 큰 악이다.', source: '『춘추좌씨전』' },
  { text: '죽 한 그릇, 밥 한 공기도 얻기 쉽지 않았음을 생각하라.', source: '주백려' },
  { text: '적게 가진 사람이 아니라 더 바라는 사람이 가난하다.', source: '세네카' },
  { text: '절약은 주머니 바닥이 보이기 전에 시작해야 한다.', source: '세네카' },
  { text: '충분한 것을 적다고 여기면 무엇도 충분하지 않다.', source: '에피쿠로스' },
  { text: '행복한 삶에 필요한 것은 아주 적다.', source: '마르쿠스 아우렐리우스' },
  { text: '없이 지낼 수 있는 것이 많을수록 부유하다.', source: '헨리 데이비드 소로' },
  { text: '단순하게, 단순하게.', source: '헨리 데이비드 소로, 『월든』' },
  { text: '무엇을 가졌든 그보다 적게 써라.', source: '새뮤얼 존슨' },
  { text: '돈이 생기기 전에 먼저 쓰지 마라.', source: '토머스 제퍼슨' },
  { text: '싸다고 필요 없는 것을 사지 마라. 결국 비싼 값이 된다.', source: '제퍼슨' },
  { text: '수입보다 조금 덜 쓰면 행복, 조금 더 쓰면 불행이다.', source: '찰스 디킨스' },
  { text: '모든 행동은 되고 싶은 사람에게 던지는 한 표다.', source: '제임스 클리어' },
  { text: '반복하는 것이 우리다. 탁월함은 행동이 아니라 습관이다.', source: '윌 듀런트' },
  { text: '티끌 모아 태산.', source: '속담' },
  { text: '낙숫물이 댓돌을 뚫는다.', source: '속담' },
  { text: '가랑비에 옷 젖는 줄 모른다.', source: '속담' },
  { text: '개미 금탑 모으듯 한다.', source: '속담' },
  { text: '한 푼 아낀 것은 한 푼 번 것이다.', source: '영국 속담' },
  { text: '부는 많이 가지는 데 있지 않고 적게 바라는 데 있다.' },
  { text: '저축하는 습관은 그 자체로 하나의 배움이다.' },
  { text: '필요한 것과 갖고 싶은 것을 가르는 데서 절약이 시작된다.' },
  { text: '오늘 참은 작은 것이 내일의 여유가 된다.' },
  { text: '적게 쓰는 날이 쌓이면 한 달이 달라진다.' },
];

/**
 * 그날의 명언. 날짜 순번으로 차례차례 돌려서 같은 날엔 늘 같은 문장,
 * 목록 길이(36일) 안에서는 같은 문장이 다시 나오지 않는다.
 */
export function quoteOfDay(date: string): Quote {
  const n = QUOTES.length;
  const index = ((dayNumber(date) % n) + n) % n;
  return QUOTES[index] ?? QUOTES[0];
}

/** 출처까지 합친 최대 글자 수. 카드에서 2줄 안에 들어오게 한다 */
export const QUOTE_MAX_CHARS = 40;

/** 카드에 한 줄로 쓰는 모양: "문장 — 출처" (격언은 문장만) */
export function formatQuote(quote: Quote): string {
  return quote.source ? `${quote.text} — ${quote.source}` : quote.text;
}
