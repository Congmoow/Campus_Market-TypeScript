import request from 'supertest';
import app from '../app';
import { prisma } from '../utils/prisma.util';
import { hashPassword } from '../utils/password.util';

describe('Auth API Integration Tests', () => {
  // 娓呯悊娴嬭瘯鏁版嵁
  afterAll(async () => {
    // 娓呯悊娴嬭瘯鐢ㄦ埛
    await prisma.user.deleteMany({
      where: {
        studentId: {
          startsWith: 'testuser',
        },
      },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          studentId: 'testuser01',
          password: 'password123',
          phone: '13800138001',
          name: 'Test User',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.studentId).toBe('testuser01');
    });

    it('should return error for duplicate studentId', async () => {
      // 鍏堟敞鍐屼竴涓敤鎴?
      await request(app).post('/api/auth/register').send({
        studentId: 'testuser02',
        password: 'password123',
        name: 'Test User 1',
      });

      // 灏濊瘯鐢ㄧ浉鍚岀敤鎴峰悕鍐嶆娉ㄥ唽
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          studentId: 'testuser02',
          password: 'password456',
          name: 'Test User 2',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('学号已存在');
    });

    it('should return validation error for short password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          studentId: 'testuser03',
          password: '12345',
          name: 'Test User',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('密码');
    });

    it('should return validation error for empty studentId', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          studentId: '',
          password: 'password123',
          name: 'Test User',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeAll(async () => {
      // 鍒涘缓娴嬭瘯鐢ㄦ埛
      const hashedPassword = await hashPassword('password123');
      const user = await prisma.user.create({
        data: {
          studentId: 'testuser10',
          passwordHash: hashedPassword,
          phone: '13800138010',
          role: 'USER',
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await prisma.userProfile.create({
        data: {
          userId: user.id,
          name: 'Test User',
          credit: 700,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    });

    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          studentId: 'testuser10',
          password: 'password123',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.studentId).toBe('testuser10');
    });

    it('should return error for invalid studentId', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          studentId: 'nonexistent',
          password: 'password123',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('学号或密码错误');
    });

    it('should return error for invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          studentId: 'testuser10',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('学号或密码错误');
    });

    it('should return validation error for empty credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          studentId: '',
          password: '',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    let authToken: string;

    beforeAll(async () => {
      // 鐧诲綍鑾峰彇 token
      const response = await request(app).post('/api/auth/login').send({
        studentId: 'testuser10',
        password: 'password123',
      });
      authToken = response.body.data.token;
    });

    it('should return current user info with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('studentId');
      expect(response.body.data.studentId).toBe('testuser10');
    });

    it('should return error without token', async () => {
      const response = await request(app).get('/api/auth/me').expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('认证令牌');
    });

    it('should return error with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return error with malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/reset-password', () => {
    let authToken: string;

    beforeAll(async () => {
      // 鐧诲綍鑾峰彇 token
      const response = await request(app).post('/api/auth/login').send({
        studentId: 'testuser10',
        password: 'password123',
      });
      authToken = response.body.data.token;
    });

    it('should reset password successfully', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          oldPassword: 'password123',
          newPassword: 'newpassword123',
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // 楠岃瘉鏂板瘑鐮佸彲浠ョ櫥褰?
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          studentId: 'testuser10',
          password: 'newpassword123',
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);

      // 鎭㈠鍘熷瘑鐮佷互渚垮叾浠栨祴璇曚娇鐢?
      await request(app)
        .post('/api/auth/reset-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          oldPassword: 'newpassword123',
          newPassword: 'password123',
        });
    });

    it('should return error for incorrect old password', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          oldPassword: 'wrongpassword',
          newPassword: 'newpassword123',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('旧密码错误');
    });

    it('should return validation error for short new password', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          oldPassword: 'password123',
          newPassword: '12345',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return error without authentication', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          oldPassword: 'password123',
          newPassword: 'newpassword123',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
