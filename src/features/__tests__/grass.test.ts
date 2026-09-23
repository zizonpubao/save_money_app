import { buildGrassCells, grassLevel } from '@/src/features/grass';

describe('grassLevel (농도 4단계)', () => {
  it('기록 없으면 0, 최댓값 대비 25% 구간마다 한 단계', () => {
    expect(grassLevel(0, 10000)).toBe(0);
    expect(grassLevel(1, 10000)).toBe(1);
    expect(grassLevel(2500, 10000)).toBe(1);
    expect(grassLevel(2501, 10000)).toBe(2);
    expect(grassLevel(5000, 10000)).toBe(2);
    expect(grassLevel(7500, 10000)).toBe(3);
    expect(grassLevel(7501, 10000)).toBe(4);
    expect(grassLevel(10000, 10000)).toBe(4);
  });
});

describe('buildGrassCells', () => {
  it('1일의 요일만큼 첫 주를 비운다 (2026-09-01 화 → 2칸, 2026-08-01 토 → 6칸)', () => {
    expect(buildGrassCells('2026-09', [], '2026-09-24').leadingBlanks).toBe(2);
    expect(buildGrassCells('2026-08', [], '2026-09-24').leadingBlanks).toBe(6);
  });

  it('평년 2월은 28칸, 1일이 일요일이라 빈칸 0 → 딱 4주', () => {
    const g = buildGrassCells('2026-02', [], '2026-09-24');
    expect(g.cells).toHaveLength(28);
    expect(g.leadingBlanks).toBe(0);
    expect((g.leadingBlanks + g.cells.length) / 7).toBe(4);
  });

  it('윤년 2월은 29칸, 31일 달은 31칸', () => {
    expect(buildGrassCells('2028-02', [], '2028-02-01').cells).toHaveLength(29);
    const aug = buildGrassCells('2026-08', [], '2026-09-24');
    expect(aug.cells).toHaveLength(31);
    expect(aug.cells.at(-1)).toMatchObject({ day: 31, date: '2026-08-31' });
  });

  it('그달 최댓값 기준으로 날마다 단계가 붙는다', () => {
    const g = buildGrassCells(
      '2026-09',
      [
        { date: '2026-09-02', total: 2000 },
        { date: '2026-09-03', total: 5000 },
        { date: '2026-09-04', total: 7000 },
        { date: '2026-09-05', total: 8000 },
      ],
      '2026-09-24',
    );
    const levelOf = (day: number) => g.cells[day - 1]?.level;
    expect(levelOf(1)).toBe(0);
    expect(levelOf(2)).toBe(1);
    expect(levelOf(3)).toBe(3);
    expect(levelOf(4)).toBe(4);
    expect(levelOf(5)).toBe(4);
  });

  it('오늘 칸은 하나, 오늘 뒤는 미래, 오늘과 지난날은 미래가 아니다', () => {
    const g = buildGrassCells('2026-09', [], '2026-09-24');
    expect(g.cells.filter((c) => c.isToday).map((c) => c.day)).toEqual([24]);
    expect(g.cells[23]).toMatchObject({ isToday: true, isFuture: false });
    expect(g.cells[24]).toMatchObject({ day: 25, isFuture: true });
    expect(g.cells[0]).toMatchObject({ isFuture: false });
    expect(g.cells.filter((c) => c.isFuture)).toHaveLength(6);
  });

  it('지난달을 그리면 오늘 칸도 미래 칸도 없다', () => {
    const g = buildGrassCells('2026-08', [], '2026-09-24');
    expect(g.cells.some((c) => c.isToday || c.isFuture)).toBe(false);
  });
});
