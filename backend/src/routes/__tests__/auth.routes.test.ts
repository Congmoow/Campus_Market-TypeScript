import express from 'express';
import request from 'supertest';
import { errorHandler } from '../../middlewares/error.middleware';

const mockAuthControllerHandlers = {
  register: jest.fn((req, res) => res.json({ success: true })),
  login: jest.fn((req, res) => res.json({ success: true })),
  refresh: jest.fn((req, res) => res.json({ success: true })),
  logout: jest.fn((req, res) => res.json({ success: true })),
  getCurrentUser: jest.fn((req, res) => res.json({ success: true })),
  resetPassword: jest.fn((req, res) => res.json({ success: true })),
};

jest.mock('../../middlewares/auth.middleware', () => ({
  authenticate: (req: any, res: any, next: any) => {
    const { UnauthorizedException } = require('../../utils/error.util');
    if (!req.headers.authorization) {
      next(new UnauthorizedException('未提供认证令牌'));
      return;
    }
    req.user = { id: 1 };
    next();
  },
}));

jest.mock('../../controllers/auth.controller', () => ({
  AuthController: jest.fn().mockImplementation(() => mockAuthControllerHandlers),
}));

describe('auth route validation', () => {
  let authRoutes: any;
  const app = express();

  beforeAll(() => {
    authRoutes = require('../auth.routes').default;
    app.use(express.json());
    app.use('/auth', authRoutes);
    app.use(errorHandler);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects invalid register payloads before the controller runs', async () => {
    const response = await request(app).post('/auth/register').send({
      studentId: '',
      password: '123',
      phone: 'bad-phone',
      name: '',
    });

    expect(response.status).toBe(400);
    expect(mockAuthControllerHandlers.register).not.toHaveBeenCalled();
  });

  it('rejects invalid login payloads before the controller runs', async () => {
    const response = await request(app).post('/auth/login').send({
      studentId: '',
      password: '',
    });

    expect(response.status).toBe(400);
    expect(mockAuthControllerHandlers.login).not.toHaveBeenCalled();
  });

  it('rejects invalid reset-password payloads before the controller runs', async () => {
    const response = await request(app)
      .post('/auth/reset-password')
      .set('Authorization', 'Bearer test-token')
      .send({
        oldPassword: '',
        newPassword: '123',
      });

    expect(response.status).toBe(400);
    expect(mockAuthControllerHandlers.resetPassword).not.toHaveBeenCalled();
  });

  it('returns the authenticated current user via /auth/me', async () => {
    mockAuthControllerHandlers.getCurrentUser.mockImplementationOnce((req, res) =>
      res.json({
        success: true,
        data: {
          id: 1,
          studentId: '20240001',
          role: 'USER',
        },
      }),
    );

    const response = await request(app).get('/auth/me').set('Authorization', 'Bearer test-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        id: 1,
        studentId: '20240001',
        role: 'USER',
      },
    });
    expect(mockAuthControllerHandlers.getCurrentUser).toHaveBeenCalledTimes(1);
  });

  it('rejects unauthenticated access to /auth/me', async () => {
    const response = await request(app).get('/auth/me');

    expect(response.status).toBe(401);
    expect(mockAuthControllerHandlers.getCurrentUser).not.toHaveBeenCalled();
  });

  it('routes refresh requests without requiring a bearer token', async () => {
    const response = await request(app)
      .post('/auth/refresh')
      .set('Cookie', ['refreshToken=test-token']);

    expect(response.status).toBe(200);
    expect(mockAuthControllerHandlers.refresh).toHaveBeenCalledTimes(1);
  });

  it('routes logout requests without requiring a bearer token', async () => {
    const response = await request(app)
      .post('/auth/logout')
      .set('Cookie', ['refreshToken=test-token']);

    expect(response.status).toBe(200);
    expect(mockAuthControllerHandlers.logout).toHaveBeenCalledTimes(1);
  });
});
