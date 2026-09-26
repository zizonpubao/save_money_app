import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { Alert, Appearance, type AlertButton } from 'react-native';

import type * as FileSystemMock from '@/__mocks__/expo-file-system';
import type * as PickerMock from '@/__mocks__/expo-document-picker';
import {
  addCategory,
  addEntry,
  getAllCategories,
  getAllEntries,
  getAllSettings,
  getSetting,
  initDatabase,
  resetDatabaseConnection,
  setSetting,
  SETTING_KEYS,
  type EntryInput,
} from '@/src/db';
import { getDb } from '@/src/db';
import { CURRENT_DEFAULT_CATEGORIES } from '@/src/db/migrations';
import {
  confirmDeleteAll,
  exportCsv,
  exportJson,
  startRestore,
} from '@/src/features/backupActions';
import { useCategoryStore } from '@/src/store/categoryStore';
import { useEntryStore } from '@/src/store/entryStore';
import { useSettingsStore } from '@/src/store/settingsStore';
import { thisMonth, today } from '@/src/utils/date';

const { mockFiles, mockFileSystemState } = jest.requireMock<typeof FileSystemMock>('expo-file-system');
const { mockPickFile } = jest.requireMock<typeof PickerMock>('expo-document-picker');

const alertSpy = jest.spyOn(Alert, 'alert');

type AlertCall = { title: string; message?: string; buttons: AlertButton[] };

function alerts(): AlertCall[] {
  return alertSpy.mock.calls.map(([title, message, buttons]) => ({
    title,
    message,
    buttons: buttons ?? [],
  }));
}

function lastAlert(): AlertCall {
  const all = alerts();
  const last = all[all.length - 1];
  if (!last) throw new Error('알림이 없습니다');
  return last;
}

/** 마지막 알림의 버튼을 누른다 */
async function press(text: string): Promise<void> {
  const button = lastAlert().buttons.find((b) => b.text === text);
  if (!button) throw new Error(`"${text}" 버튼이 없습니다 (${lastAlert().title})`);
  // 취소처럼 onPress 가 없는 버튼은 알림만 닫는다
  button.onPress?.();
  // 버튼이 비동기(공유 시트)를 부르면 한 번 넘긴다
  await Promise.resolve();
  await Promise.resolve();
}

function input(over: Partial<EntryInput> = {}): EntryInput {
  return { date: '2026-09-15', title: '아메리카노', amount: 4500, categoryId: null, memo: null, ...over };
}

function seed() {
  const store = addCategory({ name: '편의점', emoji: '🏪' });
  addEntry(input({ title: '아메리카노', categoryId: getAllCategories()[0]?.id ?? null }));
  addEntry(input({ title: '삼각김밥', amount: 1500, categoryId: store.id, memo: '점심' }));
  setSetting(SETTING_KEYS.monthlyGoal, '300000');
}

/** 내보낸 백업 파일 주소 (공유 시트에 넘긴 것) */
function sharedUri(): string {
  const call = jest.mocked(Sharing.shareAsync).mock.calls.at(-1);
  if (!call) throw new Error('공유하지 않았습니다');
  return call[0];
}

function comparable() {
  const names = new Map(getAllCategories().map((c) => [c.id, c.name]));
  return {
    entries: getAllEntries().map(({ id: _id, categoryId, ...rest }) => ({
      ...rest,
      category: categoryId === null ? null : names.get(categoryId),
    })),
    categories: getAllCategories().map(({ id: _id, ...rest }) => rest),
  };
}

describe('백업 동작 (M5)', () => {
  beforeEach(() => {
    resetDatabaseConnection();
    initDatabase();
    mockFiles.clear();
    mockFileSystemState.failWrites = false;
    alertSpy.mockClear();
    alertSpy.mockImplementation(() => undefined);
    jest.mocked(Sharing.shareAsync).mockClear();
    jest.mocked(Sharing.isAvailableAsync).mockClear();
    jest.mocked(Sharing.isAvailableAsync).mockImplementation(() => Promise.resolve(true));
    jest.mocked(DocumentPicker.getDocumentAsync).mockClear();
    useCategoryStore.setState({ categories: [], loaded: false });
    useSettingsStore.setState({ monthlyGoal: null, loaded: false });
  });

  afterAll(() => {
    alertSpy.mockRestore();
    resetDatabaseConnection();
  });

  describe('JSON 내보내기', () => {
    it('캐시에 savelog-backup-오늘.json 을 쓰고 공유 시트(public.json)를 연다', async () => {
      seed();
      await exportJson();
      const uri = `file:///cache/savelog-backup-${today()}.json`;
      expect(Sharing.shareAsync).toHaveBeenCalledWith(uri, {
        mimeType: 'application/json',
        UTI: 'public.json',
        dialogTitle: 'SaveLog 백업 내보내기',
      });
      const json = JSON.parse(mockFiles.get(uri) ?? '') as Record<string, unknown>;
      expect(json).toMatchObject({ app: 'savelog', version: 2, settings: { monthlyGoal: 300000 } });
      expect(json.entries).toHaveLength(2);
      expect(json.categories).toHaveLength(10);
      expect(alertSpy).not.toHaveBeenCalled();
    });

    it('테마는 기기 설정이라 백업 JSON 에 넣지 않는다', async () => {
      setSetting(SETTING_KEYS.themeMode, 'dark');
      await exportJson();
      const text = mockFiles.get(`file:///cache/savelog-backup-${today()}.json`) ?? '';
      expect(JSON.parse(text)).toMatchObject({ settings: { monthlyGoal: null } });
      expect(text).not.toContain('dark');
      expect(text).not.toContain('theme');
    });

    it('공유를 못 하는 기기면 알림', async () => {
      jest.mocked(Sharing.isAvailableAsync).mockImplementation(() => Promise.resolve(false));
      await exportJson();
      expect(Sharing.shareAsync).not.toHaveBeenCalled();
      expect(lastAlert().title).toBe('공유할 수 없습니다');
    });

    it('파일을 못 쓰면 "내보내기 실패"', async () => {
      mockFileSystemState.failWrites = true;
      await exportJson();
      expect(lastAlert().title).toBe('내보내기 실패');
    });
  });

  describe('CSV 내보내기', () => {
    it('캐시에 savelog-오늘.csv (BOM + 헤더 + 기록) 를 쓰고 공유 시트(CSV)를 연다', async () => {
      seed();
      await exportCsv();
      const uri = `file:///cache/savelog-${today()}.csv`;
      expect(Sharing.shareAsync).toHaveBeenCalledWith(
        uri,
        expect.objectContaining({ mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' }),
      );
      const csv = mockFiles.get(uri) ?? '';
      expect(csv.startsWith('\uFEFF날짜,항목,금액,카테고리,메모,생성시각\r\n')).toBe(true);
      expect(csv).toContain('2026-09-15,삼각김밥,1500,편의점,점심,');
    });
  });

  describe('복원', () => {
    it('파일 선택을 취소하면 아무 일 없다', async () => {
      await startRestore();
      expect(DocumentPicker.getDocumentAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.arrayContaining(['application/json', 'text/plain']),
          copyToCacheDirectory: true,
        }),
      );
      expect(alertSpy).not.toHaveBeenCalled();
    });

    it('JSON 이 아니거나 SaveLog 백업이 아니면 거부 알림, DB 는 그대로', async () => {
      mockFiles.set('file:///picked/a.json', '{ 깨진');
      mockPickFile('file:///picked/a.json');
      await startRestore();
      expect(lastAlert()).toMatchObject({ title: '복원할 수 없습니다', message: 'JSON 형식이 아닌 파일입니다.' });

      mockFiles.set('file:///picked/b.json', JSON.stringify({ app: 'other', version: 2, categories: [], entries: [] }));
      mockPickFile('file:///picked/b.json');
      await startRestore();
      expect(lastAlert()).toMatchObject({ title: '복원할 수 없습니다', message: 'SaveLog 백업 파일이 아닙니다' });
      expect(getAllCategories()).toHaveLength(9);
    });

    it('요약 알림: 건수 + 건너뜀, 버튼은 취소 · 병합 · 덮어쓰기 (확장자가 .json 이 아니어도 내용으로 판정)', async () => {
      mockFiles.set(
        'file:///picked/c.txt',
        JSON.stringify({
          app: 'savelog',
          version: 2,
          settings: { monthlyGoal: null },
          categories: [{ id: 1, name: '커피', emoji: '☕' }],
          entries: [
            { date: '2026-09-01', title: '라떼', amount: 5000, categoryId: 1, createdAt: 'a' },
            { date: '2026-09-32', title: '틀린 날', amount: 5000, createdAt: 'b' },
            { date: '2026-09-01', title: '', amount: 5000, createdAt: 'c' },
          ],
        }),
      );
      mockPickFile('file:///picked/c.txt');
      await startRestore();
      expect(lastAlert().title).toBe('백업 복원');
      expect(lastAlert().message).toContain('기록 1건, 카테고리 1개. 건너뜀 2건');
      expect(lastAlert().buttons.map((b) => b.text)).toEqual(['취소', '병합', '덮어쓰기']);

      await press('취소');
      expect(getAllEntries()).toEqual([]);
    });

    it('왕복: 내보내기 → 데이터 전체 삭제 → 그 파일로 덮어쓰기 → 원래와 같고 스토어도 갱신', async () => {
      seed();
      const before = comparable();
      await exportJson();
      const backupUri = sharedUri();

      confirmDeleteAll();
      await press('삭제 계속');
      await press('정말 삭제');
      expect(getAllEntries()).toEqual([]);

      mockPickFile(backupUri);
      await startRestore();
      await press('덮어쓰기');
      expect(lastAlert().title).toBe('정말 덮어쓸까요?');
      await press('덮어쓰기');

      expect(comparable()).toEqual(before);
      expect(getSetting(SETTING_KEYS.monthlyGoal)).toBe('300000');
      expect(lastAlert().title).toBe('덮어쓰기 완료');
      // 홈 카드·칩·목표가 바로 새 값
      expect(useEntryStore.getState().entries.map((e) => e.title).sort()).toEqual(['삼각김밥', '아메리카노']);
      expect(useCategoryStore.getState().categories.map((c) => c.name)).toContain('편의점');
      expect(useSettingsStore.getState().monthlyGoal).toBe(300000);
    });

    it('덮어쓰기는 지우기 전에 지금 데이터를 자동 백업하고, 완료 알림에 그 경로를 알린다', async () => {
      seed();
      mockFiles.set(
        'file:///picked/d.json',
        JSON.stringify({ app: 'savelog', version: 2, settings: { monthlyGoal: null }, categories: [], entries: [] }),
      );
      mockPickFile('file:///picked/d.json');
      await startRestore();
      await press('덮어쓰기');
      // 2단계 확인 전에는 아직 자동 백업도 없다
      expect([...mockFiles.keys()].some((k) => k.includes('autobackup'))).toBe(false);
      await press('덮어쓰기');

      const autoUri = [...mockFiles.keys()].find((k) => k.includes('savelog-autobackup-'));
      expect(autoUri).toMatch(/^file:\/\/\/document\/savelog-autobackup-\d{4}-\d{2}-\d{2}-\d{6}\.json$/);
      // 자동 백업에는 덮어쓰기 전 데이터가 들어 있다
      const auto = JSON.parse(mockFiles.get(autoUri ?? '') ?? '') as { entries: unknown[] };
      expect(auto.entries).toHaveLength(2);
      expect(lastAlert().message).toContain(autoUri);
      expect(getAllEntries()).toEqual([]);

      // 완료 알림에서 자동 백업을 바로 공유할 수 있다
      await press('자동 백업 공유');
      expect(sharedUri()).toBe(autoUri);
    });

    it('자동 백업을 못 쓰면 덮어쓰기를 멈추고 아무것도 지우지 않는다', async () => {
      seed();
      mockFiles.set(
        'file:///picked/e.json',
        JSON.stringify({ app: 'savelog', version: 2, categories: [], entries: [] }),
      );
      mockPickFile('file:///picked/e.json');
      await startRestore();
      await press('덮어쓰기');
      mockFileSystemState.failWrites = true;
      await press('덮어쓰기');
      expect(lastAlert().title).toBe('자동 백업 실패');
      expect(getAllEntries()).toHaveLength(2);
      expect(getAllCategories()).toHaveLength(10);
    });

    it('병합: 없는 기록만 더하고 결과 알림, 목표는 그대로', async () => {
      seed();
      await exportJson();
      const backupUri = sharedUri();
      addEntry(input({ title: '백업 뒤 기록' }));

      mockPickFile(backupUri);
      await startRestore();
      await press('병합');
      expect(lastAlert()).toMatchObject({
        title: '병합 완료',
        message: '기록 0건, 카테고리 0개를 추가했습니다.\n이미 있는 기록 2건은 건너뛰었습니다.',
      });
      expect(getAllEntries()).toHaveLength(3);
    });

    it('복원 쿼리가 실패하면 "복원 실패" 알림', async () => {
      // 기록 INSERT 를 막는 트리거로 트랜잭션 중간 실패를 만든다
      getDb().execSync(
        "CREATE TRIGGER fail_insert BEFORE INSERT ON entries BEGIN SELECT RAISE(ABORT, 'DB 오류'); END;",
      );
      addCategory({ name: '남아야 할 것', emoji: '✅' });
      mockFiles.set(
        'file:///picked/f.json',
        JSON.stringify({
          app: 'savelog',
          version: 2,
          categories: [{ id: 1, name: '새 카테고리', emoji: '✨' }],
          entries: [{ date: '2026-09-01', title: '라떼', amount: 5000, categoryId: 1, createdAt: 'a' }],
        }),
      );
      mockPickFile('file:///picked/f.json');
      await startRestore();
      await press('병합');
      expect(lastAlert().title).toBe('복원 실패');
      // 롤백: 먼저 넣은 카테고리도 남지 않는다
      expect(getAllCategories().map((c) => c.name)).not.toContain('새 카테고리');
      expect(getAllCategories().map((c) => c.name)).toContain('남아야 할 것');
    });
  });

  describe('데이터 전체 삭제', () => {
    it('1단계는 백업 권장 + 백업하기 버튼, 2단계는 빨간 "정말 삭제"', async () => {
      confirmDeleteAll();
      expect(lastAlert().message).toContain('먼저 백업하는 것을 권장합니다');
      expect(lastAlert().buttons.map((b) => b.text)).toEqual(['취소', '백업하기', '삭제 계속']);
      await press('삭제 계속');
      expect(lastAlert().title).toBe('정말 삭제할까요?');
      const final = lastAlert().buttons.find((b) => b.text === '정말 삭제');
      expect(final?.style).toBe('destructive');
    });

    it('"백업하기" 는 JSON 내보내기를 하고 삭제하지 않는다', async () => {
      seed();
      confirmDeleteAll();
      await press('백업하기');
      await Promise.resolve();
      expect(Sharing.shareAsync).toHaveBeenCalledTimes(1);
      expect(getAllEntries()).toHaveLength(2);
    });

    it('삭제하면 기록·설정이 없고 카테고리는 기본 9개, 스토어도 비워진다', async () => {
      seed();
      useEntryStore.setState({ oldestMonth: '2020-01', lastRecord: 'day' });
      useSettingsStore.setState({ monthlyGoal: 300000, loaded: true });
      confirmDeleteAll();
      await press('삭제 계속');
      await press('정말 삭제');

      expect(getAllEntries()).toEqual([]);
      expect(getAllSettings()).toEqual({});
      expect(getAllCategories().map((c) => c.name)).toEqual(CURRENT_DEFAULT_CATEGORIES.map((c) => c.name));
      expect(useEntryStore.getState()).toMatchObject({
        entries: [],
        monthTotal: 0,
        oldestMonth: thisMonth(),
        lastRecord: null,
      });
      expect(useSettingsStore.getState().monthlyGoal).toBeNull();
      expect(useCategoryStore.getState().categories).toHaveLength(9);
      expect(lastAlert().title).toBe('삭제 완료');
    });

    it('삭제하면 테마가 시스템으로 돌아가고 바로 적용된다', async () => {
      const appearanceSpy = jest.spyOn(Appearance, 'setColorScheme');
      useSettingsStore.getState().setThemeMode('dark');
      expect(getSetting(SETTING_KEYS.themeMode)).toBe('dark');
      appearanceSpy.mockClear();

      confirmDeleteAll();
      await press('삭제 계속');
      await press('정말 삭제');

      expect(getSetting(SETTING_KEYS.themeMode)).toBeNull();
      expect(useSettingsStore.getState().themeMode).toBe('system');
      expect(appearanceSpy).toHaveBeenLastCalledWith('unspecified');
      appearanceSpy.mockRestore();
    });
  });
});
