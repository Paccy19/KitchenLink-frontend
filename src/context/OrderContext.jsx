import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { cancelRemoteOrder, createOrder as createRemoteOrder, fetchOrder, fetchOrders } from '../api/endpoints';
import { normalizeOrder } from '../api/normalize';
import { useAuth } from './AuthContext';

const OrderContext = createContext(null);

export const ORDER_STATUSES = [
  { id: 'placed', label: 'Order placed', icon: 'clipboard', description: 'Your order was sent to the kitchen.' },
  { id: 'confirmed', label: 'Confirmed by kitchen', icon: 'check-circle', description: 'The kitchen accepted your order.' },
  { id: 'preparing', label: 'Preparing your food', icon: 'chef-hat', description: 'Fresh ingredients are being cooked.' },
  { id: 'ready', label: 'Ready for pickup', icon: 'shopping-bag', description: 'Food packed and waiting for delivery.' },
  { id: 'out_for_delivery', label: 'Out for delivery', icon: 'bike', description: 'Your order is on the way.' },
  { id: 'delivered', label: 'Delivered', icon: 'package', description: 'Enjoy your meal!' },
  { id: 'cancelled', label: 'Cancelled', icon: '×', description: 'This order has been cancelled.' },
];

export const OrderProvider = ({ children }) => {
  const { accessToken } = useAuth();
  const apiEnabled = Boolean(accessToken);
  const [orders, setOrders] = useState([]);
  const [activeTrackingOrderId, setActiveTrackingOrderId] = useState('');
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    localStorage.removeItem('ofk_orders');
    localStorage.removeItem('ofk_complaints');
  }, []);

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
    if (!apiEnabled) {
      setOrders([]);
      setActiveTrackingOrderId('');
      return undefined;
    }
    refreshOrders();
    const timer = setInterval(refreshOrders, 15000);
    return () => clearInterval(timer);
  }, [accessToken]);

  const placeOrder = async ({ deliveryLocation, paymentMethod }) => {
    if (!apiEnabled) {
      const error = new Error('Sign in before placing an order.');
      setApiError(error.message);
      throw error;
    }
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
  };

  const refreshOrder = async (orderId) => {
    if (!apiEnabled) return null;
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

  const cancelOrder = async (orderId, reason = '') => {
    if (!apiEnabled) return false;
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
  };

  const getOrderById = (id) => orders.find((order) => order.id === id);

  const value = useMemo(() => ({
    orders,
    activeTrackingOrderId,
    setActiveTrackingOrderId,
    placeOrder,
    cancelOrder,
    getOrderById,
    refreshOrders,
    refreshOrder,
    apiError,
    clearApiError: () => setApiError(''),
    apiEnabled,
  }), [orders, activeTrackingOrderId, apiError, apiEnabled]);

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
};

export const useOrders = () => useContext(OrderContext);
