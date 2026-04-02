import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import LazyLottie from '../components/LazyLottie';
import {
  ChevronLeft,
  Package,
  Clock,
  MessageCircle,
  CheckCircle,
  Truck,
  Copy,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import { orderApi, chatApi } from '../api';
import { getCurrentUser } from '../lib/auth';
import type { OrderStatus, OrderWithDetails } from '@campus-market/shared';
import { getUserAvatarUrl, getUserDisplayName } from '../lib/user-display';

interface StatusConfig {
  label: string;
  desc: string;
  color: string;
  bg: string;
  border: string;
  icon: React.ElementType;
  progress: number;
}

type StatusAnimationModule = { default: Record<string, unknown> };

interface StatusAnimationConfig {
  className: string;
  style: React.CSSProperties;
  load: () => Promise<StatusAnimationModule>;
}

const getStatusAnimationConfig = (status: OrderStatus): StatusAnimationConfig | null => {
  switch (status) {
    case 'PENDING':
      return {
        className: 'absolute -right-8 bottom-8 pointer-events-none',
        style: { width: 230, height: 150 },
        load: () => import('../assets/package-opening.json'),
      };
    case 'SHIPPED':
      return {
        className: 'absolute -right-8 bottom-12 pointer-events-none',
        style: { width: 280, height: 200 },
        load: () => import('../assets/Delivery-truck.json'),
      };
    case 'COMPLETED':
      return {
        className: 'absolute -right-8 bottom-12 pointer-events-none',
        style: { width: 280, height: 200 },
        load: () => import('../assets/Food-delivered.json'),
      };
    default:
      return null;
  }
};

const getStatusConfig = (status: OrderStatus | string): StatusConfig => {
  switch (status) {
    case 'PENDING':
      return {
        label: '待交易',
        desc: '等待双方线下确认，请保持沟通。',
        color: 'text-orange-600',
        bg: 'bg-orange-50',
        border: 'border-orange-100',
        icon: Clock,
        progress: 1,
      };
    case 'SHIPPED':
      return {
        label: '交易中',
        desc: '卖家已发货或准备交接，请及时确认。',
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        border: 'border-blue-100',
        icon: Truck,
        progress: 2,
      };
    case 'COMPLETED':
      return {
        label: '已完成',
        desc: '交易顺利完成，欢迎继续逛校园市场。',
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        border: 'border-emerald-100',
        icon: CheckCircle,
        progress: 3,
      };
    case 'CANCELLED':
      return {
        label: '已取消',
        desc: '该订单已取消。',
        color: 'text-slate-500',
        bg: 'bg-slate-100',
        border: 'border-slate-200',
        icon: Package,
        progress: 0,
      };
    default:
      return {
        label: status,
        desc: '当前状态暂不可识别。',
        color: 'text-slate-600',
        bg: 'bg-slate-50',
        border: 'border-slate-200',
        icon: Package,
        progress: 0,
      };
  }
};

const OrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [confirmLoading, setConfirmLoading] = useState<boolean>(false);
  const [shipLoading, setShipLoading] = useState<boolean>(false);
  const [cancelLoading, setCancelLoading] = useState<boolean>(false);
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [statusAnimationData, setStatusAnimationData] = useState<Record<string, unknown> | null>(
    null,
  );

  useEffect(() => {
    const loadOrder = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const res = await orderApi.getDetail(Number(id));
        if (res.success && res.data) {
          setOrder(res.data);
        } else {
          setError(res.message || '加载订单详情失败');
        }
      } catch (caughtError) {
        console.error('加载订单详情失败', caughtError);
        setError('加载订单详情失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    void loadOrder();
  }, [id]);

  useEffect(() => {
    if (!order) {
      setStatusAnimationData(null);
      return;
    }

    const statusAnimationConfig = getStatusAnimationConfig(order.status as OrderStatus);
    if (!statusAnimationConfig) {
      setStatusAnimationData(null);
      return;
    }

    let cancelled = false;

    void statusAnimationConfig
      .load()
      .then((module) => {
        if (!cancelled) {
          setStatusAnimationData(module.default);
        }
      })
      .catch((caughtError) => {
        console.error('Failed to load order status animation', caughtError);
        if (!cancelled) {
          setStatusAnimationData(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [order]);

  const handleContact = async () => {
    if (!order?.productId) {
      navigate('/chat');
      return;
    }
    try {
      const res = await chatApi.startChat(order.productId);
      if (res.success && res.data) {
        navigate(res.data.id ? `/chat?sessionId=${res.data.id}` : '/chat');
      } else {
        navigate('/chat');
      }
    } catch (caughtError) {
      console.error('发起聊天失败', caughtError);
      navigate('/chat');
    }
  };

  const handleShip = async () => {
    if (!order) return;
    try {
      setShipLoading(true);
      const res = await orderApi.ship(order.id);
      if (res.success && res.data) {
        setOrder((prev) => (prev ? { ...prev, status: res.data.status } : null));
      } else {
        alert(res.message || '发货失败');
      }
    } catch (caughtError) {
      console.error('发货失败', caughtError);
      alert('发货失败，请稍后重试');
    } finally {
      setShipLoading(false);
    }
  };

  const handleConfirmReceipt = async () => {
    if (!order) return;
    try {
      setConfirmLoading(true);
      const res = await orderApi.complete(order.id);
      if (res.success && res.data) {
        setOrder((prev) => (prev ? { ...prev, status: res.data.status } : null));
      } else {
        alert(res.message || '确认收货失败');
      }
    } catch (caughtError) {
      console.error('确认收货失败', caughtError);
      alert('确认收货失败，请稍后重试');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order) return;
    try {
      setCancelLoading(true);
      const res = await orderApi.cancel(order.id);
      if (res.success) {
        setOrder((prev) => (prev ? { ...prev, status: 'CANCELLED' as OrderStatus } : null));
        if (order.productId) {
          try {
            const chatRes = await chatApi.startChat(order.productId);
            if (chatRes.success && chatRes.data?.id) {
              await chatApi.sendMessage(chatRes.data.id, {
                content: '我已取消订单',
                type: 'TEXT',
              });
            }
          } catch (chatError) {
            console.error('发送取消消息失败', chatError);
          }
        }
        setShowCancelModal(false);
      } else {
        alert(res.message || '取消订单失败');
      }
    } catch (caughtError) {
      console.error('取消订单失败', caughtError);
      alert('取消订单失败，请稍后重试');
    } finally {
      setCancelLoading(false);
    }
  };

  const currentUser = useMemo(() => getCurrentUser() as { id?: number | string } | null, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">加载订单详情...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
            <AlertCircle size={40} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">无法加载订单</h2>
          <p className="text-slate-500 mb-8">{error || '找不到该订单信息'}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors"
          >
            返回上一页
          </button>
        </div>
      </div>
    );
  }

  const statusCfg = getStatusConfig(order.status);
  const StatusIcon = statusCfg.icon;
  const statusAnimationConfig = getStatusAnimationConfig(order.status as OrderStatus);
  const isBuyer = currentUser && String(currentUser.id) === String(order.buyerId);

  const partner = isBuyer ? order.seller : order.buyer;
  const partnerName = getUserDisplayName(partner, isBuyer ? '卖家' : '买家');
  const partnerRole = isBuyer ? '卖家' : '买家';
  const partnerId = isBuyer ? order.sellerId : order.buyerId;
  const avatar =
    getUserAvatarUrl(
      partner,
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
        String(partnerId || partnerName),
      )}`,
    ) || '';

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 300, damping: 24 },
    },
  };

  const productImage =
    order.product?.images?.[0]?.url ||
    order.productImage ||
    'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&q=80&w=800';

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      <Navbar />

      <div className="absolute top-0 left-0 right-0 h-[400px] bg-gradient-to-b from-blue-50 via-indigo-50/50 to-transparent pointer-events-none" />

      <motion.div
        className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-28"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.button
          variants={itemVariants}
          onClick={() => navigate(-1)}
          className="mb-8 flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:border-slate-400 transition-colors">
            <ChevronLeft size={18} />
          </div>
          <span className="font-medium">返回列表</span>
        </motion.button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              variants={itemVariants}
              className={`relative overflow-hidden rounded-3xl p-8 ${statusCfg.bg} border ${statusCfg.border} shadow-sm`}
            >
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <StatusIcon size={32} className={statusCfg.color} />
                  <h1 className={`text-2xl font-bold ${statusCfg.color}`}>{statusCfg.label}</h1>
                </div>
                <p className="text-slate-600 opacity-80 font-medium ml-11">{statusCfg.desc}</p>
                {statusAnimationConfig && statusAnimationData && (
                  <div className={statusAnimationConfig.className}>
                    <LazyLottie
                      animationData={statusAnimationData}
                      loop={true}
                      style={statusAnimationConfig.style}
                    />
                  </div>
                )}

                <div className="mt-8 ml-2 flex items-center gap-2 relative">
                  {[1, 2, 3].map((step) => {
                    const active = statusCfg.progress >= step;
                    return (
                      <React.Fragment key={step}>
                        <div className="flex flex-col items-center gap-2 relative z-10">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-500 ${
                              active
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                : 'bg-white text-slate-400 border border-slate-200'
                            }`}
                          >
                            {step}
                          </div>
                        </div>
                        {step < 3 && (
                          <div
                            className={`h-1 flex-1 rounded-full mx-2 transition-colors duration-500 ${
                              statusCfg.progress > step ? 'bg-blue-600' : 'bg-slate-200'
                            }`}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
                <div className="flex justify-between text-xs font-medium text-slate-500 mt-2 px-1">
                  <span>已下单</span>
                  <span className="text-center">交易中</span>
                  <span className="text-right">已完成</span>
                </div>
              </div>

              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-48 h-48 bg-white opacity-40 blur-3xl rounded-full pointer-events-none" />
              <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-32 h-32 bg-current opacity-5 blur-2xl rounded-full pointer-events-none" />
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
            >
              <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                <div className="flex items-center gap-2 text-slate-900 font-bold">
                  <Package size={20} className="text-blue-500" />
                  <h2>订单详情</h2>
                </div>
              </div>

              <div className="p-6">
                <div className="flex gap-6 mb-8 pb-8 border-b border-slate-50 border-dashed">
                  <div className="w-28 h-28 rounded-2xl bg-slate-100 overflow-hidden border border-slate-100 shadow-inner flex-shrink-0">
                    <img
                      src={productImage}
                      alt={order.product?.title || '商品'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 flex flex-col">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2 leading-relaxed">
                        {order.product?.title || order.productTitle || '商品'}
                      </h3>
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 text-xs font-medium border border-slate-100">
                        <span>二手交易</span>
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      <div className="text-2xl font-bold text-blue-600 tracking-tight">
                        ¥{order.priceSnapshot}
                      </div>
                      <span className="text-slate-400 text-sm font-medium">x1</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-y-4">
                  <InfoRow label="订单编号" value={String(order.id)} copyable />
                  <InfoRow
                    label="创建时间"
                    value={new Date(order.createdAt).toLocaleString('zh-CN')}
                  />
                  <InfoRow label="交易方式" value={order.meetLocation || '线下交易'} />
                  <InfoRow label="订单状态" value={statusCfg.label} />
                </div>
              </div>
            </motion.div>
          </div>

          <div className="lg:col-span-1 flex flex-col space-y-6">
            <motion.div
              variants={itemVariants}
              className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6"
            >
              <div className="text-center">
                <div
                  className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full p-1 mb-4 relative group cursor-pointer"
                  onClick={() => navigate(`/user/${partnerId}`)}
                >
                  <img
                    src={avatar}
                    alt="Avatar"
                    className="w-full h-full rounded-full object-cover border-2 border-white shadow-sm"
                  />
                  <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 border-4 border-white rounded-full" />
                </div>
                <h3
                  className="text-lg font-bold text-slate-900 mb-1 cursor-pointer hover:text-blue-600 transition-colors"
                  onClick={() => navigate(`/user/${partnerId}`)}
                >
                  {partnerName}
                </h3>
                <p className="text-sm text-slate-500 mb-6">{partnerRole}</p>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleContact}
                    className="col-span-2 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                  >
                    <MessageCircle size={18} />
                    联系对方
                  </button>
                </div>
              </div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sticky top-24 flex-1 flex flex-col"
            >
              <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                <span className="w-1 h-5 bg-blue-600 rounded-full" />
                订单操作
              </h3>
              <div className="space-y-3">
                {isBuyer && order.status === 'SHIPPED' && (
                  <button
                    onClick={handleConfirmReceipt}
                    disabled={confirmLoading}
                    className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
                  >
                    {confirmLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <CheckCircle size={18} />
                    )}
                    确认收货
                  </button>
                )}

                {!isBuyer && order.status === 'PENDING' && (
                  <button
                    onClick={handleShip}
                    disabled={shipLoading}
                    className="w-full py-3.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {shipLoading ? (
                      <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Truck size={18} />
                    )}
                    发货
                  </button>
                )}

                {(order.status === 'PENDING' || order.status === 'SHIPPED') && (
                  <button
                    onClick={() => setShowCancelModal(true)}
                    disabled={cancelLoading}
                    className="w-full py-3.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {cancelLoading ? (
                      <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <XCircle size={18} />
                    )}
                    取消订单
                  </button>
                )}

                <button className="w-full py-3.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl font-medium transition-colors flex items-center justify-center gap-2">
                  <AlertCircle size={18} />
                  举报 / 投诉
                </button>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-50 flex-1 flex items-center justify-center">
                <p className="text-xs text-slate-400 leading-relaxed text-center">
                  如遇交易纠纷，请及时联系平台介入处理。
                  <br />
                  为了你的资金安全，请勿脱离平台沟通渠道。
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showCancelModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-sm bg-white rounded-3xl shadow-xl overflow-hidden"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">确定要取消订单吗？</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  取消后订单将无法恢复，如果卖家已经发货，请先与卖家沟通协商。
                </p>
              </div>
              <div className="p-6 pt-0 flex gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
                >
                  暂不取消
                </button>
                <button
                  onClick={handleCancelOrder}
                  disabled={cancelLoading}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-red-500/20"
                >
                  {cancelLoading && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  确认取消
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface InfoRowProps {
  label: string;
  value: string;
  copyable?: boolean;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value, copyable }) => (
  <div className="flex justify-between items-center text-sm group">
    <span className="text-slate-500">{label}</span>
    <div className="flex items-center gap-2 text-slate-900 font-medium">
      <span className="font-mono">{value}</span>
      {copyable && (
        <button
          onClick={() => navigator.clipboard.writeText(value)}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
          title="复制"
        >
          <Copy size={14} />
        </button>
      )}
    </div>
  </div>
);

export default OrderDetail;
