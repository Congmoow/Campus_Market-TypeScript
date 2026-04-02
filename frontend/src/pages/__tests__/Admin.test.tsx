import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Admin from '../Admin';

const mockNavigate = vi.hoisted(() => vi.fn());
const mockIsAdmin = vi.hoisted(() => vi.fn());
const toastState = vi.hoisted(() => ({
  toasts: [],
  removeToast: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
}));

const adminApiMocks = vi.hoisted(() => ({
  getStatistics: vi.fn(),
  getAllUsers: vi.fn(),
  toggleUserStatus: vi.fn(),
  getAllProducts: vi.fn(),
  deleteProduct: vi.fn(),
  getAllOrders: vi.fn(),
  getAllCategories: vi.fn(),
  createCategory: vi.fn(),
  deleteCategory: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../lib/auth', () => ({
  isAdmin: () => mockIsAdmin(),
}));

vi.mock('../../api', () => ({
  adminApi: adminApiMocks,
}));

vi.mock('../../hooks/useToast', () => ({
  useToast: () => toastState,
}));

vi.mock('../../components/ToastContainer', () => ({
  default: () => null,
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('recharts', () => {
  const MockChart = () => <div data-testid="chart" />;
  const MockContainer = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;

  return {
    ResponsiveContainer: MockContainer,
    AreaChart: MockChart,
    BarChart: MockChart,
    LineChart: MockChart,
    PieChart: MockChart,
    Pie: MockChart,
    Area: MockChart,
    Bar: MockChart,
    Line: MockChart,
    Cell: () => null,
    CartesianGrid: () => null,
    XAxis: () => null,
    YAxis: () => null,
    Tooltip: () => null,
    Legend: () => null,
  };
});

describe('Admin page', () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation((message, ...args) => {
      if (typeof message === 'string' && message.includes('not wrapped in act')) {
        return;
      }

      originalConsoleError(message, ...args);
    });
    mockIsAdmin.mockReturnValue(true);
    adminApiMocks.getStatistics.mockResolvedValue({
      success: true,
      data: {
        totalUsers: 12,
        totalProducts: 8,
        totalOrders: 5,
        activeUsers: 4,
        todayUsers: 2,
        todayProducts: 1,
        todayOrders: 1,
        orderStatusDistribution: [{ status: 'PENDING', count: 2 }],
        salesTrend: [{ date: '2026-04-01', amount: 128 }],
        userGrowthTrend: [{ month: '2026-04', users: 12, newUsers: 2 }],
      },
    });
    adminApiMocks.getAllCategories.mockResolvedValue({
      success: true,
      data: [
        { id: 1, name: '数码产品', productCount: 3 },
        { id: 2, name: '书籍教材', productCount: 2 },
      ],
    });
    adminApiMocks.getAllUsers.mockResolvedValue({
      success: true,
      data: {
        users: [
          {
            id: 1,
            studentId: '20230001',
            phone: '13800138000',
            role: 'USER',
            enabled: true,
            createdAt: '2026-04-01T08:00:00.000Z',
            updatedAt: '2026-04-01T08:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      },
    });
    adminApiMocks.getAllProducts.mockResolvedValue({
      success: true,
      data: { products: [], total: 0, page: 1, pageSize: 20, totalPages: 0 },
    });
    adminApiMocks.getAllOrders.mockResolvedValue({
      success: true,
      data: { orders: [], total: 0, page: 1, pageSize: 20, totalPages: 0 },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('redirects non-admin users away from the admin page', async () => {
    mockIsAdmin.mockReturnValue(false);

    render(<Admin />);

    await waitFor(() => {
      expect(toastState.error).toHaveBeenCalledWith('您没有管理员权限');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('renders clean dashboard text and switches to typed user management data', async () => {
    const user = userEvent.setup();

    render(<Admin />);

    expect(await screen.findByRole('heading', { name: '管理后台' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '数据概览' })).toBeInTheDocument();
    expect(await screen.findByText('数码产品')).toBeInTheDocument();
    expect(screen.getByText('书籍教材')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /用户管理/i }));

    expect(await screen.findByText('20230001')).toBeInTheDocument();
    expect(screen.getByText('共 1 位用户')).toBeInTheDocument();
  });
});
