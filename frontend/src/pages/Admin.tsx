import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Ban,
  BarChart3,
  CheckCircle,
  Filter,
  Grid3x3,
  MoreVertical,
  Receipt,
  Search,
  ShoppingCart,
  Sparkles,
  Trash2,
  UsersRound,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  AdminCategoryListItem,
  AdminOrderListItem,
  AdminProductListItem,
  AdminStatistics,
  AdminUserListItem,
  OrderStatus,
  ProductStatus,
} from '@campus-market/shared';
import { isAdmin } from '../lib/auth';
import { adminApi } from '../api';
import { useToast } from '../hooks/useToast';
import ToastContainer from '../components/ToastContainer';

type AdminTab = 'dashboard' | 'users' | 'products' | 'orders' | 'categories';
type SearchableTab = Extract<AdminTab, 'users' | 'products' | 'orders'>;
type AdminToast = ReturnType<typeof useToast>;
type ColorTone = 'blue' | 'green' | 'purple' | 'orange';

type CategoryChartItem = {
  name: string;
  value: number;
  color: string;
};

type StatCard = {
  label: string;
  value: string;
  change: string;
  icon: typeof UsersRound;
  color: ColorTone;
};

type TabItem = {
  key: AdminTab;
  label: string;
  icon: typeof BarChart3;
};

const ADMIN_TABS: TabItem[] = [
  { key: 'dashboard', label: '数据概览', icon: BarChart3 },
  { key: 'users', label: '用户管理', icon: UsersRound },
  { key: 'products', label: '商品管理', icon: ShoppingCart },
  { key: 'orders', label: '订单管理', icon: Receipt },
  { key: 'categories', label: '分类管理', icon: Grid3x3 },
];

const CATEGORY_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f43f5e',
];

const PRODUCT_STATUS_LABELS: Record<string, string> = {
  ON_SALE: '在售',
  RESERVED: '已预订',
  SOLD: '已售出',
  DELETED: '已下架',
};

const PRODUCT_STATUS_COLORS: Record<string, string> = {
  ON_SALE: 'bg-green-50 text-green-700',
  RESERVED: 'bg-amber-50 text-amber-700',
  SOLD: 'bg-slate-100 text-slate-700',
  DELETED: 'bg-red-50 text-red-700',
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: '待发货',
  SHIPPED: '运输中',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
};

const ORDER_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700',
  SHIPPED: 'bg-purple-50 text-purple-700',
  COMPLETED: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-red-50 text-red-700',
};

const CATEGORY_ICONS: Record<string, string> = {
  数码产品: '💻',
  书籍教材: '📚',
  图书教材: '📚',
  生活用品: '🪥',
  运动器材: '🏸',
  衣物鞋帽: '👟',
  服装配饰: '👕',
  美妆护肤: '🧴',
  食品饮料: '🍱',
  文具办公: '🖊️',
  家具家电: '🪑',
  其他: '📦',
};

const CARD_COLORS: Record<ColorTone, { bg: string; light: string; badge: string }> = {
  blue: {
    bg: 'bg-gradient-to-br from-blue-500 to-blue-600',
    light: 'bg-blue-50',
    badge: 'bg-blue-100 text-blue-700',
  },
  green: {
    bg: 'bg-gradient-to-br from-green-500 to-green-600',
    light: 'bg-green-50',
    badge: 'bg-green-100 text-green-700',
  },
  purple: {
    bg: 'bg-gradient-to-br from-purple-500 to-purple-600',
    light: 'bg-purple-50',
    badge: 'bg-purple-100 text-purple-700',
  },
  orange: {
    bg: 'bg-gradient-to-br from-orange-500 to-orange-600',
    light: 'bg-orange-50',
    badge: 'bg-orange-100 text-orange-700',
  },
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'data' in error.response &&
    error.response.data &&
    typeof error.response.data === 'object' &&
    'message' in error.response.data &&
    typeof error.response.data.message === 'string'
  ) {
    return error.response.data.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

const buildCategoryChartData = (categories: AdminCategoryListItem[]): CategoryChartItem[] =>
  categories.map((category, index) => ({
    name: category.name,
    value: category.productCount,
    color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
  }));

const formatCurrency = (value: number): string => `¥${value.toLocaleString('zh-CN')}`;
const formatDate = (value: string | Date): string => new Date(value).toLocaleDateString('zh-CN');
const formatDateTime = (value: string | Date): string => new Date(value).toLocaleString('zh-CN');

const getSearchPlaceholder = (tab: SearchableTab): string => {
  switch (tab) {
    case 'users':
      return '搜索学号、手机号或角色';
    case 'products':
      return '搜索商品标题';
    case 'orders':
      return '搜索订单编号';
    default:
      return '搜索';
  }
};

const getProductStatusLabel = (status: ProductStatus | string) =>
  PRODUCT_STATUS_LABELS[status] ?? status;
const getOrderStatusLabel = (status: OrderStatus | string) => ORDER_STATUS_LABELS[status] ?? status;
const getProductStatusColor = (status: ProductStatus | string) =>
  PRODUCT_STATUS_COLORS[status] ?? 'bg-slate-100 text-slate-700';
const getOrderStatusColor = (status: OrderStatus | string) =>
  ORDER_STATUS_COLORS[status] ?? 'bg-slate-100 text-slate-700';

const PaginationControls: React.FC<{
  page: number;
  total: number;
  pageSize: number;
  onPageChange: React.Dispatch<React.SetStateAction<number>>;
}> = ({ page, total, pageSize, onPageChange }) => {
  if (total <= pageSize) {
    return null;
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        onClick={() => onPageChange((current) => Math.max(1, current - 1))}
        disabled={page === 1}
        className="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        上一页
      </button>
      <span className="text-sm text-slate-600">
        第 {page} / {totalPages} 页
      </span>
      <button
        onClick={() => onPageChange((current) => Math.min(totalPages, current + 1))}
        disabled={page >= totalPages}
        className="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        下一页
      </button>
    </div>
  );
};

const Admin: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const showError = toast.error;
  const hasAdminAccess = isAdmin();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [searchKeyword, setSearchKeyword] = useState('');

  useEffect(() => {
    if (!hasAdminAccess) {
      showError('您没有管理员权限');
      navigate('/');
    }
  }, [hasAdminAccess, navigate, showError]);

  if (!hasAdminAccess) {
    return null;
  }

  const searchable = activeTab === 'users' || activeTab === 'products' || activeTab === 'orders';

  return (
    <div className="min-h-screen bg-slate-50">
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />

      <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-blue-600 text-white p-2 rounded-xl">
            <BarChart3 size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">管理后台</h1>
            <p className="text-xs text-slate-500">Campus Market</p>
          </div>
        </div>

        <nav className="space-y-2">
          {ADMIN_TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                activeTab === key ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">{label}</span>
            </button>
          ))}
        </nav>

        <button
          onClick={() => navigate('/')}
          className="absolute bottom-6 left-6 right-6 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
        >
          返回前台
        </button>
      </aside>

      <main className="ml-64 p-8">
        {searchable && (
          <div className="mb-6 flex items-center gap-4">
            <div className="relative flex-1">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={20}
              />
              <input
                type="text"
                placeholder={getSearchPlaceholder(activeTab)}
                value={searchKeyword}
                onChange={(event) => setSearchKeyword(event.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="hidden md:flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-500">
              <Filter size={18} />
              按关键词筛选
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && <Dashboard toast={toast} />}
        {activeTab === 'users' && <UserManagement searchKeyword={searchKeyword} toast={toast} />}
        {activeTab === 'products' && (
          <ProductManagement searchKeyword={searchKeyword} toast={toast} />
        )}
        {activeTab === 'orders' && <OrderManagement searchKeyword={searchKeyword} toast={toast} />}
        {activeTab === 'categories' && <CategoryManagement toast={toast} />}
      </main>
    </div>
  );
};

const Dashboard: React.FC<{ toast: AdminToast }> = ({ toast }) => {
  const [statistics, setStatistics] = useState<AdminStatistics | null>(null);
  const [categoryData, setCategoryData] = useState<CategoryChartItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setLoading(true);

    const [statisticsResult, categoriesResult] = await Promise.allSettled([
      adminApi.getStatistics(),
      adminApi.getAllCategories(),
    ]);

    if (statisticsResult.status === 'fulfilled' && statisticsResult.value.success) {
      setStatistics(statisticsResult.value.data);
    } else if (statisticsResult.status === 'rejected') {
      toast.error(getErrorMessage(statisticsResult.reason, '加载统计数据失败'));
    }

    if (categoriesResult.status === 'fulfilled' && categoriesResult.value.success) {
      setCategoryData(buildCategoryChartData(categoriesResult.value.data));
    } else if (categoriesResult.status === 'rejected') {
      toast.error(getErrorMessage(categoriesResult.reason, '加载分类数据失败'));
    }

    setLoading(false);
  }, [toast]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const stats = useMemo<StatCard[]>(() => {
    if (!statistics) {
      return [];
    }

    return [
      {
        label: '总用户数',
        value: statistics.totalUsers.toLocaleString('zh-CN'),
        change: statistics.todayUsers > 0 ? `+${statistics.todayUsers}` : '+0',
        icon: UsersRound,
        color: 'blue',
      },
      {
        label: '在售商品',
        value: statistics.totalProducts.toLocaleString('zh-CN'),
        change: statistics.todayProducts > 0 ? `+${statistics.todayProducts}` : '+0',
        icon: ShoppingCart,
        color: 'green',
      },
      {
        label: '总订单数',
        value: statistics.totalOrders.toLocaleString('zh-CN'),
        change: statistics.todayOrders > 0 ? `+${statistics.todayOrders}` : '+0',
        icon: Receipt,
        color: 'purple',
      },
      {
        label: '活跃用户',
        value: statistics.activeUsers.toLocaleString('zh-CN'),
        change:
          statistics.totalUsers > 0
            ? `${Math.round((statistics.activeUsers / statistics.totalUsers) * 100)}%`
            : '0%',
        icon: Sparkles,
        color: 'orange',
      },
    ];
  }, [statistics]);

  const orderStatusData = useMemo(
    () =>
      (statistics?.orderStatusDistribution ?? []).map((item) => ({
        status: getOrderStatusLabel(item.status),
        count: item.count,
      })),
    [statistics],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">数据概览</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const colors = CARD_COLORS[stat.color];

          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className="group relative bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
            >
              <div
                className={`absolute top-0 right-0 w-32 h-32 ${colors.light} rounded-full -mr-16 -mt-16 opacity-50 group-hover:scale-110 transition-transform duration-300`}
              />

              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`w-14 h-14 rounded-xl ${colors.bg} flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300`}
                  >
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors.badge}`}>
                    {stat.change}
                  </span>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-900 tracking-tight">{stat.value}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4">用户增长趋势</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={statistics?.userGrowthTrend ?? []}>
              <defs>
                <linearGradient id="adminUsersGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="users"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#adminUsersGradient)"
                name="累计用户"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4">商品分类分布</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
                label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {categoryData.map((item, index) => (
                  <Cell key={`${item.name}-${index}`} fill={item.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>

          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            {categoryData.map((item) => (
              <div key={item.name} className="flex items-center gap-2 text-slate-600">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span>{item.name}</span>
                <span className="text-slate-400">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4">订单状态分布</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={orderStatusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="status" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip />
              <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} name="订单数" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4">每日交易额趋势</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={statistics?.salesTrend ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ fill: '#10b981', r: 5 }}
                activeDot={{ r: 7 }}
                name="交易额"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const UserManagement: React.FC<{ searchKeyword: string; toast: AdminToast }> = ({
  searchKeyword,
  toast,
}) => {
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminApi.getAllUsers({
        page,
        pageSize,
        keyword: searchKeyword || undefined,
      });

      if (response.success) {
        setUsers(response.data.users);
        setTotal(response.data.total);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, '加载用户列表失败'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchKeyword, toast]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const toggleUserStatus = async (userId: number) => {
    try {
      const response = await adminApi.toggleUserStatus(userId);
      if (!response.success) {
        toast.error('更新用户状态失败');
        return;
      }

      setUsers((current) =>
        current.map((user) =>
          user.id === userId ? { ...user, enabled: response.data.enabled } : user,
        ),
      );
      toast.success('用户状态已更新');
    } catch (error) {
      toast.error(getErrorMessage(error, '更新用户状态失败'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">用户管理</h2>
        <span className="text-sm text-slate-500">共 {total} 位用户</span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {users.length === 0 ? (
          <div className="text-center py-12 text-slate-400">暂无用户数据</div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                  用户 ID
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">学号</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">手机号</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">角色</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">状态</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                  注册时间
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-900">#{user.id}</td>
                  <td className="px-6 py-4 text-sm text-slate-900 font-medium">{user.studentId}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{user.phone ?? '未填写'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{user.role}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                        user.enabled ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {user.enabled ? '正常' : '已禁用'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{formatDate(user.createdAt)}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => void toggleUserStatus(user.id)}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        user.enabled
                          ? 'bg-red-50 hover:bg-red-100 text-red-600'
                          : 'bg-green-50 hover:bg-green-100 text-green-600'
                      }`}
                    >
                      {user.enabled ? <Ban size={16} /> : <CheckCircle size={16} />}
                      {user.enabled ? '禁用' : '启用'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <PaginationControls page={page} total={total} pageSize={pageSize} onPageChange={setPage} />
    </div>
  );
};

const ProductManagement: React.FC<{ searchKeyword: string; toast: AdminToast }> = ({
  searchKeyword,
  toast,
}) => {
  const [products, setProducts] = useState<AdminProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const pageSize = 20;

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminApi.getAllProducts({
        page,
        pageSize,
        keyword: searchKeyword || undefined,
      });

      if (response.success) {
        setProducts(response.data.products);
        setTotal(response.data.total);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, '加载商品列表失败'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchKeyword, toast]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const deleteProduct = async (productId: number) => {
    try {
      const response = await adminApi.deleteProduct(productId);
      if (!response.success) {
        toast.error('删除商品失败');
        return;
      }

      toast.success('商品已删除');
      setShowDeleteConfirm(null);
      await loadProducts();
    } catch (error) {
      toast.error(getErrorMessage(error, '删除商品失败'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">商品管理</h2>
        <span className="text-sm text-slate-500">共 {total} 件商品</span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {products.length === 0 ? (
          <div className="text-center py-12 text-slate-400">暂无商品数据</div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                  商品 ID
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                  商品名称
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                  卖家 ID
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">价格</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">状态</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">浏览量</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                  发布时间
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-900">#{product.id}</td>
                  <td className="px-6 py-4 text-sm text-slate-900 font-medium max-w-xs truncate">
                    {product.title}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">#{product.sellerId}</td>
                  <td className="px-6 py-4 text-sm text-slate-900 font-semibold">
                    {formatCurrency(product.price)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${getProductStatusColor(product.status)}`}
                    >
                      {getProductStatusLabel(product.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{product.viewCount}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {formatDate(product.createdAt)}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setShowDeleteConfirm(product.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} className="text-red-600" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <PaginationControls page={page} total={total} pageSize={pageSize} onPageChange={setPage} />

      {showDeleteConfirm !== null && (
        <ConfirmDialog
          title="确认删除"
          description="确定要删除这件商品吗？该操作无法撤销。"
          confirmText="删除"
          confirmTone="danger"
          onCancel={() => setShowDeleteConfirm(null)}
          onConfirm={() => void deleteProduct(showDeleteConfirm)}
        />
      )}
    </div>
  );
};

const OrderManagement: React.FC<{ searchKeyword: string; toast: AdminToast }> = ({
  searchKeyword,
  toast,
}) => {
  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminApi.getAllOrders({
        page,
        pageSize,
        keyword: searchKeyword || undefined,
      });

      if (response.success) {
        setOrders(response.data.orders);
        setTotal(response.data.total);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, '加载订单列表失败'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchKeyword, toast]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">订单管理</h2>
        <span className="text-sm text-slate-500">共 {total} 笔订单</span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {orders.length === 0 ? (
          <div className="text-center py-12 text-slate-400">暂无订单数据</div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                  订单编号
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                  买家 ID
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                  卖家 ID
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                  商品 ID
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">金额</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">状态</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                  创建时间
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-900 font-mono">{order.orderNo}</td>
                  <td className="px-6 py-4 text-sm text-slate-900">#{order.buyerId}</td>
                  <td className="px-6 py-4 text-sm text-slate-900">#{order.sellerId}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">#{order.productId}</td>
                  <td className="px-6 py-4 text-sm text-slate-900 font-semibold">
                    {formatCurrency(order.priceSnapshot)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${getOrderStatusColor(order.status)}`}
                    >
                      {getOrderStatusLabel(order.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {formatDateTime(order.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <PaginationControls page={page} total={total} pageSize={pageSize} onPageChange={setPage} />
    </div>
  );
};

const CategoryManagement: React.FC<{ toast: AdminToast }> = ({ toast }) => {
  const [categories, setCategories] = useState<AdminCategoryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminApi.getAllCategories();
      if (response.success) {
        setCategories(response.data);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, '加载分类列表失败'));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const addCategory = async () => {
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) {
      toast.warning('请输入分类名称');
      return;
    }

    try {
      const response = await adminApi.createCategory(trimmedName);
      if (!response.success) {
        toast.error('创建分类失败');
        return;
      }

      toast.success('分类创建成功');
      setNewCategoryName('');
      setShowAddModal(false);
      await loadCategories();
    } catch (error) {
      toast.error(getErrorMessage(error, '创建分类失败'));
    }
  };

  const deleteCategory = async (categoryId: number) => {
    try {
      const response = await adminApi.deleteCategory(categoryId);
      if (!response.success) {
        toast.error('删除分类失败');
        return;
      }

      toast.success('分类已删除');
      setShowDeleteConfirm(null);
      await loadCategories();
    } catch (error) {
      toast.error(getErrorMessage(error, '删除分类失败'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">分类管理</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
        >
          + 添加分类
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-4xl">{CATEGORY_ICONS[category.name] ?? '📦'}</div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{category.name}</h3>
                  <p className="text-sm text-slate-500">{category.productCount} 件商品</p>
                </div>
              </div>
              <button type="button" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <MoreVertical size={18} className="text-slate-400" />
              </button>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(category.id)}
              className="w-full px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors text-sm font-medium"
            >
              删除
            </button>
          </motion.div>
        ))}
      </div>

      {showAddModal && (
        <ModalShell onClose={() => setShowAddModal(false)}>
          <h3 className="text-xl font-bold text-slate-900 mb-4">添加新分类</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">分类名称</label>
              <input
                type="text"
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                placeholder="例如：数码产品"
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors font-medium"
              >
                取消
              </button>
              <button
                onClick={() => void addCategory()}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-medium"
              >
                添加
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {showDeleteConfirm !== null && (
        <ConfirmDialog
          title="确认删除"
          description="确定要删除这个分类吗？该操作无法撤销。"
          confirmText="删除"
          confirmTone="danger"
          onCancel={() => setShowDeleteConfirm(null)}
          onConfirm={() => void deleteCategory(showDeleteConfirm)}
        />
      )}
    </div>
  );
};

const ModalShell: React.FC<{ children: React.ReactNode; onClose: () => void }> = ({
  children,
  onClose,
}) => {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl p-6 w-full max-w-md m-4"
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </motion.div>
    </div>
  );
};

const ConfirmDialog: React.FC<{
  title: string;
  description: string;
  confirmText: string;
  confirmTone?: 'danger' | 'primary';
  onCancel: () => void;
  onConfirm: () => void;
}> = ({ title, description, confirmText, confirmTone = 'primary', onCancel, onConfirm }) => {
  const confirmClassName =
    confirmTone === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700';

  return (
    <ModalShell onClose={onCancel}>
      <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600 mb-6">{description}</p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors font-medium"
        >
          取消
        </button>
        <button
          onClick={onConfirm}
          className={`flex-1 px-4 py-2 text-white rounded-xl transition-colors font-medium ${confirmClassName}`}
        >
          {confirmText}
        </button>
      </div>
    </ModalShell>
  );
};

export default Admin;
