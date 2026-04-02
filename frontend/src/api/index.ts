import request from './axios';
import type {
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

  updateProfile: (data: UpdateProfileRequest): Promise<ApiResponse<User>> => {
    const normalizedData: UpdateProfileRequest = {
      ...data,
    };

    if (data.nickname !== undefined && normalizedData.name === undefined) {
      normalizedData.name = data.nickname;
    }
    if (data.campus !== undefined && normalizedData.location === undefined) {
      normalizedData.location = data.campus;
    }
    if (data.location !== undefined && normalizedData.campus === undefined) {
      normalizedData.campus = data.location;
    }
    if (data.avatarUrl !== undefined && normalizedData.avatar === undefined) {
      normalizedData.avatar = data.avatarUrl;
    }
    if (data.avatar !== undefined && normalizedData.avatarUrl === undefined) {
      normalizedData.avatarUrl = data.avatar;
    }

    return request.put('/users/me', normalizedData);
  },
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
  getStatistics: (): Promise<ApiResponse<{
    totalUsers: number;
    totalProducts: number;
    totalOrders: number;
    activeUsers: number;
    todayUsers: number;
    todayProducts: number;
    todayOrders: number;
    orderStatusDistribution: Array<{
      status: string;
      count: number;
    }>;
    salesTrend: Array<{
      date: string;
      amount: number;
    }>;
    userGrowthTrend: Array<{
      month: string;
      users: number;
      newUsers: number;
    }>;
  }>> =>
    request.get('/admin/statistics'),

  getAllUsers: (params: {
    page?: number;
    pageSize?: number;
    keyword?: string;
  }): Promise<ApiResponse<{
    users: Array<{
      id: number;
      studentId: string;
      phone: string | null;
      role: string;
      enabled: boolean;
      createdAt: Date;
      updatedAt: Date;
    }>;
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>> =>
    request.get('/admin/users', { params }),

  toggleUserStatus: (userId: number): Promise<ApiResponse<{
    id: number;
    studentId: string;
    enabled: boolean;
  }>> =>
    request.put(`/admin/users/${userId}/toggle-status`),

  getAllProducts: (params: {
    page?: number;
    pageSize?: number;
    keyword?: string;
  }): Promise<ApiResponse<{
    products: Array<{
      id: number;
      sellerId: number;
      title: string;
      description: string;
      price: number;
      status: string;
      viewCount: number;
      imageUrl?: string;
      createdAt: Date;
    }>;
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>> =>
    request.get('/admin/products', { params }),

  deleteProduct: (productId: number): Promise<ApiResponse<void>> =>
    request.delete(`/admin/products/${productId}`),

  getAllOrders: (params: {
    page?: number;
    pageSize?: number;
    keyword?: string;
  }): Promise<ApiResponse<{
    orders: Array<{
      id: number;
      orderNo: string;
      buyerId: number;
      sellerId: number;
      productId: number;
      status: string;
      priceSnapshot: number;
      meetLocation: string | null;
      meetTime: Date | null;
      createdAt: Date;
      updatedAt: Date;
    }>;
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>> =>
    request.get('/admin/orders', { params }),

  getAllCategories: (): Promise<ApiResponse<Array<{
    id: number;
    name: string;
    productCount: number;
  }>>> =>
    request.get('/admin/categories'),

  createCategory: (name: string): Promise<ApiResponse<{
    id: number;
    name: string;
  }>> =>
    request.post('/admin/categories', { name }),

  deleteCategory: (categoryId: number): Promise<ApiResponse<void>> =>
    request.delete(`/admin/categories/${categoryId}`),
};
