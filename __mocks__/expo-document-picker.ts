/**
 * jest 용 expo-document-picker 대역. jest.setup.ts 에서 jest.mock('expo-document-picker').
 * 기본은 "취소". 테스트가 mockPickFile(uri) 로 다음 선택 결과를 정한다.
 */
type PickResult =
  | { canceled: true; assets: null }
  | { canceled: false; assets: { uri: string; name: string; lastModified: number }[] };

export const getDocumentAsync = jest.fn(
  (_options?: unknown): Promise<PickResult> => Promise.resolve({ canceled: true, assets: null }),
);

/** 다음 한 번의 선택 결과를 uri 파일로 */
export function mockPickFile(uri: string): void {
  getDocumentAsync.mockImplementationOnce(() =>
    Promise.resolve({
      canceled: false,
      assets: [{ uri, name: uri.split('/').pop() ?? 'backup.json', lastModified: 0 }],
    }),
  );
}
