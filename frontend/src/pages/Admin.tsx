import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UsersRound, ShoppingCart, Receipt, Sparkles, BarChart3,
  Search, Filter, MoreVertical, Ban, CheckCircle,
  Trash2, Grid3x3
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import { isAdmin } from '../lib/auth';
import { adminApi } from '../api';
import { useToast } from '../hooks/useToast';
import ToastContainer from '../components/ToastContainer';

// 管理员仪表盘主页面
const Admin: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'products' | 'orders' | 'categories'>('dashboard');
  const [searchKeyword, setSearchKeyword] = useState('');
  const toast = useToast();

  // 检查管理员权限
  useEffect(() => {
    if (!isAdmin()) {
      toast.error('您没有管理员权限');
      navigate('/');
    }
  }, [navigate]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard toast={toast} />;
      case 'users':
        return <UserManagement searchKeyword={searchKeyword} toast={toast} />;
      case 'products':
        return <ProductManagement searchKeyword={searchKeyword} toast={toast} />;
      case 'orders':
        return <OrderManagement searchKeyword={searchKeyword} toast={toast} />;
      case 'categories':
        return <CategoryManagement toast={toast} />;
      default:
        return <Dashboard toast={toast} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Toast 提示容器 */}
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
      
      {/* 侧边栏 */}
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
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              activeTab === 'dashboard'
                ? 'bg-blue-50 text-blue-600'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <BarChart3 size={20} />
            <span className="font-medium">数据概览</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              activeTab === 'users'
                ? 'bg-blue-50 text-blue-600'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <UsersRound size={20} />
            <span className="font-medium">用户管理</span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              activeTab === 'products'
                ? 'bg-blue-50 text-blue-600'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ShoppingCart size={20} />
            <span className="font-medium">商品管理</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              activeTab === 'orders'
                ? 'bg-blue-50 text-blue-600'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Receipt size={20} />
            <span className="font-medium">订单管理</span>
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              activeTab === 'categories'
                ? 'bg-blue-50 text-blue-600'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Grid3x3 size={20} />
            <span className="font-medium">分类管理</span>
          </button>
        </nav>

        <button
          onClick={() => navigate('/')}
          className="absolute bottom-6 left-6 right-6 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
        >
          返回前台
        </button>
      </aside>
      {/* 主内容区 */}
      <main className="ml-64 p-8">
        {/* 顶部搜索栏 */}
        {activeTab !== 'dashboard' && activeTab !== 'categories' && (
          <div className="mb-6 flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder={`搜索${activeTab === 'users' ? '用户' : activeTab === 'products' ? '商品' : '订单'}...`}
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              <Filter size={20} />
              <span>筛选</span>
            </button>
          </div>
        )}

        {/* 内容区域 */}
        {renderContent()}
      </main>
    </div>
  );
};

// 创建 Toast Context 用于子组件
const ToastContext = React.createContext<ReturnType<typeof useToast> | null>(null);

export const useAdminToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useAdminToast must be used within Admin component');
  }
  return context;
};

// 数据概览仪表盘
const Dashboard: React.FC<{ toast: ReturnType<typeof useToast> }> = ({ toast }) => {
  const [statistics, setStatistics] = useState<any>(null);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatistics();
    loadCategories();
  }, []);

  const loadStatistics = async () => {
    try {
      const response = await adminApi.getStatistics();
      if (response.success) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error('加载统计数据失败:', error);
      toast.error('加载统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await adminApi.getAllCategories();
      if (response.success) {
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e'];
        const data = response.data.map((cat: any, index: number) => ({
          name: cat.name,
          value: cat.productCount,
          color: colors[index % colors.length]
        }));
        setCategoryData(data);
      }
    } catch (error) {
      console.error('加载分类数据失败:', error);
      toast.error('加载分类数据失败');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">加载中...</div>
      </div>
    );
  }

  const stats = [
    { 
      label: '总用户数', 
      value: statistics?.totalUsers?.toLocaleString() || '0', 
      change: statistics?.todayUsers ? `+${statistics.todayUsers}` : '+0', 
      icon: UsersRound, 
      color: 'blue' 
    },
    { 
      label: '在售商品', 
      value: statistics?.totalProducts?.toLocaleString() || '0', 
      change: statistics?.todayProducts ? `+${statistics.todayProducts}` : '+0', 
      icon: ShoppingCart, 
      color: 'green' 
    },
    { 
      label: '总订单数', 
      value: statistics?.totalOrders?.toLocaleString() || '0', 
      change: statistics?.todayOrders ? `+${statistics.todayOrders}` : '+0', 
      icon: Receipt, 
      color: 'purple' 
    },
    { 
      label: '活跃用户', 
      value: statistics?.activeUsers?.toLocaleString() || '0', 
      change: statistics?.totalUsers ? `${Math.round((statistics.activeUsers / statistics.totalUsers) * 100)}%` : '0%', 
      icon: Sparkles, 
      color: 'orange' 
    },
  ];

  // 用户增长趋势数据（从后端获取）
  const userGrowthData = statistics?.userGrowthTrend || [];

  // 订单状态分布数据（从后端获取）
  const orderStatusData = (statistics?.orderStatusDistribution || []).map((item: any) => {
    const statusMap: Record<string, string> = {
      PENDING: '待发货',
      SHIPPED: '进行中',
      COMPLETED: '已完成',
      CANCELLED: '已取消',
    };
    return {
      status: statusMap[item.status] || item.status,
      count: item.count,
    };
  });

  // 每日交易额趋势（从后端获取）
  const salesData = statistics?.salesTrend || [];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">数据概览</h2>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const colorClasses = {
            blue: {
              bg: 'bg-gradient-to-br from-blue-500 to-blue-600',
              light: 'bg-blue-50',
              text: 'text-blue-600',
              badge: 'bg-blue-100 text-blue-700'
            },
            green: {
              bg: 'bg-gradient-to-br from-green-500 to-green-600',
              light: 'bg-green-50',
              text: 'text-green-600',
              badge: 'bg-green-100 text-green-700'
            },
            purple: {
              bg: 'bg-gradient-to-br from-purple-500 to-purple-600',
              light: 'bg-purple-50',
              text: 'text-purple-600',
              badge: 'bg-purple-100 text-purple-700'
            },
            orange: {
              bg: 'bg-gradient-to-br from-orange-500 to-orange-600',
              light: 'bg-orange-50',
              text: 'text-orange-600',
              badge: 'bg-orange-100 text-orange-700'
            }
          };
          const colors = colorClasses[stat.color as keyof typeof colorClasses];
          
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group relative bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
            >
              {/* 背景装饰 */}
              <div className={`absolute top-0 right-0 w-32 h-32 ${colors.light} rounded-full -mr-16 -mt-16 opacity-50 group-hover:scale-110 transition-transform duration-300`}></div>
              
              <div className="relative">
                {/* 图标和变化值 */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-14 h-14 rounded-xl ${colors.bg} flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors.badge}`}>
                    {stat.change}
                  </span>
                </div>
                
                {/* 标签和数值 */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-900 tracking-tight">{stat.value}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 用户增长趋势图 */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4">用户增长趋势</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={userGrowthData}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip 
                cursor={false}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="users" 
                stroke="#3b82f6" 
                strokeWidth={2}
                fill="url(#colorUsers)" 
                name="总用户数"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* 商品分类分布饼图 */}
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
                label={({ percent }) => `${((percent || 0) * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                iconType="circle"
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* 订单状态分布柱状图 */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4">订单状态分布</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={orderStatusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="status" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip 
                cursor={false}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} name="订单数" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 每日交易额趋势图 */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4">每日交易额趋势</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip 
                cursor={false}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}
                formatter={(value: number | string | undefined) => value ? `¥${Number(value).toLocaleString()}` : '¥0'}
              />
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

// 用户管理组件
const UserManagement: React.FC<{ searchKeyword: string; toast: ReturnType<typeof useToast> }> = ({ searchKeyword, toast }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    loadUsers();
  }, [page, searchKeyword]);

  const loadUsers = async () => {
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
      console.error('加载用户列表失败:', error);
      toast.error('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId: number) => {
    try {
      const response = await adminApi.toggleUserStatus(userId);
      if (response.success) {
        // 更新本地状态
        setUsers(users.map(u => 
          u.id === userId 
            ? { ...u, enabled: response.data.enabled }
            : u
        ));
        toast.success('用户状态已更新');
      }
    } catch (error) {
      console.error('切换用户状态失败:', error);
      toast.error('操作失败');
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
        <span className="text-sm text-slate-500">共 {total} 个用户</span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">用户ID</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">用户名</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">手机号</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">角色</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">状态</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">注册时间</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-sm text-slate-900">#{user.id}</td>
                <td className="px-6 py-4 text-sm text-slate-900">{user.studentId}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{user.phone || '-'}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                    user.role === 'ADMIN' 
                      ? 'bg-purple-50 text-purple-600' 
                      : 'bg-blue-50 text-blue-600'
                  }`}>
                    {user.role === 'ADMIN' ? '管理员' : '用户'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                    user.enabled 
                      ? 'bg-green-50 text-green-600' 
                      : 'bg-red-50 text-red-600'
                  }`}>
                    {user.enabled ? <CheckCircle size={14} /> : <Ban size={14} />}
                    {user.enabled ? '正常' : '已禁用'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => toggleUserStatus(user.id)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                      disabled={user.role === 'ADMIN'}
                      title={user.role === 'ADMIN' ? '不能禁用管理员' : user.enabled ? '禁用用户' : '启用用户'}
                    >
                      {user.enabled ? (
                        <Ban size={16} className={user.role === 'ADMIN' ? 'text-slate-300' : 'text-red-600'} />
                      ) : (
                        <CheckCircle size={16} className="text-green-600" />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {total > pageSize && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            上一页
          </button>
          <span className="text-sm text-slate-600">
            第 {page} 页 / 共 {Math.ceil(total / pageSize)} 页
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(total / pageSize)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
};

// 商品管理组件
const ProductManagement: React.FC<{ searchKeyword: string; toast: ReturnType<typeof useToast> }> = ({ searchKeyword, toast }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const pageSize = 20;

  useEffect(() => {
    loadProducts();
  }, [page, searchKeyword]);

  const loadProducts = async () => {
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
      console.error('加载商品列表失败:', error);
      toast.error('加载商品列表失败');
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (productId: number) => {
    try {
      const response = await adminApi.deleteProduct(productId);
      if (response.success) {
        toast.success('商品已删除');
        setShowDeleteConfirm(null);
        loadProducts(); // 重新加载列表
      }
    } catch (error) {
      console.error('删除商品失败:', error);
      toast.error('删除失败');
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      ON_SALE: '在售',
      SOLD: '已售',
      RESERVED: '预定',
      OFF_SALE: '下架',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      ON_SALE: 'bg-green-50 text-green-600',
      SOLD: 'bg-slate-100 text-slate-600',
      RESERVED: 'bg-yellow-50 text-yellow-600',
      OFF_SALE: 'bg-red-50 text-red-600',
    };
    return colorMap[status] || 'bg-slate-100 text-slate-600';
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
        <span className="text-sm text-slate-500">共 {total} 个商品</span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">商品ID</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">商品名称</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">卖家ID</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">价格</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">状态</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">浏览量</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">发布时间</th>
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
                <td className="px-6 py-4 text-sm text-slate-900 font-semibold">¥{product.price}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(product.status)}`}>
                    {getStatusText(product.status)}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">{product.viewCount}</td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {new Date(product.createdAt).toLocaleDateString('zh-CN')}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setShowDeleteConfirm(product.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} className="text-red-600" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {total > pageSize && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            上一页
          </button>
          <span className="text-sm text-slate-600">
            第 {page} 页 / 共 {Math.ceil(total / pageSize)} 页
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(total / pageSize)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            下一页
          </button>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowDeleteConfirm(null)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-md m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-slate-900 mb-2">确认删除</h3>
            <p className="text-slate-600 mb-6">确定要删除这个商品吗？此操作无法撤销。</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors font-medium"
              >
                取消
              </button>
              <button
                onClick={() => deleteProduct(showDeleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors font-medium"
              >
                删除
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

// 订单管理组件
const OrderManagement: React.FC<{ searchKeyword: string; toast: ReturnType<typeof useToast> }> = ({ searchKeyword, toast }) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    loadOrders();
  }, [page, searchKeyword]);

  const loadOrders = async () => {
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
      console.error('加载订单列表失败:', error);
      toast.error('加载订单列表失败');
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      PENDING: '待发货',
      SHIPPED: '进行中',
      COMPLETED: '已完成',
      CANCELLED: '已取消',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      PENDING: 'bg-yellow-50 text-yellow-600',
      SHIPPED: 'bg-purple-50 text-purple-600',
      COMPLETED: 'bg-green-50 text-green-600',
      CANCELLED: 'bg-red-50 text-red-600',
    };
    return colorMap[status] || 'bg-slate-100 text-slate-600';
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
        <h2 className="text-2xl font-bold text-slate-900">订单管理</h2>
        <span className="text-sm text-slate-500">共 {total} 个订单</span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {orders.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            暂无订单数据
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">订单编号</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">买家ID</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">卖家ID</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">商品ID</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">金额</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">状态</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">创建时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-900 font-mono">{order.orderNo}</td>
                  <td className="px-6 py-4 text-sm text-slate-900">#{order.buyerId}</td>
                  <td className="px-6 py-4 text-sm text-slate-900">#{order.sellerId}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">#{order.productId}</td>
                  <td className="px-6 py-4 text-sm text-slate-900 font-semibold">¥{order.priceSnapshot}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {new Date(order.createdAt).toLocaleString('zh-CN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 分页 */}
      {total > pageSize && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            上一页
          </button>
          <span className="text-sm text-slate-600">
            第 {page} 页 / 共 {Math.ceil(total / pageSize)} 页
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(total / pageSize)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
};

// 分类管理组件
const CategoryManagement: React.FC<{ toast: ReturnType<typeof useToast> }> = ({ toast }) => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getAllCategories();
      if (response.success) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('加载分类列表失败:', error);
      toast.error('加载分类列表失败');
    } finally {
      setLoading(false);
    }
  };

  const addCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.warning('请输入分类名称');
      return;
    }
    
    try {
      const response = await adminApi.createCategory(newCategoryName.trim());
      if (response.success) {
        toast.success('分类创建成功');
        setNewCategoryName('');
        setShowAddModal(false);
        loadCategories(); // 重新加载列表
      }
    } catch (error) {
      console.error('创建分类失败:', error);
      toast.error('创建失败');
    }
  };

  const deleteCategory = async (categoryId: number) => {
    try {
      const response = await adminApi.deleteCategory(categoryId);
      if (response.success) {
        toast.success('分类已删除');
        setShowDeleteConfirm(null);
        loadCategories(); // 重新加载列表
      }
    } catch (error: any) {
      console.error('删除分类失败:', error);
      toast.error(error.response?.data?.message || '删除失败');
    }
  };

  // 分类图标映射
  const getCategoryIcon = (name: string) => {
    const iconMap: Record<string, string> = {
      '数码产品': '💻',
      '书籍教材': '📚',
      '图书教材': '📚',
      '生活用品': '🏠',
      '运动器材': '⚽',
      '衣物鞋帽': '👕',
      '服装配饰': '👔',
      '美妆护肤': '💄',
      '食品饮料': '🍔',
      '文具办公': '✏️',
      '家具家电': '🛋️',
      '其他': '🔖',
    };
    return iconMap[name] || '🔖';
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
                <div className="text-4xl">{getCategoryIcon(category.name)}</div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{category.name}</h3>
                  <p className="text-sm text-slate-500">{category.productCount} 个商品</p>
                </div>
              </div>
              <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <MoreVertical size={18} className="text-slate-400" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowDeleteConfirm(category.id)}
                className="flex-1 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors text-sm font-medium"
              >
                删除
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 添加分类弹窗 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddModal(false)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-md m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-slate-900 mb-4">添加新分类</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">分类名称</label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
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
                  onClick={addCategory}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-medium"
                >
                  添加
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowDeleteConfirm(null)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-md m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-slate-900 mb-2">确认删除</h3>
            <p className="text-slate-600 mb-6">确定要删除这个分类吗？此操作无法撤销。</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors font-medium"
              >
                取消
              </button>
              <button
                onClick={() => deleteCategory(showDeleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors font-medium"
              >
                删除
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Admin;
