import {
  celebrationMessage,
  detectGoalReached,
  GOAL_REACHED_MESSAGE,
  goalLine,
  goalProgress,
  parseGoal,
  presetLabel,
} from '@/src/features/goal';

describe('goalProgress', () => {
  it('합계 0이면 0%, 남은 금액은 목표 전체다', () => {
    expect(goalProgress(0, 300000)).toEqual({
      ratio: 0,
      percent: 0,
      remaining: 300000,
      over: 0,
      reached: false,
    });
  });

  it('186,000 / 300,000 은 62% 다', () => {
    expect(goalProgress(186000, 300000)).toEqual({
      ratio: 0.62,
      percent: 62,
      remaining: 114000,
      over: 0,
      reached: false,
    });
  });

  it('목표에 1원 모자라면 100% 가 아니라 99% 다 (내림)', () => {
    const p = goalProgress(299999, 300000);
    expect(p?.percent).toBe(99);
    expect(p?.reached).toBe(false);
  });

  it('딱 목표면 100% · 달성 · 초과 0', () => {
    expect(goalProgress(300000, 300000)).toEqual({
      ratio: 1,
      percent: 100,
      remaining: 0,
      over: 0,
      reached: true,
    });
  });

  it('목표를 넘으면 바는 1에서 멈추고 초과액이 나온다', () => {
    const p = goalProgress(312000, 300000);
    expect(p?.ratio).toBe(1);
    expect(p?.over).toBe(12000);
    expect(p?.remaining).toBe(0);
    expect(p?.reached).toBe(true);
    expect(p?.percent).toBe(104);
  });

  it('목표가 없거나(null) 0 이하면 null', () => {
    expect(goalProgress(10000, null)).toBeNull();
    expect(goalProgress(10000, 0)).toBeNull();
    expect(goalProgress(10000, -5)).toBeNull();
  });
});

describe('goalLine', () => {
  it('달성 전: "목표 300,000원 · 62%"', () => {
    const p = goalProgress(186000, 300000);
    expect(p && goalLine(300000, p)).toBe('목표 300,000원 · 62%');
  });

  it('초과: "목표 300,000원 · 달성! +12,000원 초과"', () => {
    const p = goalProgress(312000, 300000);
    expect(p && goalLine(300000, p)).toBe('목표 300,000원 · 달성! +12,000원 초과');
  });

  it('딱 목표면 "+0원 초과" 없이 "달성!" 까지만', () => {
    const p = goalProgress(300000, 300000);
    expect(p && goalLine(300000, p)).toBe('목표 300,000원 · 달성!');
  });
});

describe('detectGoalReached', () => {
  const MONTH = '2026-09';

  it('이번 저장으로 목표선을 넘으면 true', () => {
    expect(detectGoalReached(290000, 305000, 300000, null, MONTH)).toBe(true);
  });

  it('저장 후 합계가 목표와 딱 같아도 true (동점 = 달성)', () => {
    expect(detectGoalReached(290000, 300000, 300000, null, MONTH)).toBe(true);
  });

  it('이미 목표 이상이던 달에 더 쌓는 저장은 false', () => {
    expect(detectGoalReached(300000, 310000, 300000, null, MONTH)).toBe(false);
  });

  it('아직 목표에 못 미치면 false', () => {
    expect(detectGoalReached(100000, 200000, 300000, null, MONTH)).toBe(false);
  });

  it('이번 달에 이미 축하한 기록이 남아 있으면 false (목표를 바꾸면 스토어가 기록을 지운다)', () => {
    expect(detectGoalReached(290000, 305000, 300000, MONTH, MONTH)).toBe(false);
  });

  it('지난달에 축하한 기록은 이번 달 판정에 영향이 없다', () => {
    expect(detectGoalReached(290000, 305000, 300000, '2026-08', MONTH)).toBe(true);
  });

  it('목표가 없으면(null·0) false', () => {
    expect(detectGoalReached(0, 999999, null, null, MONTH)).toBe(false);
    expect(detectGoalReached(0, 999999, 0, null, MONTH)).toBe(false);
  });

  it('합계가 그대로면(지난 달 날짜로 넣은 기록) false', () => {
    expect(detectGoalReached(290000, 290000, 290000, null, MONTH)).toBe(false);
  });
});

describe('parseGoal', () => {
  it('정수 문자열은 숫자로', () => {
    expect(parseGoal('300000')).toBe(300000);
  });

  it('없음·0·음수·숫자 아님은 목표 없음(null)', () => {
    expect(parseGoal(null)).toBeNull();
    expect(parseGoal('0')).toBeNull();
    expect(parseGoal('-5')).toBeNull();
    expect(parseGoal('abc')).toBeNull();
    expect(parseGoal('1.5')).toBeNull();
    expect(parseGoal('')).toBeNull();
  });
});

describe('celebrationMessage', () => {
  it('목표 달성이 개인 최고보다 우선한다', () => {
    expect(celebrationMessage(true, 'month')).toBe(GOAL_REACHED_MESSAGE);
    expect(GOAL_REACHED_MESSAGE).toBe('이번 달 목표 달성 🎉');
  });

  it('목표 달성이 아니면 개인 최고 문구, 둘 다 아니면 null', () => {
    expect(celebrationMessage(false, 'day')).toBe('하루 최고 기록! 🏆');
    expect(celebrationMessage(false, null)).toBeNull();
  });
});

describe('presetLabel', () => {
  it('만 원 단위로 줄여 쓴다', () => {
    expect(presetLabel(100000)).toBe('10만');
    expect(presetLabel(500000)).toBe('50만');
  });
});
