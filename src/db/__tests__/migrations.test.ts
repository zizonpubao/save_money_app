import { DEFAULT_CATEGORIES, LATEST_SCHEMA_VERSION } from '@/src/db/migrations';

// expo-sqlite 가 필요한 runMigrations 자체는 jest 에서 못 돌린다.
// 마이그레이션 목록의 메타데이터(최신 버전, v1 시드)만 회귀 방지용으로 검사한다.
describe('migrations', () => {
  it('최신 스키마 버전은 3 (v2 = 밥값 카테고리, v3 = settings 테이블)', () => {
    expect(LATEST_SCHEMA_VERSION).toBe(3);
  });

  it('v1 시드 카테고리는 8개이며 밥값을 포함하지 않는다', () => {
    expect(DEFAULT_CATEGORIES).toHaveLength(8);
    expect(DEFAULT_CATEGORIES.map((c) => c.name)).toEqual([
      '커피',
      '배달',
      '택시',
      '쇼핑',
      '술',
      '간식',
      '구독',
      '기타',
    ]);
  });
});
