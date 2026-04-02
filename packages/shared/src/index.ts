type ValueOf<T> = T[keyof T];

export const ProductStatus = {
  ON_SALE: 'ON_SALE',
  RESERVED: 'RESERVED',
  SOLD: 'SOLD',
  DELETED: 'DELETED',
} as const;

export type ProductStatus = ValueOf<typeof ProductStatus>;

export const OrderStatus = {
  PENDING: 'PENDING',
  SHIPPED: 'SHIPPED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type OrderStatus = ValueOf<typeof OrderStatus>;

export const MessageType = {
  TEXT: 'TEXT',
  IMAGE: 'IMAGE',
  SYSTEM: 'SYSTEM',
} as const;

export type MessageType = ValueOf<typeof MessageType>;

export interface UserProfile {
  id: number;
  userId: number;
  name?: string;
  studentId?: string;
  phone?: string | null;
  campus?: string;
  avatarUrl?: string;
  major?: string;
  grade?: string;
  bio?: string;
  // Legacy aliases kept temporarily to avoid breaking the current frontend.
  nickname?: string;
  location?: string;
}

export interface User {
  id: number;
  studentId: string;
  phone?: string | null;
  role?: string;
  avatar?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  profile?: UserProfile;
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

export interface AuthTokenPayload {
  id: number;
  studentId: string;
  phone?: string | null;
  role: string;
  exp?: number;
  iat?: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface UpdateProfileRequest {
  name?: string;
  studentId?: string;
  phone?: string | null;
  campus?: string;
  major?: string;
  grade?: string;
  bio?: string;
  avatarUrl?: string;
  // Legacy aliases kept temporarily to avoid breaking the current frontend.
  nickname?: string;
  location?: string;
  avatar?: string;
}

export interface ResetPasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface Category {
  id: number;
  name: string;
  icon?: string;
}

export interface ProductImage {
  id: number;
  productId: number;
  url: string;
}

export interface Product {
  id: number;
  title: string;
  description: string;
  price: number;
  originalPrice?: number | null;
  categoryId?: number;
  location?: string;
  status: ProductStatus | string;
  viewCount: number;
  sellerId: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ProductWithDetails extends Product {
  images: ProductImage[];
  seller: User;
  category?: Category;
}

export interface ProductListItem extends Product {
  images: ProductImage[];
  seller: User;
}

export interface CreateProductRequest {
  title: string;
  description: string;
  price: number;
  originalPrice?: number | null;
  categoryId?: number;
  categoryName?: string | null;
  location: string;
  images: string[];
}

export interface UpdateProductRequest {
  title?: string;
  description?: string;
  price?: number;
  originalPrice?: number | null;
  categoryId?: number;
  categoryName?: string | null;
  location?: string;
  images?: string[];
}

export interface UpdateProductStatusRequest {
  status: ProductStatus | string;
}

export interface Order {
  id: number;
  orderNo: string;
  productId: number;
  buyerId: number;
  sellerId: number;
  priceSnapshot: number;
  status: OrderStatus | string;
  meetLocation?: string | null;
  meetTime?: Date | string | null;
  remark?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface OrderWithDetails extends Order {
  product?: ProductWithDetails;
  buyer: User;
  seller: User;
  productTitle?: string;
  productImage?: string;
  productPrice?: number;
  buyerName?: string;
  buyerAvatar?: string;
  sellerName?: string;
  sellerAvatar?: string;
}

export interface CreateOrderRequest {
  productId: number;
  meetLocation: string;
  contactPhone: string;
  contactName: string;
  remark?: string;
}

export interface ChatSession {
  id: number;
  productId: number;
  buyerId: number;
  sellerId: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ChatMessage {
  id: number;
  sessionId: number;
  senderId: number;
  content: string;
  type: MessageType;
  isRecalled: boolean;
  createdAt: Date | string;
}

export interface ChatSessionWithDetails extends ChatSession {
  product: Product;
  buyer: User;
  seller: User;
  lastMessage?: ChatMessage;
  partnerId?: number;
  partnerName?: string;
  partnerAvatar?: string | null;
  productThumbnail?: string;
  productTitle?: string;
  productPrice?: number;
  lastTime?: Date | string;
  unreadCount?: number;
}

export interface ChatMessageWithSender extends ChatMessage {
  sender: User;
}

export interface SendMessageRequest {
  sessionId: number;
  content: string;
  type: MessageType;
}

export interface StartChatRequest {
  productId: number;
  sellerId?: number;
}

export interface Favorite {
  id: number;
  userId: number;
  productId: number;
  createdAt: Date | string;
}

export interface FavoriteWithProduct extends Favorite {
  product: ProductWithDetails;
}

export interface ApiResponse<T = unknown> {
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

export interface UploadResponse {
  url: string;
  filename: string;
}
