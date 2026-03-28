import { describe, it, expect, vi, beforeEach } from 'vitest';
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

describe('UserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('hydrates current user header from local cache before profile request resolves', async () => {
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

    expect(screen.getByRole('heading', { name: 'Cached Seller' })).toBeInTheDocument();
    expect(screen.getByText('Yuquan')).toBeInTheDocument();
    expect(screen.getByText(/Computer Science/)).toBeInTheDocument();
    expect(screen.getByText('Cached signature')).toBeInTheDocument();
    expect(screen.getByText(new Date(cachedJoinAt).toLocaleDateString('zh-CN'))).toBeInTheDocument();
    expect(container.querySelector('img.object-cover')?.getAttribute('src')).toBe(
      'https://cdn.example.com/cached-avatar.png'
    );

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
});
