/**
 * jest 용 expo-file-system 대역 (새 File/Paths API 중 앱이 쓰는 것만). jest.setup.ts 에서 jest.mock('expo-file-system').
 * 파일 내용은 모듈 변수 mockFiles(주소 → 글자)에 담는다. 테스트는 여기서 "무엇을 썼는지" 보고,
 * 내보낸 파일을 그대로 문서 선택기 대역에 넘겨 내보내기 → 복원 왕복을 돌린다.
 */
export const mockFiles = new Map<string, string>();

/** 테스트가 "쓰기 실패" 를 흉내 낼 때 true */
export const mockFileSystemState = { failWrites: false };

type PathPart = string | MockDirectory | File;

function joinUri(parts: PathPart[]): string {
  return parts
    .map((p) => (typeof p === 'string' ? p : p.uri))
    .map((p, i) => (i === 0 ? p.replace(/\/+$/, '') : p.replace(/^\/+|\/+$/g, '')))
    .join('/');
}

class MockDirectory {
  constructor(public readonly uri: string) {}
}

export class Directory extends MockDirectory {}

export class File {
  readonly uri: string;

  constructor(...uris: PathPart[]) {
    this.uri = joinUri(uris);
  }

  get name(): string {
    return this.uri.split('/').pop() ?? '';
  }

  get exists(): boolean {
    return mockFiles.has(this.uri);
  }

  create(options?: { overwrite?: boolean }): void {
    if (mockFileSystemState.failWrites) throw new Error('쓰기 실패 (테스트)');
    if (mockFiles.has(this.uri) && !options?.overwrite) throw new Error('이미 있는 파일');
    mockFiles.set(this.uri, '');
  }

  write(content: string): void {
    if (mockFileSystemState.failWrites) throw new Error('쓰기 실패 (테스트)');
    mockFiles.set(this.uri, content);
  }

  text(): Promise<string> {
    const content = mockFiles.get(this.uri);
    return content === undefined
      ? Promise.reject(new Error(`없는 파일: ${this.uri}`))
      : Promise.resolve(content);
  }

  textSync(): string {
    const content = mockFiles.get(this.uri);
    if (content === undefined) throw new Error(`없는 파일: ${this.uri}`);
    return content;
  }

  delete(): void {
    mockFiles.delete(this.uri);
  }
}

export class Paths {
  static get cache(): Directory {
    return new Directory('file:///cache');
  }

  static get document(): Directory {
    return new Directory('file:///document');
  }
}
