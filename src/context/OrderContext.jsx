import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { cancelRemoteOrder, createOrder as createRemoteOrder, fetchOrder, fetchOrders } from '../api/endpoints';
import { isMockMode } from '../api/client';
import { normalizeOrder } from '../api/normalize';
import { INITIAL_ORDERS } from '../data/mockData';
import { useAuth } from './AuthContext';

const OrderContext = createContext(null);

export const ORDER_STATUSES = [
  { id: 'placed', label: 'Order placed', icon: '📝', description: 'Your order was sent to the kitchen.' },
  { id: 'confirmed', label: 'Confirmed by kitchen', icon: '✅', description: 'The kitchen accepted your order.' },
  { id: 'preparing', label: 'Preparing your food', icon: '🍳', description: 'Fresh ingredients are being cooked.' },
  { id: 'ready', label: 'Ready for pickup', icon: '🛍️', description: 'Food packed and waiting for delivery.' },
  { id: 'out_for_delivery', label: 'Out for delivery', icon: '🛵', description: 'Your order is on the way.' },
  { id: 'delivered', label: 'Delivered', icon: '🎉', description: 'Enjoy your meal!' },
  { id: 'cancelled', label: 'Cancelled', icon: '×', description: 'This order has been cancelled.' },
];

const LEGACY_STATUSES = {
  Pending: 'placed',
  Accepted: 'confirmed',
  Preparing: 'preparing',
  'Ready for Pickup': 'ready',
  'Assigned to Driver': 'out_for_delivery',
  'Picked Up': 'out_for_delivery',
  'Out for Delivery': 'out_for_delivery',
  Delivered: 'delivered',
  Completed: 'delivered',
  Cancelled: 'cancelled',
};

const normalizeStoredOrders = (saved) => {
  if (!Array.isArray(saved)) return INITIAL_ORDERS;
  return saved.map((order) => ({
    ...order,
    status: LEGACY_STATUSES[order.status] ?? order.status,
  }));
};

export const OrderProvider = ({ children }) => {
  const { accessToken } = useAuth();
  const apiEnabled = Boolean(accessToken) && !isMockMode;
  const [orders, setOrders] = useState(() => {
    if (!isMockMode) return [];
    const saved = localStorage.getItem('ofk_orders');
    if (!saved) return normalizeStoredOrders(INITIAL_ORDERS);
    try {
      return normalizeStoredOrders(JSON.parse(saved));
    } catch {
      return normalizeStoredOrders(INITIAL_ORDERS);
    }
  });
  const [activeTrackingOrderId, setActiveTrackingOrderId] = useState('');
  const [apiError, setApiError] = useState('');
  const [complaints, setComplaints] = useState(() => {
    const saved = localStorage.getItem('ofk_complaints');
    return saved ? JSON.parse(saved) : [];
  });

  const refreshOrders = async () => {
    if (!apiEnabled) return;
    try {
      const response = await fetchOrders({ limit: 50 });
      const nextOrders = (response.orders ?? []).map(normalizeOrder);
      setOrders(nextOrders);
      setApiError('');
      setActiveTrackingOrderId((current) =>
        current && nextOrders.some((order) => order.id === current)
          ? current
          : nextOrders[0]?.id ?? '',
      );
    } catch (error) {
      setApiError(error.message);
    }
  };

  useEffect(() => {
    if (apiEnabled) {
      refreshOrders();
      const timer = setInterval(refreshOrders, 15000);
      return () => clearInterval(timer);
    }
    if (!isMockMode) {
      setOrders([]);
      setActiveTrackingOrderId('');
    }
    return undefined;
  }, [accessToken]);

  useEffect(() => {
    if (isMockMode) localStorage.setItem('ofk_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('ofk_complaints', JSON.stringify(complaints));
  }, [complaints]);

  const placeOrder = async ({
    items,
    vendor,
    deliveryAddress,
    deliveryLocation,
    paymentMethod,
    orderType,
    scheduledInfo,
    pricing,
    specialNotes,
  }) => {
    if (apiEnabled) {
      setApiError('');
      try {
        const result = await createRemoteOrder({
          delivery_location: deliveryLocation,
          payment_method: paymentMethod.code,
        });
        const order = normalizeOrder(result);
        setOrders((current) => [order, ...current.filter((item) => item.id !== order.id)]);
        setActiveTrackingOrderId(order.id);
        return order.id;
      } catch (error) {
        setApiError(error.message);
        throw error;
      }
    }

    const newOrderId = `ORD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder = {
      id: newOrderId,
      createdAt: new Date().toISOString(),
      vendorId: vendor?.id ?? '',
      vendorName: vendor?.name ?? 'Kitchen',
      vendorType: vendor?.type ?? 'Food Vendor',
      vendorLocation: vendor?.location ?? '',
      orderType: orderType === 'scheduled' ? 'Scheduled' : 'Immediate',
      scheduledInfo: orderType === 'scheduled' ? scheduledInfo : null,
      status: 'placed',
      items: [...items],
      pricing,
      payment: {
        method: paymentMethod.label,
        methodCode: paymentMethod.code,
        status: paymentMethod.code === 'cash_on_delivery' ? 'pending' : 'paid',
        phone: paymentMethod.phone || '',
      },
      deliveryAddress,
      specialNotes: specialNotes || '',
      driver: null,
      estimatedDeliveryTime: orderType === 'scheduled'
        ? `${scheduledInfo.date} at ${scheduledInfo.time}`
        : '25–35 minutes',
      rated: false,
    };

    setOrders((current) => [newOrder, ...current]);
    setActiveTrackingOrderId(newOrderId);
    return newOrderId;
  };

  const refreshOrder = async (orderId) => {
    if (!apiEnabled) return getOrderById(orderId);
    try {
      const result = await fetchOrder(orderId);
      const order = normalizeOrder(result);
      setOrders((current) => [order, ...current.filter((item) => item.id !== order.id)]);
      setApiError('');
      return order;
    } catch (error) {
      setApiError(error.message);
      return null;
    }
  };

  const advanceOrderStatus = (orderId) => {
    const statusOrder = ORDER_STATUSES.filter((status) => status.id !== 'cancelled').map((status) => status.id);
    setOrders((current) => current.map((order) => {
      if (order.id !== orderId) return order;
      const currentIndex = statusOrder.indexOf(order.status);
      return currentIndex >= 0 && currentIndex < statusOrder.length - 1
        ? { ...order, status: statusOrder[currentIndex + 1] }
        : order;
    }));
  };

  const setOrderStatus = (orderId, newStatus) => {
    setOrders((current) => current.map((order) =>
      order.id === orderId ? { ...order, status: newStatus } : order,
    ));
  };

  const cancelOrder = async (orderId, reason = '') => {
    if (apiEnabled) {
      setApiError('');
      try {
        const result = await cancelRemoteOrder(orderId, reason);
        const updated = normalizeOrder(result);
        setOrders((current) => current.map((order) => order.id === orderId ? updated : order));
        return true;
      } catch (error) {
        setApiError(error.message);
        return false;
      }
    }

    const cancellable = ['placed', 'confirmed', 'preparing', 'ready'];
    setOrders((current) => current.map((order) =>
      order.id === orderId && cancellable.includes(order.status)
        ? { ...order, status: 'cancelled', cancelReason: reason }
        : order,
    ));
    return true;
  };

  const rateOrder = (orderId, rating, reviewText) => {
    setOrders((current) => current.map((order) => order.id === orderId
      ? { ...order, rated: true, rating, review: reviewText }
      : order));
  };

  const submitComplaint = (orderId, issueType, description) => {
    const complaint = {
      id: `CMP-${Math.floor(100 + Math.random() * 900)}`,
      orderId,
      issueType,
      description,
      status: 'Under Review',
      createdAt: new Date().toISOString(),
    };
    setComplaints((current) => [complaint, ...current]);
    return complaint;
  };

  const getOrderById = (id) => orders.find((order) => order.id === id);

  const value = useMemo(() => ({
    orders,
    activeTrackingOrderId,
    setActiveTrackingOrderId,
    placeOrder,
    advanceOrderStatus,
    setOrderStatus,
    cancelOrder,
    rateOrder,
    submitComplaint,
    complaints,
    getOrderById,
    refreshOrders,
    refreshOrder,
    apiError,
    clearApiError: () => setApiError(''),
    apiEnabled,
  }), [orders, activeTrackingOrderId, complaints, apiError, apiEnabled]);

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
};

export const useOrders = () => useContext(OrderContext);
