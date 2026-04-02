import { Request, Response, NextFunction } from 'express';
import type { SendMessageRequest, StartChatRequest } from '@campus-market/shared';
import { ChatService } from '../services/chat.service';
import { successResponse } from '../utils/response.util';

export class ChatController {
  private chatService: ChatService;

  constructor() {
    this.chatService = new ChatService();
  }

  /**
   * 发起聊天
   * POST /api/chat/start
   */
  startChat = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const data: StartChatRequest = req.body;
      const session = await this.chatService.startChat(userId, data);
      res.json(successResponse(session, '聊天会话创建成功'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * 获取聊天会话列表
   * GET /api/chat/sessions
   */
  getSessions = async (req: Request, res: Response, next: NextFunction) => {
    console.log('=== ChatController.getSessions called ===');
    console.log('User:', req.user);
    console.log('Path:', req.path);
    console.log('URL:', req.url);
    try {
      const userId = req.user!.id;
      const sessions = await this.chatService.getChatSessions(userId);
      res.json(successResponse(sessions));
    } catch (error) {
      console.error('Error in getSessions:', error);
      next(error);
    }
  };

  /**
   * 获取聊天消息列表
   * GET /api/chat/sessions/:sessionId/messages
   */
  getMessages = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const sessionId = Number(req.params.sessionId);
      const messages = await this.chatService.getChatMessages(userId, sessionId);
      res.json(successResponse(messages));
    } catch (error) {
      next(error);
    }
  };

  /**
   * 发送消息
   * POST /api/chat/messages
   */
  sendMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const data: SendMessageRequest = req.body;
      const message = await this.chatService.sendMessage(userId, data);
      res.json(successResponse(message, '消息发送成功'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * 标记消息已读
   * POST /api/chat/sessions/:sessionId/read
   */
  markAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const sessionId = Number(req.params.sessionId);
      await this.chatService.markAsRead(userId, sessionId);
      res.json(successResponse(null, '标记已读成功'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * 撤回消息
   * POST /api/chat/messages/:messageId/recall
   */
  recallMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const messageId = Number(req.params.messageId);
      const message = await this.chatService.recallMessage(userId, messageId);
      res.json(successResponse(message, '消息撤回成功'));
    } catch (error) {
      next(error);
    }
  };
}
