import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserProfile from '../UserProfile';

const mockNavigate = vi.fn();
const mockUseParams = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockUseParams(),
    Link: ({ to, children }: any) => <a href={to}>{children}</a>,
  };
});

vi.mock('../../components/Navbar', () => ({
  default: () => <div>Navbar</div>,
}));

vi.mock('../../components/AuthModal', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div>Auth Modal</div> : null),
}));

vi.mock('../../components/ProductCard', () => ({
  default: ({ product }: any) => <div>{product.title}</div>,
}));

vi.mock('../../components/EditProfileModal', () => ({
  default: () => null,
}));

const authState = vi.hoisted(() => ({
  isAuthenticated: vi.fn(),
  getStoredUser: vi.fn(),
}));

vi.mock('../../lib/auth', () => authState);

const apiMocks = vi.hoisted(() => ({
  userApi: {
    getProfile: vi.fn(),
    getUserProducts: vi.fn(),
  },
  chatApi: {
    startChat: vi.fn(),
  },
}));

vi.mock('../../api', () => apiMocks);

const flushAsync = () => new Promise((resolve) => setTimeout(resolve, 0));
const originalConsoleError = console.error;

describe('UserProfile', () => {
  let consoleErrorSpy: { mockRestore: () => void };

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation((message, ...args) => {
      if (typeof message === 'string' && message.includes('not wrapped in act')) {
        return;
      }

      originalConsoleError(message, ...args);
    });
    window.history.replaceState({}, '', '/user/2');
    mockUseParams.mockReturnValue({ id: '2' });
    authState.isAuthenticated.mockReturnValue(true);
    authState.getStoredUser.mockImplementation(() => {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    });
    localStorage.setItem('user', JSON.stringify({ id: 1, studentId: '20230001' }));

    apiMocks.userApi.getProfile.mockResolvedValue({
      success: true,
      data: {
        id: 2,
        studentId: '20230002',
        name: 'Seller',
        profile: {
          major: 'Software Engineering',
          grade: '2023',
          campus: 'Zijingang',
          bio: 'Seller bio',
        },
      },
    });
    apiMocks.userApi.getUserProducts.mockResolvedValue({
      success: true,
      data: [
        {
          id: 101,
          title: 'Seller Product',
          price: 88,
          createdAt: new Date().toISOString(),
          images: [],
          sellerId: 2,
        },
      ],
    });
    apiMocks.chatApi.startChat.mockResolvedValue({
      success: true,
      data: {
        id: 999,
      },
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('starts a chat session with the viewed seller when clicking contact', async () => {
    const user = userEvent.setup();

    render(<UserProfile />);

    const contactButton = (await screen.findByText('联系Ta')).closest('button') as HTMLButtonElement;
    await user.click(contactButton);

    await waitFor(() => {
      expect(apiMocks.chatApi.startChat).toHaveBeenCalledWith(101);
      expect(mockNavigate).toHaveBeenCalledWith('/chat?sessionId=999');
    });
  });

  it('displays nested profile fields after reload', async () => {
    render(<UserProfile />);

    const profileMeta = await screen.findByText(/Software Engineering/, {
      selector: 'p',
    });

    expect(profileMeta).toHaveTextContent('2023');
    expect(screen.getByText('Zijingang')).toBeInTheDocument();
    expect(screen.getByText('Seller bio')).toBeInTheDocument();
  });

  it('renders profile skeletons instead of cached profile text while request resolves', async () => {
    let resolveProfile!: (value: any) => void;
    const pendingProfile = new Promise((resolve) => {
      resolveProfile = resolve;
    });
    const cachedJoinAt = '2024-09-01T08:00:00.000Z';

    mockUseParams.mockReturnValue({ id: '1' });
    authState.getStoredUser.mockReturnValue({
      id: 1,
      name: 'Cached Seller',
      studentId: '20230001',
      avatarUrl: 'https://cdn.example.com/cached-avatar.png',
      campus: 'Yuquan',
      major: 'Computer Science',
      grade: '2023',
      bio: 'Cached signature',
      createdAt: cachedJoinAt,
    });
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 1,
        name: 'Cached Seller',
        studentId: '20230001',
        avatarUrl: 'https://cdn.example.com/cached-avatar.png',
        campus: 'Yuquan',
        major: 'Computer Science',
        grade: '2023',
        bio: 'Cached signature',
        createdAt: cachedJoinAt,
      })
    );
    apiMocks.userApi.getProfile.mockReturnValue(pendingProfile as any);

    const { container } = render(<UserProfile />);

    expect(screen.queryByRole('heading', { name: 'Cached Seller' })).not.toBeInTheDocument();
    expect(screen.queryByText('Yuquan')).not.toBeInTheDocument();
    expect(screen.queryByText(/Computer Science/)).not.toBeInTheDocument();
    expect(screen.queryByText('Cached signature')).not.toBeInTheDocument();
    expect(screen.queryByText(new Date(cachedJoinAt).toLocaleDateString('zh-CN'))).not.toBeInTheDocument();
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThanOrEqual(5);

    await act(async () => {
      resolveProfile({
        success: true,
        data: {
          id: 1,
          studentId: '20230001',
          name: 'Cached Seller',
        },
      });
      await pendingProfile;
    });
  });

  it('persists the sold tab in the URL and restores it after rerender', async () => {
    const user = userEvent.setup();
    const productStatuses: string[] = [];

    apiMocks.userApi.getUserProducts.mockImplementation((_userId: number, status: string) => {
      productStatuses.push(status);
      return Promise.resolve({
        success: true,
        data: [
          {
            id: status === 'SOLD' ? 202 : 101,
            title: status === 'SOLD' ? 'Sold Product' : 'Seller Product',
            price: 88,
            createdAt: new Date().toISOString(),
            images: [],
            sellerId: 2,
          },
        ],
      });
    });

    let unmount!: () => void;
    await act(async () => {
      ({ unmount } = render(<UserProfile />));
      await flushAsync();
    });
    await screen.findByText('Seller Product');

    const soldTab = screen.getByText(/已卖出|宸插崠鍑?/).closest('div') as HTMLDivElement;
    await user.click(soldTab);
    await act(async () => {
      await flushAsync();
    });

    await screen.findByText('Sold Product');
    expect(window.location.search).toBe('?tab=sold');

    apiMocks.userApi.getUserProducts.mockClear();
    productStatuses.length = 0;

    await act(async () => {
      unmount();
      render(<UserProfile />);
      await flushAsync();
    });

    await screen.findByText('Sold Product');
    expect(apiMocks.userApi.getUserProducts).toHaveBeenCalledWith(2, 'SOLD');
    expect(productStatuses[0]).toBe('SOLD');
  });
});
