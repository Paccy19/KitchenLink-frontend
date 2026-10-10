/**
 * Driver Web App domain metadata: delivery status progression and labels.
 * Mirrors config.delivery on the backend.
 */

export const DELIVERY_STATUSES = [
  'assigned_to_driver',
  'picked_up',
  'out_for_delivery',
  'delivered',
  'completed',
];

export const DELIVERY_STATUS_META = {
  assigned_to_driver: { step: 0, label: 'Assigned', color: 'sky' },
  picked_up: { step: 1, label: 'Picked up', color: 'amber' },
  out_for_delivery: { step: 2, label: 'On the way', color: 'orange' },
  delivered: { step: 3, label: 'Delivered', color: 'emerald' },
  completed: { step: 3, label: 'Completed', color: 'emerald' },
};

export const CONTEXT_ACTIONS = {
  assigned_to_driver: {
    to: 'picked_up',
    label: 'Arrived at Vendor — Confirm Pickup',
    hint: 'Check the order items, then confirm you picked everything up',
  },
  picked_up: {
    to: 'out_for_delivery',
    label: 'Start Delivery (Out for Delivery)',
    hint: 'Leave the vendor and head to the customer',
  },
  out_for_delivery: {
    to: 'delivered',
    label: 'Arrived at Customer — Confirm Delivery',
    hint: 'Get the delivery code from the customer to confirm',
  },
};

export const NAV_ITEM_ICONS = {
  dashboard: 'LayoutDashboard',
  active: 'Navigation',
  history: 'History',
  earnings: 'Wallet',
  profile: 'Settings',
};