import express from 'express';
import request from 'supertest';
import { errorHandler } from '../../middlewares/error.middleware';

const mockOrderControllerHandlers = {
  create: jest.fn((req, res) => res.json({ success: true })),
  getMyOrders: jest.fn((req, res) => res.json({ success: true })),
  getMySalesOrders: jest.fn((req, res) => res.json({ success: true })),
  getDetail: jest.fn((req, res) => res.json({ success: true })),
  ship: jest.fn((req, res) => res.json({ success: true })),
  complete: jest.fn((req, res) => res.json({ success: true })),
  cancel: jest.fn((req, res) => res.json({ success: true })),
};

jest.mock('../../middlewares/auth.middleware', () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = { id: 1 };
    next();
  },
}));

jest.mock('../../controllers/order.controller', () => ({
  OrderController: jest.fn().mockImplementation(() => mockOrderControllerHandlers),
}));

describe('order route validation', () => {
  let orderRoutes: any;
  const app = express();

  beforeAll(() => {
    orderRoutes = require('../order.routes').default;
    app.use(express.json());
    app.use('/orders', orderRoutes);
    app.use(errorHandler);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects a non-numeric order id before the controller runs', async () => {
    const response = await request(app).get('/orders/not-a-number');

    expect(response.status).toBe(400);
    expect(mockOrderControllerHandlers.getDetail).not.toHaveBeenCalled();
  });

  it('rejects invalid order creation payloads', async () => {
    const response = await request(app).post('/orders').send({
      productId: 'abc',
      deliveryAddress: '',
      deliveryPhone: '',
      deliveryName: '',
    });

    expect(response.status).toBe(400);
    expect(mockOrderControllerHandlers.create).not.toHaveBeenCalled();
  });

  it('rejects unsupported order list filters', async () => {
    const response = await request(app).get('/orders/me?role=ADMIN&status=UNKNOWN');

    expect(response.status).toBe(400);
    expect(mockOrderControllerHandlers.getMyOrders).not.toHaveBeenCalled();
  });
});
