import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EditProductModal from '../EditProductModal';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('../../api', () => ({
  fileApi: {
    uploadImage: vi.fn(),
  },
}));

describe('EditProductModal', () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation((message, ...args) => {
      if (typeof message === 'string' && message.includes('not wrapped in act')) {
        return;
      }

      originalConsoleError(message, ...args);
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows the current category and renders category options from props', async () => {
    const user = userEvent.setup();

    render(
      <EditProductModal
        isOpen={true}
        onClose={vi.fn()}
        product={
          {
            id: 1,
            title: '旧吉他',
            description: '八成新',
            price: 200,
            location: '下沙校区',
            images: [],
            category: {
              id: 9,
              name: '乐器',
            },
          } as any
        }
        categories={[
          { id: 1, name: '数码产品' },
          { id: 9, name: '乐器' },
        ]}
        onSave={vi.fn().mockResolvedValue(undefined)}
      />
    );

    const categoryTrigger = await screen.findByRole('button', { name: /乐器/ });
    expect(categoryTrigger).toBeInTheDocument();

    await user.click(categoryTrigger);

    expect(screen.getAllByRole('button', { name: '乐器' }).length).toBeGreaterThan(1);
    expect(screen.getByRole('button', { name: '数码产品' })).toBeInTheDocument();
  });

  it('submits a backend-compatible payload when original price is empty', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <EditProductModal
        isOpen={true}
        onClose={vi.fn()}
        product={
          {
            id: 1,
            title: '旧吉他',
            description: '八成新',
            price: 200,
            location: '下沙校区',
            images: ['cover.jpg'],
            categoryName: '数码产品',
          } as any
        }
        categories={[{ id: 1, name: '数码产品' }]}
        onSave={onSave}
      />
    );

    await user.click(screen.getByRole('button', { name: '保存修改' }));

    expect(onSave).toHaveBeenCalledWith({
      title: '旧吉他',
      description: '八成新',
      price: 200,
      originalPrice: null,
      categoryName: '数码产品',
      location: '下沙校区',
      images: ['cover.jpg'],
    });
  });

  it('normalizes detail-image objects into plain image urls for preview and save', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <EditProductModal
        isOpen={true}
        onClose={vi.fn()}
        product={
          {
            id: 1,
            title: '旧吉他',
            description: '八成新',
            price: 200,
            location: '下沙校区',
            images: [
              { id: 1, productId: 1, url: 'cover.jpg' },
              { id: 2, productId: 1, url: 'detail.jpg' },
            ],
            categoryName: '数码产品',
          } as any
        }
        categories={[{ id: 1, name: '数码产品' }]}
        onSave={onSave}
      />
    );

    expect((await screen.findByAltText('商品图 1') as HTMLImageElement).getAttribute('src')).toBe(
      'cover.jpg'
    );
    expect((screen.getByAltText('商品图 2') as HTMLImageElement).getAttribute('src')).toBe(
      'detail.jpg'
    );

    await user.click(screen.getByRole('button', { name: '保存修改' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        images: ['cover.jpg', 'detail.jpg'],
      })
    );
  });
});
