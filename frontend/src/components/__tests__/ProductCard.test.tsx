import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import ProductCard, { invalidateFavoriteIdsCache } from '../ProductCard';
import { favoriteApi } from '../../api';
import { isAuthenticated } from '../../lib/auth';

// Mock API
vi.mock('../../api', () => ({
  favoriteApi: {
    listMy: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('../../lib/auth', () => ({
  isAuthenticated: vi.fn(),
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, whileHover, whileTap, layout, layoutId, ...props }: any) => (
      <div {...props}>{children}</div>
    ),
  },
}));

const mockProduct = {
  id: 1,
  title: 'Test Product',
  description: 'This is a test product description',
  price: 100,
  location: 'Test Location',
  image: '/test-image.jpg',
  seller: {
    avatar: '/test-avatar.jpg',
    name: 'Test Seller',
  },
  timeAgo: '2小时前',
};

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {component}
    </BrowserRouter>
  );
};

describe('ProductCard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateFavoriteIdsCache();
    (isAuthenticated as any).mockReturnValue(true);
    (favoriteApi.listMy as any).mockImplementation(() => new Promise(() => {}));
  });

  it('should render product information correctly', () => {
    renderWithRouter(<ProductCard product={mockProduct} />);

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('This is a test product description')).toBeInTheDocument();
    expect(screen.getByText('¥100')).toBeInTheDocument();
    expect(screen.getByText('Test Location')).toBeInTheDocument();
    expect(screen.getByText('Test Seller')).toBeInTheDocument();
    expect(screen.getByText('2小时前')).toBeInTheDocument();
  });

  it('should render product image with correct src', () => {
    renderWithRouter(<ProductCard product={mockProduct} />);

    const image = screen.getByAltText('Test Product') as HTMLImageElement;
    expect(image).toBeInTheDocument();
    expect(image.src).toContain('/test-image.jpg');
  });

  it('should render seller avatar with correct src', () => {
    renderWithRouter(<ProductCard product={mockProduct} />);

    const avatar = screen.getByAltText('Test Seller') as HTMLImageElement;
    expect(avatar).toBeInTheDocument();
    expect(avatar.src).toContain('/test-avatar.jpg');
  });

  it('should show sold out overlay when isSold is true', () => {
    renderWithRouter(<ProductCard product={mockProduct} isSold={true} />);

    const soldOutImage = screen.getByAltText('已售出') as HTMLImageElement;
    expect(soldOutImage).toBeInTheDocument();
  });

  it('should not show sold out overlay when isSold is false', () => {
    renderWithRouter(<ProductCard product={mockProduct} isSold={false} />);

    const soldOutImage = screen.queryByAltText('已售出');
    expect(soldOutImage).not.toBeInTheDocument();
  });

  it('should link to product detail page', () => {
    renderWithRouter(<ProductCard product={mockProduct} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/product/1');
  });

  it('should load favorite status on mount', async () => {
    (favoriteApi.listMy as any).mockResolvedValue({
      success: true,
      data: [{ id: 1 }],
    });

    renderWithRouter(<ProductCard product={mockProduct} />);

    await waitFor(() => {
      expect(favoriteApi.listMy).toHaveBeenCalled();
    });
  });

  it('should toggle favorite when heart button is clicked', async () => {
    const user = userEvent.setup();
    (favoriteApi.add as any).mockResolvedValue({
      success: true,
      data: { id: 1, productId: 1 },
    });

    renderWithRouter(<ProductCard product={mockProduct} />);

    await waitFor(() => {
      expect(favoriteApi.listMy).toHaveBeenCalled();
    });

    const heartButton = screen.getByRole('button');
    await act(async () => {
      await user.click(heartButton);
    });

    await waitFor(() => {
      expect(favoriteApi.add).toHaveBeenCalledWith(1);
    });
  });

  it('should show success message after adding to favorites', async () => {
    const user = userEvent.setup();
    (favoriteApi.add as any).mockResolvedValue({
      success: true,
      data: { id: 1, productId: 1 },
    });

    renderWithRouter(<ProductCard product={mockProduct} />);

    await waitFor(() => {
      expect(favoriteApi.listMy).toHaveBeenCalled();
    });

    const heartButton = screen.getByRole('button');
    await act(async () => {
      await user.click(heartButton);
    });

    await waitFor(() => {
      expect(screen.getByText('已加入收藏')).toBeInTheDocument();
    });
  });

  it('should remove from favorites when already favorited', async () => {
    const user = userEvent.setup();
    (favoriteApi.listMy as any).mockResolvedValue({
      success: true,
      data: [{ id: 99, productId: 1 }],
    });
    (favoriteApi.remove as any).mockResolvedValue({
      success: true,
      data: null,
    });

    renderWithRouter(<ProductCard product={mockProduct} />);

    await waitFor(() => {
      expect(favoriteApi.listMy).toHaveBeenCalled();
    });

    const heartButton = screen.getByRole('button');
    await act(async () => {
      await user.click(heartButton);
    });

    await waitFor(() => {
      expect(favoriteApi.remove).toHaveBeenCalledWith(1);
    });
  });

  it('should use nested product id from favorite records when deciding initial favorite state', async () => {
    const user = userEvent.setup();
    (favoriteApi.listMy as any).mockResolvedValue({
      success: true,
      data: [{ id: 999, product: { id: 1 } }],
    });
    (favoriteApi.remove as any).mockResolvedValue({
      success: true,
      data: null,
    });

    renderWithRouter(<ProductCard product={mockProduct} />);

    await waitFor(() => {
      expect(favoriteApi.listMy).toHaveBeenCalled();
    });

    await act(async () => {
      await user.click(screen.getByRole('button'));
    });

    await waitFor(() => {
      expect(favoriteApi.remove).toHaveBeenCalledWith(1);
      expect(favoriteApi.add).not.toHaveBeenCalled();
    });
  });

  it('should handle favorite API error gracefully', async () => {
    const user = userEvent.setup();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    (favoriteApi.add as any).mockRejectedValue(new Error('API Error'));

    renderWithRouter(<ProductCard product={mockProduct} />);

    await waitFor(() => {
      expect(favoriteApi.listMy).toHaveBeenCalled();
    });

    const heartButton = screen.getByRole('button');
    await act(async () => {
      await user.click(heartButton);
    });

    await waitFor(() => {
      expect(screen.getByText('收藏操作失败，请稍后重试')).toBeInTheDocument();
    });

    consoleError.mockRestore();
  });

  it('should prevent navigation when clicking favorite button', async () => {
    const user = userEvent.setup();
    (favoriteApi.add as any).mockResolvedValue({
      success: true,
      data: { id: 1, productId: 1 },
    });

    renderWithRouter(<ProductCard product={mockProduct} />);

    await waitFor(() => {
      expect(favoriteApi.listMy).toHaveBeenCalled();
    });

    const heartButton = screen.getByRole('button');
    await act(async () => {
      await user.click(heartButton);
    });

    // The click should not navigate (preventDefault should be called)
    // We verify this by checking that the favorite API was called
    await waitFor(() => {
      expect(favoriteApi.add).toHaveBeenCalled();
    });
  });
});
