import { prisma } from '../utils/prisma.util';
import {
  ChatSession,
  ChatSessionWithDetails,
  ChatMessage,
  ChatMessageWithSender,
  SendMessageRequest,
  StartChatRequest,
  MessageType,
  User,
  UserProfile,
  Product,
} from '../types/shared';
import { BusinessException, NotFoundException, ForbiddenException } from '../utils/error.util';

export class ChatService {
  /**
   * 杞崲鐢ㄦ埛淇℃伅
   */
  private async convertUser(userId: bigint): Promise<User & { profile?: UserProfile }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const profile = await prisma.userProfile.findFirst({
      where: { userId: userId },
    });

    return {
      id: Number(user.id),
      studentId: user.studentId,
      email: user.phone || '',
      role: user.role,
      avatar: profile?.avatarUrl || undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      profile: profile ? {
        id: Number(profile.id),
        userId: Number(profile.userId),
        name: profile.name || undefined,
        nickname: profile.name || undefined,
        studentId: profile.studentId || undefined,
        phone: user.phone || undefined,
        location: profile.campus || undefined,
        bio: profile.bio || undefined,
      } : undefined,
    };
  }

  /**
   * 杞崲鍟嗗搧淇℃伅
   */
  private async convertProduct(productId: bigint): Promise<Product | null> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        images: {
          orderBy: { sort_order: 'asc' },
        },
      },
    });

    if (!product) {
      // 鍟嗗搧宸茶鍒犻櫎锛岃繑鍥?null 鑰屼笉鏄姏鍑洪敊璇?
      return null;
    }

    const result: any = {
      id: Number(product.id),
      title: product.title,
      description: product.description,
      price: Number(product.price),
      originalPrice: product.originalPrice ? Number(product.originalPrice) : undefined,
      categoryId: product.categoryId ? Number(product.categoryId) : undefined,
      location: product.location || undefined,
      status: product.status,
      viewCount: Number(product.viewCount),
      sellerId: Number(product.sellerId),
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
    
    // 娣诲姞 images 瀛楁
    if (product.images) {
      result.images = product.images.map((img: any) => img.url);
    }
    
    return result;
  }

  /**
   * 杞崲鑱婂ぉ浼氳瘽
   */
  private async convertSession(
    session: any,
    includeDetails: boolean = false,
    currentUserId?: number
  ): Promise<ChatSession | ChatSessionWithDetails> {
    const result: any = {
      id: Number(session.id),
      productId: Number(session.productId),
      buyerId: Number(session.buyerId),
      sellerId: Number(session.sellerId),
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };

    if (includeDetails) {
      // 鑾峰彇鍟嗗搧淇℃伅
      const product = await this.convertProduct(session.productId);
      
      // 濡傛灉鍟嗗搧涓嶅瓨鍦紙宸茶鍒犻櫎锛夛紝璺宠繃姝や細璇?
      if (!product) {
        return null as any; // 杩斿洖 null锛岃皟鐢ㄦ柟浼氳繃婊ゆ帀
      }
      
      result.product = product;

      // 鑾峰彇涔板淇℃伅
      const buyer = await this.convertUser(session.buyerId);
      result.buyer = buyer;

      // 鑾峰彇鍗栧淇℃伅
      const seller = await this.convertUser(session.sellerId);
      result.seller = seller;

      // 纭畾鑱婂ぉ瀵硅薄锛坧artner锛夛細濡傛灉褰撳墠鐢ㄦ埛鏄拱瀹讹紝鍒欏鏂规槸鍗栧锛涘弽涔嬩害鐒?
      if (currentUserId) {
        const isBuyer = Number(session.buyerId) === currentUserId;
        const partner = isBuyer ? seller : buyer;
        
        result.partnerId = partner.id;
        result.partnerName = partner.profile?.name || partner.studentId;
        result.partnerAvatar = partner.avatar || null;
        
        // 娣诲姞鍟嗗搧缂╃暐鍥剧瓑淇℃伅
        const productImages = (product as any).images;
        if (productImages && productImages.length > 0) {
          result.productThumbnail = productImages[0];
        }
        result.productTitle = product.title;
        result.productPrice = product.price;
      }

      // 鑾峰彇鏈€鍚庝竴鏉℃秷鎭?
      const lastMessage = await prisma.chatMessage.findFirst({
        where: { sessionId: session.id },
        orderBy: { createdAt: 'desc' },
      });

      if (lastMessage) {
        result.lastMessage = {
          id: Number(lastMessage.id),
          sessionId: Number(lastMessage.sessionId),
          senderId: Number(lastMessage.senderId),
          content: lastMessage.content,
          type: lastMessage.type as MessageType,
          isRecalled: lastMessage.isRecalled,
          createdAt: lastMessage.createdAt,
        };
        result.lastTime = lastMessage.createdAt;
      }
      
      // 璁＄畻鏈娑堟伅鏁帮紙瀵规柟鍙戦€佺粰鎴戠殑鏈娑堟伅锛?
      if (currentUserId) {
        const unreadCount = await prisma.chatMessage.count({
          where: {
            sessionId: session.id,
            senderId: { not: BigInt(currentUserId) },
            isRead: false,
          },
        });
        result.unreadCount = unreadCount;
      }
    }

    return result;
  }

  /**
   * 杞崲鑱婂ぉ娑堟伅
   */
  private async convertMessage(
    message: any,
    includeSender: boolean = false
  ): Promise<ChatMessage | ChatMessageWithSender> {
    const result: any = {
      id: Number(message.id),
      sessionId: Number(message.sessionId),
      senderId: Number(message.senderId),
      content: message.content,
      type: message.type as MessageType,
      isRecalled: message.isRecalled,
      createdAt: message.createdAt,
    };

    if (includeSender) {
      result.sender = await this.convertUser(message.senderId);
    }

    return result;
  }

  /**
   * 鍙戣捣鑱婂ぉ
   */
  async startChat(userId: number, data: StartChatRequest): Promise<ChatSessionWithDetails> {
    // 楠岃瘉鍟嗗搧鏄惁瀛樺湪
    const product = await prisma.product.findUnique({
      where: { id: BigInt(data.productId) },
    });

    if (!product) {
      throw new NotFoundException('商品不存在');
    }

    // 浠庡晢鍝佷俊鎭腑鑾峰彇鍗栧ID锛堝晢鍝佽〃浣跨敤 sellerId 瀛楁锛?
    const sellerId = Number(product.sellerId);

    // 楠岃瘉鍗栧鏄惁瀛樺湪
    const seller = await prisma.user.findUnique({
      where: { id: BigInt(sellerId) },
    });

    if (!seller) {
      throw new NotFoundException('卖家不存在');
    }

    // 楠岃瘉涓嶈兘鍜岃嚜宸辫亰澶?
    if (sellerId === userId) {
      throw new BusinessException('不能和自己聊天');
    }

    // 鏌ユ壘鎴栧垱寤鸿亰澶╀細璇?
    let session = await prisma.chatSession.findFirst({
      where: {
        productId: BigInt(data.productId),
        buyerId: BigInt(userId),
        sellerId: BigInt(sellerId),
      },
    });

    if (!session) {
      session = await prisma.chatSession.create({
        data: {
          productId: BigInt(data.productId),
          buyerId: BigInt(userId),
          sellerId: BigInt(sellerId),
        },
      });
    }

    return this.convertSession(session, true, userId) as Promise<ChatSessionWithDetails>;
  }

  /**
   * 鑾峰彇鑱婂ぉ浼氳瘽鍒楄〃
   */
  async getChatSessions(userId: number): Promise<ChatSessionWithDetails[]> {
    const sessions = await prisma.chatSession.findMany({
      where: {
        OR: [
          { buyerId: BigInt(userId) },
          { sellerId: BigInt(userId) },
        ],
      },
      orderBy: { updatedAt: 'desc' },
    });

    const convertedSessions = await Promise.all(
      sessions.map((session: any) => this.convertSession(session, true, userId) as Promise<ChatSessionWithDetails | null>)
    );
    
    // 杩囨护鎺夊晢鍝佸凡琚垹闄ょ殑浼氳瘽
    return convertedSessions.filter((session) => session !== null) as ChatSessionWithDetails[];
  }

  /**
   * 鑾峰彇鑱婂ぉ娑堟伅鍒楄〃
   */
  async getChatMessages(userId: number, sessionId: number): Promise<ChatMessageWithSender[]> {
    // 楠岃瘉浼氳瘽鏄惁瀛樺湪
    const session = await prisma.chatSession.findUnique({
      where: { id: BigInt(sessionId) },
    });

    if (!session) {
      throw new NotFoundException('聊天会话不存在');
    }

    // 楠岃瘉鏉冮檺锛氬彧鏈変拱瀹舵垨鍗栧鍙互鏌ョ湅娑堟伅
    if (Number(session.buyerId) !== userId && Number(session.sellerId) !== userId) {
      throw new ForbiddenException('无权查看此聊天');
    }

    const messages = await prisma.chatMessage.findMany({
      where: { sessionId: BigInt(sessionId) },
      orderBy: { createdAt: 'asc' },
    });

    return Promise.all(
      messages.map((message: any) => this.convertMessage(message, true) as Promise<ChatMessageWithSender>)
    );
  }

  /**
   * 鍙戦€佹秷鎭?
   */
  async sendMessage(userId: number, data: SendMessageRequest): Promise<ChatMessageWithSender> {
    // 楠岃瘉浼氳瘽鏄惁瀛樺湪
    const session = await prisma.chatSession.findUnique({
      where: { id: BigInt(data.sessionId) },
    });

    if (!session) {
      throw new NotFoundException('聊天会话不存在');
    }

    // 楠岃瘉鏉冮檺锛氬彧鏈変拱瀹舵垨鍗栧鍙互鍙戦€佹秷鎭?
    if (Number(session.buyerId) !== userId && Number(session.sellerId) !== userId) {
      throw new ForbiddenException('无权在此聊天中发送消息');
    }

    // 楠岃瘉娑堟伅鍐呭
    if (!data.content || data.content.trim().length === 0) {
      throw new BusinessException('娑堟伅鍐呭涓嶈兘涓虹┖');
    }

    // 鍒涘缓娑堟伅
    const message = await prisma.chatMessage.create({
      data: {
        sessionId: BigInt(data.sessionId),
        senderId: BigInt(userId),
        content: data.content,
        type: data.type || MessageType.TEXT,
        isRecalled: false,
        isRead: false,
      },
    });

    // 鏇存柊浼氳瘽鐨?updatedAt
    await prisma.chatSession.update({
      where: { id: BigInt(data.sessionId) },
      data: { updatedAt: new Date() },
    });

    return this.convertMessage(message, true) as Promise<ChatMessageWithSender>;
  }

  /**
   * 鏍囪娑堟伅宸茶
   */
  async markAsRead(userId: number, sessionId: number): Promise<void> {
    // 楠岃瘉浼氳瘽鏄惁瀛樺湪
    const session = await prisma.chatSession.findUnique({
      where: { id: BigInt(sessionId) },
    });

    if (!session) {
      throw new NotFoundException('聊天会话不存在');
    }

    // 楠岃瘉鏉冮檺锛氬彧鏈変拱瀹舵垨鍗栧鍙互鏍囪宸茶
    if (Number(session.buyerId) !== userId && Number(session.sellerId) !== userId) {
      throw new ForbiddenException('无权操作此聊天');
    }

    // 鏍囪鎵€鏈夊鏂瑰彂閫佺殑鏈娑堟伅涓哄凡璇?
    await prisma.chatMessage.updateMany({
      where: {
        sessionId: BigInt(sessionId),
        senderId: { not: BigInt(userId) },
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
  }

  /**
   * 鎾ゅ洖娑堟伅
   */
  async recallMessage(userId: number, messageId: number): Promise<ChatMessageWithSender> {
    // 楠岃瘉娑堟伅鏄惁瀛樺湪
    const message = await prisma.chatMessage.findUnique({
      where: { id: BigInt(messageId) },
    });

    if (!message) {
      throw new NotFoundException('消息不存在');
    }

    // 楠岃瘉鏉冮檺锛氬彧鏈夊彂閫佽€呭彲浠ユ挙鍥炴秷鎭?
    if (Number(message.senderId) !== userId) {
      throw new ForbiddenException('只能撤回自己的消息');
    }

    // 楠岃瘉娑堟伅鏄惁宸茬粡鎾ゅ洖
    if (message.isRecalled) {
      throw new BusinessException('娑堟伅宸茬粡鎾ゅ洖');
    }

    // 楠岃瘉鎾ゅ洖鏃堕棿锛氬彧鑳芥挙鍥?鍒嗛挓鍐呯殑娑堟伅
    const now = new Date();
    const messageTime = new Date(message.createdAt);
    const diffMinutes = (now.getTime() - messageTime.getTime()) / 1000 / 60;

    if (diffMinutes > 2) {
      throw new BusinessException('鍙兘鎾ゅ洖2鍒嗛挓鍐呯殑娑堟伅');
    }

    // 鎾ゅ洖娑堟伅
    const updatedMessage = await prisma.chatMessage.update({
      where: { id: BigInt(messageId) },
      data: { isRecalled: true },
    });

    return this.convertMessage(updatedMessage, true) as Promise<ChatMessageWithSender>;
  }
}
