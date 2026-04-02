import request from './axios';
import type {
  AdminCategoryListItem,
  AdminOrderListResponse,
  AdminProductListResponse,
  AdminStatistics,
  AdminUserListResponse,
  AdminUserStatusUpdate,
  ApiResponse,
  AuthResponse,
  Category,
  ChatMessageWithSender,
  ChatSessionWithDetails,
  CreateOrderRequest,
  CreateProductRequest,
  FavoriteWithProduct,
  LoginRequest,
  Order,
  OrderWithDetails,
  PageResponse,
  Product,
  ProductListItem,
  ProductWithDetails,
  RegisterRequest,
  ResetPasswordRequest,
  SendMessageRequest,
  UpdateProductRequest,
  UpdateProfileRequest,
  UploadResponse,
  User,
} from '@campus-market/shared';

export const authApi = {
  login: (data: LoginRequest): Promise<ApiResponse<AuthResponse>> =>
    request.post('/auth/login', data),

  register: (data: RegisterRequest): Promise<ApiResponse<AuthResponse>> =>
    request.post('/auth/register', data),

  me: (): Promise<ApiResponse<User>> => request.get('/auth/me'),

  resetPassword: (data: ResetPasswordRequest): Promise<ApiResponse<void>> =>
    request.post('/auth/reset-password', data),
};

export const productApi = {
  getLatest: (): Promise<ApiResponse<ProductListItem[]>> =>
    request.get('/products/latest'),

  getList: (params: {
    categoryId?: number;
    keyword?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
    page?: number;
    size?: number;
  }): Promise<ApiResponse<PageResponse<ProductListItem>>> =>
    request.get('/products', { params }),

  getDetail: (id: number): Promise<ApiResponse<ProductWithDetails>> =>
    request.get(`/products/${id}`),

  increaseView: (id: number): Promise<ApiResponse<void>> =>
    request.post(`/products/${id}/view`),

  create: (data: CreateProductRequest): Promise<ApiResponse<ProductWithDetails>> =>
    request.post('/products', data),

  update: (id: number, data: UpdateProductRequest): Promise<ApiResponse<ProductWithDetails>> =>
    request.put(`/products/${id}`, data),

  delete: (id: number): Promise<ApiResponse<void>> =>
    request.delete(`/products/${id}`),

  getCategories: (): Promise<ApiResponse<Category[]>> =>
    request.get('/categories'),

  updateStatus: (id: number, status: string): Promise<ApiResponse<Product>> =>
    request.patch(`/products/${id}/status`, { status }),
};

export const userApi = {
  getProfile: (id: number): Promise<ApiResponse<User>> =>
    request.get(`/users/${id}`),

  getMyProducts: (status?: string): Promise<ApiResponse<ProductListItem[]>> =>
    request.get('/users/me/products', { params: { status } }),

  getUserProducts: (id: number, status?: string): Promise<ApiResponse<ProductListItem[]>> =>
    request.get(`/users/${id}/products`, { params: { status } }),

  updateProfile: (data: UpdateProfileRequest): Promise<ApiResponse<User>> =>
    request.put('/users/me', data),
};

export const orderApi = {
  create: (data: CreateOrderRequest): Promise<ApiResponse<OrderWithDetails>> =>
    request.post('/orders', data),

  getDetail: (id: number): Promise<ApiResponse<OrderWithDetails>> =>
    request.get(`/orders/${id}`),

  getMyOrders: (role?: string, status?: string): Promise<ApiResponse<OrderWithDetails[]>> =>
    request.get('/orders/me', { params: { role, status } }),

  confirm: (id: number): Promise<ApiResponse<Order>> =>
    request.post(`/orders/${id}/confirm`),

  ship: (id: number): Promise<ApiResponse<Order>> =>
    request.post(`/orders/${id}/ship`),

  complete: (id: number): Promise<ApiResponse<Order>> =>
    request.post(`/orders/${id}/complete`),

  cancel: (id: number): Promise<ApiResponse<Order>> =>
    request.post(`/orders/${id}/cancel`),
};

export const chatApi = {
  getList: (): Promise<ApiResponse<ChatSessionWithDetails[]>> =>
    request.get('/chat/sessions'),

  getMessages: (sessionId: number): Promise<ApiResponse<ChatMessageWithSender[]>> =>
    request.get(`/chat/sessions/${sessionId}/messages`),

  sendMessage: (
    sessionId: number,
    data: Omit<SendMessageRequest, 'sessionId'>
  ): Promise<ApiResponse<ChatMessageWithSender>> =>
    request.post('/chat/messages', { ...data, sessionId }),

  startChat: (productId: number): Promise<ApiResponse<ChatSessionWithDetails>> =>
    request.post('/chat/start', { productId }),

  markAsRead: (sessionId: number): Promise<ApiResponse<void>> =>
    request.post(`/chat/sessions/${sessionId}/read`),

  recallMessage: (messageId: number): Promise<ApiResponse<void>> =>
    request.post(`/chat/messages/${messageId}/recall`),
};

export const fileApi = {
  uploadImage: (
    file: File,
    type: 'avatar' | 'product' | 'chat' = 'product'
  ): Promise<ApiResponse<UploadResponse>> => {
    const formData = new FormData();
    const fieldName = type === 'avatar' ? 'avatar' : 'image';
    formData.append(fieldName, file);

    return request.post(`/upload/${type}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

export const favoriteApi = {
  listMy: (): Promise<ApiResponse<FavoriteWithProduct[]>> =>
    request.get('/favorites'),

  add: (productId: number): Promise<ApiResponse<FavoriteWithProduct>> =>
    request.post(`/favorites/${productId}`),

  remove: (productId: number): Promise<ApiResponse<void>> =>
    request.delete(`/favorites/${productId}`),
};

export const adminApi = {
  getStatistics: (): Promise<ApiResponse<AdminStatistics>> =>
    request.get('/admin/statistics'),

  getAllUsers: (params: {
    page?: number;
    pageSize?: number;
    keyword?: string;
  }): Promise<ApiResponse<AdminUserListResponse>> =>
    request.get('/admin/users', { params }),

  toggleUserStatus: (userId: number): Promise<ApiResponse<AdminUserStatusUpdate>> =>
    request.put(`/admin/users/${userId}/toggle-status`),

  getAllProducts: (params: {
    page?: number;
    pageSize?: number;
    keyword?: string;
  }): Promise<ApiResponse<AdminProductListResponse>> =>
    request.get('/admin/products', { params }),

  deleteProduct: (productId: number): Promise<ApiResponse<void>> =>
    request.delete(`/admin/products/${productId}`),

  getAllOrders: (params: {
    page?: number;
    pageSize?: number;
    keyword?: string;
  }): Promise<ApiResponse<AdminOrderListResponse>> =>
    request.get('/admin/orders', { params }),

  getAllCategories: (): Promise<ApiResponse<AdminCategoryListItem[]>> =>
    request.get('/admin/categories'),

  createCategory: (name: string): Promise<ApiResponse<Pick<AdminCategoryListItem, 'id' | 'name'>>> =>
    request.post('/admin/categories', { name }),

  deleteCategory: (categoryId: number): Promise<ApiResponse<void>> =>
    request.delete(`/admin/categories/${categoryId}`),
};
