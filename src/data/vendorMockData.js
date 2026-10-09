import { VENDORS } from './mockData';

const baseVendor = VENDORS.find((vendor) => vendor.id === 'vendor-1') || VENDORS[0];

/**
 * The signed-in vendor account for the dashboard.
 * Mirrors the storefront data so the customer view and vendor view agree.
 */
export const ACTIVE_VENDOR = {
  id: baseVendor.id,
  name: baseVendor.name,
  type: baseVendor.type,
  ownerName: baseVendor.owner,
  phone: '+250 788 445 210',
  email: 'grace.mukamana@foodkitchen.rw',
  location: baseVendor.location,
  address: baseVendor.address,
  description: baseVendor.description,
  avatar: baseVendor.avatarImage,
  cover: baseVendor.coverImage,
  rating: baseVendor.rating,
  reviewsCount: baseVendor.reviewsCount,
  isOpen: baseVendor.isOpen,
  operatingHours: baseVendor.operatingHours,
  deliveryFee: baseVendor.deliveryFee,
  minimumOrder: baseVendor.minOrder,
  foodCategories: baseVendor.tags,
  verificationStatus: 'Approved',
  commissionRate: 0.15,
  joinedAt: '2025-11-04T09:00:00Z',
};

/** Menu categories a vendor can assign to a dish. */
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

/** Vendor types supported by the marketplace (per the product spec). */
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

/** Food categories a vendor can select during registration. */
export const FOOD_CATEGORY_OPTIONS = [...MENU_CATEGORIES];

/** Order statuses shown in the vendor order management tabs. */
export const VENDOR_ORDER_STATUSES = [
  { id: 'New', label: 'New', tone: 'amber' },
  { id: 'Accepted', label: 'Accepted', tone: 'sky' },
  { id: 'Preparing', label: 'Preparing', tone: 'orange' },
  { id: 'Ready', label: 'Ready', tone: 'violet' },
  { id: 'Completed', label: 'Completed', tone: 'emerald' },
  { id: 'Cancelled', label: 'Cancelled', tone: 'rose' },
];

/** Progression used by the "next status" action buttons. */
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

export const INITIAL_VENDOR_WALLET = {
  withdrawn: 210000,
  baseSales: 462000,
  withdrawalHistory: [
    {
      id: 'WD-2026-014',
      amount: 120000,
      method: 'MTN Mobile Money',
      date: new Date(Date.now() - 9 * 86400000).toISOString(),
      status: 'Completed',
    },
    {
      id: 'WD-2026-009',
      amount: 90000,
      method: 'Bank Transfer',
      date: new Date(Date.now() - 21 * 86400000).toISOString(),
      status: 'Completed',
    },
  ],
};

/** Convert the storefront menu into the dashboard menu shape. */
export const INITIAL_MENU_ITEMS = baseVendor.menu.map((dish) => ({
  id: dish.id,
  name: dish.name,
  category: dish.category,
  price: dish.price,
  prepTime: dish.prepTime,
  description: dish.description,
  image: dish.image,
  isAvailable: true,
  isPreorder: Boolean(dish.isPreorder),
  preorderCutoff: dish.preorderCutoff || '',
  popular: Boolean(dish.popular),
  options: (dish.options || []).map((option) => ({
    name: option.name,
    choices: [...option.choices],
  })),
}));

const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60000).toISOString();
const hoursAgo = (hours) => minutesAgo(hours * 60);
const daysAgo = (days) => minutesAgo(days * 24 * 60);

const makeOrder = (id, status, createdAt, customer, items, extra = {}) => {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = extra.deliveryFee ?? 1000;
  return {
    id,
    status,
    createdAt,
    customer,
    items,
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee,
    orderType: extra.orderType || 'Immediate',
    scheduledFor: extra.scheduledFor || null,
    paymentStatus: extra.paymentStatus || 'Paid',
    paymentMethod: extra.paymentMethod || 'MTN Mobile Money',
    notes: extra.notes || '',
    eta: extra.eta || '25–35 min',
  };
};

const item = (name, price, quantity, options = '') => ({ name, price, quantity, options });

/**
 * Builds a fresh set of orders using timestamps relative to "now" so the
 * overview always has believable "today" figures.
 */
export function buildInitialVendorOrders() {
  return [
    makeOrder('ORD-2026-9127', 'New', minutesAgo(4), {
      name: 'Aline Uwase',
      phone: '+250 788 214 990',
      address: 'KG 11 Ave, House 24, Kimironko',
      note: 'Please add extra Akabanga on the side.',
    }, [
      item('Whole Spiced Chicken & Fragrant Rice', 5000, 1, 'Breast & Wing'),
      item('Fresh Passion Fruit Juice (1L Bottle)', 2500, 2, 'Light Sugar'),
    ], { notes: 'Ring the bell twice, black gate.', eta: '25–35 min' }),

    makeOrder('ORD-2026-9126', 'New', minutesAgo(12), {
      name: 'Eric Niyonzima',
      phone: '+250 782 667 120',
      address: 'KG 17 Ave, Gisimenti Corner, Remera',
      note: '',
    }, [
      item('Isombe & Ugali with Beef Broth', 3500, 2, 'Medium (Akabanga touch)'),
    ], { eta: '30–40 min' }),

    makeOrder('ORD-2026-9125', 'Accepted', minutesAgo(24), {
      name: 'Diane Mukamana',
      phone: '+250 789 330 457',
      address: 'KG 7 Ave, Kacyiru, Apartment 3B',
      note: 'Leave at the reception desk.',
    }, [
      item('Beef Stew & Golden Fried Chips', 6000, 1, 'Spicy Piri Piri'),
      item('Fresh Passion Fruit Juice (1L Bottle)', 2500, 1, 'No Added Sugar'),
    ]),

    makeOrder('ORD-2026-9124', 'Preparing', minutesAgo(38), {
      name: 'Samuel Habimana',
      phone: '+250 787 991 004',
      address: 'KN 31 St, Kiyovu Hill',
      note: '',
    }, [
      item('Whole Spiced Chicken & Fragrant Rice', 5000, 2, 'Drumstick & Thigh'),
      item('Isombe & Ugali with Beef Broth', 3500, 1, 'Hot (Extra Akabanga)'),
    ], { paymentMethod: 'Airtel Money' }),

    makeOrder('ORD-2026-9123', 'Ready', minutesAgo(52), {
      name: 'Claudine Uwera',
      phone: '+250 788 552 781',
      address: 'KG 9 Ave, Nyarutarama Lakeside',
      note: 'Waiting outside the blue gate.',
    }, [
      item('Beef Stew & Golden Fried Chips', 6000, 2, 'Garlic Herb'),
    ], { eta: 'Ready for pickup' }),

    makeOrder('ORD-2026-9122', 'Completed', hoursAgo(3), {
      name: 'Jean Bosco',
      phone: '+250 783 118 220',
      address: 'KK 15 Rd, Gikondo Commercial Hub',
      note: '',
    }, [
      item('Whole Spiced Chicken & Fragrant Rice', 5000, 1, 'Breast & Wing'),
      item('Beef Stew & Golden Fried Chips', 6000, 1, 'Plain Salt'),
    ]),

    makeOrder('ORD-2026-9121', 'Completed', hoursAgo(5), {
      name: 'Peace Ingabire',
      phone: '+250 786 704 552',
      address: 'KG 33 Ave, Gisozi Ridge',
      note: '',
    }, [
      item('Isombe & Ugali with Beef Broth', 3500, 2, 'Mild'),
      item('Fresh Passion Fruit Juice (1L Bottle)', 2500, 1, 'Standard Sweet'),
    ]),

    makeOrder('ORD-2026-9120', 'Cancelled', hoursAgo(6), {
      name: 'Yves Mugisha',
      phone: '+250 782 440 109',
      address: 'KG 11 Ave, Kimironko Market',
      note: 'Customer cancelled before preparation.',
    }, [
      item('Beef Stew & Golden Fried Chips', 6000, 1, 'Plain Salt'),
    ], { paymentStatus: 'Refunded', paymentMethod: 'MTN Mobile Money' }),

    makeOrder('ORD-2026-9119', 'Completed', daysAgo(1), {
      name: 'Chantal Nyirahabimana',
      phone: '+250 788 909 113',
      address: 'KG 5 Ave, Rebero',
      note: '',
    }, [
      item('Whole Spiced Chicken & Fragrant Rice', 5000, 3, 'Drumstick & Thigh'),
    ]),

    makeOrder('ORD-2026-9118', 'New', minutesAgo(30), {
      name: 'Emmanuel Rukundo',
      phone: '+250 787 233 876',
      address: 'KG 7 Ave, Kigali Heights, 3rd Floor',
      note: 'Pre-order for tomorrow lunch.',
    }, [
      item("Tomorrow's Special: Slow-Cooked Goat Pilau", 7500, 2, 'Double Feast (+3,500 RWF)'),
    ], {
      orderType: 'Scheduled',
      scheduledFor: 'Tomorrow, 12:30 PM',
      eta: 'Scheduled',
    }),
  ];
}
