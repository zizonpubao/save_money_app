import { celebrationMessage, GOAL_REACHED_MESSAGE } from '@/src/features/goal';
import {
  detectMilestone,
  MILESTONES,
  milestoneMessage,
  parseMilestone,
} from '@/src/features/milestone';

describe('detectMilestone (M4 누적 이정표)', () => {
  it('이정표는 10만·50만·100만·500만·1,000만', () => {
    expect(MILESTONES).toEqual([100000, 500000, 1000000, 5000000, 10000000]);
  });

  it('저장 전 < 이정표 ≤ 저장 후 이면 그 이정표', () => {
    expect(detectMilestone(95500, 100000, null)).toBe(100000);
    expect(detectMilestone(99999, 104499, null)).toBe(100000);
  });

  it('저장 전에 이미 이정표와 같으면(이미 넘음) 아니다', () => {
    expect(detectMilestone(100000, 104500, null)).toBeNull();
  });

  it('이정표에 못 미치면 없다', () => {
    expect(detectMilestone(90000, 99999, null)).toBeNull();
  });

  it('이미 축하한 이정표 이하는 다시 축하하지 않는다 (삭제 후 다시 넘은 경우)', () => {
    expect(detectMilestone(90000, 110000, 100000)).toBeNull();
    expect(detectMilestone(490000, 510000, 1000000)).toBeNull();
  });

  it('이미 축하한 것보다 큰 이정표는 축하한다', () => {
    expect(detectMilestone(490000, 510000, 100000)).toBe(500000);
  });

  it('한 번에 여러 개를 넘으면 가장 큰 것 하나만', () => {
    expect(detectMilestone(50000, 1200000, null)).toBe(1000000);
    expect(detectMilestone(0, 20000000, 100000)).toBe(10000000);
  });

  it('settings 값 해석: 정수 문자열만, 나머지는 없음', () => {
    expect(parseMilestone('500000')).toBe(500000);
    expect(parseMilestone(null)).toBeNull();
    expect(parseMilestone('abc')).toBeNull();
    expect(parseMilestone('0')).toBeNull();
  });

  it('배너 문구', () => {
    expect(milestoneMessage(100000)).toBe('누적 10만원 돌파 🎉');
    expect(milestoneMessage(500000)).toBe('누적 50만원 돌파 🎉');
    expect(milestoneMessage(10000000)).toBe('누적 1,000만원 돌파 🎉');
  });
});

describe('celebrationMessage 우선순위 (목표 > 이정표 > 개인 최고)', () => {
  it('목표 달성이 이정표보다 먼저', () => {
    expect(celebrationMessage(true, 'month', 500000)).toBe(GOAL_REACHED_MESSAGE);
  });

  it('이정표가 개인 최고보다 먼저', () => {
    expect(celebrationMessage(false, 'month', 500000)).toBe('누적 50만원 돌파 🎉');
  });

  it('이정표가 없으면 개인 최고', () => {
    expect(celebrationMessage(false, 'day', null)).toBe('하루 최고 기록! 🏆');
    expect(celebrationMessage(false, null)).toBeNull();
  });
});
