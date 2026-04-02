import express from 'express';
import request from 'supertest';
import { errorHandler } from '../../middlewares/error.middleware';

const mockAuthControllerHandlers = {
  register: jest.fn((req, res) => res.json({ success: true })),
  login: jest.fn((req, res) => res.json({ success: true })),
  getCurrentUser: jest.fn((req, res) => res.json({ success: true })),
  resetPassword: jest.fn((req, res) => res.json({ success: true })),
};

jest.mock('../../middlewares/auth.middleware', () => ({
  authenticate: (req: any, res: any, next: any) => {
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
    const response = await request(app).post('/auth/reset-password').send({
      oldPassword: '',
      newPassword: '123',
    });

    expect(response.status).toBe(400);
    expect(mockAuthControllerHandlers.resetPassword).not.toHaveBeenCalled();
  });
});
