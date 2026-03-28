import request from 'supertest';
import app from '../app';
import { prisma } from '../utils/prisma.util';
import { hashPassword } from '../utils/password.util';

describe('Product API Integration Tests', () => {
  let authToken: string;
  let userId: bigint;
  let testProductId: number;
  let testCategoryId: number;

  beforeAll(async () => {
    // 鍒涘缓娴嬭瘯鐢ㄦ埛
    const hashedPassword = await hashPassword('password123');
    const user = await prisma.user.create({
      data: {
        studentId: 'testuser20',
        passwordHash: hashedPassword,
        phone: '13800138020',
        role: 'USER',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    userId = user.id;

    await prisma.userProfile.create({
      data: {
        userId: user.id,
        name: 'Test User',
        credit: 700,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // 鐧诲綍鑾峰彇 token
    const loginResponse = await request(app).post('/api/auth/login').send({
      studentId: 'testuser20',
      password: 'password123',
    });
    authToken = loginResponse.body.data.token;

    // 鍒涘缓鎴栬幏鍙栨祴璇曞垎绫?
    let category = await prisma.category.findFirst({
      where: { name: 'Test Category' },
    });
    
    if (!category) {
      category = await prisma.category.create({
        data: {
          name: 'Test Category',
        },
      });
    }
    testCategoryId = Number(category.id);
  });

  afterAll(async () => {
    // 娓呯悊娴嬭瘯鏁版嵁
    await prisma.product.deleteMany({
      where: { sellerId: userId },
    });
    await prisma.userProfile.deleteMany({
      where: { userId },
    });
    // 妫€鏌ョ敤鎴锋槸鍚﹀瓨鍦ㄥ啀鍒犻櫎
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (user) {
      await prisma.user.delete({
        where: { id: userId },
      });
    }
    await prisma.category.deleteMany({
      where: { name: 'Test Category' },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/products', () => {
    it('should create a new product', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Product',
          description: 'Test Description',
          price: 100,
          originalPrice: 150,
          categoryId: testCategoryId,
          location: 'Test Location',
          images: ['image1.jpg', 'image2.jpg'],
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Test Product');
      expect(response.body.data.price).toBe(100);
      expect(response.body.data.images).toHaveLength(2);

      testProductId = response.body.data.id;
    });

    it('should return error for invalid price', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Product',
          description: 'Test Description',
          price: -10,
          categoryId: testCategoryId,
          location: 'Test Location',
          images: [],
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('价格');
    });

    it('should return error for empty title', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '',
          description: 'Test Description',
          price: 100,
          categoryId: testCategoryId,
          location: 'Test Location',
          images: [],
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return error without authentication', async () => {
      const response = await request(app)
        .post('/api/products')
        .send({
          title: 'Test Product',
          description: 'Test Description',
          price: 100,
          categoryId: testCategoryId,
          location: 'Test Location',
          images: [],
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/products/latest', () => {
    it('should return latest products', async () => {
      const response = await request(app)
        .get('/api/products/latest')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/products', () => {
    it('should return paginated product list', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ page: 0, size: 20 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('content');
      expect(response.body.data).toHaveProperty('totalElements');
      expect(response.body.data).toHaveProperty('totalPages');
      expect(Array.isArray(response.body.data.content)).toBe(true);
    });

    it('should filter by category', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ categoryId: testCategoryId, page: 0, size: 20 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.content)).toBe(true);
    });

    it('should filter by keyword', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ keyword: 'Test', page: 0, size: 20 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.content)).toBe(true);
    });

    it('should sort by price ascending', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ sort: 'priceAsc', page: 0, size: 20 })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/products/:id', () => {
    it('should return product detail', async () => {
      const response = await request(app)
        .get(`/api/products/${testProductId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testProductId);
      expect(response.body.data).toHaveProperty('seller');
      expect(response.body.data).toHaveProperty('category');
    });

    it('should return error for non-existent product', async () => {
      const response = await request(app)
        .get('/api/products/999999')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/products/:id', () => {
    it('should update product', async () => {
      const response = await request(app)
        .put(`/api/products/${testProductId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Product',
          price: 120,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Updated Product');
      expect(response.body.data.price).toBe(120);
    });

    it('should return error when updating non-owned product', async () => {
      // 鍒涘缓鍙︿竴涓敤鎴?
      const hashedPassword = await hashPassword('password123');
      const otherUser = await prisma.user.create({
        data: {
          studentId: 'testuser21',
          passwordHash: hashedPassword,
          phone: '13800138021',
          role: 'USER',
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await prisma.userProfile.create({
        data: {
          userId: otherUser.id,
          name: 'Other User',
          credit: 700,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const loginResponse = await request(app).post('/api/auth/login').send({
        studentId: 'testuser21',
        password: 'password123',
      });
      const otherToken = loginResponse.body.data.token;

      const response = await request(app)
        .put(`/api/products/${testProductId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          title: 'Hacked Product',
        })
        .expect(403);

      expect(response.body.success).toBe(false);

      // 娓呯悊
      await prisma.userProfile.deleteMany({
        where: { userId: otherUser.id },
      });
      await prisma.user.delete({
        where: { id: otherUser.id },
      });
    });

    it('should return error without authentication', async () => {
      const response = await request(app)
        .put(`/api/products/${testProductId}`)
        .send({
          title: 'Updated Product',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/products/:id/status', () => {
    it('should update product status', async () => {
      const response = await request(app)
        .patch(`/api/products/${testProductId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'SOLD',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('SOLD');
    });
  });

  describe('POST /api/products/:id/view', () => {
    it('should increase view count', async () => {
      const response = await request(app)
        .post(`/api/products/${testProductId}/view`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('should delete product (soft delete)', async () => {
      const response = await request(app)
        .delete(`/api/products/${testProductId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // 楠岃瘉浜у搧鐘舵€佸凡鏇存敼涓?DELETED
      const product = await prisma.product.findUnique({
        where: { id: BigInt(testProductId) },
      });
      expect(product?.status).toBe('DELETED');
    });

    it('should return error without authentication', async () => {
      const response = await request(app)
        .delete(`/api/products/${testProductId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/categories', () => {
    it('should return category list', async () => {
      const response = await request(app).get('/api/categories').expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});
