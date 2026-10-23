export const MENU_CATEGORIES = [
  'Local Food',
  'Fast Food',
  'African Food',
  'Healthy Food',
  'Bakery',
  'Breakfast',
  'Lunch',
  'Dinner',
  'Drinks',
  'Desserts',
];

// Kitchen (vendor) types live in ./vendorTypes.js.


export const FOOD_CATEGORY_OPTIONS = [...MENU_CATEGORIES];

export const VENDOR_ORDER_STATUSES = [
  { id: 'New', label: 'New', tone: 'amber' },
  { id: 'Accepted', label: 'Accepted', tone: 'sky' },
  { id: 'Preparing', label: 'Preparing', tone: 'orange' },
  { id: 'Ready', label: 'Ready', tone: 'violet' },
  { id: 'Completed', label: 'Completed', tone: 'emerald' },
  { id: 'Cancelled', label: 'Cancelled', tone: 'rose' },
];

// Vendors move an order up to Ready. It is completed only when the delivery
// worker confirms the code the customer gives them.
export const ORDER_NEXT_STATUS = {
  New: 'Accepted',
  Accepted: 'Preparing',
  Preparing: 'Ready',
};

export const ORDER_ACTION_LABEL = {
  New: 'Accept Order',
  Accepted: 'Start Preparing',
  Preparing: 'Mark Ready',
};

// Statuses a vendor may still cancel (the server refuses once a delivery
// worker has accepted the order).
export const ORDER_CANCELLABLE_STATUSES = ['New', 'Accepted', 'Preparing', 'Ready'];

export const READY_ORDER_NOTE =
  "Waiting for the delivery worker. The order completes automatically when they confirm the customer's code.";
