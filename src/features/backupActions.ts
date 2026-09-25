import { Alert } from 'react-native';

import {
  deleteAllData,
  getAllCategories,
  getAllEntries,
  getAllSettings,
  importBackup,
  SETTING_KEYS,
} from '@/src/db';
import { useCategoryStore } from '@/src/store/categoryStore';
import { useEntryStore } from '@/src/store/entryStore';
import { useSettingsStore } from '@/src/store/settingsStore';
import { fileTimestamp, thisMonth, today } from '@/src/utils/date';

import {
  autoBackupFileName,
  backupFileName,
  buildBackup,
  restoreSummary,
  validateBackup,
  type BackupV2,
  type ValidBackup,
} from './backup';
import {
  CSV_SHARE,
  JSON_SHARE,
  pickJsonText,
  shareFile,
  writeCacheFile,
  writeTextFile,
  type ShareKind,
} from './backupFile';
import { buildCsv, csvFileName } from './csv';
import { parseGoal } from './goal';
import { mergeResultMessage, planMerge, planOverwrite } from './restore';

/**
 * (M5) 설정 탭 "백업" · "앱 정보" 구획의 동작. 알림(Alert) 흐름과 파일 입출력을 이어 붙이기만 하고,
 * 내용 만들기·검증·계획은 순수 함수에, SQL 은 queries.ts 에 있다.
 */

const TRY_AGAIN = '잠시 후 다시 시도해 주세요.';

/** 지금 DB 전체를 백업 객체로 */
export function snapshotBackup(): BackupV2 {
  const goal = parseGoal(getAllSettings()[SETTING_KEYS.monthlyGoal] ?? null);
  return buildBackup(getAllCategories(), getAllEntries(), { monthlyGoal: goal });
}

/**
 * 지금 DB 전체를 JSON 파일로 쓰고 주소를 돌려준다. 내보내기(cache)와 덮어쓰기 전 자동 백업(document)이 같이 쓴다
 */
export function writeBackupFile(name: string, dir: 'cache' | 'document' = 'cache'): string {
  return writeTextFile(dir, name, JSON.stringify(snapshotBackup(), null, 2));
}

/** 복원·삭제 뒤 홈 카드·목록·카테고리 칩·목표가 바로 새 DB 를 보게 한다 */
export function refreshAllStores(): void {
  useCategoryStore.getState().reload();
  useSettingsStore.getState().load();
  useEntryStore.getState().reload();
}

async function share(uri: string, kind: ShareKind): Promise<void> {
  if (!(await shareFile(uri, kind))) {
    Alert.alert('공유할 수 없습니다', '이 기기에서는 공유 시트를 열 수 없습니다.');
  }
}

/** "JSON 으로 내보내기": 캐시에 savelog-backup-YYYY-MM-DD.json → 공유 시트 */
export async function exportJson(): Promise<void> {
  try {
    await share(writeBackupFile(backupFileName(today())), JSON_SHARE);
  } catch {
    Alert.alert('내보내기 실패', TRY_AGAIN);
  }
}

/** "CSV 로 내보내기": 캐시에 savelog-YYYY-MM-DD.csv → 공유 시트 */
export async function exportCsv(): Promise<void> {
  try {
    const uri = writeCacheFile(csvFileName(today()), buildCsv(getAllEntries(), getAllCategories()));
    await share(uri, CSV_SHARE);
  } catch {
    Alert.alert('내보내기 실패', TRY_AGAIN);
  }
}

/** 병합: 이름으로 카테고리를 맞추고 같은 기록은 건너뛰며 더한다 */
export function runMerge(data: ValidBackup): void {
  const plan = planMerge({ categories: getAllCategories(), entries: getAllEntries() }, data);
  try {
    importBackup(plan, 'merge');
  } catch {
    Alert.alert('복원 실패', `바뀐 것은 없습니다. ${TRY_AGAIN}`);
    return;
  }
  refreshAllStores();
  Alert.alert('병합 완료', mergeResultMessage(plan));
}

/**
 * 덮어쓰기: 먼저 지금 데이터를 자동 백업(앱 문서 폴더 — 캐시는 OS 가 지울 수 있다)하고, 그게 성공해야 지우고 채운다.
 * 자동 백업을 못 쓰면 아무것도 지우지 않고 멈춘다 (데이터 안전 규칙: 삭제 전 백업)
 */
export function runOverwrite(data: ValidBackup): void {
  let autoUri: string;
  try {
    autoUri = writeBackupFile(autoBackupFileName(fileTimestamp()), 'document');
  } catch {
    Alert.alert('자동 백업 실패', '지금 데이터를 백업하지 못해 덮어쓰기를 멈췄습니다. 바뀐 것은 없습니다.');
    return;
  }
  try {
    importBackup(planOverwrite(data), 'overwrite');
  } catch {
    Alert.alert('복원 실패', `바뀐 것은 없습니다. ${TRY_AGAIN}`);
    return;
  }
  refreshAllStores();
  Alert.alert(
    '덮어쓰기 완료',
    `${restoreSummary(data)}\n\n덮어쓰기 전 데이터는 자동 백업했습니다.\n${autoUri}`,
    [
      { text: '확인', style: 'cancel' },
      { text: '자동 백업 공유', onPress: () => void share(autoUri, JSON_SHARE) },
    ],
  );
}

/** 덮어쓰기 2단계 확인 */
function confirmOverwrite(data: ValidBackup): void {
  const count = getAllEntries().length;
  Alert.alert(
    '정말 덮어쓸까요?',
    `지금 기록 ${count}건과 카테고리를 모두 지우고 백업 내용으로 바꿉니다. 지우기 전에 지금 데이터를 자동으로 백업합니다.`,
    [
      { text: '취소', style: 'cancel' },
      { text: '덮어쓰기', style: 'destructive', onPress: () => runOverwrite(data) },
    ],
  );
}

/** "JSON 에서 복원": 파일 선택 → 파싱 → 검증 → 요약 + 병합 / 덮어쓰기 / 취소 */
export async function startRestore(): Promise<void> {
  let text: string | null;
  try {
    text = await pickJsonText();
  } catch {
    Alert.alert('파일을 열 수 없습니다', TRY_AGAIN);
    return;
  }
  if (text === null) return;

  let raw: unknown;
  try {
    raw = JSON.parse(text) as unknown;
  } catch {
    Alert.alert('복원할 수 없습니다', 'JSON 형식이 아닌 파일입니다.');
    return;
  }
  const result = validateBackup(raw);
  if (!result.ok) {
    Alert.alert('복원할 수 없습니다', result.errors[0] ?? 'SaveLog 백업 파일이 아닙니다');
    return;
  }
  const data = result.data;
  Alert.alert(
    '백업 복원',
    `${restoreSummary(data)}\n\n병합: 지금 데이터에 없는 기록만 더합니다.\n덮어쓰기: 지금 데이터를 지우고 백업으로 바꿉니다.`,
    [
      { text: '취소', style: 'cancel' },
      { text: '병합', onPress: () => runMerge(data) },
      { text: '덮어쓰기', style: 'destructive', onPress: () => confirmOverwrite(data) },
    ],
  );
}

/** 전체 삭제 뒤 스토어를 처음 상태로: 홈 목록 범위·축하 문구를 되돌리고 새 DB 로 다시 읽는다 */
function resetStoresAfterDeleteAll(): void {
  useEntryStore.setState({
    oldestMonth: thisMonth(),
    lastRecord: null,
    lastGoalReached: false,
    lastMilestone: null,
  });
  refreshAllStores();
}

export function runDeleteAll(): void {
  try {
    deleteAllData();
  } catch {
    Alert.alert('삭제 실패', `바뀐 것은 없습니다. ${TRY_AGAIN}`);
    return;
  }
  resetStoresAfterDeleteAll();
  Alert.alert('삭제 완료', '모든 기록과 설정을 지웠습니다.');
}

/** "데이터 전체 삭제": 1단계(백업 권장 + 백업하기) → 2단계(빨간 "정말 삭제") */
export function confirmDeleteAll(): void {
  Alert.alert(
    '데이터 전체 삭제',
    '모든 기록과 설정을 지우고 카테고리를 기본으로 되돌립니다. 먼저 백업하는 것을 권장합니다.',
    [
      { text: '취소', style: 'cancel' },
      { text: '백업하기', onPress: () => void exportJson() },
      {
        text: '삭제 계속',
        style: 'destructive',
        onPress: () =>
          Alert.alert('정말 삭제할까요?', '지운 데이터는 되돌릴 수 없습니다.', [
            { text: '취소', style: 'cancel' },
            { text: '정말 삭제', style: 'destructive', onPress: runDeleteAll },
          ]),
      },
    ],
  );
}
