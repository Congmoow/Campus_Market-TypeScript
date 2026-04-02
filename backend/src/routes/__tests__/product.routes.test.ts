import express from 'express';
import request from 'supertest';
import { errorHandler } from '../../middlewares/error.middleware';

const mockProductControllerHandlers = {
  getLatest: jest.fn((req, res) => res.json({ success: true })),
  getMyProducts: jest.fn((req, res) => res.json({ success: true })),
  getList: jest.fn((req, res) => res.json({ success: true })),
  getDetail: jest.fn((req, res) => res.json({ success: true })),
  create: jest.fn((req, res) => res.json({ success: true })),
  update: jest.fn((req, res) => res.json({ success: true })),
  delete: jest.fn((req, res) => res.json({ success: true })),
  updateStatus: jest.fn((req, res) => res.json({ success: true })),
  increaseView: jest.fn((req, res) => res.json({ success: true })),
  getUserProducts: jest.fn((req, res) => res.json({ success: true })),
};

jest.mock('../../middlewares/auth.middleware', () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = { id: 1 };
    next();
  },
}));

jest.mock('../../controllers/product.controller', () => ({
  ProductController: jest.fn().mockImplementation(() => mockProductControllerHandlers),
}));

describe('product route validation', () => {
  let productRoutes: any;
  const app = express();

  beforeAll(() => {
    productRoutes = require('../product.routes').default;
    app.use(express.json());
    app.use('/products', productRoutes);
    app.use(errorHandler);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects invalid pagination query values', async () => {
    const response = await request(app).get('/products?page=-1&size=0');

    expect(response.status).toBe(400);
    expect(mockProductControllerHandlers.getList).not.toHaveBeenCalled();
  });

  it('rejects a non-numeric product id before the controller runs', async () => {
    const response = await request(app).get('/products/not-a-number');

    expect(response.status).toBe(400);
    expect(mockProductControllerHandlers.getDetail).not.toHaveBeenCalled();
  });

  it('rejects a non-numeric user id on user product listings', async () => {
    const response = await request(app).get('/products/user/not-a-number');

    expect(response.status).toBe(400);
    expect(mockProductControllerHandlers.getUserProducts).not.toHaveBeenCalled();
  });

  it('rejects invalid product creation payloads before the controller runs', async () => {
    const response = await request(app).post('/products').send({
      title: '',
      description: '',
      price: 0,
      location: '',
      images: [],
    });

    expect(response.status).toBe(400);
    expect(mockProductControllerHandlers.create).not.toHaveBeenCalled();
  });

  it('rejects invalid product status updates before the controller runs', async () => {
    const response = await request(app).patch('/products/1/status').send({
      status: 'DONE',
    });

    expect(response.status).toBe(400);
    expect(mockProductControllerHandlers.updateStatus).not.toHaveBeenCalled();
  });
});
