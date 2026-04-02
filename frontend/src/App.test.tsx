import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const authState = vi.hoisted(() => ({
  restoreAuthSession: vi.fn(),
  useAuthSession: vi.fn(),
}));

vi.mock('./lib/auth', () => authState);

vi.mock('./pages/Home', () => ({ default: () => <div>Home Page</div> }));
vi.mock('./pages/Marketplace', () => ({ default: () => <div>Marketplace Page</div> }));
vi.mock('./pages/ProductDetail', () => ({ default: () => <div>Product Detail Page</div> }));
vi.mock('./pages/Publish', () => ({ default: () => <div>Publish Page</div> }));
vi.mock('./pages/UserProfile', () => ({ default: () => <div>User Profile Page</div> }));
vi.mock('./pages/MyProducts', () => ({ default: () => <div>My Products Page</div> }));
vi.mock('./pages/MyOrders', () => ({ default: () => <div>My Orders Page</div> }));
vi.mock('./pages/MyFavorites', () => ({ default: () => <div>My Favorites Page</div> }));
vi.mock('./pages/SearchResults', () => ({ default: () => <div>Search Results Page</div> }));
vi.mock('./pages/Checkout', () => ({ default: () => <div>Checkout Page</div> }));
vi.mock('./pages/OrderSuccess', () => ({ default: () => <div>Order Success Page</div> }));
vi.mock('./pages/OrderDetail', () => ({ default: () => <div>Order Detail Page</div> }));
vi.mock('./pages/Chat', () => ({ default: () => <div>Chat Page</div> }));
vi.mock('./pages/Login', () => ({ default: () => <div>Login Page</div> }));
vi.mock('./pages/Admin', () => ({ default: () => <div>Admin Page</div> }));
vi.mock('./pages/NotFound', () => ({ default: () => <div>Not Found Page</div> }));

describe('App route guards', () => {
  beforeEach(() => {
    authState.restoreAuthSession.mockResolvedValue(null);
    authState.useAuthSession.mockReturnValue({
      status: 'unauthenticated',
      user: null,
    });
    window.history.replaceState({}, '', '/');
    localStorage.clear();
  });

  it('redirects unauthenticated users away from protected routes', async () => {
    const { default: App } = await import('./App');
    window.history.replaceState({}, '', '/my-orders');

    render(<App />);

    expect(await screen.findByText('Login Page')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/login');
  });

  it('does not trust spoofed local admin data when the current session is not admin', async () => {
    localStorage.setItem('token', 'spoofed-token');
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 1,
        role: 'ADMIN',
      }),
    );
    authState.useAuthSession.mockReturnValue({
      status: 'authenticated',
      user: {
        id: 1,
        studentId: '20230001',
        role: 'USER',
      },
    });
    const { default: App } = await import('./App');
    window.history.replaceState({}, '', '/admin');

    render(<App />);

    expect(await screen.findByText('Home Page')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
  });

  it('starts session restoration when the app mounts', async () => {
    const { default: App } = await import('./App');

    render(<App />);

    expect(authState.restoreAuthSession).toHaveBeenCalled();
  });
});
