import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import CartDrawer from './components/cart/CartDrawer';
import AuthModal from './components/auth/AuthModal';
import ErrorBoundary from './components/common/ErrorBoundary';
import ScrollManager from './components/common/ScrollManager';
import ThemeToggle from './components/common/ThemeToggle';
import { HomeFeedSkeleton } from './components/common/Skeleton';
import { loadCheckoutPage, loadVendorPage, loadVendorsPage, preloadCustomerPages } from './utils/preload';

import HomePage from './pages/HomePage';

// Route-level code splitting for the heavier screens.
const VendorsPage = lazy(loadVendorsPage);
const VendorsMapPage = lazy(() => import('./pages/VendorsMapPage'));
const VendorPage = lazy(loadVendorPage);
const CheckoutPage = lazy(loadCheckoutPage);
const EventOrderPage = lazy(() => import('./pages/EventOrderPage'));
const OrderTrackingPage = lazy(() => import('./pages/OrderTrackingPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const OrdersHistoryPage = lazy(() => import('./pages/OrdersHistoryPage'));
const WishlistPage = lazy(() => import('./pages/WishlistPage'));
const SupportPage = lazy(() => import('./pages/SupportPage'));
const MessagesPage = lazy(() => import('./pages/MessagesPage'));
const VendorMessagesPage = lazy(() => import('./pages/vendor/VendorMessagesPage'));
// Big-event delivery: coverage, special delivery negotiations, admin pricing.
const SpecialDeliveriesPage = lazy(() => import('./pages/SpecialDeliveriesPage'));
const SpecialDeliveryPage = lazy(() => import('./pages/SpecialDeliveryPage'));
const VendorDeliveryCoveragePage = lazy(() => import('./pages/vendor/VendorDeliveryCoveragePage'));
const VendorSpecialDeliveriesPage = lazy(() => import('./pages/vendor/VendorSpecialDeliveriesPage'));
const AdminDeliveryManagementPage = lazy(() => import('./pages/admin/AdminDeliveryManagementPage'));
const AdminChatsPage = lazy(() => import('./pages/admin/AdminChatsPage'));

// Vendor dashboard (separate shell without the customer chrome).
const VendorLayout = lazy(() => import('./components/vendor-dashboard/VendorLayout'));
const VendorOverviewPage = lazy(() => import('./pages/vendor/VendorOverviewPage'));
const VendorOrdersPage = lazy(() => import('./pages/vendor/VendorOrdersPage'));
const VendorMenuPage = lazy(() => import('./pages/vendor/VendorMenuPage'));
const VendorWalletPage = lazy(() => import('./pages/vendor/VendorWalletPage'));
const VendorNotificationsPage = lazy(() => import('./pages/vendor/VendorNotificationsPage'));
const VendorProfilePage = lazy(() => import('./pages/vendor/VendorProfilePage'));
const VendorSupportPage = lazy(() => import('./pages/vendor/VendorSupportPage'));
const VendorRegisterPage = lazy(() => import('./pages/vendor/VendorRegisterPage'));
const VendorKitchenQueuePage = lazy(() => import('./pages/vendor/VendorKitchenQueuePage'));
const VendorServicePage = lazy(() => import('./pages/vendor/VendorServicePage'));
const VendorTablesPage = lazy(() => import('./pages/vendor/VendorTablesPage'));
const VendorInvoicesPage = lazy(() => import('./pages/vendor/VendorInvoicesPage'));
const VendorDepartmentsPage = lazy(() => import('./pages/vendor/VendorDepartmentsPage'));
const VendorStaffPage = lazy(() => import('./pages/vendor/VendorStaffPage'));
const VendorInventoryPage = lazy(() => import('./pages/vendor/VendorInventoryPage'));
const VendorReportsPage = lazy(() => import('./pages/vendor/VendorReportsPage'));
const VendorActivityPage = lazy(() => import('./pages/vendor/VendorActivityPage'));
const VendorOperationsPage = lazy(() => import('./pages/vendor/VendorOperationsPage'));
const TableMenuPage = lazy(() => import('./pages/TableMenuPage'));
const VendorInboxPage = lazy(() => import('./pages/vendor/VendorInboxPage'));
const VendorCustomersPage = lazy(() => import('./pages/vendor/VendorCustomersPage'));
const VendorReservationsPage = lazy(() => import('./pages/vendor/VendorReservationsPage'));
const VendorFloorPage = lazy(() => import('./pages/vendor/VendorFloorPage'));
const VendorMyTablesPage = lazy(() => import('./pages/vendor/VendorMyTablesPage'));
const VendorPackingPage = lazy(() => import('./pages/vendor/VendorPackingPage'));
const VendorDeliveriesPage = lazy(() => import('./pages/vendor/VendorDeliveriesPage'));
const BookingPage = lazy(() => import('./pages/BookingPage'));
const VendorPromotionsPage = lazy(() => import('./pages/vendor/VendorPromotionsPage'));
const VendorFinancePage = lazy(() => import('./pages/vendor/VendorFinancePage'));
const VendorCashierPage = lazy(() => import('./pages/vendor/VendorCashierPage'));

// Driver app (separate shell without the customer chrome).
const DriverLayout = lazy(() => import('./components/driver-dashboard/DriverLayout'));
const DriverRegisterPage = lazy(() => import('./pages/driver/DriverRegisterPage'));
const DriverDashboardPage = lazy(() => import('./pages/driver/DriverDashboardPage'));
const DriverActiveDeliveryPage = lazy(() => import('./pages/driver/DriverActiveDeliveryPage'));
const DriverHistoryPage = lazy(() => import('./pages/driver/DriverHistoryPage'));
const DriverEarningsPage = lazy(() => import('./pages/driver/DriverEarningsPage'));
const DriverProfilePage = lazy(() => import('./pages/driver/DriverProfilePage'));
const DriverSupportPage = lazy(() => import('./pages/driver/DriverSupportPage'));

// Admin panel (separate shell without the customer chrome).
const AdminLayout = lazy(() => import('./components/admin-dashboard/AdminLayout'));
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
const AdminRefundsPage = lazy(() => import('./pages/admin/AdminRefundsPage'));
const AdminAnalyticsPage = lazy(() => import('./pages/admin/AdminAnalyticsPage'));
const AdminAuditPage = lazy(() => import('./pages/admin/AdminAuditPage'));
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage'));
const AdminTeamPage = lazy(() => import('./pages/admin/AdminTeamPage'));
const AdminPlatformBooksPage = lazy(() => import('./pages/admin/AdminPlatformBooksPage'));
const AdminInvitePage = lazy(() => import('./pages/admin/AdminInvitePage'));
const UnifiedLoginPage = lazy(() => import('./pages/UnifiedLoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));

export default function App() {
  const location = useLocation();
  const isDriverArea = location.pathname.startsWith('/driver-');
  const isAdminArea = location.pathname.startsWith('/admin-');
  const isVendorArea =
    location.pathname.startsWith('/vendor-dashboard') ||
    location.pathname.startsWith('/vendor-login') ||
    isDriverArea ||
    isAdminArea;

  // Every area now offers dark mode, each with its own palette scope.
  const themeScope = isDriverArea ? 'app-theme-driver' : isAdminArea ? 'app-theme-admin' : 'app-theme';

  // Customers get the kitchen, kitchens list and checkout pages ready in the
  // background; staff dashboards don't need them.
  useEffect(() => {
    if (!isVendorArea) preloadCustomerPages();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`min-h-screen flex flex-col ${isDriverArea || isAdminArea ? 'bg-gray-50/50' : 'kl-canvas'} ${themeScope}`}>
      <ScrollManager />
      {!isVendorArea && <Navbar />}

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
              {/* A table's QR code: the kitchen's whole menu, ordering for that table. */}
              <Route path="/menu/:token" element={<TableMenuPage />} />
              <Route path="/booking/:token" element={<BookingPage />} />
              <Route path="/event-order/:vendorId" element={<EventOrderPage />} />
              <Route path="/track" element={<OrderTrackingPage />} />
              <Route path="/track/:orderId" element={<OrderTrackingPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/orders" element={<OrdersHistoryPage />} />
              <Route path="/wishlist" element={<WishlistPage />} />
              <Route path="/support" element={<SupportPage />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/special-deliveries" element={<SpecialDeliveriesPage />} />
              <Route path="/special-deliveries/:requestId" element={<SpecialDeliveryPage />} />
              <Route path="/login" element={<UnifiedLoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/register" element={<Navigate to="/signup" replace />} />
              <Route path="/vendor-register" element={<VendorRegisterPage />} />
              <Route path="/vendor-login" element={<Navigate to="/login" replace />} />
              <Route path="/driver-register" element={<DriverRegisterPage />} />
              <Route path="/driver-login" element={<Navigate to="/login" replace />} />
              <Route path="/admin-login" element={<Navigate to="/login" replace />} />
              <Route path="/admin-verify" element={<Navigate to="/login" replace />} />
              <Route path="/admin-invite" element={<AdminInvitePage />} />

              <Route path="/admin-dashboard" element={<AdminLayout />}>
                <Route index element={<AdminOverviewPage />} />
                <Route path="orders" element={<AdminOrdersPage />} />
                <Route path="deliveries" element={<AdminDeliveriesPage />} />
                <Route path="delivery-management" element={<AdminDeliveryManagementPage />} />
                <Route path="vendors" element={<AdminVendorsPage />} />
                <Route path="drivers" element={<AdminDriversPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="payments" element={<AdminPaymentsPage />} />
                <Route path="payouts" element={<AdminPayoutsPage />} />
                <Route path="platform" element={<AdminPlatformWalletPage />} />
                <Route path="books" element={<AdminPlatformBooksPage />} />
                <Route path="categories" element={<AdminCategoriesPage />} />
                <Route path="complaints" element={<AdminComplaintsPage />} />
                <Route path="chats" element={<AdminChatsPage />} />
                <Route path="refunds" element={<AdminRefundsPage />} />
                <Route path="analytics" element={<AdminAnalyticsPage />} />
                <Route path="team" element={<AdminTeamPage />} />
                <Route path="audit" element={<AdminAuditPage />} />
                <Route path="settings" element={<Navigate to="profile" replace />} />
                <Route path="settings/:section" element={<AdminSettingsPage />} />
              </Route>

              <Route path="/driver-dashboard" element={<DriverLayout />}>
                <Route index element={<DriverDashboardPage />} />
                <Route path="active" element={<DriverActiveDeliveryPage />} />
                <Route path="history" element={<DriverHistoryPage />} />
                <Route path="earnings" element={<DriverEarningsPage />} />
                <Route path="profile" element={<DriverProfilePage />} />
                <Route path="support" element={<DriverSupportPage />} />
              </Route>

              <Route path="/vendor-dashboard" element={<VendorLayout />}>
                <Route index element={<VendorOverviewPage />} />
                <Route path="orders" element={<VendorOrdersPage />} />
                <Route path="menu" element={<VendorMenuPage />} />
                <Route path="wallet" element={<VendorWalletPage />} />
                <Route path="notifications" element={<VendorNotificationsPage />} />
                <Route path="profile" element={<VendorProfilePage />} />
                <Route path="profile/:section" element={<VendorProfilePage />} />
                <Route path="support" element={<VendorSupportPage />} />
                <Route path="messages" element={<VendorMessagesPage />} />
                <Route path="special-deliveries" element={<VendorSpecialDeliveriesPage />} />
                <Route path="delivery-coverage" element={<VendorDeliveryCoveragePage />} />
                <Route path="kitchen" element={<VendorKitchenQueuePage />} />
                <Route path="service" element={<VendorServicePage />} />
                <Route path="tables" element={<VendorTablesPage />} />
                <Route path="invoices" element={<VendorInvoicesPage />} />
                <Route path="departments" element={<VendorDepartmentsPage />} />
                <Route path="staff" element={<VendorStaffPage />} />
                <Route path="inventory" element={<VendorInventoryPage />} />
                <Route path="reports" element={<VendorReportsPage />} />
                <Route path="activity" element={<VendorActivityPage />} />
                <Route path="operations" element={<VendorOperationsPage />} />
                <Route path="inbox" element={<VendorInboxPage />} />
                <Route path="customers" element={<VendorCustomersPage />} />
                <Route path="reservations" element={<VendorReservationsPage />} />
                <Route path="floor" element={<VendorFloorPage />} />
                <Route path="my-tables" element={<VendorMyTablesPage />} />
                <Route path="packing" element={<VendorPackingPage />} />
                <Route path="deliveries" element={<VendorDeliveriesPage />} />
                <Route path="promotions" element={<VendorPromotionsPage />} />
                <Route path="finance" element={<VendorFinancePage />} />
                <Route path="cashier" element={<VendorCashierPage />} />
              </Route>

              <Route path="*" element={<HomePage />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>

      {(location.pathname.startsWith('/vendor-login') ||
        location.pathname.startsWith('/driver-login') ||
        location.pathname.startsWith('/driver-register') ||
        location.pathname.startsWith('/admin-login') ||
        location.pathname.startsWith('/admin-verify') ||
        location.pathname.startsWith('/admin-invite')) && (
        <ThemeToggle className="fixed top-4 right-4 z-50 shadow-md" />
      )}

      {!isVendorArea && <CartDrawer />}
      {!isVendorArea && <AuthModal />}
      {!isVendorArea && <Footer />}
    </div>
  );
}
