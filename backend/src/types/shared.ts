// ========== 用户相关类型 ==========
export interface User {
  id: number;
  studentId: string;
  email: string;
  role?: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  id: number;
  userId: number;
  name?: string;
  nickname?: string;
  studentId?: string;
  phone?: string;
  location?: string;
  avatarUrl?: string;
  major?: string;
  grade?: string;
  campus?: string;
  bio?: string;
}

export interface LoginRequest {
  studentId: string;
  password: string;
}

export interface RegisterRequest {
  studentId: string;
  password: string;
  phone?: string;
  name?: string;
}

export interface AuthResponse {
  token: string;
  user: User & { profile?: UserProfile };
}

export interface UpdateProfileRequest {
  name?: string;
  nickname?: string;
  studentId?: string;
  phone?: string;
  location?: string;
  campus?: string;
  major?: string;
  grade?: string;
  bio?: string;
  avatar?: string;
  avatarUrl?: string;
}

export interface ResetPasswordRequest {
  oldPassword: string;
  newPassword: string;
}

// ========== 商品相关类型 ==========
export enum ProductStatus {
  ON_SALE = 'ON_SALE',
  RESERVED = 'RESERVED',
  SOLD = 'SOLD',
  DELETED = 'DELETED'
}

export interface Product {
  id: number;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  categoryId?: number;
  location?: string;
  status: string;
  viewCount: number;
  sellerId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductImage {
  id: number;
  productId: number;
  url: string;
}

export interface ProductWithDetails extends Product {
  images: ProductImage[];
  seller: User & { profile?: UserProfile };
  category: Category;
}

export interface ProductListItem extends Product {
  images: ProductImage[];
  seller: User & { profile?: UserProfile };
}

export interface CreateProductRequest {
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  categoryId: number;
  location: string;
  images: string[];
}

export interface UpdateProductRequest {
  title?: string;
  description?: string;
  price?: number;
  originalPrice?: number;
  categoryId?: number;
  location?: string;
  images?: string[];
}

export interface UpdateProductStatusRequest {
  status: string;
}

// ========== 分类类型 ==========
export interface Category {
  id: number;
  name: string;
  icon?: string;
}

// ========== 订单相关类型 ==========
export enum OrderStatus {
  PENDING = 'PENDING',      // 待发货
  SHIPPED = 'SHIPPED',      // 进行中
  COMPLETED = 'COMPLETED',  // 已完成
  CANCELLED = 'CANCELLED'   // 已取消
}

export interface Order {
  id: number;
  orderNo: string;
  productId: number;
  buyerId: number;
  sellerId: number;
  totalAmount: number;
  status: OrderStatus;
  deliveryAddress: string;
  deliveryPhone: string;
  deliveryName: string;
  remark?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderWithDetails extends Order {
  product: ProductWithDetails;
  buyer: User & { profile?: UserProfile };
  seller: User & { profile?: UserProfile };
}

export interface CreateOrderRequest {
  productId: number;
  deliveryAddress: string;
  deliveryPhone: string;
  deliveryName: string;
  remark?: string;
}

// ========== 聊天相关类型 ==========
export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  SYSTEM = 'SYSTEM'
}

export interface ChatSession {
  id: number;
  productId: number;
  buyerId: number;
  sellerId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatSessionWithDetails extends ChatSession {
  product: Product;
  buyer: User & { profile?: UserProfile };
  seller: User & { profile?: UserProfile };
  lastMessage?: ChatMessage;
}

export interface ChatMessage {
  id: number;
  sessionId: number;
  senderId: number;
  content: string;
  type: MessageType;
  isRecalled: boolean;
  createdAt: Date;
}

export interface ChatMessageWithSender extends ChatMessage {
  sender: User & { profile?: UserProfile };
}

export interface SendMessageRequest {
  sessionId: number;
  content: string;
  type: MessageType;
}

export interface StartChatRequest {
  productId: number;
  sellerId?: number; // 可选，后端会从商品信息中自动获取
}

// ========== 收藏类型 ==========
export interface Favorite {
  id: number;
  userId: number;
  productId: number;
  createdAt: Date;
}

export interface FavoriteWithProduct extends Favorite {
  product: ProductWithDetails;
}

// ========== API 响应包装器 ==========
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

// ========== 文件上传类型 ==========
export interface UploadResponse {
  url: string;
  filename: string;
}
