import { render, screen } from '@testing-library/react-native';

import { CategoryBreakdown } from '@/src/components/CategoryBreakdown';
import type { Category, CategoryTotal } from '@/src/db';
import { buildCategoryRows } from '@/src/features/monthlyStats';

const 커피: Category = { id: 1, name: '커피', emoji: '☕', sortOrder: 0, isDefault: true };
const 택시: Category = { id: 2, name: '택시', emoji: '🚕', sortOrder: 1, isDefault: true };
const 간식: Category = { id: 3, name: '간식', emoji: '🍪', sortOrder: 2, isDefault: true };
const CATEGORIES = [커피, 택시, 간식];

// DB 는 total 내림차순으로 준다. 미분류(NULL)가 가장 커도 맨 뒤로 가야 한다.
// 합계 42,000 → 20000/12000/9000/1000 = 47.6/28.6/21.4/2.4% (반올림 합 101)
const TOTALS: CategoryTotal[] = [
  { categoryId: null, total: 20000 },
  { categoryId: 2, total: 12000 },
  { categoryId: 1, total: 9000 },
  { categoryId: 3, total: 1000 },
];

async function renderRows() {
  await render(<CategoryBreakdown rows={buildCategoryRows(TOTALS, CATEGORIES)} />);
}

/** Text 의 children 을 이어 붙인 문자열 (숫자 + '%' 처럼 쪼개진 경우 포함) */
function textOf(children: unknown): string {
  return Array.isArray(children) ? children.join('') : String(children);
}

describe('CategoryBreakdown (카테고리별 합계)', () => {
  it('많은 순으로 그리고 미분류는 금액과 상관없이 맨 뒤에 둔다', async () => {
    await renderRows();
    const names = screen
      .getAllByText(/^(커피|택시|간식|미분류)$/)
      .map((el) => textOf(el.props.children));
    expect(names).toEqual(['택시', '커피', '간식', '미분류']);
  });

  it('미분류 줄은 📦 이모지와 함께 보인다', async () => {
    await renderRows();
    expect(screen.getByText('📦')).toBeOnTheScreen();
  });

  it('각 줄 금액을 콤마·원 형식으로 보여준다', async () => {
    await renderRows();
    expect(screen.getByText('12,000원')).toBeOnTheScreen();
    expect(screen.getByText('20,000원')).toBeOnTheScreen();
  });

  it('보이는 % 를 모두 더하면 100 근처다 (반올림 오차 ±2 이내)', async () => {
    await renderRows();
    const percents = screen
      .getAllByText(/^\d+%$/)
      .map((el) => Number.parseInt(textOf(el.props.children), 10));
    const sum = percents.reduce((a, b) => a + b, 0);
    expect(percents).toHaveLength(4);
    expect(Math.abs(sum - 100)).toBeLessThanOrEqual(2);
  });

  it('행이 없으면 아무 줄도 그리지 않는다', async () => {
    await render(<CategoryBreakdown rows={[]} />);
    expect(screen.queryByText(/원$/)).toBeNull();
  });
});
