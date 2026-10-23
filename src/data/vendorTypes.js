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
