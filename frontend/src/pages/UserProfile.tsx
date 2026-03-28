import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Calendar, MapPin, MessageCircle, ShieldCheck } from 'lucide-react';
import Navbar from '../components/Navbar';
import AuthModal from '../components/AuthModal';
import ProductCard from '../components/ProductCard';
import EditProfileModal from '../components/EditProfileModal';
import { chatApi, userApi } from '../api';
import { getStoredUser, isAuthenticated } from '../lib/auth';
import { getUserAvatarUrl } from '../lib/user-display';
import type { User, UserProfile as UserProfileType } from '../../../backend/src/types/shared';
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

interface ProfileData extends User {
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
}

interface CachedProfileUser {
  id?: number;
  userId?: number;
  studentId?: string;
  name?: string;
  nickname?: string;
  avatarUrl?: string;
  campus?: string;
  major?: string;
  grade?: string;
  bio?: string;
  createdAt?: string | Date;
  joinAt?: string | Date;
}

const getProfileField = <T extends keyof UserProfileType>(
  profile: ProfileData | null,
  key: T
): UserProfileType[T] | undefined => {
  const topLevelValue = profile?.[key as keyof ProfileData];
  return (topLevelValue as UserProfileType[T] | undefined) ?? profile?.profile?.[key];
};

const getInitialProfile = (userId: string | undefined): ProfileData | null => {
  if (!userId || typeof window === 'undefined') {
    return null;
  }

  const storedUser = getStoredUser<CachedProfileUser>();
  if (!storedUser) {
    return null;
  }

  const storedUserId = storedUser.userId ?? storedUser.id;
  if (typeof storedUserId !== 'number' || String(storedUserId) !== userId) {
    return null;
  }

  return {
    id: storedUserId,
    studentId: storedUser.studentId || '',
    email: '',
    createdAt: storedUser.createdAt ? new Date(storedUser.createdAt) : new Date(0),
    updatedAt: new Date(0),
    name: storedUser.name || storedUser.nickname,
    avatarUrl: storedUser.avatarUrl,
    campus: storedUser.campus,
    major: storedUser.major,
    grade: storedUser.grade,
    bio: storedUser.bio,
    joinAt: storedUser.joinAt ? String(storedUser.joinAt) : undefined,
    profile: {
      id: storedUserId,
      userId: storedUserId,
      name: storedUser.name || storedUser.nickname,
      nickname: storedUser.nickname,
      studentId: storedUser.studentId,
      campus: storedUser.campus,
      location: storedUser.campus,
      avatarUrl: storedUser.avatarUrl,
      major: storedUser.major,
      grade: storedUser.grade,
      bio: storedUser.bio,
    },
  };
};

const syncCurrentUserCache = (profileData: ProfileData) => {
  const storedUser = getStoredUser<CachedProfileUser>();
  const localUserId = storedUser?.userId ?? storedUser?.id;

  if (!storedUser || String(localUserId) !== String(profileData.id)) {
    return;
  }

  const displayName =
    profileData.name ||
    profileData.profile?.name ||
    storedUser.name ||
    storedUser.nickname ||
    storedUser.studentId;

  const updatedUser = {
    ...storedUser,
    id: profileData.id,
    name: displayName,
    nickname: displayName,
    studentId: profileData.studentId || storedUser.studentId,
    avatarUrl: getUserAvatarUrl(profileData) || storedUser.avatarUrl,
    campus:
      getProfileField(profileData, 'campus') ||
      profileData.profile?.location ||
      storedUser.campus,
    major: getProfileField(profileData, 'major') || storedUser.major,
    grade: getProfileField(profileData, 'grade') || storedUser.grade,
    bio: profileData.bio || profileData.profile?.bio || storedUser.bio,
    createdAt:
      profileData.createdAt instanceof Date
        ? profileData.createdAt.toISOString()
        : profileData.createdAt || storedUser.createdAt,
    joinAt:
      profileData.joinAt ||
      (profileData.createdAt instanceof Date
        ? profileData.createdAt.toISOString()
        : profileData.createdAt) ||
      storedUser.joinAt,
  };

  localStorage.setItem('user', JSON.stringify(updatedUser));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('user-profile-updated'));
  }
};

const LoadingLine: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span
    aria-hidden="true"
    className={`inline-block rounded bg-slate-200 animate-pulse align-middle ${className}`.trim()}
  />
);

const UserProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(() => getInitialProfile(id));
  const [products, setProducts] = useState<MappedProduct[]>([]);
  const [profileLoading, setProfileLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeProductTab, setActiveProductTab] = useState<'ON_SALE' | 'SOLD'>('ON_SALE');

  const currentUser = getStoredUser<CachedProfileUser>();
  const isCurrentUser = !!currentUser && String(currentUser.userId || currentUser.id) === id;

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
      window.alert('该用户当前没有可联系的商品');
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

  const loadProductsByStatus = async (status: string) => {
    if (!id) return;

    try {
      setProductsLoading(true);

      const productsRes = await userApi.getUserProducts(Number(id), status);
      if (!productsRes.success) {
        console.error(productsRes.message || '加载商品列表失败');
        return;
      }

      const data = productsRes.data as any;
      const list = Array.isArray(data) ? data : data?.content || [];
      const mapped: MappedProduct[] = (list as any[]).map((product: any) => ({
        id: product.id,
        title: product.title,
        price: product.price,
        description: '',
        image:
          product.thumbnail ||
          product.images?.[0]?.url ||
          'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&q=80&w=800',
        location: product.location || '校内',
        timeAgo: formatTime(product.createdAt),
        seller: {
          name: product.sellerName || profile?.name || profile?.studentId || '同学',
          avatar:
            product.sellerAvatar ||
            profile?.avatarUrl ||
            profile?.avatar ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${product.sellerId || product.id}`,
        },
      }));

      setProducts(mapped);
    } catch (error) {
      console.error('加载商品列表失败', error);
    } finally {
      setProductsLoading(false);
    }
  };

  const loadData = async () => {
    if (!id) return;

    try {
      setProfileLoading(true);
      setProfile(getInitialProfile(id));

      const profileRes = await userApi.getProfile(Number(id));
      if (profileRes.success && profileRes.data) {
        const nextProfile = profileRes.data as ProfileData;
        setProfile(nextProfile);
        syncCurrentUserCache(nextProfile);
      } else {
        console.error(profileRes.message || '加载用户信息失败');
      }

      await loadProductsByStatus('ON_SALE');
    } catch (error) {
      console.error('加载用户主页失败，请稍后重试', error);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleProductTabClick = (tab: 'ON_SALE' | 'SOLD') => {
    if (tab === activeProductTab) return;

    setActiveProductTab(tab);
    void loadProductsByStatus(tab === 'SOLD' ? 'SOLD' : 'ON_SALE');
  };

  useEffect(() => {
    if (id) {
      void loadData();
    }
  }, [id]);

  const handleEditSuccess = (updatedProfile: ProfileData) => {
    setProfile(updatedProfile);

    try {
      syncCurrentUserCache(updatedProfile);
    } catch {
      // Ignore local cache sync errors.
    }
  };

  const avatarUrl = getUserAvatarUrl(profile);
  const displayName = profile?.name || profile?.studentId;
  const displayMajor = getProfileField(profile, 'major');
  const displayGrade = getProfileField(profile, 'grade');
  const displayCampus = getProfileField(profile, 'campus') || profile?.profile?.location;
  const displayBio = profile?.bio || profile?.profile?.bio;
  const displayJoinDate = profile?.joinAt
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
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={profile?.nickname || profile?.studentId || '用户头像'}
                    className="w-full h-full rounded-full bg-slate-100 object-cover"
                  />
                ) : profileLoading ? (
                  <div className="w-full h-full rounded-full bg-slate-200 animate-pulse" />
                ) : (
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${
                      profile?.id || id || profile?.studentId || 'user'
                    }`}
                    alt={profile?.nickname || profile?.studentId || '用户头像'}
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
                    联系Ta
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-col md:flex-row gap-8">
              <div className="md:w-1/3 space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    {displayName || (profileLoading ? <LoadingLine className="h-8 w-36" /> : '同学')}
                    <ShieldCheck className="text-blue-500" size={20} />
                  </h1>
                  <p className="text-slate-500 mt-1">
                    {profile?.studentId && (
                      <span className="font-mono text-sm">{profile.studentId}</span>
                    )}
                    {profile?.studentId && (displayMajor || displayGrade) && ' · '}
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
                      信用分：
                      <span className="font-bold text-slate-900">{profile?.credit ?? 700}</span>{' '}
                      (极好)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={16} />
                    <span>
                      {displayCampus || (profileLoading ? <LoadingLine className="h-4 w-20" /> : '校内')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={16} />
                    <span>
                      {displayJoinDate || (profileLoading ? <LoadingLine className="h-4 w-24" /> : '加入时间未知')}
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
                      这个同学还没有填写个人简介～
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
