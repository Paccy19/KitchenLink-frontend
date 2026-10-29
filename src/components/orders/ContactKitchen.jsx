import React from 'react';
import clsx from 'clsx';
import MessageKitchenButton from '../chat/MessageKitchenButton';
import CallKitchenButton from './CallKitchenButton';
import { useOrders } from '../../context/OrderContext';

/** The customer's latest order from this kitchen (null when they never ordered from it). */
export function useOrderWithKitchen(vendorId) {
  const { orders } = useOrders();
  if (!vendorId) return null;
  return orders.find((order) => order.vendorId === vendorId) || null;
}

/**
 * "Message kitchen" + "Call kitchen" for a customer who has ordered from it.
 * Customers can only reach kitchens they have placed an order with (the API
 * enforces it too), so on a kitchen's page this shows nothing until then.
 *
 * Pass `order` when it is known (order pages); otherwise the customer's
 * orders are searched for one with `vendorId`.
 */
export default function ContactKitchen({ vendorId, order: givenOrder = null, className = '' }) {
  const found = useOrderWithKitchen(givenOrder ? null : vendorId);
  const order = givenOrder || found;
  if (!order?.vendorId) return null;

  return (
    <div className={clsx('flex flex-wrap items-center gap-2', className)}>
      <MessageKitchenButton vendorId={order.vendorId} label="Message kitchen" />
      {order.vendorPhone && <CallKitchenButton phone={order.vendorPhone} kitchenName={order.vendorName} />}
    </div>
  );
}
