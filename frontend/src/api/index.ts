import request from './axios';
import type {
  // 用户相关类型
  User,
  UserProfile,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  UpdateProfileRequest,
  ResetPasswordRequest,
  // 商品相关类型
  Product,
  ProductWithDetails,
  ProductListItem,
  CreateProductRequest,
  UpdateProductRequest,
  Category,
  // 订单相关类型
  Order,
  OrderWithDetails,
  CreateOrderRequest,
  // 聊天相关类型
  ChatSessionWithDetails,
  ChatMessageWithSender,
  SendMessageRequest,
  // 收藏类型
  FavoriteWithProduct,
  // API 响应类型
  ApiResponse,
  PageResponse,
  UploadResponse,
} from '../../../backend/src/types/shared';

export const authApi = {
  login: (data: LoginRequest): Promise<ApiResponse<AuthResponse>> => 
    request.post('/auth/login', data),
  
  register: (data: RegisterRequest): Promise<ApiResponse<AuthResponse>> => 
    request.post('/auth/register', data),
  
  me: (): Promise<ApiResponse<User & { profile?: UserProfile }>> => 
    request.get('/auth/me'),
  
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
  getProfile: (id: number): Promise<ApiResponse<User & { profile?: UserProfile }>> => 
    request.get(`/users/${id}`),
  
  getMyProducts: (status?: string): Promise<ApiResponse<ProductListItem[]>> => 
    request.get('/users/me/products', { params: { status } }),
  
  getUserProducts: (id: number, status?: string): Promise<ApiResponse<ProductListItem[]>> => 
    request.get(`/users/${id}/products`, { params: { status } }),
  
  updateProfile: (data: UpdateProfileRequest): Promise<ApiResponse<User & { profile?: UserProfile }>> => {
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
  // 获取聊天会话列表
  getList: (): Promise<ApiResponse<ChatSessionWithDetails[]>> => 
    request.get('/chat/sessions'),
  
  // 获取聊天消息列表
  getMessages: (sessionId: number): Promise<ApiResponse<ChatMessageWithSender[]>> => 
    request.get(`/chat/sessions/${sessionId}/messages`),
  
  // 发送消息
  sendMessage: (sessionId: number, data: Omit<SendMessageRequest, 'sessionId'>): Promise<ApiResponse<ChatMessageWithSender>> => 
    request.post('/chat/messages', { ...data, sessionId }),
  
  // 发起聊天
  startChat: (productId: number): Promise<ApiResponse<ChatSessionWithDetails>> => 
    request.post('/chat/start', { productId }),
  
  // 标记会话已读
  markAsRead: (sessionId: number): Promise<ApiResponse<void>> => 
    request.post(`/chat/sessions/${sessionId}/read`),
  
  // 撤回消息
  recallMessage: (messageId: number): Promise<ApiResponse<void>> => 
    request.post(`/chat/messages/${messageId}/recall`),
};

export const fileApi = {
  /**
   * 上传图片
   * @param file 文件
   * @param type 类型: avatar(头像), product(商品图片), chat(聊天图片)
   */
  uploadImage: (file: File, type: 'avatar' | 'product' | 'chat' = 'product'): Promise<ApiResponse<UploadResponse>> => {
    const formData = new FormData();
    // 根据不同类型使用不同的字段名
    const fieldName = type === 'avatar' ? 'avatar' : 'image';
    formData.append(fieldName, file);
    
    // 根据类型调用不同的上传接口
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

// 管理员 API
export const adminApi = {
  // 获取统计数据
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
  
  // 用户管理
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
  
  // 商品管理
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
  
  // 订单管理
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
  
  // 分类管理
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
