import {
  addEntry,
  deleteEntry,
  getAllCategories,
  getDb,
  getEarliestEntryDate,
  getEntriesBetween,
  getEntryById,
  getSumBetween,
  getSumByDate,
  initDatabase,
  resetDatabaseConnection,
  updateEntry,
  type EntryInput,
} from '@/src/db';

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
  });
});
