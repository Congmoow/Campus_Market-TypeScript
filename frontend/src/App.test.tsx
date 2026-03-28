import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const authState = vi.hoisted(() => ({
  isAuthenticated: vi.fn(),
  isAdmin: vi.fn(),
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
    authState.isAuthenticated.mockReturnValue(false);
    authState.isAdmin.mockReturnValue(false);
    window.history.replaceState({}, '', '/');
  });

  it('redirects unauthenticated users away from protected routes', async () => {
    const { default: App } = await import('./App');
    window.history.replaceState({}, '', '/my-orders');

    render(<App />);

    expect(await screen.findByText('Login Page')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/login');
  });

  it('redirects non-admin users away from the admin route', async () => {
    authState.isAuthenticated.mockReturnValue(true);
    authState.isAdmin.mockReturnValue(false);
    const { default: App } = await import('./App');
    window.history.replaceState({}, '', '/admin');

    render(<App />);

    expect(await screen.findByText('Home Page')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
  });
});
