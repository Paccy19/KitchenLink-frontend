import React from 'react';
import SupportCenter from '../../components/support/SupportCenter';
import { driverApi } from '../../api/driverApi';

/** Delivery worker Help & Support: conversations with the support team. */
export default function DriverSupportPage() {
  return <SupportCenter api={driverApi.support} role="driver" />;
}
