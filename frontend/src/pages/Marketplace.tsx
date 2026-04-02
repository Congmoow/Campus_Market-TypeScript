import React, { useEffect, useState } from 'react';
import { Filter } from 'lucide-react';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import type { ProductListItem } from '@campus-market/shared';
import { productApi } from '../api';
import { getUserDisplayName } from '../lib/user-display';
import AuthModal from '../components/AuthModal';
import Navbar from '../components/Navbar';
import ProductCard from '../components/ProductCard';
import openRafiki from '../assets/open-rafiki.svg';
import { sortCategoriesByPublishOrder } from '../lib/product-categories';

const SORT_OPTIONS = ['最新发布', '价格最低', '价格最高', '浏览最多'] as const;
type SortOption = typeof SORT_OPTIONS[number];

interface CardProduct {
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

interface CategoryWithAll {
  id: number | null;
  name: string;
  icon?: string;
}

const DEFAULT_PRICE_RANGE: [number, number] = [0, 1000];

const formatTimeAgo = (createdAt?: string | Date | null): string => {
  if (!createdAt) return '';

  const date = new Date(createdAt);
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

const mapToCardProduct = (product: ProductListItem): CardProduct => ({
  id: product.id,
  title: product.title,
  price: product.price,
  description: product.description || '',
  image:
    product.images?.[0]?.url ||
    'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&q=80&w=800',
  location: product.location || '校内',
  timeAgo: formatTimeAgo(product.createdAt),
  seller: {
    name: getUserDisplayName(product.seller, '同学'),
    avatar:
      product.seller?.avatar ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${product.sellerId || product.id}`,
  },
});

const sortKey = (label: SortOption): string => {
  switch (label) {
    case '价格最低':
      return 'priceAsc';
    case '价格最高':
      return 'priceDesc';
    case '浏览最多':
      return 'viewDesc';
    default:
      return 'latest';
  }
};

const Marketplace: React.FC = () => {
  const [categories, setCategories] = useState<CategoryWithAll[]>([{ id: null, name: '全部' }]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('最新发布');
  const [priceRange, setPriceRange] = useState<[number, number]>(DEFAULT_PRICE_RANGE);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [minPrice, maxPrice] = priceRange;

  const handleNeedLogin = () => {
    setShowAuthModal(true);
  };

  const handleLoginSuccess = () => {
    setShowAuthModal(false);
    window.location.reload();
  };

  const loadProducts = async (
    categoryId: number | null,
    sortLabel: SortOption,
    currentPriceRange: [number, number]
  ) => {
    try {
      setLoading(true);
      setError('');

      const [currentMinPrice, currentMaxPrice] = currentPriceRange;
      const params: {
        sort: string;
        page: number;
        size: number;
        categoryId?: number;
        minPrice?: number;
        maxPrice?: number;
      } = {
        sort: sortKey(sortLabel),
        page: 0,
        size: 20,
      };

      if (categoryId != null) {
        params.categoryId = categoryId;
      }

      if (currentMinPrice > DEFAULT_PRICE_RANGE[0]) {
        params.minPrice = currentMinPrice;
      }

      if (currentMaxPrice < DEFAULT_PRICE_RANGE[1]) {
        params.maxPrice = currentMaxPrice;
      }

      const res = await productApi.getList(params);
      if (res.success) {
        setProducts(res.data?.content || []);
      } else {
        setError(res.message || '加载商品列表失败');
      }
    } catch {
      setError('加载商品列表失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const res = await productApi.getCategories();
        if (res.success && Array.isArray(res.data)) {
          setCategories([{ id: null, name: '全部' }, ...sortCategoriesByPublishOrder(res.data)]);
        }
      } catch {
        // 分类加载失败时保留“全部”入口。
      }
    };

    init();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadProducts(selectedCategoryId, sortBy, priceRange);
    }, 300);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategoryId, sortBy, minPrice, maxPrice]);

  const visibleProducts = products.filter((product) => product.status === 'ON_SALE');
  const filteredProducts = visibleProducts.filter(
    (product) => product.price >= minPrice && product.price <= maxPrice
  );

  const emptyStateText =
    visibleProducts.length === 0
      ? '当前没有在售商品，试试其他分类或稍后再来看看。'
      : '没有符合当前价格区间的商品，试试调整筛选条件吧。';

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Navbar />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      <div className="pt-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-start gap-6">
            <div className="hidden md:block w-64 h-64 lg:w-72 lg:h-72 flex-shrink-0">
              <img
                src={openRafiki}
                alt="发现好物插画"
                className="w-full h-full object-contain drop-shadow-md"
              />
            </div>

            <div className="flex-1">
              <h1 className="text-3xl font-bold text-slate-900 mb-4">发现好物</h1>

              <div className="flex flex-col gap-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div data-testid="marketplace-category-bar" className="flex-1">
                    <div
                      data-testid="marketplace-category-list"
                      className="flex max-h-24 flex-wrap content-start gap-2"
                    >
                      {categories.map((category) => (
                        <button
                          key={category.id ?? 'all'}
                          type="button"
                          onClick={() => setSelectedCategoryId(category.id)}
                          className={`px-5 py-2.5 rounded-full whitespace-nowrap text-sm font-medium transition-all duration-300 ${
                            selectedCategoryId === category.id
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105'
                              : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-blue-600'
                          }`}
                        >
                          {category.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsSortOpen((prev) => !prev)}
                        className="inline-flex items-center justify-between gap-2 min-w-[120px] px-4 py-2 bg-white rounded-full text-sm font-medium text-slate-700 hover:bg-slate-50 border border-slate-100 shadow-sm transition-all"
                      >
                        <span>{sortBy}</span>
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 text-slate-500 transition-transform duration-300 ${
                            isSortOpen ? 'rotate-180' : 'rotate-0'
                          }`}
                        >
                          <Filter size={14} />
                        </span>
                      </button>

                      {isSortOpen && (
                        <div className="absolute right-0 mt-2 w-40 bg-white rounded-2xl shadow-lg border border-slate-100 py-1 z-20">
                          {SORT_OPTIONS.map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => {
                                setSortBy(option);
                                setIsSortOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between rounded-xl transition-colors ${
                                sortBy === option
                                  ? 'bg-blue-50 text-blue-600 font-semibold'
                                  : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <span>{option}</span>
                              {sortBy === option && (
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="px-2 max-w-2xl mt-8">
                  <div className="flex items-center justify-between text-sm font-medium text-slate-500 mb-4">
                    <span className="ml-1">价格区间</span>
                    <span className="text-slate-600">
                      ¥{minPrice} - {maxPrice === DEFAULT_PRICE_RANGE[1] ? '¥1k+' : `¥${maxPrice}`}
                    </span>
                  </div>
                  <div className="px-2">
                    <Slider
                      range
                      min={DEFAULT_PRICE_RANGE[0]}
                      max={DEFAULT_PRICE_RANGE[1]}
                      step={10}
                      value={priceRange}
                      onChange={(value) => setPriceRange(value as [number, number])}
                      marks={{
                        0: '¥0',
                        200: '¥200',
                        400: '¥400',
                        600: '¥600',
                        800: '¥800',
                        1000: '¥1k+',
                      }}
                      trackStyle={[{ backgroundColor: '#334155', height: 6 }]}
                      railStyle={{ backgroundColor: '#e2e8f0', height: 6 }}
                      handleStyle={[
                        {
                          borderColor: '#334155',
                          height: 20,
                          width: 20,
                          marginTop: -7,
                          backgroundColor: '#ffffff',
                          opacity: 1,
                          borderWidth: 4,
                          boxShadow: 'none',
                        },
                        {
                          borderColor: '#334155',
                          height: 20,
                          width: 20,
                          marginTop: -7,
                          backgroundColor: '#ffffff',
                          opacity: 1,
                          borderWidth: 4,
                          boxShadow: 'none',
                        },
                      ]}
                      dotStyle={{
                        borderColor: '#e2e8f0',
                        backgroundColor: '#ffffff',
                        borderWidth: 4,
                        bottom: -9,
                        width: 20,
                        height: 20,
                      }}
                      activeDotStyle={{
                        borderColor: '#334155',
                        backgroundColor: '#ffffff',
                        borderWidth: 4,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && <div className="text-red-500 text-sm mb-4">{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            <div className="col-span-full text-center text-slate-400 text-sm">正在加载商品...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="col-span-full text-center text-slate-400 text-sm">{emptyStateText}</div>
          ) : (
            filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={mapToCardProduct(product)}
                onNeedLogin={handleNeedLogin}
              />
            ))
          )}
        </div>

        {!loading && filteredProducts.length > 8 && (
          <div className="mt-16 text-center">
            <button className="px-8 py-3 bg-white border border-slate-200 rounded-full text-slate-600 font-medium hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm hover:shadow-md">
              加载更多商品
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Marketplace;
