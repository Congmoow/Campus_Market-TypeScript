import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { lazy, ReactNode, Suspense, useEffect } from 'react';
import { restoreAuthSession, useAuthSession } from './lib/auth';

const Home = lazy(() => import('./pages/Home'));
const Marketplace = lazy(() => import('./pages/Marketplace'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Publish = lazy(() => import('./pages/Publish'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const MyProducts = lazy(() => import('./pages/MyProducts'));
const MyOrders = lazy(() => import('./pages/MyOrders'));
const MyFavorites = lazy(() => import('./pages/MyFavorites'));
const SearchResults = lazy(() => import('./pages/SearchResults'));
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderSuccess = lazy(() => import('./pages/OrderSuccess'));
const OrderDetail = lazy(() => import('./pages/OrderDetail'));
const Chat = lazy(() => import('./pages/Chat'));
const Login = lazy(() => import('./pages/Login'));
const Admin = lazy(() => import('./pages/Admin'));
const NotFound = lazy(() => import('./pages/NotFound'));

const AppFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
    正在加载页面...
  </div>
);

// Scroll to top component
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) {
      return;
    }

    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const { status } = useAuthSession();

  if (status === 'loading') {
    return <AppFallback />;
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const { status, user } = useAuthSession();

  if (status === 'loading') {
    return <AppFallback />;
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function App() {
  useEffect(() => {
    void restoreAuthSession();
  }, []);

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Suspense fallback={<AppFallback />}>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/market" element={<Marketplace />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route
            path="/publish"
            element={
              <ProtectedRoute>
                <Publish />
              </ProtectedRoute>
            }
          />
          <Route path="/user/:id" element={<UserProfile />} />
          <Route
            path="/checkout/:id"
            element={
              <ProtectedRoute>
                <Checkout />
              </ProtectedRoute>
            }
          />
          <Route
            path="/order-success"
            element={
              <ProtectedRoute>
                <OrderSuccess />
              </ProtectedRoute>
            }
          />
          <Route
            path="/order/:id"
            element={
              <ProtectedRoute>
                <OrderDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-products"
            element={
              <ProtectedRoute>
                <MyProducts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-orders"
            element={
              <ProtectedRoute>
                <MyOrders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-favorites"
            element={
              <ProtectedRoute>
                <MyFavorites />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <Admin />
              </AdminRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
