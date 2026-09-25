import {
  addEntry,
  deleteEntry,
  deleteSetting,
  getAllCategories,
  getCategoryTotals,
  getCategoryTotalsBetween,
  getDailyTotals,
  getDb,
  getEarliestEntryDate,
  getEntriesBetween,
  getEntryById,
  getEntryEmojisForMonth,
  getMaxDailyTotal,
  getMaxMonthlyTotal,
  getMonthStats,
  getMonthlyTotals,
  getRecentTitles,
  getRecordedDates,
  getSetting,
  getStatsBetween,
  getSumBetween,
  getSumByDate,
  getTotalSum,
  initDatabase,
  openDatabaseAt,
  resetDatabaseConnection,
  setSetting,
  SETTING_KEYS,
  UNCATEGORIZED_EMOJI,
  updateEntry,
  type EntryInput,
} from '@/src/db';
import { runMigrations } from '@/src/db/migrations';
import { buildMonthlyBars } from '@/src/features/monthlyStats';
import { addDays, today } from '@/src/utils/date';

function input(over: Partial<EntryInput> = {}): EntryInput {
  return {
    date: '2026-09-15',
    title: '아메리카노',
    amount: 4500,
    categoryId: null,
    memo: null,
    ...over,
  };
}

function categoryIdOf(name: string): number {
  const found = getAllCategories().find((c) => c.name === name);
  if (!found) throw new Error(`카테고리 ${name} 없음`);
  return found.id;
}

describe('queries', () => {
  beforeEach(() => {
    resetDatabaseConnection();
    initDatabase();
  });

  afterAll(() => {
    resetDatabaseConnection();
  });

  describe('카테고리', () => {
    it('getAllCategories 는 sort_order 순으로 기본 9개를 돌려준다', () => {
      expect(getAllCategories().map((c) => c.name)).toEqual([
        '커피',
        '밥값',
        '배달',
        '택시',
        '쇼핑',
        '술',
        '간식',
        '구독',
        '기타',
      ]);
    });

    it('기본 카테고리는 isDefault 가 true 로 변환된다', () => {
      expect(getAllCategories().every((c) => c.isDefault)).toBe(true);
    });
  });

  describe('addEntry', () => {
    it('저장한 기록을 id·타임스탬프가 채워진 채로 돌려준다', () => {
      const created = addEntry(input({ memo: '참았다' }));
      expect(created.id).toBeGreaterThan(0);
      expect(created.title).toBe('아메리카노');
      expect(created.createdAt).toBe(created.updatedAt);
    });

    it('저장한 기록을 getEntryById 로 그대로 다시 읽을 수 있다', () => {
      const created = addEntry(input({ categoryId: categoryIdOf('커피'), memo: '참았다' }));
      expect(getEntryById(created.id)).toEqual(created);
    });

    it('없는 id 로 getEntryById 하면 null 이다', () => {
      expect(getEntryById(9999)).toBeNull();
    });

    it('금액이 0이면 저장하지 않고 예외를 던진다', () => {
      expect(() => addEntry(input({ amount: 0 }))).toThrow('금액은 1원 이상의 정수여야 합니다');
      expect(getEntriesBetween('2000-01-01', '2100-12-31')).toHaveLength(0);
    });

    it('금액이 소수면 예외를 던진다', () => {
      expect(() => addEntry(input({ amount: 4500.5 }))).toThrow('금액은 1원 이상의 정수여야 합니다');
    });

    it('금액이 음수면 예외를 던진다', () => {
      expect(() => addEntry(input({ amount: -100 }))).toThrow('금액은 1원 이상의 정수여야 합니다');
    });

    it('항목명이 공백뿐이면 예외를 던진다', () => {
      expect(() => addEntry(input({ title: '   ' }))).toThrow('항목명이 비어 있습니다');
    });
  });

  describe('updateEntry', () => {
    it('수정한 값이 반영된 행을 돌려준다', () => {
      const created = addEntry(input());
      const updated = updateEntry(created.id, input({ title: '라떼', amount: 5500 }));
      expect(updated).toMatchObject({ id: created.id, title: '라떼', amount: 5500 });
    });

    it('수정해도 createdAt 은 그대로다', () => {
      const created = addEntry(input());
      const updated = updateEntry(created.id, input({ amount: 5500 }));
      expect(updated?.createdAt).toBe(created.createdAt);
    });

    it('없는 id 를 수정하면 null 을 돌려준다', () => {
      expect(updateEntry(9999, input())).toBeNull();
    });

    it('금액이 0이면 수정도 막힌다', () => {
      const created = addEntry(input());
      expect(() => updateEntry(created.id, input({ amount: 0 }))).toThrow();
      expect(getEntryById(created.id)?.amount).toBe(4500);
    });
  });

  describe('deleteEntry', () => {
    it('지운 행 수 1을 돌려주고 그 기록은 사라진다', () => {
      const created = addEntry(input());
      expect(deleteEntry(created.id)).toBe(1);
      expect(getEntryById(created.id)).toBeNull();
    });

    it('없는 id 를 지우면 0을 돌려준다', () => {
      expect(deleteEntry(9999)).toBe(0);
    });
  });

  describe('getEntriesBetween', () => {
    it('최신 날짜가 먼저, 같은 날이면 나중에 넣은 것이 먼저 나온다', () => {
      addEntry(input({ date: '2026-09-01', title: '첫날' }));
      const sameDayOld = addEntry(input({ date: '2026-09-10', title: '먼저' }));
      const sameDayNew = addEntry(input({ date: '2026-09-10', title: '나중' }));
      const titles = getEntriesBetween('2026-09-01', '2026-09-30').map((e) => e.title);
      expect(titles).toEqual(['나중', '먼저', '첫날']);
      expect(sameDayNew.id).toBeGreaterThan(sameDayOld.id);
    });

    it('월 첫날과 말일은 구간에 포함된다', () => {
      addEntry(input({ date: '2026-09-01', title: '첫날' }));
      addEntry(input({ date: '2026-09-30', title: '말일' }));
      expect(getEntriesBetween('2026-09-01', '2026-09-30').map((e) => e.title)).toEqual([
        '말일',
        '첫날',
      ]);
    });

    it('다음 달 첫날은 이번 달 구간에서 빠진다', () => {
      addEntry(input({ date: '2026-09-30', title: '말일' }));
      addEntry(input({ date: '2026-10-01', title: '다음달' }));
      expect(getEntriesBetween('2026-09-01', '2026-09-30').map((e) => e.title)).toEqual(['말일']);
    });

    it('구간에 기록이 없으면 빈 배열이다', () => {
      addEntry(input({ date: '2026-09-15' }));
      expect(getEntriesBetween('2026-08-01', '2026-08-31')).toEqual([]);
    });
  });

  describe('합계', () => {
    it('getSumBetween 은 구간 안 금액을 모두 더한다', () => {
      addEntry(input({ date: '2026-09-01', amount: 4500 }));
      addEntry(input({ date: '2026-09-30', amount: 5500 }));
      addEntry(input({ date: '2026-10-01', amount: 100000 }));
      expect(getSumBetween('2026-09-01', '2026-09-30')).toBe(10000);
    });

    it('getSumBetween 은 기록이 하나도 없으면 0이다', () => {
      expect(getSumBetween('2026-09-01', '2026-09-30')).toBe(0);
    });

    it('getSumByDate 는 그날 합계만 더한다', () => {
      addEntry(input({ date: '2026-09-15', amount: 4500 }));
      addEntry(input({ date: '2026-09-15', amount: 3000 }));
      addEntry(input({ date: '2026-09-16', amount: 9999 }));
      expect(getSumByDate('2026-09-15')).toBe(7500);
    });

    it('getSumByDate 는 그날 기록이 없으면 0이다', () => {
      addEntry(input({ date: '2026-09-15', amount: 4500 }));
      expect(getSumByDate('2026-09-14')).toBe(0);
    });
  });

  describe('getEarliestEntryDate', () => {
    it('기록이 없으면 null 이다', () => {
      expect(getEarliestEntryDate()).toBeNull();
    });

    it('가장 오래된 날짜를 돌려준다', () => {
      addEntry(input({ date: '2026-09-15' }));
      addEntry(input({ date: '2025-12-31' }));
      addEntry(input({ date: '2026-01-01' }));
      expect(getEarliestEntryDate()).toBe('2025-12-31');
    });
  });

  describe('getMonthStats', () => {
    it('그 달의 합계와 건수를 함께 돌려준다', () => {
      addEntry(input({ date: '2026-09-01', amount: 4500 }));
      addEntry(input({ date: '2026-09-30', amount: 5500 }));
      addEntry(input({ date: '2026-10-01', amount: 100000 }));
      expect(getMonthStats('2026-09')).toEqual({ total: 10000, count: 2 });
    });

    it('기록이 없는 달은 0원 0건이다', () => {
      addEntry(input({ date: '2026-09-15' }));
      expect(getMonthStats('2026-08')).toEqual({ total: 0, count: 0 });
    });
  });

  describe('getDailyTotals', () => {
    it('같은 날 기록을 합쳐 날짜 오름차순으로 돌려준다', () => {
      addEntry(input({ date: '2026-09-15', amount: 4500 }));
      addEntry(input({ date: '2026-09-15', amount: 3000 }));
      addEntry(input({ date: '2026-09-02', amount: 1000 }));
      expect(getDailyTotals('2026-09')).toEqual([
        { date: '2026-09-02', total: 1000 },
        { date: '2026-09-15', total: 7500 },
      ]);
    });

    it('다른 달 기록은 섞이지 않고, 기록 없는 달은 빈 배열이다', () => {
      addEntry(input({ date: '2026-08-31', amount: 1000 }));
      addEntry(input({ date: '2026-10-01', amount: 2000 }));
      expect(getDailyTotals('2026-09')).toEqual([]);
    });
  });

  describe('getCategoryTotals', () => {
    it('카테고리별로 합쳐 많은 순으로 돌려준다', () => {
      const coffee = categoryIdOf('커피');
      const taxi = categoryIdOf('택시');
      addEntry(input({ date: '2026-09-01', amount: 4500, categoryId: coffee }));
      addEntry(input({ date: '2026-09-02', amount: 4500, categoryId: coffee }));
      addEntry(input({ date: '2026-09-03', amount: 12000, categoryId: taxi }));
      expect(getCategoryTotals('2026-09')).toEqual([
        { categoryId: taxi, total: 12000 },
        { categoryId: coffee, total: 9000 },
      ]);
    });

    it('카테고리 없는 기록은 categoryId 가 null 인 한 줄로 묶인다', () => {
      addEntry(input({ date: '2026-09-01', amount: 1000, categoryId: null }));
      addEntry(input({ date: '2026-09-02', amount: 2000, categoryId: null }));
      expect(getCategoryTotals('2026-09')).toEqual([{ categoryId: null, total: 3000 }]);
    });

    it('지워진 카테고리 기록과 원래 미분류 기록이 NULL 한 줄로 합쳐진다', () => {
      const coffee = categoryIdOf('커피');
      addEntry(input({ date: '2026-09-01', amount: 4500, categoryId: coffee }));
      addEntry(input({ date: '2026-09-02', amount: 1000, categoryId: null }));
      getDb().runSync('DELETE FROM categories WHERE id = ?', [coffee]);
      expect(getCategoryTotals('2026-09')).toEqual([{ categoryId: null, total: 5500 }]);
    });

    it('기록 없는 달은 빈 배열이다', () => {
      addEntry(input({ date: '2026-08-31', amount: 1000, categoryId: categoryIdOf('커피') }));
      expect(getCategoryTotals('2026-09')).toEqual([]);
    });
  });

  describe('getMonthlyTotals (년 모드 월별 합계)', () => {
    it('같은 달 기록을 합쳐 월 오름차순으로, 기록 있는 달만 돌려준다', () => {
      addEntry(input({ date: '2026-09-15', amount: 4500 }));
      addEntry(input({ date: '2026-09-30', amount: 3000 }));
      addEntry(input({ date: '2026-01-02', amount: 1000 }));
      expect(getMonthlyTotals('2026')).toEqual([
        { month: '2026-01', total: 1000 },
        { month: '2026-09', total: 7500 },
      ]);
    });

    it('연도 경계: 작년 12/31 과 내년 1/1 은 섞이지 않고 1/1·12/31 은 포함된다', () => {
      addEntry(input({ date: '2025-12-31', amount: 100 }));
      addEntry(input({ date: '2026-01-01', amount: 1000 }));
      addEntry(input({ date: '2026-12-31', amount: 2000 }));
      addEntry(input({ date: '2027-01-01', amount: 200 }));
      expect(getMonthlyTotals('2026')).toEqual([
        { month: '2026-01', total: 1000 },
        { month: '2026-12', total: 2000 },
      ]);
    });

    it('기록 없는 해는 빈 배열이다', () => {
      addEntry(input({ date: '2025-06-01' }));
      expect(getMonthlyTotals('2026')).toEqual([]);
    });

    it('buildMonthlyBars 와 합치면 12칸이 되고 기록 없는 달은 0이다', () => {
      addEntry(input({ date: '2026-03-10', amount: 5000 }));
      const bars = buildMonthlyBars('2026', getMonthlyTotals('2026'));
      expect(bars).toHaveLength(12);
      expect(bars.map((b) => b.total)).toEqual([0, 0, 5000, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    });
  });

  describe('getStatsBetween / getCategoryTotalsBetween (기간 파라미터)', () => {
    it('한 해 구간의 합계·건수를 센다 (구간 밖은 빼고)', () => {
      addEntry(input({ date: '2026-01-01', amount: 1000 }));
      addEntry(input({ date: '2026-12-31', amount: 2000 }));
      addEntry(input({ date: '2027-01-01', amount: 50000 }));
      expect(getStatsBetween('2026-01-01', '2026-12-31')).toEqual({ total: 3000, count: 2 });
    });

    it('한 해 구간의 카테고리별 합계를 많은 순으로 센다', () => {
      const coffee = categoryIdOf('커피');
      const taxi = categoryIdOf('택시');
      addEntry(input({ date: '2026-01-05', amount: 4500, categoryId: coffee }));
      addEntry(input({ date: '2026-11-05', amount: 4500, categoryId: coffee }));
      addEntry(input({ date: '2026-06-05', amount: 12000, categoryId: taxi }));
      addEntry(input({ date: '2025-06-05', amount: 99000, categoryId: taxi }));
      expect(getCategoryTotalsBetween('2026-01-01', '2026-12-31')).toEqual([
        { categoryId: taxi, total: 12000 },
        { categoryId: coffee, total: 9000 },
      ]);
    });
  });

  describe('getMaxDailyTotal / getMaxMonthlyTotal', () => {
    it('기록이 없으면 둘 다 0이다', () => {
      expect(getMaxDailyTotal()).toBe(0);
      expect(getMaxMonthlyTotal()).toBe(0);
    });

    it('인자 없이 부르면 모든 날·모든 달을 센다', () => {
      addEntry(input({ date: '2026-09-01', amount: 4500 }));
      addEntry(input({ date: '2026-09-01', amount: 3000 })); // 같은 날 = 7500
      addEntry(input({ date: '2026-10-05', amount: 9000 }));
      expect(getMaxDailyTotal()).toBe(9000);
      expect(getMaxMonthlyTotal()).toBe(9000);
    });

    it('excludeDate 를 주면 그 날짜만 빼고 최고를 센다', () => {
      addEntry(input({ date: '2026-09-01', amount: 4500 }));
      addEntry(input({ date: '2026-09-10', amount: 20000 }));
      expect(getMaxDailyTotal('2026-09-10')).toBe(4500);
    });

    it('비교할 다른 날이 없으면 excludeDate 로 0이 된다 (첫 기록)', () => {
      addEntry(input({ date: '2026-09-01', amount: 4500 }));
      expect(getMaxDailyTotal('2026-09-01')).toBe(0);
    });

    it('excludeMonth 를 주면 그 달만 빼고 월 최고를 센다', () => {
      addEntry(input({ date: '2026-08-01', amount: 4500 }));
      addEntry(input({ date: '2026-09-01', amount: 30000 }));
      addEntry(input({ date: '2026-09-02', amount: 30000 }));
      expect(getMaxMonthlyTotal('2026-09')).toBe(4500);
      expect(getMaxMonthlyTotal('2026-08')).toBe(60000);
    });

    it('excludeDate 는 정확히 그 날짜만 뺀다 (다른 달 같은 일자는 그대로 센다)', () => {
      addEntry(input({ date: '2026-08-10', amount: 8000 }));
      addEntry(input({ date: '2026-09-10', amount: 20000 }));
      expect(getMaxDailyTotal('2026-09-10')).toBe(8000);
    });

    it('excludeMonth 는 정확히 그 달만 뺀다 (작년 같은 월은 그대로 센다)', () => {
      addEntry(input({ date: '2025-09-15', amount: 7000 }));
      addEntry(input({ date: '2026-09-15', amount: 30000 }));
      expect(getMaxMonthlyTotal('2026-09')).toBe(7000);
    });

    it('비교할 다른 달이 없으면 excludeMonth 로 0이 된다 (첫 달)', () => {
      addEntry(input({ date: '2026-09-01', amount: 4500 }));
      expect(getMaxMonthlyTotal('2026-09')).toBe(0);
    });
  });

  describe('카테고리 삭제', () => {
    it('카테고리를 지우면 그 카테고리를 쓰던 기록의 categoryId 가 NULL 이 된다', () => {
      const coffee = categoryIdOf('커피');
      const created = addEntry(input({ categoryId: coffee }));
      getDb().runSync('DELETE FROM categories WHERE id = ?', [coffee]);
      expect(getEntryById(created.id)?.categoryId).toBeNull();
    });

    it('카테고리를 지워도 기록 자체는 남는다', () => {
      const coffee = categoryIdOf('커피');
      addEntry(input({ categoryId: coffee, title: '아메리카노' }));
      getDb().runSync('DELETE FROM categories WHERE id = ?', [coffee]);
      expect(getEntriesBetween('2026-09-01', '2026-09-30')).toHaveLength(1);
    });

    it('다른 카테고리를 지워도 무관한 기록의 categoryId 는 그대로다', () => {
      const coffee = categoryIdOf('커피');
      const created = addEntry(input({ categoryId: coffee }));
      getDb().runSync('DELETE FROM categories WHERE id = ?', [categoryIdOf('택시')]);
      expect(getEntryById(created.id)?.categoryId).toBe(coffee);
    });

    it('다른 DB 를 따로 열고 닫아도, 기본 연결을 다시 열어도 foreign_keys PRAGMA 가 걸려 있다', () => {
      openDatabaseAt('savelog-restore.db').closeSync(); // 기본 연결은 건드리지 않는다
      resetDatabaseConnection();
      runMigrations(getDb()); // 다시 열면 PRAGMA 도 함께 걸려야 한다

      const coffee = categoryIdOf('커피');
      const created = addEntry(input({ categoryId: coffee }));
      getDb().runSync('DELETE FROM categories WHERE id = ?', [coffee]);
      expect(getEntryById(created.id)?.categoryId).toBeNull();
    });
  });

  describe('getEntryEmojisForMonth (M3.6 이모지 적립 줄)', () => {
    it('기록 날짜가 아니라 등록(created_at) 순서대로 이모지를 돌려준다', () => {
      const coffee = categoryIdOf('커피');
      const taxi = categoryIdOf('택시');
      // 같은 초에 넣으면 created_at 이 같으므로 순서를 확실히 하려고 직접 적는다
      const late = addEntry(input({ date: '2026-09-02', categoryId: coffee }));
      const early = addEntry(input({ date: '2026-09-20', categoryId: taxi }));
      getDb().runSync('UPDATE entries SET created_at = ? WHERE id = ?', ['2026-09-21T10:00:00+09:00', late.id]);
      getDb().runSync('UPDATE entries SET created_at = ? WHERE id = ?', ['2026-09-20T09:00:00+09:00', early.id]);
      expect(getEntryEmojisForMonth('2026-09')).toEqual([
        { id: early.id, emoji: '🚕' },
        { id: late.id, emoji: '☕' },
      ]);
    });

    it('created_at 이 같으면 먼저 넣은(id 작은) 기록이 앞이다', () => {
      const a = addEntry(input({ categoryId: categoryIdOf('커피') }));
      const b = addEntry(input({ categoryId: categoryIdOf('술') }));
      getDb().runSync('UPDATE entries SET created_at = ?', ['2026-09-15T12:00:00+09:00']);
      expect(getEntryEmojisForMonth('2026-09').map((e) => e.id)).toEqual([a.id, b.id]);
    });

    it('미분류(카테고리 없음)는 📦 로 채운다', () => {
      addEntry(input({ categoryId: null }));
      expect(UNCATEGORIZED_EMOJI).toBe('📦');
      expect(getEntryEmojisForMonth('2026-09').map((e) => e.emoji)).toEqual(['📦']);
    });

    it('다른 달 기록은 빼고, 기록 없는 달은 빈 배열이다', () => {
      addEntry(input({ date: '2026-08-31' }));
      addEntry(input({ date: '2026-10-01' }));
      expect(getEntryEmojisForMonth('2026-09')).toEqual([]);
    });
  });

  describe('settings (M3.5)', () => {
    it('없는 키는 null 이다', () => {
      expect(getSetting(SETTING_KEYS.monthlyGoal)).toBeNull();
    });

    it('setSetting 한 값을 getSetting 으로 그대로 읽는다', () => {
      setSetting(SETTING_KEYS.monthlyGoal, '300000');
      expect(getSetting(SETTING_KEYS.monthlyGoal)).toBe('300000');
    });

    it('같은 키에 다시 저장하면 덮어쓰고 행은 하나다', () => {
      setSetting(SETTING_KEYS.monthlyGoal, '300000');
      setSetting(SETTING_KEYS.monthlyGoal, '500000');
      expect(getSetting(SETTING_KEYS.monthlyGoal)).toBe('500000');
      expect(getDb().getFirstSync<{ n: number }>('SELECT COUNT(*) AS n FROM settings')?.n).toBe(1);
    });

    it('키끼리는 서로 영향을 주지 않는다', () => {
      setSetting(SETTING_KEYS.monthlyGoal, '300000');
      setSetting(SETTING_KEYS.goalReachedMonth, '2026-09');
      deleteSetting(SETTING_KEYS.goalReachedMonth);
      expect(getSetting(SETTING_KEYS.monthlyGoal)).toBe('300000');
      expect(getSetting(SETTING_KEYS.goalReachedMonth)).toBeNull();
    });

    it('deleteSetting 하면 null 이 되고, 없는 키를 지워도 에러가 없다', () => {
      setSetting(SETTING_KEYS.monthlyGoal, '300000');
      deleteSetting(SETTING_KEYS.monthlyGoal);
      expect(getSetting(SETTING_KEYS.monthlyGoal)).toBeNull();
      expect(() => deleteSetting(SETTING_KEYS.monthlyGoal)).not.toThrow();
    });

    it('키 상수는 PRD 의 이름 그대로다', () => {
      expect(SETTING_KEYS).toEqual({
        monthlyGoal: 'monthly_goal',
        goalReachedMonth: 'goal_reached_month',
        lastOpenDate: 'last_open_date',
        milestoneReached: 'milestone_reached',
        reviewDismissedMonth: 'review_dismissed_month',
        soundEnabled: 'sound_enabled',
        hapticsEnabled: 'haptics_enabled',
      });
    });
  });

  describe('getRecordedDates · getTotalSum (M4)', () => {
    it('기록 있는 날짜를 중복 없이 최신 날짜부터', () => {
      const now = today();
      addEntry(input({ date: addDays(now, -2) }));
      addEntry(input({ date: now }));
      addEntry(input({ date: now }));
      addEntry(input({ date: addDays(now, -1) }));
      expect(getRecordedDates()).toEqual([now, addDays(now, -1), addDays(now, -2)]);
    });

    it('sinceDays 보다 오래된 날짜는 빼고, 경계 날짜는 넣는다', () => {
      const now = today();
      addEntry(input({ date: addDays(now, -10) }));
      addEntry(input({ date: addDays(now, -11) }));
      expect(getRecordedDates(10)).toEqual([addDays(now, -10)]);
    });

    it('기록이 없으면 빈 목록 · 누적 0', () => {
      expect(getRecordedDates()).toEqual([]);
      expect(getTotalSum()).toBe(0);
    });

    it('누적은 날짜·달과 상관없이 전체 합계', () => {
      addEntry(input({ date: '2025-01-01', amount: 100000 }));
      addEntry(input({ date: '2026-09-15', amount: 4500 }));
      expect(getTotalSum()).toBe(104500);
    });
  });

  describe('getRecentTitles (M4 빠른 입력)', () => {
    /** 수정 시각을 직접 정한다 (nowIso 는 초 단위라 한 테스트 안에서는 모두 같은 값이 된다) */
    function touch(id: number, updatedAt: string) {
      getDb().runSync('UPDATE entries SET updated_at = ? WHERE id = ?', [updatedAt, id]);
    }

    it('기록이 없으면 빈 목록', () => {
      expect(getRecentTitles(5)).toEqual([]);
    });

    it('같은 항목명은 가장 최근 한 건의 카테고리·금액만 남는다', () => {
      const coffee = categoryIdOf('커피');
      const a = addEntry(input({ title: '아메리카노', amount: 4500, categoryId: coffee }));
      const b = addEntry(input({ title: '택시', amount: 12000, categoryId: categoryIdOf('택시') }));
      const c = addEntry(input({ title: '아메리카노', amount: 5000, categoryId: null }));
      touch(a.id, '2026-09-20T09:00:00+09:00');
      touch(b.id, '2026-09-21T09:00:00+09:00');
      touch(c.id, '2026-09-22T09:00:00+09:00');

      expect(getRecentTitles(5)).toEqual([
        { title: '아메리카노', categoryId: null, amount: 5000 },
        { title: '택시', categoryId: categoryIdOf('택시'), amount: 12000 },
      ]);
    });

    it('기록 날짜가 아니라 최근 등록·수정 순이다 (수정한 기록이 앞으로 온다)', () => {
      const old = addEntry(input({ date: '2026-01-01', title: '예전 것' }));
      const recent = addEntry(input({ date: '2026-09-20', title: '최근 것' }));
      touch(recent.id, '2026-09-20T09:00:00+09:00');
      touch(old.id, '2026-09-23T09:00:00+09:00');
      expect(getRecentTitles(5).map((r) => r.title)).toEqual(['예전 것', '최근 것']);
    });

    it('수정 시각이 같으면 나중에 넣은(id 가 큰) 기록이 앞이다', () => {
      addEntry(input({ title: '첫째' }));
      addEntry(input({ title: '둘째' }));
      getDb().runSync('UPDATE entries SET updated_at = ?', ['2026-09-20T09:00:00+09:00']);
      expect(getRecentTitles(5).map((r) => r.title)).toEqual(['둘째', '첫째']);
    });

    it('limit 개까지만 최근 순으로', () => {
      const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((t) => addEntry(input({ title: t })).id);
      ids.forEach((id, i) => touch(id, `2026-09-${String(10 + i).padStart(2, '0')}T09:00:00+09:00`));
      expect(getRecentTitles(5).map((r) => r.title)).toEqual(['g', 'f', 'e', 'd', 'c']);
      expect(getRecentTitles(3)).toHaveLength(3);
    });
  });
});
