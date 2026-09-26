import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

/**
 * (M5) 기기 파일 입출력만 모은 곳. 백업 내용 만들기·검증은 순수 함수(backup.ts · csv.ts · restore.ts)라
 * 네이티브 모듈 없이 테스트하고, 여기만 jest 에서 대역(__mocks__)으로 바꾼다.
 * expo-file-system 은 SDK 54+ 의 새 File/Paths API 를 쓴다 (legacy 아님).
 */

export type ShareKind = {
  mimeType: string;
  /** iOS 공유 시트가 파일 종류를 알아보게 하는 형식 이름 */
  UTI: string;
  dialogTitle: string;
};

export const JSON_SHARE: ShareKind = {
  mimeType: 'application/json',
  UTI: 'public.json',
  dialogTitle: 'SaveLog 백업 내보내기',
};

export const CSV_SHARE: ShareKind = {
  mimeType: 'text/csv',
  UTI: 'public.comma-separated-values-text',
  dialogTitle: 'SaveLog CSV 내보내기',
};

/**
 * 텍스트 파일을 (있으면 덮어써서) 쓰고 file:// 주소를 돌려준다.
 * cache: 공유 시트로 넘기고 끝나는 내보내기용 (OS 가 지워도 됨)
 * document: 덮어쓰기 전 자동 백업처럼 남아 있어야 하는 것 (cache 는 저장 공간이 모자라면 OS 가 지운다)
 */
export function writeTextFile(dir: 'cache' | 'document', name: string, content: string): string {
  const file = new File(dir === 'cache' ? Paths.cache : Paths.document, name);
  file.create({ overwrite: true });
  file.write(content);
  return file.uri;
}

/** 캐시 디렉터리에 텍스트 파일을 쓴다 (내보내기용 임시 파일) */
export function writeCacheFile(name: string, content: string): string {
  return writeTextFile('cache', name, content);
}

/** 공유 시트(파일 앱에 저장 · 카톡 등)를 연다. 이 기기에서 공유를 못 하면 false */
export async function shareFile(uri: string, kind: ShareKind): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(uri, { mimeType: kind.mimeType, UTI: kind.UTI, dialogTitle: kind.dialogTitle });
  return true;
}

/**
 * 백업 파일 고르기에서 보여 줄 형식.
 * iOS 는 MIME + UTI(public.json). Android 는 MIME 만 알아듣고, 카톡·메일로 받은 .json 이
 * application/octet-stream 으로 잡혀 회색으로 막히는 일이 흔해 모든 파일을 보여 준다 (어차피 내용으로 판정한다)
 */
export function backupPickerTypes(): string[] {
  return Platform.OS === 'android' ? ['*/*'] : ['application/json', 'text/plain', 'public.json'];
}

/**
 * 파일 앱에서 백업 파일을 골라 내용을 읽는다. 취소하면 null.
 * 카톡·메일로 받으면 확장자·형식이 바뀌어 오기도 해서 텍스트까지 고를 수 있게 하고,
 * 백업인지는 파일 이름이 아니라 내용(JSON.parse + validateBackup)으로 판정한다
 */
export async function pickJsonText(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: backupPickerTypes(),
    // Android 의 content:// 주소는 바로 읽을 수 없어 캐시에 복사한 file:// 로 읽는다
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) return null;
  return new File(asset.uri).text();
}
