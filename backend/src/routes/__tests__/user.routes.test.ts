import express from 'express';
import request from 'supertest';
import { errorHandler } from '../../middlewares/error.middleware';

const mockUserControllerHandlers = {
  getMyProducts: jest.fn((req, res) => res.json({ success: true })),
  updateProfile: jest.fn((req, res) => res.json({ success: true })),
  getUserProfile: jest.fn((req, res) => res.json({ success: true })),
  getUserProducts: jest.fn((req, res) => res.json({ success: true })),
};

jest.mock('../../middlewares/auth.middleware', () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = { id: 1 };
    next();
  },
}));

jest.mock('../../controllers/user.controller', () => ({
  UserController: jest.fn().mockImplementation(() => mockUserControllerHandlers),
}));

describe('user route validation', () => {
  let userRoutes: any;
  const app = express();

  beforeAll(() => {
    userRoutes = require('../user.routes').default;
    app.use(express.json());
    app.use('/users', userRoutes);
    app.use(errorHandler);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects invalid profile update payloads before the controller runs', async () => {
    const response = await request(app).put('/users/me').send({
      name: '',
      studentId: '',
      phone: 'bad-phone',
      campus: '',
      bio: 'x'.repeat(501),
    });

    expect(response.status).toBe(400);
    expect(mockUserControllerHandlers.updateProfile).not.toHaveBeenCalled();
  });

  it('rejects a non-numeric user id before the controller runs', async () => {
    const response = await request(app).get('/users/not-a-number');

    expect(response.status).toBe(400);
    expect(mockUserControllerHandlers.getUserProfile).not.toHaveBeenCalled();
  });
});
