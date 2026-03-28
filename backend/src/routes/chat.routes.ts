import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const chatController = new ChatController();

// 所有聊天接口都需要认证
router.use(authenticate);

// 发起聊天
router.post('/start', chatController.startChat);

// 获取聊天会话列表
router.get('/sessions', chatController.getSessions);

// 获取聊天消息列表
router.get('/sessions/:sessionId/messages', chatController.getMessages);

// 发送消息
router.post('/messages', chatController.sendMessage);

// 标记消息已读
router.post('/sessions/:sessionId/read', chatController.markAsRead);

// 撤回消息
router.post('/messages/:messageId/recall', chatController.recallMessage);

export default router;
