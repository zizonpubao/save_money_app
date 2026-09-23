import { render, screen } from '@testing-library/react-native';

import { EntrySectionHeader } from '@/src/components/EntrySectionHeader';

describe('EntrySectionHeader (날짜 그룹 헤더)', () => {
  it('월 섹션(YYYY-MM, 길이 7)은 "2026년 9월" 로 보인다', async () => {
    await render(<EntrySectionHeader sectionKey="2026-09" total={0} />);
    expect(screen.getByText('2026년 9월')).toBeOnTheScreen();
  });

  it('일 섹션(YYYY-MM-DD, 길이 10)은 "2026년 9월 23일 (수)" 로 보인다', async () => {
    await render(<EntrySectionHeader sectionKey="2026-09-23" total={0} />);
    expect(screen.getByText('2026년 9월 23일 (수)')).toBeOnTheScreen();
  });

  it('섹션 합계를 콤마·원 형식으로 보여준다', async () => {
    await render(<EntrySectionHeader sectionKey="2026-09-23" total={16500} />);
    expect(screen.getByText('16,500원')).toBeOnTheScreen();
  });
});
