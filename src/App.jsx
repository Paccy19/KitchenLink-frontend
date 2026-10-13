import React, { Suspense, lazy, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import CartDrawer from './components/cart/CartDrawer';
import AuthModal from './components/auth/AuthModal';
import ErrorBoundary from './components/common/ErrorBoundary';
import { HomeFeedSkeleton } from './components/common/Skeleton';

import HomePage from './pages/HomePage';

// Route-level code splitting for the heavier screens.
const VendorsPage = lazy(() => import('./pages/VendorsPage'));
const VendorsMapPage = lazy(() => import('./pages/VendorsMapPage'));
const VendorPage = lazy(() => import('./pages/VendorPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const OrderTrackingPage = lazy(() => import('./pages/OrderTrackingPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const OrdersHistoryPage = lazy(() => import('./pages/OrdersHistoryPage'));
const WishlistPage = lazy(() => import('./pages/WishlistPage'));

// Vendor dashboard (separate shell without the customer chrome).
const VendorLayout = lazy(() => import('./components/vendor-dashboard/VendorLayout'));
const VendorOverviewPage = lazy(() => import('./pages/vendor/VendorOverviewPage'));
const VendorOrdersPage = lazy(() => import('./pages/vendor/VendorOrdersPage'));
const VendorMenuPage = lazy(() => import('./pages/vendor/VendorMenuPage'));
const VendorWalletPage = lazy(() => import('./pages/vendor/VendorWalletPage'));
const VendorNotificationsPage = lazy(() => import('./pages/vendor/VendorNotificationsPage'));
const VendorProfilePage = lazy(() => import('./pages/vendor/VendorProfilePage'));
const VendorRegisterPage = lazy(() => import('./pages/vendor/VendorRegisterPage'));
const VendorLoginPage = lazy(() => import('./pages/vendor/VendorLoginPage'));

// Driver app (separate shell without the customer chrome).
const DriverLayout = lazy(() => import('./components/driver-dashboard/DriverLayout'));
const DriverLoginPage = lazy(() => import('./pages/driver/DriverLoginPage'));
const DriverRegisterPage = lazy(() => import('./pages/driver/DriverRegisterPage'));
const DriverDashboardPage = lazy(() => import('./pages/driver/DriverDashboardPage'));
const DriverActiveDeliveryPage = lazy(() => import('./pages/driver/DriverActiveDeliveryPage'));
const DriverHistoryPage = lazy(() => import('./pages/driver/DriverHistoryPage'));
const DriverEarningsPage = lazy(() => import('./pages/driver/DriverEarningsPage'));
const DriverProfilePage = lazy(() => import('./pages/driver/DriverProfilePage'));

// Admin panel (separate shell without the customer chrome).
const AdminLayout = lazy(() => import('./components/admin-dashboard/AdminLayout'));
const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage'));
const AdminOverviewPage = lazy(() => import('./pages/admin/AdminOverviewPage'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'));
const AdminVendorsPage = lazy(() => import('./pages/admin/AdminVendorsPage'));
const AdminDriversPage = lazy(() => import('./pages/admin/AdminDriversPage'));
const AdminOrdersPage = lazy(() => import('./pages/admin/AdminOrdersPage'));
const AdminDeliveriesPage = lazy(() => import('./pages/admin/AdminDeliveriesPage'));
const AdminPaymentsPage = lazy(() => import('./pages/admin/AdminPaymentsPage'));
const AdminPayoutsPage = lazy(() => import('./pages/admin/AdminPayoutsPage'));
const AdminPlatformWalletPage = lazy(() => import('./pages/admin/AdminPlatformWalletPage'));
const AdminCategoriesPage = lazy(() => import('./pages/admin/AdminCategoriesPage'));
const AdminComplaintsPage = lazy(() => import('./pages/admin/AdminComplaintsPage'));
const AdminAnalyticsPage = lazy(() => import('./pages/admin/AdminAnalyticsPage'));
const AdminAuditPage = lazy(() => import('./pages/admin/AdminAuditPage'));
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage'));

export default function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const location = useLocation();
  const isVendorArea =
    location.pathname.startsWith('/vendor-dashboard') ||
    location.pathname.startsWith('/vendor-login') ||
    location.pathname.startsWith('/driver-dashboard') ||
    location.pathname.startsWith('/driver-login') ||
    location.pathname.startsWith('/driver-register') ||
    location.pathname.startsWith('/admin-login') ||
    location.pathname.startsWith('/admin-dashboard');

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50">
      {!isVendorArea && <Navbar searchTerm={searchTerm} onSearchChange={setSearchTerm} />}

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
              <Route path="/vendors/map" element={<VendorsMapPage />} />
              <Route path="/vendor/:vendorId" element={<VendorPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/track" element={<OrderTrackingPage />} />
              <Route path="/track/:orderId" element={<OrderTrackingPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/orders" element={<OrdersHistoryPage />} />
              <Route path="/wishlist" element={<WishlistPage />} />
              <Route path="/vendor-register" element={<VendorRegisterPage />} />
              <Route path="/vendor-login" element={<VendorLoginPage />} />
              <Route path="/driver-register" element={<DriverRegisterPage />} />
              <Route path="/driver-login" element={<DriverLoginPage />} />
              <Route path="/admin-login" element={<AdminLoginPage />} />

              <Route path="/admin-dashboard" element={<AdminLayout />}>
                <Route index element={<AdminOverviewPage />} />
                <Route path="orders" element={<AdminOrdersPage />} />
                <Route path="deliveries" element={<AdminDeliveriesPage />} />
                <Route path="vendors" element={<AdminVendorsPage />} />
                <Route path="drivers" element={<AdminDriversPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="payments" element={<AdminPaymentsPage />} />
                <Route path="payouts" element={<AdminPayoutsPage />} />
                <Route path="platform" element={<AdminPlatformWalletPage />} />
                <Route path="categories" element={<AdminCategoriesPage />} />
                <Route path="complaints" element={<AdminComplaintsPage />} />
                <Route path="analytics" element={<AdminAnalyticsPage />} />
                <Route path="audit" element={<AdminAuditPage />} />
                <Route path="settings" element={<AdminSettingsPage />} />
              </Route>

              <Route path="/driver-dashboard" element={<DriverLayout />}>
                <Route index element={<DriverDashboardPage />} />
                <Route path="active" element={<DriverActiveDeliveryPage />} />
                <Route path="history" element={<DriverHistoryPage />} />
                <Route path="earnings" element={<DriverEarningsPage />} />
                <Route path="profile" element={<DriverProfilePage />} />
              </Route>

              <Route path="/vendor-dashboard" element={<VendorLayout />}>
                <Route index element={<VendorOverviewPage />} />
                <Route path="orders" element={<VendorOrdersPage />} />
                <Route path="menu" element={<VendorMenuPage />} />
                <Route path="wallet" element={<VendorWalletPage />} />
                <Route path="notifications" element={<VendorNotificationsPage />} />
                <Route path="profile" element={<VendorProfilePage />} />
              </Route>

              <Route path="*" element={<HomePage />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>

      {!isVendorArea && <CartDrawer />}
      {!isVendorArea && <AuthModal />}
      {!isVendorArea && <Footer />}
    </div>
  );
}
