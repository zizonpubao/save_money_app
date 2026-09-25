import type { Category, Entry } from '@/src/db';
import { buildCsv, csvField, csvFileName } from '@/src/features/csv';

const categories: Category[] = [{ id: 1, name: '커피', emoji: '☕', sortOrder: 0, isDefault: true }];

function entry(over: Partial<Entry> = {}): Entry {
  return {
    id: 1,
    date: '2026-09-23',
    title: '아메리카노',
    amount: 4500,
    categoryId: 1,
    memo: null,
    createdAt: '2026-09-23T09:00:00+09:00',
    updatedAt: '2026-09-23T09:00:00+09:00',
    ...over,
  };
}

describe('buildCsv', () => {
  it('UTF-8 BOM 으로 시작하고 헤더는 날짜,항목,금액,카테고리,메모,생성시각', () => {
    const csv = buildCsv([], categories);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toBe('\uFEFF날짜,항목,금액,카테고리,메모,생성시각\r\n');
  });

  it('금액은 콤마 없는 정수, 카테고리는 이름, 메모 없으면 빈 칸, 줄 끝은 CRLF', () => {
    const csv = buildCsv([entry({ amount: 1234567 })], categories);
    expect(csv.split('\r\n')[1]).toBe('2026-09-23,아메리카노,1234567,커피,,2026-09-23T09:00:00+09:00');
  });

  it("=, +, -, @ 로 시작하는 글 칸은 앞에 ' 를 붙여 수식으로 실행되지 않게 한다 (금액은 그대로)", () => {
    const cats: Category[] = [{ id: 1, name: '@카테고리', emoji: '☕', sortOrder: 0, isDefault: false }];
    const csv = buildCsv([entry({ title: '=HYPERLINK("x")', memo: '+1,2', amount: 4500 })], cats);
    expect(csv.split('\r\n')[1]).toBe(
      `2026-09-23,"'=HYPERLINK(""x"")",4500,'@카테고리,"'+1,2",2026-09-23T09:00:00+09:00`,
    );
    const plain = buildCsv([entry({ title: '-5', memo: '보통 메모' })], categories);
    expect(plain.split('\r\n')[1]).toBe("2026-09-23,'-5,4500,커피,보통 메모,2026-09-23T09:00:00+09:00");
  });

  it('카테고리가 없거나 지워졌으면 빈 칸', () => {
    const csv = buildCsv([entry({ categoryId: null }), entry({ categoryId: 99 })], categories);
    const lines = csv.split('\r\n');
    expect(lines[1]?.split(',')[3]).toBe('');
    expect(lines[2]?.split(',')[3]).toBe('');
  });

  it('쉼표·큰따옴표·줄바꿈이 든 값은 큰따옴표로 감싸고 안의 따옴표는 두 번', () => {
    const csv = buildCsv(
      [entry({ title: '커피, 케이크', memo: '그냥 "참음"\n다음엔 텀블러' })],
      categories,
    );
    expect(csv).toContain(
      '2026-09-23,"커피, 케이크",4500,커피,"그냥 ""참음""\n다음엔 텀블러",2026-09-23T09:00:00+09:00',
    );
  });

  it('기록 순서는 받은 그대로', () => {
    const csv = buildCsv([entry({ title: 'A' }), entry({ title: 'B' })], categories);
    const titles = csv
      .split('\r\n')
      .slice(1, 3)
      .map((l) => l.split(',')[1]);
    expect(titles).toEqual(['A', 'B']);
  });
});

describe('csvField · csvFileName', () => {
  it('특수 문자가 없으면 그대로, \\r 도 감싼다', () => {
    expect(csvField('평범')).toBe('평범');
    expect(csvField('a\rb')).toBe('"a\rb"');
    expect(csvField('"')).toBe('""""');
  });

  it('파일 이름은 savelog-YYYY-MM-DD.csv', () => {
    expect(csvFileName('2026-09-25')).toBe('savelog-2026-09-25.csv');
  });
});
