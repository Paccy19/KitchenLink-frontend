import {
  Cake,
  ChefHat,
  Coffee,
  CupSoda,
  Home,
  PartyPopper,
  Salad,
  Store,
  Truck,
  UtensilsCrossed,
} from 'lucide-react';

/**
 * Vendor (kitchen) business types. `code` is what the API stores and filters
 * by; keep in sync with backend/src/config/vendorTypes.js. Menu categories are
 * not tied to a type — a Home Cook can sell any kind of food.
 *
 * `badge` is the badge colour on light surfaces; the dark theme re-tints it
 * (see `.vendor-type-badge` in index.css).
 */
export const VENDOR_TYPES = [
  { code: 'home_cook', label: 'Home Cook', description: 'Home-made meals cooked in a family kitchen.', icon: Home, badge: 'bg-amber-100 text-amber-900 border-amber-200' },
  { code: 'restaurant', label: 'Restaurant', description: 'A sit-down or takeaway restaurant with a full menu.', icon: UtensilsCrossed, badge: 'bg-[#f5ebe1] text-[#3d1b0c] border-[#ebd7c5]' },
  { code: 'cafe', label: 'Café', description: 'Coffee, tea, light meals and snacks.', icon: Coffee, badge: 'bg-orange-100 text-orange-800 border-orange-200' },
  { code: 'bakery', label: 'Bakery', description: 'Bread, cakes, pastries and baked goods.', icon: Cake, badge: 'bg-rose-100 text-rose-800 border-rose-200' },
  { code: 'caterer', label: 'Caterer', description: 'Food for events, offices and large groups.', icon: PartyPopper, badge: 'bg-violet-100 text-violet-800 border-violet-200' },
  { code: 'food_truck', label: 'Food Truck', description: 'Street food from a mobile kitchen.', icon: Truck, badge: 'bg-sky-100 text-sky-800 border-sky-200' },
  { code: 'chef', label: 'Chef', description: 'A professional chef cooking signature dishes.', icon: ChefHat, badge: 'bg-stone-800 text-white border-stone-800' },
  { code: 'meal_prep', label: 'Meal Prep', description: 'Ready-made meals prepared in advance for the week.', icon: Salad, badge: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { code: 'juice_drinks', label: 'Juice & Drinks', description: 'Fresh juices, smoothies and other drinks.', icon: CupSoda, badge: 'bg-lime-100 text-lime-800 border-lime-200' },
  {
    code: 'other',
    label: 'Other',
    // Longer name on the sign-up and type-change cards; badges and filters use `label`.
    title: 'Other food business',
    description: 'Any food business that does not fit the types above (specialty, niche, or unique concept).',
    // Catch-all for legitimate kitchens that don't fit the other types — same features, no extra rules.
    examples: [
      'Snack or street-food kiosks',
      'Single-cuisine or cultural kitchens',
      'Diet-specific kitchens (vegan, keto, diabetic-friendly)',
      'Dessert-only or ice-cream shops',
      'Hybrid concepts that mix categories',
      'Niche sellers (only grilled fish, party snacks, breakfast packages)',
      'Pop-up or cloud kitchens',
    ],
    icon: Store,
    badge: 'bg-stone-100 text-stone-700 border-stone-200',
  },
];

/** The name shown on sign-up / type-change cards ("Other food business" for Other). */
export const vendorTypeTitle = (type) => type.title || type.label;

/**
 * What each type does well, what it is less suited for, and a short note —
 * SOFT guidance only (nothing is blocked). `features` are the tools that suit
 * the type best, shown as tips on the kitchen dashboard. Same as the backend's
 * PROFILES in config/vendorTypes.js.
 */
const PROFILES = {
  home_cook: {
    strengths: ['Sell any food', 'Scheduled orders & pre-orders', "Tomorrow's Special", 'Small daily capacity', 'Personal touch'],
    lessSuited: ['High-volume immediate orders', 'Large catering', 'Formal dine-in feel'],
    note: 'Best for homemade food with limited daily slots.',
    features: ['preorder', 'scheduled', 'pickup'],
  },
  restaurant: {
    strengths: ['Full menu', 'High volume', 'Immediate & scheduled orders', 'Delivery & pick-up'],
    lessSuited: ['Very small home-style batches'],
    note: 'Classic full-service kitchen.',
    features: ['immediate', 'scheduled', 'delivery', 'pickup'],
  },
  cafe: {
    strengths: ['Coffee', 'Light meals', 'Breakfast', 'Snacks', 'Quick orders'],
    lessSuited: ['Heavy main meals', 'Large catering', 'Late-night heavy food'],
    note: 'Casual and daytime-focused.',
    features: ['immediate', 'pickup'],
  },
  bakery: {
    strengths: ['Bread', 'Cakes', 'Pastries', 'Desserts', 'Pre-orders'],
    lessSuited: ['Full savoury meals', 'Hot cooked dishes as the main business'],
    note: 'Can still sell savoury items.',
    features: ['preorder', 'scheduled', 'offer_days'],
  },
  caterer: {
    strengths: ['Bulk orders', 'Events', 'Advance & scheduled orders', 'Large quantities'],
    lessSuited: ['Small single-portion immediate orders'],
    note: 'Strong with Offer Days and pre-orders.',
    features: ['offer_days', 'preorder', 'scheduled'],
  },
  food_truck: {
    strengths: ['Mobile location', 'Street-style food', 'Quick service'],
    lessSuited: ['Fixed-address fine dining', 'Large advance catering'],
    note: 'Location can change.',
    features: ['immediate', 'pickup'],
  },
  chef: {
    strengths: ['Custom menus', 'Private dining', 'Premium & specialty dishes', 'Scheduled orders'],
    lessSuited: ['High-volume standard delivery', 'Cheap daily meals'],
    note: 'More personalised and higher-end.',
    features: ['scheduled', 'preorder', 'offer_days'],
  },
  meal_prep: {
    strengths: ['Weekly plans', 'Portioned meals', 'Subscriptions', 'Scheduled orders'],
    lessSuited: ['On-demand single hot meals', 'Café-style snacks'],
    note: 'Best with recurring orders.',
    features: ['scheduled', 'offer_days', 'preorder'],
  },
  juice_drinks: {
    strengths: ['Juices', 'Smoothies', 'Beverages', 'Light add-ons'],
    lessSuited: ['Full solid meals as the main offering'],
    note: 'Can still sell light food.',
    features: ['immediate', 'pickup'],
  },
  other: {
    strengths: ["Any specialty or niche concept that doesn't fit the types above"],
    lessSuited: [],
    note: 'Catch-all for unique businesses — fully open.',
    features: ['immediate', 'scheduled', 'preorder', 'offer_days'],
  },
};
VENDOR_TYPES.forEach((type) => Object.assign(type, PROFILES[type.code]));

/** Dashboard tips: what each recommended feature is and where to set it up. */
export const TYPE_FEATURES = {
  preorder: { label: "Tomorrow's Special", hint: 'Announce a dish for tomorrow; customers pre-order it before your cut-off.', to: '/vendor-dashboard#special' },
  offer_days: { label: 'Offer Days', hint: 'Announce a deal for a coming day; customers get a reminder the day before.', to: '/vendor-dashboard#offer-days' },
  scheduled: { label: 'Scheduled orders', hint: 'Customers can order for a later time — set your opening hours so they know when.', to: '/vendor-dashboard/profile' },
  immediate: { label: 'Orders for now', hint: 'Keep your store open and your menu up to date so you show up for quick orders.', to: '/vendor-dashboard/menu' },
  pickup: { label: 'Customer pick-up', hint: 'Customers can collect at your kitchen — keep your kitchen location correct.', to: '/vendor-dashboard/profile' },
  delivery: { label: 'Delivery', hint: 'Nearby delivery workers bring your food to customers.', to: '/vendor-dashboard/orders' },
};

const BY_CODE = new Map(VENDOR_TYPES.map((type) => [type.code, type]));

// Labels the API returned before types became codes.
const LEGACY = {
  'home cook': 'home_cook',
  'café': 'cafe',
  cafe: 'cafe',
  'food truck': 'food_truck',
  'meal-prep business': 'meal_prep',
  'meal prep': 'meal_prep',
  'juice/drinks vendor': 'juice_drinks',
  'juice & drinks': 'juice_drinks',
  'other food business': 'other',
  'bar & grill': 'restaurant',
};

/** A code or label → its code ('other' when unknown). */
export function toVendorTypeCode(value) {
  const raw = String(value ?? '').trim();
  if (BY_CODE.has(raw)) return raw;
  const lower = raw.toLowerCase();
  if (BY_CODE.has(lower)) return lower;
  if (LEGACY[lower]) return LEGACY[lower];
  return VENDOR_TYPES.find((type) => type.label.toLowerCase() === lower)?.code || 'other';
}

export function getVendorType(value) {
  return BY_CODE.get(toVendorTypeCode(value));
}

export function vendorTypeLabel(value) {
  return getVendorType(value).label;
}
