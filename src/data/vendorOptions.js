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

export const VENDOR_TYPE_OPTIONS = [
  'Home Cook',
  'Restaurant',
  'Café',
  'Bakery',
  'Caterer',
  'Food Truck',
  'Chef',
  'Meal-prep business',
  'Juice/Drinks vendor',
  'Other food business',
];

export const FOOD_CATEGORY_OPTIONS = [...MENU_CATEGORIES];

export const VENDOR_ORDER_STATUSES = [
  { id: 'New', label: 'New', tone: 'amber' },
  { id: 'Accepted', label: 'Accepted', tone: 'sky' },
  { id: 'Preparing', label: 'Preparing', tone: 'orange' },
  { id: 'Ready', label: 'Ready', tone: 'violet' },
  { id: 'Completed', label: 'Completed', tone: 'emerald' },
  { id: 'Cancelled', label: 'Cancelled', tone: 'rose' },
];

export const ORDER_NEXT_STATUS = {
  New: 'Accepted',
  Accepted: 'Preparing',
  Preparing: 'Ready',
  Ready: 'Completed',
};

export const ORDER_ACTION_LABEL = {
  New: 'Accept Order',
  Accepted: 'Start Preparing',
  Preparing: 'Mark Ready',
  Ready: 'Mark Completed',
};
