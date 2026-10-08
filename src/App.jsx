import React, { Suspense, lazy, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import CartDrawer from './components/cart/CartDrawer';
import AuthModal from './components/auth/AuthModal';
import ErrorBoundary from './components/common/ErrorBoundary';
import { HomeFeedSkeleton } from './components/common/Skeleton';

import HomePage from './pages/HomePage';

// Route-level code splitting for the heavier screens.
const VendorsPage = lazy(() => import('./pages/VendorsPage'));
const VendorPage = lazy(() => import('./pages/VendorPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const OrderTrackingPage = lazy(() => import('./pages/OrderTrackingPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const OrdersHistoryPage = lazy(() => import('./pages/OrdersHistoryPage'));
const WishlistPage = lazy(() => import('./pages/WishlistPage'));

export default function App() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50">
      <Navbar searchTerm={searchTerm} onSearchChange={setSearchTerm} />

      <main className="flex-1">
        <ErrorBoundary>
          <Suspense
            fallback={
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <HomeFeedSkeleton />
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/vendors" element={<VendorsPage />} />
              <Route path="/vendor/:vendorId" element={<VendorPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/track" element={<OrderTrackingPage />} />
              <Route path="/track/:orderId" element={<OrderTrackingPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/orders" element={<OrdersHistoryPage />} />
              <Route path="/wishlist" element={<WishlistPage />} />
              <Route path="*" element={<HomePage />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>

      <CartDrawer />
      <AuthModal />
      <Footer />
    </div>
  );
}
