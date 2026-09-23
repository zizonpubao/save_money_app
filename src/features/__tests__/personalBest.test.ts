import {
  detectPersonalBest,
  personalBestMessage,
  type PersonalBestInput,
} from '@/src/features/personalBest';

function input(over: Partial<PersonalBestInput> = {}): PersonalBestInput {
  return {
    prevMaxDay: 0,
    dayTotalBefore: 0,
    dayTotal: 0,
    prevMaxMonth: 0,
    monthTotalBefore: 0,
    monthTotal: 0,
    isToday: true,
    isThisMonth: true,
    ...over,
  };
}

describe('detectPersonalBest', () => {
  it('첫 기록은 비교 대상이 없으므로 최고로 치지 않는다', () => {
    expect(detectPersonalBest(input({ dayTotal: 4500, monthTotal: 4500 }))).toBeNull();
  });

  it('이전 하루 최고를 넘기면 day 다', () => {
    expect(detectPersonalBest(input({ prevMaxDay: 10000, dayTotal: 10001 }))).toBe('day');
  });

  it('이전 하루 최고와 같으면 넘긴 게 아니다', () => {
    expect(detectPersonalBest(input({ prevMaxDay: 10000, dayTotal: 10000 }))).toBeNull();
  });

  it('이전 하루 최고에 못 미치면 null 이다', () => {
    expect(detectPersonalBest(input({ prevMaxDay: 10000, dayTotal: 9999 }))).toBeNull();
  });

  it('이전 월 최고를 넘기면 month 다', () => {
    expect(detectPersonalBest(input({ prevMaxMonth: 300000, monthTotal: 300001 }))).toBe('month');
  });

  it('이전 월 최고와 같으면 넘긴 게 아니다', () => {
    expect(detectPersonalBest(input({ prevMaxMonth: 300000, monthTotal: 300000 }))).toBeNull();
  });

  it('하루와 한 달을 동시에 갱신하면 월이 우선이다', () => {
    const best = detectPersonalBest(
      input({ prevMaxDay: 10000, dayTotal: 20000, prevMaxMonth: 300000, monthTotal: 400000 }),
    );
    expect(best).toBe('month');
  });

  it('첫 달이면 월 합계가 아무리 커도 최고로 치지 않는다', () => {
    expect(detectPersonalBest(input({ prevMaxMonth: 0, monthTotal: 999999 }))).toBeNull();
  });

  it('오늘이 아닌 날짜로 넣은 기록은 하루 최고로 치지 않는다', () => {
    expect(
      detectPersonalBest(input({ prevMaxDay: 10000, dayTotal: 50000, isToday: false })),
    ).toBeNull();
  });

  it('지난 달 날짜로 넣은 기록은 월 최고로 치지 않는다', () => {
    expect(
      detectPersonalBest(
        input({ prevMaxMonth: 100000, monthTotal: 500000, isThisMonth: false, isToday: false }),
      ),
    ).toBeNull();
  });

  it('저장 전에 이미 하루 최고를 넘어 있었으면 더 쌓아도 null 이다', () => {
    expect(
      detectPersonalBest(input({ prevMaxDay: 10000, dayTotalBefore: 12000, dayTotal: 15000 })),
    ).toBeNull();
  });

  it('저장 전에 이미 월 최고를 넘어 있었으면 더 쌓아도 null 이다', () => {
    expect(
      detectPersonalBest(
        input({ prevMaxMonth: 300000, monthTotalBefore: 310000, monthTotal: 320000 }),
      ),
    ).toBeNull();
  });

  it('저장 전 합계가 최고와 동점이었다가 넘기면 처음 넘긴 것이다', () => {
    expect(
      detectPersonalBest(input({ prevMaxDay: 10000, dayTotalBefore: 10000, dayTotal: 10001 })),
    ).toBe('day');
  });

  it('월은 이미 넘어 있고 하루는 처음 넘기면 day 다', () => {
    const best = detectPersonalBest(
      input({
        prevMaxDay: 10000,
        dayTotalBefore: 5000,
        dayTotal: 15000,
        prevMaxMonth: 300000,
        monthTotalBefore: 310000,
        monthTotal: 320000,
      }),
    );
    expect(best).toBe('day');
  });

  it('과거 날짜여도 이번 달이면 월 최고는 살아 있다', () => {
    expect(
      detectPersonalBest(
        input({ prevMaxMonth: 100000, monthTotal: 200000, isToday: false, isThisMonth: true }),
      ),
    ).toBe('month');
  });
});

describe('personalBestMessage', () => {
  it('종류별 문구를 돌려주고 없으면 null 이다', () => {
    expect(personalBestMessage('day')).toBe('하루 최고 기록! 🏆');
    expect(personalBestMessage('month')).toBe('이번 달 최고 기록! 🏆');
    expect(personalBestMessage(null)).toBeNull();
  });
});
