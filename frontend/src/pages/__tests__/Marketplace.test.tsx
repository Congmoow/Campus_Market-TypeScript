import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Marketplace from '../Marketplace';

const publishCategoryOrder = [
  '全部',
  '数码产品',
  '书籍教材',
  '生活用品',
  '衣物鞋帽',
  '美妆护肤',
  '运动器材',
  '其他',
] as const;

vi.mock('../../components/Navbar', () => ({
  default: () => <div>Navbar</div>,
}));

vi.mock('../../components/AuthModal', () => ({
  default: () => null,
}));

vi.mock('../../components/ProductCard', () => ({
  default: ({ product }: any) => <div>{product.title}</div>,
}));

vi.mock('../../assets/open-rafiki.svg', () => ({
  default: 'open-rafiki.svg',
}));

vi.mock('rc-slider/assets/index.css', () => ({}));

vi.mock('rc-slider', () => ({
  default: ({
    value,
    onChange,
  }: {
    value: number | [number, number];
    onChange: (nextValue: [number, number]) => void;
  }) => {
    const currentRange = Array.isArray(value) ? value : [0, value];

    return (
      <div>
        <div data-testid="price-range-value">{currentRange.join('-')}</div>
        <button type="button" onClick={() => onChange([100, 500])}>
          设置价格区间100-500
        </button>
        <button type="button" onClick={() => onChange([800, 900])}>
          设置价格区间800-900
        </button>
      </div>
    );
  },
}));

const apiMocks = vi.hoisted(() => ({
  productApi: {
    getCategories: vi.fn(),
    getList: vi.fn(),
  },
}));

vi.mock('../../api', () => apiMocks);

const mockProducts = [
  {
    id: 1,
    title: '低价商品',
    description: 'A',
    price: 50,
    status: 'ON_SALE',
    sellerId: 1,
    viewCount: 0,
    createdAt: '2026-04-01T08:00:00.000Z',
    updatedAt: '2026-04-01T08:00:00.000Z',
    images: [],
    seller: {
      profile: {
        nickname: '卖家A',
      },
    },
  },
  {
    id: 2,
    title: '中价商品',
    description: 'B',
    price: 300,
    status: 'ON_SALE',
    sellerId: 2,
    viewCount: 0,
    createdAt: '2026-04-01T08:00:00.000Z',
    updatedAt: '2026-04-01T08:00:00.000Z',
    images: [],
    seller: {
      profile: {
        nickname: '卖家B',
      },
    },
  },
  {
    id: 3,
    title: '高价商品',
    description: 'C',
    price: 700,
    status: 'ON_SALE',
    sellerId: 3,
    viewCount: 0,
    createdAt: '2026-04-01T08:00:00.000Z',
    updatedAt: '2026-04-01T08:00:00.000Z',
    images: [],
    seller: {
      profile: {
        nickname: '卖家C',
      },
    },
  },
];

describe('Marketplace', () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation((message, ...args) => {
      if (typeof message === 'string' && message.includes('not wrapped in act')) {
        return;
      }

      originalConsoleError(message, ...args);
    });

    apiMocks.productApi.getCategories.mockResolvedValue({
      success: true,
      data: [],
    });
    apiMocks.productApi.getList.mockResolvedValue({
      success: true,
      data: {
        content: mockProducts,
        totalElements: mockProducts.length,
        totalPages: 1,
        size: 20,
        number: 0,
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('filters the rendered list by the selected price range', async () => {
    const user = userEvent.setup();

    render(<Marketplace />);

    expect(await screen.findByText('低价商品')).toBeInTheDocument();
    expect(screen.getByText('中价商品')).toBeInTheDocument();
    expect(screen.getByText('高价商品')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '设置价格区间100-500' }));

    await waitFor(() => {
      expect(screen.queryByText('低价商品')).not.toBeInTheDocument();
      expect(screen.getByText('中价商品')).toBeInTheDocument();
      expect(screen.queryByText('高价商品')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(apiMocks.productApi.getList).toHaveBeenLastCalledWith(
        expect.objectContaining({
          minPrice: 100,
          maxPrice: 500,
        })
      );
    });
  });

  it('shows an empty state when no products match the selected price range', async () => {
    const user = userEvent.setup();

    render(<Marketplace />);

    expect(await screen.findByText('中价商品')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '设置价格区间800-900' }));

    await waitFor(() => {
      expect(screen.queryByText('低价商品')).not.toBeInTheDocument();
      expect(screen.queryByText('中价商品')).not.toBeInTheDocument();
      expect(screen.queryByText('高价商品')).not.toBeInTheDocument();
      expect(screen.getByText(/没有符合当前价格区间的商品/)).toBeInTheDocument();
    });
  });

  it('renders all categories in publish order and wraps them into two rows without a scroll bar', async () => {
    apiMocks.productApi.getCategories.mockResolvedValue({
      success: true,
      data: [
        { id: 7, name: '其他' },
        { id: 3, name: '生活用品' },
        { id: 5, name: '美妆护肤' },
        { id: 1, name: '数码产品' },
        { id: 6, name: '运动器材' },
        { id: 4, name: '衣物鞋帽' },
        { id: 2, name: '书籍教材' },
      ],
    });

    render(<Marketplace />);

    await screen.findByRole('button', { name: '数码产品' });

    const categoryBar = screen.getByTestId('marketplace-category-bar');
    const categoryList = screen.getByTestId('marketplace-category-list');
    const categoryButtons = screen
      .getAllByRole('button')
      .map((button) => button.textContent?.trim())
      .filter((label): label is string =>
        publishCategoryOrder.includes(label as (typeof publishCategoryOrder)[number])
      );

    expect(categoryBar.className).toContain('flex-1');
    expect(categoryBar.className).not.toContain('overflow-x-auto');
    expect(categoryBar.className).not.toContain('overflow-y-hidden');
    expect(categoryList.className).toContain('flex-wrap');
    expect(categoryList.className).toContain('max-h-24');
    expect(categoryButtons).toEqual(publishCategoryOrder);
  });
});
