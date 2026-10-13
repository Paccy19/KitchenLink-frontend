import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

import { AuthProvider } from './context/AuthContext';
import { LocationProvider } from './context/LocationContext';
import { CartProvider } from './context/CartContext';
import { OrderProvider } from './context/OrderContext';
import { WishlistProvider } from './context/WishlistContext';
import { VendorProvider } from './context/VendorContext';
import { DriverProvider } from './context/DriverContext';
import { AdminProvider } from './context/AdminContext';
import { NotificationProvider } from './context/NotificationContext';
import { ToastProvider } from './components/common/Toast';
import ErrorBoundary from './components/common/ErrorBoundary';
import { onDataChanged } from './api/liveUpdates';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true,
      staleTime: 30_000,
      // Admin screens follow other people's changes while they are open.
      refetchInterval: (query) => (query.queryKey[0] === 'admin' ? 10_000 : false),
    },
  },
});

// After any action anywhere in the app, reload every query on screen.
onDataChanged(() => {
  queryClient.invalidateQueries({ refetchType: 'active' });
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AuthProvider>
              <LocationProvider>
                <CartProvider>
                  <WishlistProvider>
                    <OrderProvider>
                      <NotificationProvider>
                        <VendorProvider>
                          <DriverProvider>
                            <AdminProvider>
                              <App />
                            </AdminProvider>
                          </DriverProvider>
                        </VendorProvider>
                      </NotificationProvider>
                    </OrderProvider>
                  </WishlistProvider>
                </CartProvider>
              </LocationProvider>
            </AuthProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
