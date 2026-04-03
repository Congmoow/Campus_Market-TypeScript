import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useCallback } from 'react';
import Navbar from '../components/Navbar';
import { Link, useLocation } from 'react-router-dom';
import { Send, Image as ImageIcon, Smile, ChevronDown, MessageCircle } from 'lucide-react';
import { chatApi } from '../api';
import { getCurrentUser } from '../lib/auth';
import type {
  ChatMessage,
  ChatMessageWithSender,
  ChatSessionWithDetails,
} from '@campus-market/shared';
import { getUserAvatarUrl, getUserDisplayName } from '../lib/user-display';

const EmojiPicker = React.lazy(() => import('@emoji-mart/react'));

type CurrentUser = {
  id?: number | string;
  studentId?: string;
  avatarUrl?: string | null;
};

type EmojiSelection = {
  native?: string;
};

type ApiErrorLike = {
  response?: {
    data?: {
      message?: string;
    };
  };
};

const formatTime = (isoStr: string | Date): string => {
  if (!isoStr) return '';
  const date = new Date(isoStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
};

const formatMessageTimeLabel = (isoStr: string | Date): string => {
  if (!isoStr) return '';
  const date = new Date(isoStr);
  const now = new Date();

  const startOfDay = (value: Date) =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const diffDays = Math.floor(
    (startOfDay(now).getTime() - startOfDay(date).getTime()) / (24 * 60 * 60 * 1000),
  );
  const timeStr = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

  if (diffDays === 0) return timeStr;
  if (diffDays === 1) return `昨天 ${timeStr}`;

  if (diffDays >= 2 && diffDays < 7) {
    const weekdayNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    return `${weekdayNames[date.getDay()]} ${timeStr}`;
  }

  if (now.getFullYear() === date.getFullYear()) {
    return `${date.getMonth() + 1}月${date.getDate()}日 ${timeStr}`;
  }

  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${timeStr}`;
};

const shouldShowTimeDivider = (messages: ChatMessageWithSender[], index: number): boolean => {
  if (index === 0) return true;
  const current = new Date(messages[index].createdAt);
  const previous = new Date(messages[index - 1].createdAt);
  return current.getTime() - previous.getTime() > 5 * 60 * 1000;
};

interface SessionDisplay extends Omit<ChatSessionWithDetails, 'lastMessage'> {
  partnerName?: string;
  partnerId?: number;
  partnerAvatar?: string;
  lastMessage?: string | ChatMessage;
  lastTime?: string | Date;
  unreadCount?: number;
  productThumbnail?: string;
  productTitle?: string;
  productPrice?: number;
}

const Chat: React.FC = () => {
  const [message, setMessage] = useState<string>('');
  const [sessions, setSessions] = useState<SessionDisplay[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessageWithSender[]>([]);
  const [loadingSessions, setLoadingSessions] = useState<boolean>(true);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [emojiData, setEmojiData] = useState<unknown>(null);
  const [hasInitialScroll, setHasInitialScroll] = useState<boolean>(false);
  const [showProduct, setShowProduct] = useState<boolean>(true);

  const currentUser = useMemo<CurrentUser | null>(() => {
    const authUser = getCurrentUser();
    if (!authUser) {
      return null;
    }

    return {
      id: authUser.id,
      studentId: authUser.studentId,
      avatarUrl: authUser.avatar || authUser.profile?.avatarUrl || null,
    };
  }, []);

  const location = useLocation();

  const initialSessionId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const sessionId = params.get('sessionId');
    return sessionId ? Number(sessionId) : null;
  }, [location.search]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    });
  };

  useEffect(() => {
    if (!messages.length) return;

    const behavior = hasInitialScroll ? 'smooth' : 'auto';
    const timer = window.setTimeout(() => {
      scrollToBottom(behavior);
    }, 0);

    if (!hasInitialScroll) {
      setHasInitialScroll(true);
    }

    return () => window.clearTimeout(timer);
  }, [messages, hasInitialScroll]);

  const loadMessages = useCallback(async (sessionId: number) => {
    setLoadingMessages(true);
    try {
      const res = await chatApi.getMessages(sessionId);
      if (res.success) {
        setMessages(res.data || []);
      } else {
        alert(res.message || '加载消息失败');
      }
    } catch (caughtError) {
      console.error('加载消息失败', caughtError);
      alert('加载消息失败，请稍后重试');
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const loadSessions = useCallback(
    async (preferredSessionId: number | null) => {
      setLoadingSessions(true);
      try {
        const res = await chatApi.getList();
        if (res.success) {
          const list = (res.data || []) as SessionDisplay[];
          setSessions(list);
          if (list.length > 0) {
            let target = list[0];
            if (preferredSessionId) {
              const matched = list.find((session) => session.id === preferredSessionId);
              if (matched) {
                target = matched;
              }
            }
            setCurrentSessionId(target.id);
            setHasInitialScroll(false);
            await loadMessages(target.id);
          }
        } else {
          alert(res.message || '加载会话列表失败');
        }
      } catch (caughtError) {
        console.error('加载会话列表失败', caughtError);
        alert('加载会话列表失败，请稍后重试');
      } finally {
        setLoadingSessions(false);
      }
    },
    [loadMessages],
  );

  useEffect(() => {
    void loadSessions(initialSessionId);
  }, [initialSessionId, loadSessions]);

  useEffect(() => {
    if (!showEmojiPicker || emojiData) return;

    let cancelled = false;

    void import('@emoji-mart/data')
      .then((module) => {
        if (!cancelled) {
          setEmojiData(module.default ?? module);
        }
      })
      .catch((caughtError) => {
        console.error('加载表情数据失败', caughtError);
        if (!cancelled) {
          setShowEmojiPicker(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [showEmojiPicker, emojiData]);

  const handleSelectSession = async (session: SessionDisplay) => {
    if (session.id === currentSessionId) return;
    setCurrentSessionId(session.id);
    setHasInitialScroll(false);
    await loadMessages(session.id);
  };

  const handleSend = async () => {
    if (!message.trim() || !currentSessionId) return;
    setSending(true);
    try {
      const res = await chatApi.sendMessage(currentSessionId, {
        type: 'TEXT',
        content: message.trim(),
      });
      if (res.success) {
        setMessages((prev) => [...prev, res.data]);
        setMessage('');
        setSessions((prev) =>
          prev.map((session) =>
            session.id === currentSessionId
              ? { ...session, lastMessage: res.data.content, lastTime: res.data.createdAt }
              : session,
          ),
        );
      } else {
        alert(res.message || '发送消息失败');
      }
    } catch (caughtError) {
      console.error('发送消息失败', caughtError);
      alert('发送消息失败，请稍后重试');
    } finally {
      setSending(false);
    }
  };

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === currentSessionId) || null,
    [sessions, currentSessionId],
  );

  const myAvatarUrl = useMemo(() => {
    if (!currentUser) return null;
    const seed = currentUser.id || currentUser.studentId || 'user';
    return (
      currentUser.avatarUrl ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(String(seed))}`
    );
  }, [currentUser]);

  const handleEmojiSelect = (emoji: EmojiSelection) => {
    if (!emoji.native) return;
    setMessage((prev) => prev + emoji.native);
    setShowEmojiPicker(false);
  };

  const handleImageButtonClick = () => {
    if (!activeSession || !imageInputRef.current || sending) return;
    imageInputRef.current.click();
  };

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentSessionId) {
      return;
    }

    event.target.value = '';

    try {
      setSending(true);

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (caughtError) => reject(caughtError);
        reader.readAsDataURL(file);
      });

      if (!dataUrl) {
        alert('读取图片失败，请稍后重试');
        return;
      }

      const sendRes = await chatApi.sendMessage(currentSessionId, {
        type: 'IMAGE',
        content: dataUrl,
      });

      if (sendRes.success) {
        setMessages((prev) => [...prev, sendRes.data]);
        setSessions((prev) =>
          prev.map((session) =>
            session.id === currentSessionId
              ? { ...session, lastMessage: '[图片]', lastTime: sendRes.data.createdAt }
              : session,
          ),
        );
      } else {
        alert(sendRes.message || '发送图片失败');
      }
    } catch (caughtError) {
      console.error('发送图片失败', caughtError);
      alert('发送图片失败，请稍后重试');
    } finally {
      setSending(false);
    }
  };

  const canRecall = (msg: ChatMessageWithSender): boolean => {
    if (!currentUser || !msg.createdAt) return false;
    if (msg.isRecalled) return false;
    if (String(msg.senderId) !== String(currentUser.id)) return false;
    const created = new Date(msg.createdAt).getTime();
    if (Number.isNaN(created)) return false;
    return Date.now() - created <= 2 * 60 * 1000;
  };

  const handleRecall = async (msg: ChatMessageWithSender) => {
    if (!currentSessionId || !canRecall(msg)) return;

    const isLast = messages.length > 0 && messages[messages.length - 1].id === msg.id;
    try {
      const res = await chatApi.recallMessage(msg.id);
      if (res.success && res.data) {
        const recalled = res.data as ChatMessageWithSender;
        setMessages((prev) => prev.map((item) => (item.id === msg.id ? recalled : item)));
        if (isLast) {
          setSessions((prev) =>
            prev.map((session) =>
              session.id === currentSessionId
                ? { ...session, lastMessage: '你撤回了一条消息', lastTime: recalled.createdAt }
                : session,
            ),
          );
        }
      } else {
        alert(res.message || '撤回失败，请稍后重试');
      }
    } catch (caughtError: unknown) {
      console.error('撤回消息失败', caughtError);
      const errorLike = caughtError as ApiErrorLike;
      alert(errorLike.response?.data?.message || '撤回失败，可能已超过可撤回时间');
    }
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      <Navbar />

      <div className="flex-1 pt-24 pb-6 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex h-full min-h-[520px]">
          <div className="w-80 border-r border-slate-100 flex flex-col hidden md:flex">
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <MessageCircle size={18} className="text-blue-500" />
                <h2 className="font-bold text-lg text-slate-900">消息</h2>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingSessions ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                  加载中...
                </div>
              ) : sessions.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                  暂无会话
                </div>
              ) : (
                sessions.map((session) => {
                  const isActive = session.id === currentSessionId;
                  const name = session.partnerName || getUserDisplayName(session.buyer, '同学');
                  const seed = session.partnerId || name;
                  const avatar =
                    session.partnerAvatar ||
                    getUserAvatarUrl(
                      session.buyer,
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(String(seed))}`,
                    ) ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(String(seed))}`;

                  return (
                    <div
                      key={session.id}
                      onClick={() => void handleSelectSession(session)}
                      className={`p-4 flex items-center gap-3 cursor-pointer transition-colors ${
                        isActive ? 'bg-blue-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="relative">
                        <img
                          src={avatar}
                          alt={name}
                          className="w-12 h-12 rounded-full bg-slate-100"
                        />
                        {(session.unreadCount || 0) > 0 && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs flex items-center justify-center rounded-full border-2 border-white">
                            {session.unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1">
                          <h3 className="font-semibold text-slate-900 truncate">{name}</h3>
                          <span className="text-xs text-slate-400">
                            {formatTime(session.lastTime || session.updatedAt)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 truncate">
                          {typeof session.lastMessage === 'string'
                            ? session.lastMessage
                            : session.lastMessage?.content || '暂无聊天记录'}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col bg-white">
            <div className="bg-white border-b border-slate-100">
              {activeSession ? (
                <div className="flex flex-col">
                  <Link
                    to={`/user/${activeSession.partnerId}`}
                    className="flex items-center gap-3 p-4 group"
                  >
                    {(() => {
                      const headerSeed =
                        activeSession.partnerId || activeSession.partnerName || 'user';
                      const headerAvatar =
                        activeSession.partnerAvatar ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(String(headerSeed))}`;
                      return (
                        <img
                          src={headerAvatar}
                          alt=""
                          className="w-10 h-10 rounded-full bg-slate-100 group-hover:ring-2 group-hover:ring-blue-200 transition-all"
                        />
                      );
                    })()}
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {activeSession.partnerName || '同学'}
                      </h3>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span className="text-xs text-slate-500">在线</span>
                      </div>
                    </div>
                  </Link>
                  {activeSession.productId && (
                    <div className="mx-4 mb-3">
                      <div
                        className="flex items-center justify-between text-xs text-slate-400 cursor-pointer px-1 py-1"
                        onClick={() => setShowProduct((prev) => !prev)}
                      >
                        <span>正在沟通的商品</span>
                        <ChevronDown
                          size={18}
                          className={`text-slate-400 transition-transform duration-200 ${showProduct ? 'rotate-180' : ''}`}
                        />
                      </div>
                      {showProduct && (
                        <Link
                          to={`/product/${activeSession.productId}`}
                          className="flex items-center gap-4 px-2 py-3 hover:bg-slate-50 rounded-xl transition-colors mt-1"
                        >
                          {activeSession.productThumbnail && (
                            <img
                              src={activeSession.productThumbnail}
                              alt={activeSession.productTitle || '商品缩略图'}
                              className="w-20 h-20 rounded-lg object-cover bg-white flex-shrink-0 border border-slate-200"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-base font-medium text-slate-900 truncate">
                              {activeSession.productTitle || '商品详情'}
                            </p>
                            {activeSession.productPrice != null && (
                              <p className="mt-1 text-lg font-bold text-orange-500">
                                ¥{activeSession.productPrice}
                              </p>
                            )}
                          </div>
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 text-sm text-slate-400">请选择左侧会话开始聊天</div>
              )}
            </div>

            <div
              ref={messagesContainerRef}
              className="flex-1 min-h-[260px] overflow-y-auto p-4 space-y-4 no-scrollbar bg-neutral-50"
            >
              {loadingMessages ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                  加载消息中...
                </div>
              ) : !activeSession ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                  请选择左侧会话
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                  暂无消息，发送第一条吧。
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isMe = currentUser && String(msg.senderId) === String(currentUser.id);
                  const isRecalled = msg.isRecalled;
                  const showRecall = isMe && canRecall(msg);
                  return (
                    <React.Fragment key={msg.id}>
                      {shouldShowTimeDivider(messages, index) && (
                        <div className="flex justify-center my-2 text-[11px] text-slate-400">
                          <span>{formatMessageTimeLabel(msg.createdAt)}</span>
                        </div>
                      )}

                      {isRecalled ? (
                        <div className="flex justify-center my-1 text-[11px] text-slate-400">
                          <span className="px-3 py-1 rounded-full bg-slate-100/80 border border-slate-200">
                            {isMe ? '你撤回了一条消息' : '对方撤回了一条消息'}
                          </span>
                        </div>
                      ) : (
                        <div
                          className={`flex gap-2 ${isMe ? 'items-center justify-end' : 'items-end justify-start'}`}
                        >
                          <div className="max-w-[70%] flex flex-col gap-1">
                            <div className="relative">
                              <div
                                className={`rounded-2xl px-4 py-3 shadow-sm ${
                                  isMe
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'
                                }`}
                              >
                                {msg.type === 'IMAGE' ? (
                                  <img
                                    src={msg.content}
                                    alt="sent image"
                                    className="rounded-lg max-w-full"
                                    onLoad={() => scrollToBottom('auto')}
                                  />
                                ) : (
                                  <p className="leading-relaxed">{msg.content}</p>
                                )}
                              </div>
                              {isMe && (
                                <span className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-600 rotate-45" />
                              )}
                            </div>
                            {showRecall && (
                              <button
                                type="button"
                                onClick={() => void handleRecall(msg)}
                                className="self-end text-[11px] text-slate-400 hover:text-red-500 transition-colors"
                              >
                                撤回
                              </button>
                            )}
                          </div>
                          {isMe && myAvatarUrl && (
                            <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden flex-shrink-0">
                              <img
                                src={myAvatarUrl}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </React.Fragment>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="px-4 py-3 bg-white border-t border-slate-100 flex flex-col gap-3">
              <div className="flex gap-2 relative">
                <button
                  type="button"
                  onClick={handleImageButtonClick}
                  disabled={!activeSession || sending}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ImageIcon size={20} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker((prev) => !prev)}
                  disabled={!activeSession}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Smile size={20} />
                </button>

                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />

                {showEmojiPicker && (
                  <div className="absolute bottom-12 left-0 z-10">
                    <Suspense
                      fallback={
                        <div className="w-[352px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-lg">
                          正在加载表情面板...
                        </div>
                      }
                    >
                      {emojiData ? (
                        <EmojiPicker
                          data={emojiData}
                          onEmojiSelect={(emoji: EmojiSelection) => handleEmojiSelect(emoji)}
                          theme="light"
                        />
                      ) : (
                        <div className="w-[352px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-lg">
                          正在加载表情面板...
                        </div>
                      )}
                    </Suspense>
                  </div>
                )}
              </div>
              <div className="flex items-end gap-2">
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder={activeSession ? '输入消息...' : '请选择左侧会话后再发送'}
                  rows={3}
                  className="flex-1 bg-white border-none px-1 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 resize-none"
                  disabled={!activeSession}
                />
                <button
                  onClick={() => void handleSend()}
                  className={`p-3 rounded-xl transition-all ${
                    message.trim() && activeSession && !sending
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:scale-105'
                      : 'bg-blue-600 text-white opacity-50 cursor-not-allowed'
                  }`}
                  disabled={!message.trim() || !activeSession || sending}
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
