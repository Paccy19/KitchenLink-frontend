import React, { createContext, useContext, useState, useEffect } from 'react';
import { INITIAL_ORDERS } from '../data/mockData';

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

const normalizeStoredOrders = (orders) =>
  Array.isArray(orders)
    ? orders.map((order) => ({ ...order, status: LEGACY_STATUSES[order.status] ?? order.status }))
    : INITIAL_ORDERS;

export const OrderProvider = ({ children }) => {
  const [orders, setOrders] = useState(() => {
    const saved = localStorage.getItem('ofk_orders');
    if (!saved) return normalizeStoredOrders(INITIAL_ORDERS);
    try {
      return normalizeStoredOrders(JSON.parse(saved));
    } catch {
      return normalizeStoredOrders(INITIAL_ORDERS);
    }
  });

  const [activeTrackingOrderId, setActiveTrackingOrderId] = useState(() => {
    return 'ORD-2026-9042'; // default to current active order
  });

  const [complaints, setComplaints] = useState(() => {
    const saved = localStorage.getItem('ofk_complaints');
    return saved ? JSON.parse(saved) : [
      {
        id: 'CMP-101',
        orderId: 'ORD-2026-9041',
        issueType: 'Late delivery',
        description: 'Driver arrived 15 minutes after estimated window due to rain.',
        status: 'Resolved',
        createdAt: '2026-10-07T14:30:00Z',
        resolutionNote: 'Customer credited 1,000 RWF platform voucher.'
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('ofk_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('ofk_complaints', JSON.stringify(complaints));
  }, [complaints]);

  const placeOrder = ({ items, vendor, deliveryAddress, paymentMethod, orderType, scheduledInfo, pricing, specialNotes }) => {
    const newOrderId = `ORD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    
    const newOrder = {
      id: newOrderId,
      createdAt: new Date().toISOString(),
      vendorId: vendor.id,
      vendorName: vendor.name,
      vendorType: vendor.type,
      vendorLocation: vendor.location,
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
        transactionId: `TXN-${Math.floor(100000 + Math.random() * 900000)}`
      },
      deliveryAddress,
      specialNotes: specialNotes || '',
      driver: {
        name: 'Jean-Paul Bizimana',
        phone: '+250 788 443 219',
        vehicle: 'Motorcycle TVS Apache (RAD 310 P)',
        rating: 4.92
      },
      estimatedDeliveryTime: orderType === 'scheduled' ? `${scheduledInfo.date} at ${scheduledInfo.time}` : '25–35 minutes',
      rated: false
    };

    setOrders(prev => [newOrder, ...prev]);
    setActiveTrackingOrderId(newOrderId);
    return newOrderId;
  };

  const advanceOrderStatus = (orderId) => {
    const statusOrder = ORDER_STATUSES.filter((status) => status.id !== 'cancelled').map((status) => status.id);
    setOrders(prev => prev.map(ord => {
      if (ord.id === orderId) {
        const currentIndex = statusOrder.indexOf(ord.status);
        if (currentIndex >= 0 && currentIndex < statusOrder.length - 1) {
          return {
            ...ord,
            status: statusOrder[currentIndex + 1]
          };
        }
      }
      return ord;
    }));
  };

  const setOrderStatus = (orderId, newStatus) => {
    setOrders(prev => prev.map(ord => {
      if (ord.id === orderId) {
        return { ...ord, status: newStatus };
      }
      return ord;
    }));
  };

  const cancelOrder = (orderId, reason = '') => {
    const cancellable = ['placed', 'confirmed', 'preparing', 'ready'];
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId && cancellable.includes(order.status)
          ? {
              ...order,
              status: 'cancelled',
              cancelReason: reason,
              payment:
                order.payment.status === 'paid'
                  ? { ...order.payment, status: 'refunded' }
                  : order.payment,
            }
          : order,
      ),
    );
  };

  const rateOrder = (orderId, rating, reviewText) => {
    setOrders(prev => prev.map(ord => {
      if (ord.id === orderId) {
        return {
          ...ord,
          rated: true,
          rating,
          review: reviewText
        };
      }
      return ord;
    }));
  };

  const submitComplaint = (orderId, issueType, description) => {
    const newComplaint = {
      id: `CMP-${Math.floor(100 + Math.random() * 900)}`,
      orderId,
      issueType,
      description,
      status: 'Under Review', // Under Review | Approved | Processed | Rejected
      createdAt: new Date().toISOString()
    };
    setComplaints(prev => [newComplaint, ...prev]);
    return newComplaint;
  };

  const getOrderById = (id) => orders.find(o => o.id === id);

  return (
    <OrderContext.Provider value={{
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
      getOrderById
    }}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrders = () => useContext(OrderContext);
