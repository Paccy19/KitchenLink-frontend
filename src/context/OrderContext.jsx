import React, { createContext, useContext, useState, useEffect } from 'react';
import { INITIAL_ORDERS } from '../data/mockData';

const OrderContext = createContext(null);

export const ORDER_STATUSES = [
  { id: 'Pending', label: 'Order Received', icon: '📝', description: 'Your order was sent to the kitchen.' },
  { id: 'Accepted', label: 'Order Accepted', icon: '✅', description: 'The kitchen accepted your order.' },
  { id: 'Preparing', label: 'Cooking & Preparing', icon: '🍳', description: 'Fresh ingredients are being cooked.' },
  { id: 'Ready for Pickup', label: 'Ready for Pickup', icon: '🛍️', description: 'Food packed, waiting for delivery partner.' },
  { id: 'Assigned to Driver', label: 'Driver Assigned', icon: '🛵', description: 'Delivery partner is heading to the kitchen.' },
  { id: 'Picked Up', label: 'Food Picked Up', icon: '📦', description: 'Driver has picked up your food package.' },
  { id: 'Out for Delivery', label: 'On The Way', icon: '🚀', description: 'Driver is en route to your address.' },
  { id: 'Delivered', label: 'Arrived & Delivered', icon: '🎉', description: 'Enjoy your hot meal!' },
  { id: 'Completed', label: 'Completed', icon: '⭐', description: 'Order successfully finished.' }
];

export const OrderProvider = ({ children }) => {
  const [orders, setOrders] = useState(() => {
    const saved = localStorage.getItem('ofk_orders');
    return saved ? JSON.parse(saved) : INITIAL_ORDERS;
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
      status: 'Pending',
      items: [...items],
      pricing,
      payment: {
        method: paymentMethod.name,
        status: 'Paid',
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
    const statusOrder = ['Pending', 'Accepted', 'Preparing', 'Ready for Pickup', 'Picked Up', 'Out for Delivery', 'Delivered', 'Completed'];
    setOrders(prev => prev.map(ord => {
      if (ord.id === orderId) {
        const currentIndex = statusOrder.indexOf(ord.status);
        if (currentIndex < statusOrder.length - 1) {
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
