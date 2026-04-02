import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import AuthModal from '../components/AuthModal';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MapPin,
  CreditCard,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Store,
  ArrowLeft,
  Truck,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { productApi, orderApi, userApi } from '../api';
import { getCurrentUser, isAuthenticated } from '../lib/auth';
import { getUserAvatarUrl, getUserDisplayName } from '../lib/user-display';
import type { ProductWithDetails, User } from '@campus-market/shared';

interface ProductDisplay {
  id: number;
  title: string;
  price: number;
  image: string;
  location: string;
  seller: string;
  sellerAvatar: string;
}

interface BuyerContact {
  name: string;
  phone: string;
  campus?: string;
}

type CurrentUserLike = ReturnType<typeof getCurrentUser>;

const getCampusValue = (user?: User | CurrentUserLike | null): string | undefined => {
  if (!user) return undefined;
  return user.profile?.campus || user.campus || undefined;
};

const Checkout: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState<'offline' | 'online'>('offline');
  const [tradeMethod, setTradeMethod] = useState<'pickup' | 'delivery'>('pickup');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [product, setProduct] = useState<ProductDisplay | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [pageError, setPageError] = useState<string>('');
  const [submitError, setSubmitError] = useState<string>('');
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [buyerContact, setBuyerContact] = useState<BuyerContact | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      setShowAuthModal(true);
    }
  }, []);

  const handleLoginSuccess = () => {
    setShowAuthModal(false);
  };

  const handleAuthModalClose = () => {
    setShowAuthModal(false);
    if (!isAuthenticated()) {
      navigate(id ? `/product/${id}` : '/');
    }
  };

  useEffect(() => {
    const loadProduct = async () => {
      if (!id) return;
      try {
        setLoading(true);
        setPageError('');
        const res = await productApi.getDetail(Number(id));
        if (res.success && res.data) {
          const productDetail: ProductWithDetails = res.data;
          const images = productDetail.images.length
            ? productDetail.images.map((image) => image.url)
            : [
                'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&q=80&w=800',
              ];
          const sellerAvatar =
            getUserAvatarUrl(
              productDetail.seller,
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                String(productDetail.sellerId || productDetail.seller?.studentId || productDetail.id)
              )}`
            ) || '';

          setProduct({
            id: productDetail.id,
            title: productDetail.title,
            price: productDetail.price,
            image: images[0],
            location: productDetail.location || '校内',
            seller: getUserDisplayName(productDetail.seller, productDetail.seller?.studentId || '同学'),
            sellerAvatar,
          });
        } else {
          setPageError(res.message || '加载商品信息失败');
        }
      } catch {
        setPageError('加载商品信息失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    void loadProduct();
  }, [id]);

  useEffect(() => {
    const loadBuyerContact = async () => {
      const authUser = getCurrentUser();
      if (!authUser?.id) return;

      const fallbackName = getUserDisplayName(authUser, authUser.studentId || '同学');
      setBuyerContact({
        name: fallbackName,
        phone: authUser.phone || '',
        campus: getCampusValue(authUser) || '',
      });

      try {
        const res = await userApi.getProfile(Number(authUser.id));
        if (res.success && res.data) {
          setBuyerContact({
            name: getUserDisplayName(res.data, fallbackName),
            phone: res.data.profile?.phone || res.data.phone || authUser.phone || '',
            campus: getCampusValue(res.data) || getCampusValue(authUser) || '',
          });
        }
      } catch {
        // Keep local fallback data.
      }
    };

    if (isAuthenticated()) {
      void loadBuyerContact();
    }
  }, []);

  const handleCheckout = async () => {
    if (!product?.id) return;

    if (!isAuthenticated()) {
      setShowAuthModal(true);
      return;
    }

    if (!buyerContact?.name || !buyerContact.phone) {
      setSubmitError('缺少联系电话，请先完善个人资料后再下单。');
      return;
    }

    const meetLocation =
      tradeMethod === 'pickup'
        ? product.location
        : buyerContact.campus || '校内送货上门，具体地点请在聊天中确认';

    setIsSubmitting(true);
    setSubmitError('');
    try {
      const res = await orderApi.create({
        productId: product.id,
        meetLocation,
        contactPhone: buyerContact.phone,
        contactName: buyerContact.name,
        remark: `tradeMethod=${tradeMethod};paymentMethod=${paymentMethod}`,
      });
      if (res.success && res.data) {
        navigate(res.data.id ? `/order-success?orderId=${res.data.id}` : '/order-success');
      } else {
        setSubmitError(res.message || '提交订单失败，请稍后重试');
      }
    } catch {
      setSubmitError('提交订单失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 relative overflow-hidden font-sans">
      <div className="fixed top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-50 to-transparent pointer-events-none" />
      <div className="fixed top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-purple-200/20 rounded-full blur-3xl pointer-events-none" />

      <Navbar />

      <AuthModal
        isOpen={showAuthModal}
        onClose={handleAuthModalClose}
        onLoginSuccess={handleLoginSuccess}
      />

      <div className="relative pt-28 pb-32 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/80 rounded-full transition-colors text-slate-600"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">确认订单</h1>
        </motion.div>

        {loading && <div className="text-center text-slate-400 text-sm py-20">正在加载下单商品信息...</div>}
        {pageError && !loading && <div className="text-center text-red-500 text-sm py-20">{pageError}</div>}

        {!loading && !pageError && product && (
          <>
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-sm border border-white/50 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                      <Store size={20} />
                    </div>
                    <h2 className="font-bold text-lg text-slate-900">商品详情</h2>
                  </div>

                  <div className="flex gap-5 group">
                    <div className="w-32 h-32 bg-slate-100 rounded-2xl overflow-hidden shrink-0 relative shadow-inner">
                      <img
                        src={product.image}
                        alt={product.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>
                    <div className="flex-1 flex flex-col py-1">
                      <div>
                        <h3 className="font-bold text-xl text-slate-900 line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors">
                          {product.title}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                          <img src={product.sellerAvatar} alt="" className="w-5 h-5 rounded-full bg-slate-200" />
                          <span>卖家：{product.seller}</span>
                        </div>
                      </div>
                      <div className="mt-auto flex justify-between items-end">
                        <span className="text-2xl font-extrabold text-slate-900">
                          <span className="text-base font-bold mr-1">¥</span>
                          {product.price}
                        </span>
                        <span className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-medium text-slate-600">x1</span>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-sm border border-white/50 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                        <MapPin size={20} />
                      </div>
                      <h2 className="font-bold text-lg text-slate-900">交易方式</h2>
                    </div>
                    <span className="px-4 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-full shadow-lg shadow-slate-200">
                      {tradeMethod === 'delivery' ? '送货上门' : '线下自提'}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <motion.div
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setTradeMethod('delivery')}
                      className={`relative flex items-center justify-between p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 overflow-hidden ${
                        tradeMethod === 'delivery'
                          ? 'border-blue-600 bg-blue-50/30 shadow-sm'
                          : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {tradeMethod === 'delivery' && (
                        <motion.div layoutId="trade-highlight" className="absolute inset-0 bg-blue-50/50 -z-10" />
                      )}
                      <div className="flex items-center gap-4 z-10">
                        <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-blue-600">
                          <Truck size={24} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">送货上门</p>
                          <p className="text-sm text-slate-500">卖家在校内为你送货，当面验货后完成交易。</p>
                        </div>
                      </div>
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors z-10 ${
                          tradeMethod === 'delivery' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                        }`}
                      >
                        {tradeMethod === 'delivery' && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-2.5 h-2.5 rounded-full bg-white" />
                        )}
                      </div>
                    </motion.div>

                    <motion.div
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setTradeMethod('pickup')}
                      className={`relative flex items-center justify-between p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 overflow-hidden ${
                        tradeMethod === 'pickup'
                          ? 'border-blue-600 bg-blue-50/30 shadow-sm'
                          : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {tradeMethod === 'pickup' && (
                        <motion.div layoutId="trade-highlight" className="absolute inset-0 bg-blue-50/50 -z-10" />
                      )}
                      <div className="flex items-center gap-4 z-10">
                        <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-green-600">
                          <MapPin size={24} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">线下自提</p>
                          <p className="text-sm text-slate-500">在 {product.location} 约定地点，当面完成交易。</p>
                        </div>
                      </div>
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors z-10 ${
                          tradeMethod === 'pickup' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                        }`}
                      >
                        {tradeMethod === 'pickup' && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-2.5 h-2.5 rounded-full bg-white" />
                        )}
                      </div>
                    </motion.div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-sm border border-white/50 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                      <CreditCard size={20} />
                    </div>
                    <h2 className="font-bold text-lg text-slate-900">支付方式</h2>
                  </div>

                  <div className="space-y-3">
                    <motion.div
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setPaymentMethod('offline')}
                      className={`relative flex items-center justify-between p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 overflow-hidden ${
                        paymentMethod === 'offline'
                          ? 'border-blue-600 bg-blue-50/30 shadow-sm'
                          : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {paymentMethod === 'offline' && (
                        <motion.div layoutId="payment-highlight" className="absolute inset-0 bg-blue-50/50 -z-10" />
                      )}

                      <div className="flex items-center gap-4 z-10">
                        <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-green-500">
                          <ShieldCheck size={24} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">线下支付</p>
                          <p className="text-sm text-slate-500">当面验货确认无误后，扫码转账给卖家。</p>
                        </div>
                      </div>

                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors z-10 ${
                          paymentMethod === 'offline' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                        }`}
                      >
                        {paymentMethod === 'offline' && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-2.5 h-2.5 rounded-full bg-white" />
                        )}
                      </div>
                    </motion.div>

                    <div className="opacity-50 grayscale pointer-events-none p-5 rounded-2xl border border-slate-100 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <CreditCard size={24} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">在线支付</p>
                        <p className="text-sm text-slate-500">暂未开放，敬请期待。</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              <div className="lg:col-span-1">
                <div className="sticky top-28 space-y-6">
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-orange-50/80 backdrop-blur-sm p-5 rounded-2xl border border-orange-100 text-orange-800"
                  >
                    <div className="flex gap-3">
                      <AlertCircle size={20} className="shrink-0 text-orange-600 mt-0.5" />
                      <p className="text-sm leading-relaxed font-medium">
                        <span className="block font-bold text-orange-900 mb-1">安全交易提示</span>
                        为了保障你的资金安全，请务必在 <span className="underline decoration-orange-300 underline-offset-2">当面验货确认商品无误后</span> 再进行支付。切勿在未见面的情况下提前转账。
                      </p>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100"
                  >
                    <h3 className="font-bold text-slate-900 mb-6">订单概览</h3>

                    <div className="space-y-4 mb-8">
                      <div className="flex justify-between text-slate-600">
                        <span>商品金额</span>
                        <span className="font-medium text-slate-900">¥{product.price}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>交易方式</span>
                        <span className="font-medium text-slate-900">{tradeMethod === 'delivery' ? '送货上门' : '线下自提'}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>收货人</span>
                        <span className="font-medium text-slate-900">{buyerContact?.name || '待补充'}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>联系电话</span>
                        <span className="font-medium text-slate-900">{buyerContact?.phone || '待补充'}</span>
                      </div>
                      <div className="h-px bg-slate-100 my-2" />
                      <div className="flex justify-between items-baseline">
                        <span className="font-bold text-slate-900">实付金额</span>
                        <span className="text-3xl font-extrabold text-blue-600">
                          <span className="text-lg mr-1">¥</span>
                          {product.price}
                        </span>
                      </div>
                    </div>

                    {submitError && <p className="mb-4 text-sm text-red-500">{submitError}</p>}

                    <button
                      onClick={handleCheckout}
                      disabled={isSubmitting}
                      className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 group relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

                      {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>提交订单</span>
                          <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>

                    <p className="text-xs text-center text-slate-400 mt-4">点击即表示同意《校园集市交易规则》。</p>
                  </motion.div>
                </div>
              </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 pb-safe lg:hidden z-40">
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-500">实付款</span>
                  <span className="text-2xl font-bold text-blue-600">¥{product.price}</span>
                </div>
                <button
                  onClick={handleCheckout}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-full font-bold shadow-lg shadow-blue-500/30 active:scale-95 transition-transform"
                >
                  {isSubmitting ? '提交中...' : '提交订单'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Checkout;
