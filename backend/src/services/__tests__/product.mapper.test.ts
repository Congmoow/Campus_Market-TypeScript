import { ProductMapper } from '../product.mapper';

describe('ProductMapper', () => {
  it('keeps seller fallback and category mapping shape unchanged', async () => {
    const categoryService = {
      getCategoryById: jest.fn().mockResolvedValue({
        id: BigInt(6),
        name: '数码',
      }),
    } as any;

    const productMapper = new ProductMapper(categoryService);
    const result = await productMapper.convertProduct(
      {
        id: BigInt(1),
        title: 'Keyboard',
        description: 'Mechanical keyboard',
        price: 199,
        originalPrice: 299,
        categoryId: BigInt(6),
        location: 'Dorm A',
        status: 'ON_SALE',
        viewCount: BigInt(5),
        sellerId: BigInt(2),
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        images: [{ id: BigInt(9), productId: BigInt(1), url: 'image-1.jpg' }],
      } as any,
      true,
      {
        sellers: new Map(),
        profiles: new Map([
          [
            '2',
            {
              id: BigInt(3),
              userId: BigInt(2),
              name: 'Alice',
              studentId: '20240001',
              campus: '下沙校区',
              avatarUrl: 'avatar.jpg',
              major: 'CS',
              grade: '2024',
              credit: 0,
              bio: 'hello',
              createdAt: new Date('2026-01-01T00:00:00.000Z'),
              updatedAt: new Date('2026-01-02T00:00:00.000Z'),
            },
          ],
        ]),
      } as any,
    );

    expect(result).toMatchObject({
      id: 1,
      title: 'Keyboard',
      seller: {
        id: 2,
        studentId: '',
        avatar: 'avatar.jpg',
        profile: {
          id: 3,
          userId: 2,
          name: 'Alice',
          studentId: '20240001',
          campus: '下沙校区',
          avatarUrl: 'avatar.jpg',
          major: 'CS',
          grade: '2024',
          bio: 'hello',
        },
      },
      category: {
        id: 6,
        name: '数码',
        icon: undefined,
      },
      images: [{ id: 9, productId: 1, url: 'image-1.jpg' }],
    });
  });
});
