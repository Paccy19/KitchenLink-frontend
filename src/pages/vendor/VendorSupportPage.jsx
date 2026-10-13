import React, { useMemo } from 'react';
import SupportCenter from '../../components/support/SupportCenter';
import { vendorApi } from '../../api/vendorApi';
import { useVendor } from '../../context/VendorContext';

/** Vendor Help & Support: conversations with the support team. */
export default function VendorSupportPage() {
  const { orders } = useVendor();
  const orderOptions = useMemo(
    () =>
      orders
        .filter((order) => order.backendId)
        .slice(0, 30)
        .map((order) => ({ id: order.backendId, label: `${order.orderNumber || order.id} · ${order.customer?.name || 'Customer'}` })),
    [orders]
  );
  return <SupportCenter api={vendorApi.support} role="vendor" orders={orderOptions} />;
}
