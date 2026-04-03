import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCallback } from 'react';
import { Calendar, MapPin, MessageCircle, ShieldCheck } from 'lucide-react';
import Navbar from '../components/Navbar';
import AuthModal from '../components/AuthModal';
import ProductCard from '../components/ProductCard';
import EditProfileModal from '../components/EditProfileModal';
import { chatApi, userApi } from '../api';
import {
  getCurrentUser,
  isAuthenticated,
  updateAuthSessionUser,
  useAuthSession,
} from '../lib/auth';
import { getUserAvatarUrl, getUserDisplayName } from '../lib/user-display';
import type { ProfileContainer } from '../lib/profile-update';
import type { ProductListItem, User, UserProfile as UserProfileType } from '@campus-market/shared';
import welcomeSvg from '../assets/welcome.svg';

const formatTime = (timeStr: string | Date): string => {
  if (!timeStr) return '';

  const date = new Date(timeStr);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 60) return `${diffMinutes || 1}分钟前`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}小时前`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}天前`;

  return date.toLocaleDateString('zh-CN');
};

interface MappedProduct {
  id: number;
  title: string;
  price: number;
  description: string;
  image: string;
  location: string;
  timeAgo: string;
  seller: {
    name: string;
    avatar: string;
  };
}

type ProfileData = Omit<User, 'studentId'> & {
  profile?: UserProfileType;
  avatarUrl?: string;
  name?: string;
  studentId?: string;
  major?: string;
  grade?: string;
  campus?: string;
  bio?: string;
  credit?: number;
  joinAt?: string;
  sellingCount?: number;
  soldCount?: number;
};

type ProductTab = 'ON_SALE' | 'SOLD';

const PRODUCT_TAB_QUERY_KEY = 'tab';

const getProfileField = <T extends keyof UserProfileType>(
  profile: ProfileData | null,
  key: T,
): UserProfileType[T] | undefined => {
  const topLevelValue = profile?.[key as keyof ProfileData];
  return (topLevelValue as UserProfileType[T] | undefined) ?? profile?.profile?.[key];
};

const getProductTabFromSearch = (search: string): ProductTab => {
  const tab = new URLSearchParams(search).get(PRODUCT_TAB_QUERY_KEY);
  return tab === 'sold' ? 'SOLD' : 'ON_SALE';
};

const syncProductTabToUrl = (tab: ProductTab) => {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set(PRODUCT_TAB_QUERY_KEY, tab === 'SOLD' ? 'sold' : 'on-sale');
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
};

const getInitialProfile = (userId: string | undefined): ProfileData | null => {
  if (!userId || typeof window === 'undefined') {
    return null;
  }

  const currentUser = getCurrentUser();
  if (currentUser && String(currentUser.id) === userId) {
    return {
      ...currentUser,
      avatarUrl: currentUser.avatar || currentUser.profile?.avatarUrl,
      name: getUserDisplayName(currentUser, currentUser.studentId),
      campus: currentUser.profile?.campus,
      major: currentUser.profile?.major,
      grade: currentUser.profile?.grade,
      bio: currentUser.profile?.bio,
      joinAt:
        currentUser.createdAt instanceof Date
          ? currentUser.createdAt.toISOString()
          : String(currentUser.createdAt),
    };
  }

  return null;
};

const buildSessionUser = (profileData: ProfileData, currentUser: User): User => {
  const nextAvatar = getUserAvatarUrl(profileData) || currentUser.avatar;

  return {
    ...currentUser,
    ...profileData,
    studentId: profileData.studentId || currentUser.studentId,
    avatar: nextAvatar,
    profile: {
      ...(currentUser.profile ?? {}),
      ...(profileData.profile ?? {}),
      id: profileData.profile?.id ?? currentUser.profile?.id ?? currentUser.id,
      userId: profileData.profile?.userId ?? currentUser.profile?.userId ?? currentUser.id,
      name: profileData.name || profileData.profile?.name || currentUser.profile?.name,
      studentId:
        profileData.studentId || profileData.profile?.studentId || currentUser.profile?.studentId,
      campus: getProfileField(profileData, 'campus') || currentUser.profile?.campus,
      major: getProfileField(profileData, 'major') || currentUser.profile?.major,
      grade: getProfileField(profileData, 'grade') || currentUser.profile?.grade,
      bio: profileData.bio || profileData.profile?.bio || currentUser.profile?.bio,
      avatarUrl: nextAvatar,
    },
  };
};

const syncCurrentUserCache = (profileData: ProfileData, currentUser: User | null) => {
  if (currentUser && String(currentUser.id) === String(profileData.id)) {
    updateAuthSessionUser(buildSessionUser(profileData, currentUser));
  }
};

const LoadingLine: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span
    aria-hidden="true"
    className={`inline-block rounded bg-slate-200 animate-pulse align-middle ${className}`.trim()}
  />
);

const UserProfile: React.FC = () => {
  const { user: sessionUser } = useAuthSession();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(() => getInitialProfile(id));
  const [products, setProducts] = useState<MappedProduct[]>([]);
  const [profileLoading, setProfileLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeProductTab, setActiveProductTab] = useState<ProductTab>(() =>
    getProductTabFromSearch(typeof window === 'undefined' ? '' : window.location.search),
  );

  const currentUser = sessionUser;
  const isCurrentUser = !!currentUser && String(currentUser.id) === id;

  const handleNeedLogin = () => {
    setShowAuthModal(true);
  };

  const handleLoginSuccess = () => {
    setShowAuthModal(false);
    window.location.reload();
  };

  const handleContactSeller = async () => {
    if (!isAuthenticated()) {
      setShowAuthModal(true);
      return;
    }

    const targetProduct = products[0];
    if (!targetProduct) {
      window.alert('该用户当前没有可联系的商品。');
      return;
    }

    try {
      const response = await chatApi.startChat(targetProduct.id);
      if (response.success && response.data?.id) {
        navigate(`/chat?sessionId=${response.data.id}`);
        return;
      }

      window.alert(response.message || '打开聊天失败，请稍后重试');
    } catch {
      window.alert('打开聊天失败，请稍后重试');
    }
  };

  const loadProductsByStatus = useCallback(
    async (status: ProductTab, activeProfile?: ProfileData | null) => {
      if (!id) return;

      try {
        setProductsLoading(true);

        const productsRes = await userApi.getUserProducts(Number(id), status);
        if (!productsRes.success) {
          console.error(productsRes.message || '加载商品列表失败');
          return;
        }

        const sourceProfile = activeProfile;
        const list = productsRes.data || [];
        const mapped: MappedProduct[] = list.map((product: ProductListItem) => ({
          id: product.id,
          title: product.title,
          price: product.price,
          description: product.description || '',
          image:
            product.images?.[0]?.url ||
            'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&q=80&w=800',
          location: product.location || '校内',
          timeAgo: formatTime(product.createdAt),
          seller: {
            name: getUserDisplayName(
              product.seller,
              sourceProfile?.name || sourceProfile?.studentId || '同学',
            ),
            avatar:
              getUserAvatarUrl(
                product.seller,
                getUserAvatarUrl(sourceProfile) ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${product.sellerId || product.id}`,
              ) || '',
          },
        }));

        setProducts(mapped);
      } catch (caughtError) {
        console.error('加载商品列表失败', caughtError);
      } finally {
        setProductsLoading(false);
      }
    },
    [id],
  );

  const loadData = useCallback(async () => {
    if (!id) return;

    const initialTab = getProductTabFromSearch(
      typeof window === 'undefined' ? '' : window.location.search,
    );

    try {
      setProfileLoading(true);
      const initialProfile = getInitialProfile(id);
      setProfile(initialProfile);
      setActiveProductTab(initialTab);

      const profileRes = await userApi.getProfile(Number(id));
      let nextProfile = initialProfile;
      if (profileRes.success && profileRes.data) {
        nextProfile = profileRes.data as ProfileData;
        setProfile(nextProfile);
        syncCurrentUserCache(nextProfile, currentUser);
      } else {
        console.error(profileRes.message || '加载用户信息失败');
      }

      await loadProductsByStatus(initialTab, nextProfile);
    } catch (caughtError) {
      console.error('加载用户主页失败，请稍后重试', caughtError);
    } finally {
      setProfileLoading(false);
    }
  }, [currentUser, id, loadProductsByStatus]);

  const handleProductTabClick = (tab: ProductTab) => {
    if (tab === activeProductTab) return;

    setActiveProductTab(tab);
    syncProductTabToUrl(tab);
    void loadProductsByStatus(tab, profile);
  };

  useEffect(() => {
    if (id) {
      void loadData();
    }
  }, [id, loadData]);

  const handleEditSuccess = (updatedProfile: ProfileContainer) => {
    const nextProfile = {
      ...profile,
      ...updatedProfile,
      profile: {
        ...(profile?.profile ?? {}),
        ...(updatedProfile.profile ?? {}),
      },
    } as ProfileData;

    setProfile(nextProfile);
    try {
      syncCurrentUserCache(nextProfile, currentUser);
    } catch {
      // Ignore local cache sync errors.
    }
  };

  const avatarUrl = profileLoading ? '' : getUserAvatarUrl(profile);
  const displayName = profileLoading ? undefined : profile?.name || profile?.studentId;
  const displayStudentId = profileLoading ? undefined : profile?.studentId;
  const displayMajor = profileLoading ? undefined : getProfileField(profile, 'major');
  const displayGrade = profileLoading ? undefined : getProfileField(profile, 'grade');
  const displayCampus = profileLoading ? undefined : getProfileField(profile, 'campus');
  const displayBio = profileLoading ? undefined : profile?.bio || profile?.profile?.bio;
  const displayCredit = profileLoading ? undefined : (profile?.credit ?? 700);
  const displayJoinDate = profileLoading
    ? undefined
    : profile?.joinAt
      ? new Date(profile.joinAt).toLocaleDateString('zh-CN')
      : profile?.createdAt && new Date(profile.createdAt).getTime() > 0
        ? new Date(profile.createdAt).toLocaleDateString('zh-CN')
        : undefined;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Navbar />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      <div className="pt-32 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 mb-8">
          <div className="h-40 bg-gradient-to-r from-blue-600 to-cyan-500 relative rounded-t-3xl overflow-visible">
            <img
              src={welcomeSvg}
              alt="个人主页欢迎插画"
              className="absolute right-80 -top-24 h-72 sm:h-72 pointer-events-none select-none opacity-90"
            />
            {isCurrentUser && (
              <button
                onClick={() => setShowEditModal(true)}
                className="absolute top-16 right-16 bg-white/20 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-white/30 transition-colors"
              >
                编辑个人信息
              </button>
            )}
          </div>

          <div className="px-8 pb-8">
            <div className="relative flex justify-between items-end -mt-12 mb-6">
              <div className="w-32 h-32 rounded-full shadow-xl">
                {profileLoading ? (
                  <div className="w-full h-full rounded-full bg-slate-200 animate-pulse" />
                ) : avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName || '用户头像'}
                    className="w-full h-full rounded-full bg-slate-100 object-cover"
                  />
                ) : (
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.id || id || profile?.studentId || 'user'}`}
                    alt={displayName || '用户头像'}
                    className="w-full h-full rounded-full bg-slate-100 object-cover"
                  />
                )}
              </div>

              {!isCurrentUser && (
                <div className="flex gap-3 mb-2">
                  <button
                    type="button"
                    onClick={handleContactSeller}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-full font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all flex items-center gap-2"
                  >
                    <MessageCircle size={18} />
                    联系 Ta
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-col md:flex-row gap-8">
              <div className="md:w-1/3 space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    {profileLoading ? <LoadingLine className="h-8 w-36" /> : displayName || '同学'}
                    <ShieldCheck className="text-blue-500" size={20} />
                  </h1>
                  <p className="text-slate-500 mt-1">
                    {displayStudentId && (
                      <span className="font-mono text-sm">{displayStudentId}</span>
                    )}
                    {displayStudentId && (displayMajor || displayGrade) && ' · '}
                    {displayMajor || displayGrade ? (
                      <>
                        {displayMajor || '专业未设置'} · {displayGrade || '年级未设置'}
                      </>
                    ) : profileLoading ? (
                      <LoadingLine className="h-4 w-32" />
                    ) : (
                      <>专业未设置 · 年级未设置</>
                    )}
                  </p>
                </div>

                <div className="space-y-3 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-green-500" />
                    <span>
                      {profileLoading ? (
                        <LoadingLine className="h-4 w-28" />
                      ) : (
                        <>
                          信用分：<span className="font-bold text-slate-900">{displayCredit}</span>
                          （良好）
                        </>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={16} />
                    <span>
                      {profileLoading ? (
                        <LoadingLine className="h-4 w-20" />
                      ) : (
                        displayCampus || '校内'
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={16} />
                    <span>
                      {profileLoading ? (
                        <LoadingLine className="h-4 w-24" />
                      ) : (
                        displayJoinDate || '加入时间未知'
                      )}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <h3 className="font-semibold text-slate-900 mb-2 text-sm">个人简介</h3>
                  {displayBio ? (
                    <p className="text-sm text-slate-500 leading-relaxed">{displayBio}</p>
                  ) : profileLoading ? (
                    <div className="space-y-2">
                      <div className="h-4 w-full rounded bg-slate-200 animate-pulse" />
                      <div className="h-4 w-4/5 rounded bg-slate-200 animate-pulse" />
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 leading-relaxed">
                      这个同学还没有填写个人简介。
                    </p>
                  )}
                </div>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-10 mb-6 border-b border-slate-100 pb-4">
                  <div
                    className={`relative cursor-pointer pb-1 border-b-2 transition-colors ${
                      activeProductTab === 'ON_SALE'
                        ? 'border-blue-500 text-slate-900'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                    onClick={() => handleProductTabClick('ON_SALE')}
                  >
                    <span className="text-lg font-bold">在售商品</span>
                    <span className="absolute -top-2 -right-4 bg-blue-100 text-blue-600 text-xs font-bold px-1.5 py-0.5 rounded-full">
                      {profile?.sellingCount ?? products.length}
                    </span>
                  </div>
                  <div
                    className={`relative cursor-pointer pb-1 border-b-2 transition-colors ${
                      activeProductTab === 'SOLD'
                        ? 'border-blue-500 text-slate-900'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                    onClick={() => handleProductTabClick('SOLD')}
                  >
                    <span className="text-lg font-bold">已卖出 {profile?.soldCount ?? 0}</span>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {productsLoading ? (
                    <div className="col-span-full text-center py-12 text-slate-400 text-sm">
                      {activeProductTab === 'ON_SALE'
                        ? '正在加载在售商品...'
                        : '正在加载已卖出商品...'}
                    </div>
                  ) : products.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-slate-400 text-sm">
                      {activeProductTab === 'ON_SALE' ? '暂无在售商品' : '暂无已卖出的商品'}
                    </div>
                  ) : (
                    products.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        isSold={activeProductTab === 'SOLD'}
                        onNeedLogin={handleNeedLogin}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <EditProfileModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        currentProfile={profile}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
};

export default UserProfile;
