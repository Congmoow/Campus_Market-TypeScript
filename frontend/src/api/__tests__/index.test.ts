import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  authApi,
  productApi,
  userApi,
  orderApi,
  chatApi,
  fileApi,
  favoriteApi,
} from '../index';
import request from '../axios';
import type {
  LoginRequest,
  RegisterRequest,
  CreateProductRequest,
  CreateOrderRequest,
  SendMessageRequest,
} from '@campus-market/shared';

// Mock axios instance
vi.mock('../axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('API Client Type Safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authApi', () => {
    it('should call login with correct types', async () => {
      const loginData: LoginRequest = {
        studentId: '20230001',
        password: 'password123',
      };

      const mockResponse = {
        success: true,
        data: {
          token: 'jwt-token',
          user: {
            id: 1,
            studentId: '20230001',
            phone: '13800138000',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      };

      (request.post as any).mockResolvedValue(mockResponse);

      const result = await authApi.login(loginData);

      expect(request.post).toHaveBeenCalledWith('/auth/login', loginData);
      expect(result.success).toBe(true);
      expect(result.data.token).toBe('jwt-token');
    });

    it('should call register with correct types', async () => {
      const registerData: RegisterRequest = {
        studentId: '20230002',
        password: 'password123',
        phone: '13800138001',
      };

      (request.post as any).mockResolvedValue({
        success: true,
        data: { token: 'jwt-token', user: {} },
      });

      await authApi.register(registerData);

      expect(request.post).toHaveBeenCalledWith('/auth/register', registerData);
    });

    it('should call me endpoint', async () => {
      (request.get as any).mockResolvedValue({
        success: true,
        data: { id: 1, studentId: '20230001' },
      });

      await authApi.me();

      expect(request.get).toHaveBeenCalledWith('/auth/me');
    });
  });

  describe('productApi', () => {
    it('should get latest products', async () => {
      (request.get as any).mockResolvedValue({
        success: true,
        data: [],
      });

      await productApi.getLatest();

      expect(request.get).toHaveBeenCalledWith('/products/latest');
    });

    it('should get product list with params', async () => {
      const params = {
        categoryId: 1,
        keyword: 'test',
        sort: 'priceAsc',
        page: 0,
        size: 20,
      };

      (request.get as any).mockResolvedValue({
        success: true,
        data: {
          content: [],
          totalElements: 0,
          totalPages: 0,
          size: 20,
          number: 0,
        },
      });

      await productApi.getList(params);

      expect(request.get).toHaveBeenCalledWith('/products', { params });
    });

    it('should create product with correct types', async () => {
      const productData: CreateProductRequest = {
        title: 'Test Product',
        description: 'Test Description',
        price: 100,
        categoryId: 1,
        location: 'Test Location',
        images: ['image1.jpg'],
      };

      (request.post as any).mockResolvedValue({
        success: true,
        data: { id: 1, ...productData },
      });

      await productApi.create(productData);

      expect(request.post).toHaveBeenCalledWith('/products', productData);
    });

    it('should update product status', async () => {
      (request.patch as any).mockResolvedValue({
        success: true,
        data: {},
      });

      await productApi.updateStatus(1, 'SOLD');

      expect(request.patch).toHaveBeenCalledWith('/products/1/status', {
        status: 'SOLD',
      });
    });
  });

  describe('userApi', () => {
    it('should send the canonical profile-edit payload to updateProfile', async () => {
      (request.put as any).mockResolvedValue({
        success: true,
        data: {},
      });

      await userApi.updateProfile({
        name: 'New Name',
        studentId: '20230001',
        major: 'Software Engineering',
        grade: '2023',
        campus: 'Zijingang',
        bio: 'New bio',
        avatarUrl: '/new.png',
      } as any);

      expect(request.put).toHaveBeenCalledWith('/users/me', {
        name: 'New Name',
        studentId: '20230001',
        major: 'Software Engineering',
        grade: '2023',
        campus: 'Zijingang',
        bio: 'New bio',
        avatarUrl: '/new.png',
      });
    });
  });

  describe('orderApi', () => {
    it('should create order with correct types', async () => {
      const orderData: CreateOrderRequest = {
        productId: 1,
        meetLocation: 'Test Address',
        contactPhone: '1234567890',
        contactName: 'Test Name',
      };

      (request.post as any).mockResolvedValue({
        success: true,
        data: { id: 1, ...orderData },
      });

      await orderApi.create(orderData);

      expect(request.post).toHaveBeenCalledWith('/orders', orderData);
    });

    it('should get my orders with filters', async () => {
      (request.get as any).mockResolvedValue({
        success: true,
        data: [],
      });

      await orderApi.getMyOrders('buyer', 'PENDING');

      expect(request.get).toHaveBeenCalledWith('/orders/me', {
        params: { role: 'buyer', status: 'PENDING' },
      });
    });
  });

  describe('chatApi', () => {
    it('should send message with correct types', async () => {
      const messageData: Omit<SendMessageRequest, 'sessionId'> = {
        content: 'Hello',
        type: 'TEXT',
      };

      (request.post as any).mockResolvedValue({
        success: true,
        data: { id: 1, ...messageData },
      });

      await chatApi.sendMessage(1, messageData);

      expect(request.post).toHaveBeenCalledWith('/chat/messages', { ...messageData, sessionId: 1 });
    });

    it('should start chat', async () => {
      (request.post as any).mockResolvedValue({
        success: true,
        data: { id: 1 },
      });

      await chatApi.startChat(1);

      expect(request.post).toHaveBeenCalledWith('/chat/start', { productId: 1 });
    });

    it('should get chat sessions', async () => {
      (request.get as any).mockResolvedValue({
        success: true,
        data: [],
      });

      await chatApi.getList();

      expect(request.get).toHaveBeenCalledWith('/chat/sessions');
    });

    it('should get messages for session', async () => {
      (request.get as any).mockResolvedValue({
        success: true,
        data: [],
      });

      await chatApi.getMessages(1);

      expect(request.get).toHaveBeenCalledWith('/chat/sessions/1/messages');
    });

    it('should mark session as read', async () => {
      (request.post as any).mockResolvedValue({
        success: true,
        data: null,
      });

      await chatApi.markAsRead(1);

      expect(request.post).toHaveBeenCalledWith('/chat/sessions/1/read');
    });

    it('should recall message', async () => {
      (request.post as any).mockResolvedValue({
        success: true,
        data: null,
      });

      await chatApi.recallMessage(1);

      expect(request.post).toHaveBeenCalledWith('/chat/messages/1/recall');
    });
  });

  describe('fileApi', () => {
    it('should upload image with correct type', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      (request.post as any).mockResolvedValue({
        success: true,
        data: { url: '/uploads/test.jpg' },
      });

      await fileApi.uploadImage(file, 'product');

      expect(request.post).toHaveBeenCalled();
      const callArgs = (request.post as any).mock.calls[0];
      expect(callArgs[0]).toBe('/upload/product');
      expect(callArgs[1]).toBeInstanceOf(FormData);
    });
  });

  describe('favoriteApi', () => {
    it('should list favorites', async () => {
      (request.get as any).mockResolvedValue({
        success: true,
        data: [],
      });

      await favoriteApi.listMy();

      expect(request.get).toHaveBeenCalledWith('/favorites');
    });

    it('should add favorite', async () => {
      (request.post as any).mockResolvedValue({
        success: true,
        data: { id: 1, productId: 1 },
      });

      await favoriteApi.add(1);

      expect(request.post).toHaveBeenCalledWith('/favorites/1');
    });

    it('should remove favorite', async () => {
      (request.delete as any).mockResolvedValue({
        success: true,
        data: null,
      });

      await favoriteApi.remove(1);

      expect(request.delete).toHaveBeenCalledWith('/favorites/1');
    });
  });
});

