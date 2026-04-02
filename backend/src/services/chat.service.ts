import type {
  ChatMessage,
  ChatMessageWithSender,
  ChatSession,
  ChatSessionWithDetails,
  MessageType as MessageTypeValue,
  Product,
  SendMessageRequest,
  StartChatRequest,
  User,
} from '@campus-market/shared';
import { MessageType } from '@campus-market/shared';
import { prisma } from '../utils/prisma.util';
import { mapProductBase, mapUser } from '../mappers/shared.mapper';
import {
  BusinessException,
  ForbiddenException,
  NotFoundException,
} from '../utils/error.util';

type ProductWithImageUrls = Product & { images?: string[] };

export class ChatService {
  private async convertUser(userId: bigint): Promise<User> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const profile = await prisma.userProfile.findFirst({
      where: { userId },
    });

    return mapUser(user, profile);
  }

  private async convertProduct(productId: bigint): Promise<ProductWithImageUrls | null> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        images: {
          orderBy: { sort_order: 'asc' },
        },
      },
    });

    if (!product) {
      return null;
    }

    return {
      ...mapProductBase(product),
      images: product.images.map((image) => image.url),
    };
  }

  private async convertSession(
    session: {
      id: bigint;
      productId: bigint;
      buyerId: bigint;
      sellerId: bigint;
      createdAt: Date;
      updatedAt: Date;
    },
    includeDetails = false,
    currentUserId?: number
  ): Promise<ChatSession | ChatSessionWithDetails | null> {
    const result: ChatSession = {
      id: Number(session.id),
      productId: Number(session.productId),
      buyerId: Number(session.buyerId),
      sellerId: Number(session.sellerId),
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };

    if (!includeDetails) {
      return result;
    }

    const product = await this.convertProduct(session.productId);
    if (!product) {
      return null;
    }

    const [buyer, seller, lastMessage] = await Promise.all([
      this.convertUser(session.buyerId),
      this.convertUser(session.sellerId),
      prisma.chatMessage.findFirst({
        where: { sessionId: session.id },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const detailedSession: ChatSessionWithDetails = {
      ...result,
      product,
      buyer,
      seller,
    };

    if (currentUserId) {
      const partner = Number(session.buyerId) === currentUserId ? seller : buyer;
      detailedSession.partnerId = partner.id;
      detailedSession.partnerName =
        partner.profile?.name || partner.studentId;
      detailedSession.partnerAvatar = partner.avatar || null;
      if (product.images?.length) {
        detailedSession.productThumbnail = product.images[0];
      }
      detailedSession.productTitle = product.title;
      detailedSession.productPrice = product.price;

      const unreadCount = await prisma.chatMessage.count({
        where: {
          sessionId: session.id,
          senderId: { not: BigInt(currentUserId) },
          isRead: false,
        },
      });
      detailedSession.unreadCount = unreadCount;
    }

    if (lastMessage) {
      detailedSession.lastMessage = {
        id: Number(lastMessage.id),
        sessionId: Number(lastMessage.sessionId),
        senderId: Number(lastMessage.senderId),
        content: lastMessage.content,
        type: lastMessage.type as MessageTypeValue,
        isRecalled: lastMessage.isRecalled,
        createdAt: lastMessage.createdAt,
      };
      detailedSession.lastTime = lastMessage.createdAt;
    }

    return detailedSession;
  }

  private async convertMessage(
    message: {
      id: bigint;
      sessionId: bigint;
      senderId: bigint;
      content: string;
      type: string;
      isRecalled: boolean;
      createdAt: Date;
    },
    includeSender = false
  ): Promise<ChatMessage | ChatMessageWithSender> {
    const result: ChatMessage = {
      id: Number(message.id),
      sessionId: Number(message.sessionId),
      senderId: Number(message.senderId),
      content: message.content,
      type: message.type as MessageTypeValue,
      isRecalled: message.isRecalled,
      createdAt: message.createdAt,
    };

    if (!includeSender) {
      return result;
    }

    return {
      ...result,
      sender: await this.convertUser(message.senderId),
    };
  }

  async startChat(userId: number, data: StartChatRequest): Promise<ChatSessionWithDetails> {
    const product = await prisma.product.findUnique({
      where: { id: BigInt(data.productId) },
    });

    if (!product) {
      throw new NotFoundException('商品不存在');
    }

    const sellerId = Number(product.sellerId);
    const seller = await prisma.user.findUnique({
      where: { id: BigInt(sellerId) },
    });

    if (!seller) {
      throw new NotFoundException('卖家不存在');
    }

    if (sellerId === userId) {
      throw new BusinessException('不能和自己聊天');
    }

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

  async getChatSessions(userId: number): Promise<ChatSessionWithDetails[]> {
    const sessions = await prisma.chatSession.findMany({
      where: {
        OR: [{ buyerId: BigInt(userId) }, { sellerId: BigInt(userId) }],
      },
      orderBy: { updatedAt: 'desc' },
    });

    const converted = await Promise.all(
      sessions.map((session) =>
        this.convertSession(session, true, userId) as Promise<ChatSessionWithDetails | null>
      )
    );

    return converted.filter(
      (session): session is ChatSessionWithDetails => session !== null
    );
  }

  async getChatMessages(userId: number, sessionId: number): Promise<ChatMessageWithSender[]> {
    const session = await prisma.chatSession.findUnique({
      where: { id: BigInt(sessionId) },
    });

    if (!session) {
      throw new NotFoundException('聊天会话不存在');
    }

    if (Number(session.buyerId) !== userId && Number(session.sellerId) !== userId) {
      throw new ForbiddenException('无权查看此聊天');
    }

    const messages = await prisma.chatMessage.findMany({
      where: { sessionId: BigInt(sessionId) },
      orderBy: { createdAt: 'asc' },
    });

    return Promise.all(
      messages.map((message) =>
        this.convertMessage(message, true) as Promise<ChatMessageWithSender>
      )
    );
  }

  async sendMessage(userId: number, data: SendMessageRequest): Promise<ChatMessageWithSender> {
    const session = await prisma.chatSession.findUnique({
      where: { id: BigInt(data.sessionId) },
    });

    if (!session) {
      throw new NotFoundException('聊天会话不存在');
    }

    if (Number(session.buyerId) !== userId && Number(session.sellerId) !== userId) {
      throw new ForbiddenException('无权在此聊天中发送消息');
    }

    if (!data.content || data.content.trim().length === 0) {
      throw new BusinessException('消息内容不能为空');
    }

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

    await prisma.chatSession.update({
      where: { id: BigInt(data.sessionId) },
      data: { updatedAt: new Date() },
    });

    return this.convertMessage(message, true) as Promise<ChatMessageWithSender>;
  }

  async markAsRead(userId: number, sessionId: number): Promise<void> {
    const session = await prisma.chatSession.findUnique({
      where: { id: BigInt(sessionId) },
    });

    if (!session) {
      throw new NotFoundException('聊天会话不存在');
    }

    if (Number(session.buyerId) !== userId && Number(session.sellerId) !== userId) {
      throw new ForbiddenException('无权操作此聊天');
    }

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

  async recallMessage(userId: number, messageId: number): Promise<ChatMessageWithSender> {
    const message = await prisma.chatMessage.findUnique({
      where: { id: BigInt(messageId) },
    });

    if (!message) {
      throw new NotFoundException('消息不存在');
    }

    if (Number(message.senderId) !== userId) {
      throw new ForbiddenException('只能撤回自己的消息');
    }

    if (message.isRecalled) {
      throw new BusinessException('消息已经撤回');
    }

    const diffMinutes =
      (Date.now() - new Date(message.createdAt).getTime()) / 1000 / 60;
    if (diffMinutes > 2) {
      throw new BusinessException('只能撤回 2 分钟内的消息');
    }

    const updatedMessage = await prisma.chatMessage.update({
      where: { id: BigInt(messageId) },
      data: { isRecalled: true },
    });

    return this.convertMessage(updatedMessage, true) as Promise<ChatMessageWithSender>;
  }
}
