import {
  addCategory,
  addEntry,
  CategoryNameTakenError,
  countEntriesInCategory,
  DefaultCategoryDeleteError,
  deleteAllData,
  deleteCategory,
  getAllCategories,
  getAllEntries,
  getAllSettings,
  getCategoryById,
  getDb,
  getEntryById,
  getSetting,
  importBackup,
  initDatabase,
  reorderCategories,
  resetDatabaseConnection,
  setSetting,
  SETTING_KEYS,
  updateCategory,
  type Category,
  type Entry,
  type EntryInput,
} from '@/src/db';
import { CURRENT_DEFAULT_CATEGORIES } from '@/src/db/migrations';
import { buildBackup, validateBackup, type ValidBackup } from '@/src/features/backup';
import { planMerge, planOverwrite } from '@/src/features/restore';

function input(over: Partial<EntryInput> = {}): EntryInput {
  return { date: '2026-09-15', title: '아메리카노', amount: 4500, categoryId: null, memo: null, ...over };
}

function idOf(name: string): number {
  const found = getAllCategories().find((c) => c.name === name);
  if (!found) throw new Error(`카테고리 ${name} 없음`);
  return found.id;
}

/** 지금 DB 를 JSON 으로 내보냈다가 다시 읽은 백업 (파일 왕복과 같다) */
function exportNow(): ValidBackup {
  const goal = getSetting(SETTING_KEYS.monthlyGoal);
  const backup = buildBackup(getAllCategories(), getAllEntries(), {
    monthlyGoal: goal === null ? null : Number(goal),
  });
  const result = validateBackup(JSON.parse(JSON.stringify(backup)));
  if (!result.ok) throw new Error(result.errors.join());
  return result.data;
}

/** id 를 뺀 비교용 모양: 카테고리는 이름으로 */
function comparableEntries(entries: Entry[], categories: Category[]) {
  const nameById = new Map(categories.map((c) => [c.id, c.name]));
  return entries.map(({ id: _id, categoryId, ...rest }) => ({
    ...rest,
    category: categoryId === null ? null : (nameById.get(categoryId) ?? '?'),
  }));
}

function comparableCategories(categories: Category[]) {
  return categories.map(({ id: _id, ...rest }) => rest);
}

/** 기본 카테고리 몇 개 + 사용자 카테고리 + 기록·목표가 있는 DB */
function seedRichData() {
  const store = addCategory({ name: '편의점', emoji: '🏪' });
  addEntry(input({ date: '2026-09-01', title: '아메리카노', categoryId: idOf('커피') }));
  addEntry(input({ date: '2026-09-02', title: '삼각김밥', amount: 1500, categoryId: store.id, memo: '점심, "대충"' }));
  addEntry(input({ date: '2026-08-31', title: '택시비', amount: 12000, categoryId: idOf('택시') }));
  addEntry(input({ date: '2026-09-03', title: '물', amount: 900 }));
  setSetting(SETTING_KEYS.monthlyGoal, '300000');
}

describe('백업 쿼리 (M5)', () => {
  beforeEach(() => {
    resetDatabaseConnection();
    initDatabase();
  });

  afterAll(() => {
    resetDatabaseConnection();
  });

  describe('getAllEntries · getAllSettings', () => {
    it('모든 기록을 날짜 → 등록 순으로', () => {
      addEntry(input({ date: '2026-09-02', title: 'B' }));
      addEntry(input({ date: '2026-08-01', title: 'A' }));
      addEntry(input({ date: '2026-09-02', title: 'C' }));
      expect(getAllEntries().map((e) => e.title)).toEqual(['A', 'B', 'C']);
    });

    it('settings 전체를 키 → 값으로', () => {
      setSetting(SETTING_KEYS.monthlyGoal, '300000');
      setSetting(SETTING_KEYS.soundEnabled, '0');
      expect(getAllSettings()).toEqual({ monthly_goal: '300000', sound_enabled: '0' });
    });
  });

  describe('CURRENT_DEFAULT_CATEGORIES', () => {
    it('새로 마이그레이션한 DB 의 기본 카테고리와 같다 (이름·이모지·순서)', () => {
      expect(getAllCategories().map((c) => ({ name: c.name, emoji: c.emoji }))).toEqual(
        CURRENT_DEFAULT_CATEGORIES,
      );
      expect(getAllCategories().every((c) => c.isDefault)).toBe(true);
    });
  });

  describe('importBackup — 왕복', () => {
    it('내보내기 → 빈 DB 에 덮어쓰기 복원 → 기록·카테고리·목표가 같다', () => {
      seedRichData();
      const beforeEntries = comparableEntries(getAllEntries(), getAllCategories());
      const beforeCategories = comparableCategories(getAllCategories());
      const backup = exportNow();

      resetDatabaseConnection();
      initDatabase();
      expect(getAllEntries()).toEqual([]);

      importBackup(planOverwrite(backup), 'overwrite');
      expect(comparableEntries(getAllEntries(), getAllCategories())).toEqual(beforeEntries);
      expect(comparableCategories(getAllCategories())).toEqual(beforeCategories);
      expect(getSetting(SETTING_KEYS.monthlyGoal)).toBe('300000');
    });

    it('내보내기 → 빈 DB 에 병합 복원 → 기록이 같고 카테고리는 이름으로 이어진다', () => {
      seedRichData();
      const beforeEntries = comparableEntries(getAllEntries(), getAllCategories());
      const backup = exportNow();

      resetDatabaseConnection();
      initDatabase();
      const plan = planMerge({ categories: getAllCategories(), entries: getAllEntries() }, backup);
      const result = importBackup(plan, 'merge');

      expect(result).toEqual({ categoriesAdded: 1, entriesAdded: 4 });
      expect(comparableEntries(getAllEntries(), getAllCategories())).toEqual(beforeEntries);
      // 새로 붙은 편의점은 기본 9개 뒤, 사용자 카테고리
      const store = getAllCategories().at(-1);
      expect(store).toMatchObject({ name: '편의점', sortOrder: 9, isDefault: false });
      // 병합은 목표를 건드리지 않는다
      expect(getSetting(SETTING_KEYS.monthlyGoal)).toBeNull();
    });

    it('같은 파일을 두 번 병합하면 두 번째는 전부 건너뛴다 (백업 created_at 을 그대로 넣어서)', () => {
      seedRichData();
      const backup = exportNow();
      const first = planMerge({ categories: getAllCategories(), entries: getAllEntries() }, backup);
      expect(first.entries).toHaveLength(0);
      expect(first.skippedDuplicates).toBe(4);

      resetDatabaseConnection();
      initDatabase();
      importBackup(planMerge({ categories: getAllCategories(), entries: [] }, backup), 'merge');
      const again = planMerge({ categories: getAllCategories(), entries: getAllEntries() }, backup);
      expect(again.entries).toHaveLength(0);
      expect(again.categories).toHaveLength(0);
      expect(getAllEntries()).toHaveLength(4);
    });

    it('병합 후 건수 = 기존 + 새 기록, 기존 카테고리 이모지·is_default 는 그대로', () => {
      addEntry(input({ title: '원래 있던 기록', categoryId: idOf('커피') }));
      const backup = validateBackup({
        app: 'savelog',
        version: 2,
        settings: { monthlyGoal: 100000 },
        categories: [
          { id: 1, name: '커피', emoji: '🥤', isDefault: false },
          { id: 2, name: '편의점', emoji: '🏪' },
        ],
        entries: [
          { date: '2026-09-20', title: '라떼', amount: 5000, categoryId: 1, createdAt: 'a' },
          { date: '2026-09-21', title: '컵라면', amount: 1800, categoryId: 2, createdAt: 'b' },
        ],
      }).data;
      if (!backup) throw new Error('검증 실패');

      importBackup(planMerge({ categories: getAllCategories(), entries: getAllEntries() }, backup), 'merge');
      expect(getAllEntries()).toHaveLength(3);
      expect(getCategoryById(idOf('커피'))).toMatchObject({ emoji: '☕', isDefault: true });
      const latte = getAllEntries().find((e) => e.title === '라떼');
      const ramen = getAllEntries().find((e) => e.title === '컵라면');
      expect(latte?.categoryId).toBe(idOf('커피'));
      expect(ramen?.categoryId).toBe(idOf('편의점'));
      expect(getSetting(SETTING_KEYS.monthlyGoal)).toBeNull();
    });

    it('덮어쓰기는 기존 기록·카테고리를 지우고, 기본 이름·파일의 isDefault 는 is_default=1, 기본은 늘 9개', () => {
      addEntry(input({ title: '지워질 기록' }));
      addCategory({ name: '지워질 카테고리', emoji: '🗑️' });
      setSetting(SETTING_KEYS.soundEnabled, '0');
      const backup = validateBackup({
        app: 'savelog',
        version: 2,
        settings: { monthlyGoal: null },
        categories: [
          { id: 5, name: '편의점', emoji: '🏪', sortOrder: 0, isDefault: true },
          { id: 6, name: '커피', emoji: '☕', sortOrder: 1, isDefault: false },
        ],
        entries: [{ date: '2026-09-20', title: '라떼', amount: 5000, categoryId: 6, createdAt: 'a' }],
      }).data;
      if (!backup) throw new Error('검증 실패');
      setSetting(SETTING_KEYS.monthlyGoal, '500000');
      setSetting(SETTING_KEYS.goalReachedMonth, '2026-09');

      importBackup(planOverwrite(backup), 'overwrite');
      expect(getAllEntries().map((e) => e.title)).toEqual(['라떼']);
      // 편의점은 파일에서 isDefault(이름 바꾼 기본)라 기본. 기본이 2개뿐이라 빠진 기본을 목록 순서로 9개까지만 채운다
      expect(getAllCategories().map((c) => [c.name, c.isDefault, c.sortOrder])).toEqual([
        ['편의점', true, 0],
        ['커피', true, 1],
        ...['밥값', '배달', '택시', '쇼핑', '술', '간식', '구독'].map((n, i) => [n, true, 2 + i]),
      ]);
      expect(getAllEntries()[0]?.categoryId).toBe(idOf('커피'));
      // 목표 없음으로 복원, 달성 축하 기록도 지움. 효과음 등 다른 설정은 그대로
      expect(getSetting(SETTING_KEYS.monthlyGoal)).toBeNull();
      expect(getSetting(SETTING_KEYS.goalReachedMonth)).toBeNull();
      expect(getSetting(SETTING_KEYS.soundEnabled)).toBe('0');
    });

    it('기본 이름을 바꾼 DB 를 내보내 덮어쓰면 그대로 돌아온다 (커피를 다시 채우지 않고 기타도 남음)', () => {
      updateCategory(idOf('커피'), { name: '카페', emoji: '🧋' });
      const before = comparableCategories(getAllCategories());
      const backup = exportNow();

      resetDatabaseConnection();
      initDatabase();
      importBackup(planOverwrite(backup), 'overwrite');
      expect(comparableCategories(getAllCategories())).toEqual(before);
      expect(getAllCategories().map((c) => c.name)).toContain('기타');
      expect(getAllCategories().map((c) => c.name)).not.toContain('커피');
    });

    it('version 1 덮어쓰기는 월 목표를 그대로 둔다', () => {
      setSetting(SETTING_KEYS.monthlyGoal, '500000');
      const v1 = validateBackup({ app: 'savelog', version: 1, categories: [], entries: [] }).data;
      if (!v1) throw new Error('검증 실패');
      importBackup(planOverwrite(v1), 'overwrite');
      expect(getSetting(SETTING_KEYS.monthlyGoal)).toBe('500000');
      // 카테고리 0개 백업이어도 기본 9개는 남는다
      expect(getAllCategories().filter((c) => c.isDefault)).toHaveLength(9);
    });

    it('중간에 실패하면 전부 롤백된다 (덮어쓰기에서 지운 것도 되살아남)', () => {
      seedRichData();
      const before = getAllEntries();
      const beforeCategories = getAllCategories();
      // 카테고리 이름이 겹쳐 두 번째 INSERT 가 UNIQUE 위반으로 실패하는 계획
      expect(() =>
        importBackup(
          {
            categories: [
              { name: '새것', emoji: '✨', sortOrder: 0, isDefault: false },
              { name: '새것', emoji: '✨', sortOrder: 1, isDefault: false },
            ],
            entries: [],
          },
          'overwrite',
        ),
      ).toThrow();
      expect(getAllEntries()).toEqual(before);
      expect(getAllCategories()).toEqual(beforeCategories);
    });

    it('계획에 규칙에 어긋난 기록이 있으면 아무것도 넣지 않고 던진다', () => {
      expect(() =>
        importBackup(
          {
            categories: [],
            entries: [
              {
                date: '2026-09-01',
                title: '',
                amount: 100,
                categoryName: null,
                memo: null,
                createdAt: 'a',
                updatedAt: 'a',
              },
            ],
          },
          'merge',
        ),
      ).toThrow('항목명이 비어 있습니다');
      expect(getAllEntries()).toEqual([]);
    });
  });

  describe('카테고리 관리', () => {
    it('addCategory 는 맨 뒤(sort_order = 최대 + 1)에 사용자 카테고리로, 앞뒤 공백은 걷는다', () => {
      const added = addCategory({ name: ' 편의점 ', emoji: ' 🏪 ' });
      expect(added).toMatchObject({ name: '편의점', emoji: '🏪', sortOrder: 9, isDefault: false });
      expect(getAllCategories().at(-1)?.name).toBe('편의점');
    });

    it('이름이 겹치면 CategoryNameTakenError (추가·수정 모두, 자기 이름 그대로 저장은 허용)', () => {
      expect(() => addCategory({ name: '커피', emoji: '🥤' })).toThrow(CategoryNameTakenError);
      const store = addCategory({ name: '편의점', emoji: '🏪' });
      expect(() => updateCategory(store.id, { name: '택시', emoji: '🏪' })).toThrow(CategoryNameTakenError);
      expect(updateCategory(store.id, { name: '편의점', emoji: '🥤' })).toMatchObject({ emoji: '🥤' });
    });

    it('updateCategory 는 기본 카테고리도 이름·이모지를 바꾸고 is_default 는 유지한다', () => {
      const coffee = idOf('커피');
      expect(updateCategory(coffee, { name: '카페', emoji: '🧋' })).toMatchObject({
        id: coffee,
        name: '카페',
        emoji: '🧋',
        isDefault: true,
      });
    });

    it('빈 이름·이모지는 던진다', () => {
      expect(() => addCategory({ name: ' ', emoji: '☕' })).toThrow('이름이 비어');
      expect(() => addCategory({ name: '물', emoji: '' })).toThrow('이모지가 비어');
    });

    it('기본 카테고리는 삭제할 수 없다', () => {
      expect(() => deleteCategory(idOf('커피'))).toThrow(DefaultCategoryDeleteError);
      expect(getAllCategories()).toHaveLength(9);
    });

    it('사용 중인 카테고리: 건수를 세고, 지우면 그 기록은 미분류(NULL)로 남는다', () => {
      const store = addCategory({ name: '편의점', emoji: '🏪' });
      const a = addEntry(input({ categoryId: store.id }));
      const b = addEntry(input({ title: '컵라면', categoryId: store.id }));
      addEntry(input({ title: '다른 것', categoryId: idOf('커피') }));
      expect(countEntriesInCategory(store.id)).toBe(2);

      expect(deleteCategory(store.id)).toBe(1);
      expect(getCategoryById(store.id)).toBeNull();
      expect(getEntryById(a.id)?.categoryId).toBeNull();
      expect(getEntryById(b.id)?.categoryId).toBeNull();
      expect(getAllEntries()).toHaveLength(3);
    });

    it('외래 키 PRAGMA 가 꺼진 연결에서도 기록이 미분류로 남는다 (직접 비워서)', () => {
      getDb().execSync('PRAGMA foreign_keys = OFF;');
      const store = addCategory({ name: '편의점', emoji: '🏪' });
      const a = addEntry(input({ categoryId: store.id }));
      deleteCategory(store.id);
      expect(getEntryById(a.id)?.categoryId).toBeNull();
    });

    it('없는 id 삭제는 0', () => {
      expect(deleteCategory(9999)).toBe(0);
    });

    it('reorderCategories 는 받은 순서대로 0부터, 빠진 것은 뒤에 기존 순서대로', () => {
      const ids = getAllCategories().map((c) => c.id);
      const [first, second, ...rest] = ids;
      reorderCategories([second as number, first as number]);
      expect(getAllCategories().map((c) => c.id)).toEqual([second, first, ...rest]);
      expect(getAllCategories().map((c) => c.sortOrder)).toEqual(ids.map((_, i) => i));
    });
  });

  describe('deleteAllData', () => {
    it('기록·설정을 모두 지우고 카테고리는 기본 9개(이름·이모지·순서 초기화)로', () => {
      seedRichData();
      setSetting(SETTING_KEYS.soundEnabled, '0');
      updateCategory(idOf('커피'), { name: '카페', emoji: '🧋' });
      reorderCategories([idOf('기타')]);

      deleteAllData();
      expect(getAllEntries()).toEqual([]);
      expect(getAllSettings()).toEqual({});
      expect(getAllCategories().map((c) => ({ name: c.name, emoji: c.emoji }))).toEqual(
        CURRENT_DEFAULT_CATEGORIES,
      );
      expect(getAllCategories().map((c) => c.sortOrder)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
      expect(getAllCategories().every((c) => c.isDefault)).toBe(true);
    });
  });
});
