/**
 * Demo data: the starting state of the in-browser demo backend.
 *
 * Everything is in the API's own (snake_case) shapes. `createSeed()` builds a
 * fresh copy with dates relative to now; the demo backend keeps it in
 * localStorage so changes survive a reload until the demo is reset.
 *
 * @module demo/seed
 */

const img = (id) => `https://images.unsplash.com/photo-${id}?w=800&q=70&auto=format&fit=crop`;

const IMAGES = {
  plate: img('1504674900247-0877df9cc836'),
  salad: img('1546069901-ba9599a7e63c'),
  pizza: img('1565299624946-b28f40a0ae38'),
  pizza2: img('1513104890138-7c749659a591'),
  burger: img('1568901346375-23c9450c58cd'),
  burger2: img('1551782450-a2132b4ba21d'),
  skewers: img('1555939594-58d7cb561ad1'),
  steak: img('1544025162-d76694265947'),
  bowl: img('1512621776951-a57141f2eefd'),
  bread: img('1509440159596-0249088772ff'),
  coffee: img('1495474472287-4d71bcdd2085'),
  juice: img('1600271886742-f049cd451bba'),
  spread: img('1540189549336-e6e99c3679fe'),
  restaurant: img('1414235077428-338989a2e8c0'),
  interior: img('1517248135467-4c7edcad34c4'),
  dessert: img('1565958011703-44f9829ba187'),
  toast: img('1484723091739-30a097e8f929'),
  cake: img('1578985545062-69928b1d9587'),
  pancakes: img('1567620905732-2d1ec7ab7445'),
  pasta: img('1563379926898-05f4575a45d8'),
};

/** The accounts the demo signs you in as. */
export const DEMO_IDS = {
  customer: 'cus-1',
  vendor: 'v1',
  driver: 'drv-1',
  admin: 'adm-1',
};

export const DEMO_OTP = '123456';

const CATEGORIES = [
  { id: 'cat-rwandan', name: 'Rwandan', slug: 'rwandan', icon_url: '🍲', description: 'Isombe, ibihaza, brochettes and more.' },
  { id: 'cat-grill', name: 'Grills', slug: 'grills', icon_url: '🍢', description: 'Brochettes, grilled chicken and fish.' },
  { id: 'cat-pizza', name: 'Pizza', slug: 'pizza', icon_url: '🍕', description: 'Wood-fired and pan pizzas.' },
  { id: 'cat-burger', name: 'Burgers', slug: 'burgers', icon_url: '🍔', description: 'Burgers, wraps and fries.' },
  { id: 'cat-breakfast', name: 'Breakfast', slug: 'breakfast', icon_url: '🍳', description: 'Morning plates and coffee.' },
  { id: 'cat-bakery', name: 'Bakery', slug: 'bakery', icon_url: '🥐', description: 'Bread, cakes and pastries.' },
  { id: 'cat-drinks', name: 'Drinks', slug: 'drinks', icon_url: '🥤', description: 'Fresh juices and smoothies.' },
  { id: 'cat-healthy', name: 'Healthy', slug: 'healthy', icon_url: '🥗', description: 'Salads and balanced bowls.' },
];

const HOURS = (open = '08:00', close = '21:00') =>
  ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => ({
    day,
    open_time: open,
    close_time: close,
    is_closed: false,
  }));

const VENDORS = [
  {
    id: 'v1',
    name: 'Inzu Heritage Kitchen',
    vendor_type: 'restaurant',
    owner_name: 'Aline Uwase',
    phone: '0788100001',
    email: 'hello@inzukitchen.demo',
    description: 'Home-style Rwandan classics: isombe, matoke, brochettes and fresh juices.',
    rating: 4.8,
    reviews_count: 312,
    estimated_prep_time: '20–30 min',
    neighborhood: 'Kimihurura',
    address: 'KG 7 Ave, Kimihurura',
    latitude: -1.9506,
    longitude: 30.0921,
    banner: IMAGES.restaurant,
    avatar: IMAGES.plate,
    categories: ['cat-rwandan', 'cat-grill', 'cat-drinks'],
    is_open: true,
    status: 'approved',
    total_sales_rwf: 1845000,
    hours: HOURS('08:00', '22:00'),
    created_at: '2025-11-03T09:12:00.000Z',
  },
  {
    id: 'v2',
    name: 'Kigali Fire Grill',
    vendor_type: 'restaurant',
    owner_name: 'Eric Habimana',
    phone: '0788100002',
    description: 'Charcoal brochettes, grilled tilapia and goat skewers.',
    rating: 4.6,
    reviews_count: 208,
    estimated_prep_time: '25–35 min',
    neighborhood: 'Remera',
    address: 'KN 5 Rd, Remera',
    latitude: -1.9573,
    longitude: 30.1127,
    banner: IMAGES.skewers,
    avatar: IMAGES.steak,
    categories: ['cat-grill', 'cat-rwandan'],
    is_open: true,
    status: 'approved',
    total_sales_rwf: 1210000,
    hours: HOURS('11:00', '23:00'),
    created_at: '2025-12-14T10:00:00.000Z',
  },
  {
    id: 'v3',
    name: 'Mama Keza Home Cooking',
    vendor_type: 'home_cook',
    owner_name: 'Keza Mukamana',
    phone: '0788100003',
    description: 'Family recipes cooked fresh every morning. Order ahead for lunch.',
    rating: 4.9,
    reviews_count: 97,
    estimated_prep_time: '40–60 min',
    neighborhood: 'Kicukiro',
    address: 'KK 15 Rd, Kicukiro',
    latitude: -1.9706,
    longitude: 30.1044,
    banner: IMAGES.spread,
    avatar: IMAGES.bowl,
    categories: ['cat-rwandan', 'cat-healthy'],
    is_open: true,
    status: 'approved',
    total_sales_rwf: 486000,
    hours: HOURS('07:00', '15:00'),
    created_at: '2026-02-01T08:30:00.000Z',
  },
  {
    id: 'v4',
    name: 'Nyamirambo Pizza Co.',
    vendor_type: 'restaurant',
    owner_name: 'Jean Bosco Nkurunziza',
    phone: '0788100004',
    description: 'Wood-fired pizza with local toppings — try the akabenz pizza.',
    rating: 4.5,
    reviews_count: 156,
    estimated_prep_time: '20–30 min',
    neighborhood: 'Nyamirambo',
    address: 'KN 2 Ave, Nyamirambo',
    latitude: -1.9789,
    longitude: 30.0446,
    banner: IMAGES.pizza2,
    avatar: IMAGES.pizza,
    categories: ['cat-pizza'],
    is_open: true,
    status: 'approved',
    total_sales_rwf: 932000,
    hours: HOURS('10:00', '23:00'),
    created_at: '2026-01-10T12:00:00.000Z',
  },
  {
    id: 'v5',
    name: 'Bourbon Corner Café',
    vendor_type: 'cafe',
    owner_name: 'Diane Ingabire',
    phone: '0788100005',
    description: 'Single-origin Rwandan coffee, pastries and all-day breakfast.',
    rating: 4.7,
    reviews_count: 241,
    estimated_prep_time: '10–15 min',
    neighborhood: 'Kiyovu',
    address: 'KN 67 St, Kiyovu',
    latitude: -1.9497,
    longitude: 30.0607,
    banner: IMAGES.coffee,
    avatar: IMAGES.toast,
    categories: ['cat-breakfast', 'cat-bakery', 'cat-drinks'],
    is_open: true,
    status: 'approved',
    total_sales_rwf: 1104000,
    hours: HOURS('06:30', '19:00'),
    created_at: '2025-10-20T07:00:00.000Z',
  },
  {
    id: 'v6',
    name: 'Umutsima Bakery',
    vendor_type: 'bakery',
    owner_name: 'Claudine Mutoni',
    phone: '0788100006',
    description: 'Fresh bread, celebration cakes and pastries. Cakes need a day’s notice.',
    rating: 4.6,
    reviews_count: 88,
    estimated_prep_time: '15–25 min',
    neighborhood: 'Kacyiru',
    address: 'KG 9 Ave, Kacyiru',
    latitude: -1.9367,
    longitude: 30.0874,
    banner: IMAGES.bread,
    avatar: IMAGES.cake,
    categories: ['cat-bakery'],
    is_open: true,
    status: 'approved',
    total_sales_rwf: 398000,
    hours: HOURS('06:00', '20:00'),
    created_at: '2026-03-05T06:00:00.000Z',
  },
  {
    id: 'v7',
    name: 'Green Hills Juice Bar',
    vendor_type: 'juice_drinks',
    owner_name: 'Patrick Mugisha',
    phone: '0788100007',
    description: 'Cold-pressed passion, mango and tree-tomato juices and smoothie bowls.',
    rating: 4.4,
    reviews_count: 64,
    estimated_prep_time: '5–10 min',
    neighborhood: 'Kimironko',
    address: 'KG 11 Ave, Kimironko',
    latitude: -1.9349,
    longitude: 30.1263,
    banner: IMAGES.juice,
    avatar: IMAGES.salad,
    categories: ['cat-drinks', 'cat-healthy'],
    is_open: false,
    status: 'approved',
    total_sales_rwf: 214000,
    hours: HOURS('07:00', '18:00'),
    created_at: '2026-04-11T09:00:00.000Z',
  },
  {
    id: 'v8',
    name: 'Smash Burger Gikondo',
    vendor_type: 'food_truck',
    owner_name: 'Yves Ndayisaba',
    phone: '0788100008',
    description: 'Smash burgers, loaded fries and milkshakes from our truck.',
    rating: 4.3,
    reviews_count: 51,
    estimated_prep_time: '15–20 min',
    neighborhood: 'Gikondo',
    address: 'KK 31 Ave, Gikondo',
    latitude: -1.9772,
    longitude: 30.0731,
    banner: IMAGES.burger2,
    avatar: IMAGES.burger,
    categories: ['cat-burger'],
    is_open: true,
    status: 'pending',
    total_sales_rwf: 0,
    hours: HOURS('12:00', '23:00'),
    created_at: '2026-10-25T15:20:00.000Z',
  },
];

// [vendor, name, price, category, image, description, popular, prep minutes]
const MENU = [
  ['v1', 'Isombe with Rice', 4500, 'cat-rwandan', IMAGES.plate, 'Cassava leaves slow-cooked with peanut paste, served with rice.', true, 25],
  ['v1', 'Beef Brochettes (3)', 5000, 'cat-grill', IMAGES.skewers, 'Charcoal-grilled beef skewers with roasted potatoes.', true, 20],
  ['v1', 'Matoke & Beans', 3500, 'cat-rwandan', IMAGES.spread, 'Steamed green bananas with red beans and avocado.', false, 20],
  ['v1', 'Grilled Tilapia', 9000, 'cat-grill', IMAGES.steak, 'Whole Lake Kivu tilapia with chips and kachumbari.', true, 30],
  ['v1', 'Ibihaza Soup', 2500, 'cat-rwandan', IMAGES.bowl, 'Creamy pumpkin soup with fresh bread.', false, 15],
  ['v1', 'Passion Juice', 1500, 'cat-drinks', IMAGES.juice, 'Fresh passion fruit juice, no added sugar.', false, 5],
  ['v2', 'Goat Brochettes (4)', 6000, 'cat-grill', IMAGES.skewers, 'Tender goat skewers with grilled plantain.', true, 25],
  ['v2', 'Half Grilled Chicken', 7500, 'cat-grill', IMAGES.steak, 'Marinated in pili-pili and lemon, with fries.', true, 30],
  ['v2', 'Akabenz Platter', 8000, 'cat-rwandan', IMAGES.spread, 'Crispy pork ribs with fried cassava and salad.', false, 30],
  ['v2', 'Fresh Mango Juice', 1500, 'cat-drinks', IMAGES.juice, 'Blended ripe mangoes.', false, 5],
  ['v3', 'Lunch Plate of the Day', 3000, 'cat-rwandan', IMAGES.plate, 'Rice, beans, greens, plantain and today’s stew.', true, 40],
  ['v3', 'Sweet Potato & Peas Stew', 2800, 'cat-healthy', IMAGES.bowl, 'Hearty vegetarian stew with chapati.', false, 40],
  ['v3', 'Sambaza with Ugali', 3500, 'cat-rwandan', IMAGES.spread, 'Crispy fried lake sardines with ugali and greens.', true, 45],
  ['v4', 'Margherita', 7000, 'cat-pizza', IMAGES.pizza, 'Tomato, mozzarella and fresh basil.', true, 20],
  ['v4', 'Akabenz Pizza', 9500, 'cat-pizza', IMAGES.pizza2, 'Smoked pork, onions and pili-pili oil.', true, 25],
  ['v4', 'Veggie Garden', 8000, 'cat-pizza', IMAGES.salad, 'Peppers, mushrooms, olives and onion.', false, 20],
  ['v4', 'Creamy Mushroom Pasta', 6500, 'cat-pizza', IMAGES.pasta, 'Penne in a garlic mushroom sauce.', false, 20],
  ['v5', 'Rwandan Bourbon Latte', 2500, 'cat-drinks', IMAGES.coffee, 'Double shot of local bourbon coffee with steamed milk.', true, 5],
  ['v5', 'Full Breakfast', 6000, 'cat-breakfast', IMAGES.toast, 'Eggs, sausage, beans, toast and fruit.', true, 15],
  ['v5', 'Pancake Stack', 4500, 'cat-breakfast', IMAGES.pancakes, 'Fluffy pancakes with honey and banana.', false, 15],
  ['v5', 'Butter Croissant', 1500, 'cat-bakery', IMAGES.bread, 'Baked fresh every morning.', false, 5],
  ['v6', 'Sourdough Loaf', 3000, 'cat-bakery', IMAGES.bread, 'Slow-fermented country loaf.', true, 10],
  ['v6', 'Chocolate Celebration Cake', 25000, 'cat-bakery', IMAGES.cake, 'Serves 10–12. Order a day ahead.', true, 60],
  ['v6', 'Fruit Tart', 3500, 'cat-bakery', IMAGES.dessert, 'Vanilla custard with seasonal fruit.', false, 10],
  ['v7', 'Tree Tomato Juice', 1800, 'cat-drinks', IMAGES.juice, 'Fresh ibinyomoro juice.', true, 5],
  ['v7', 'Green Smoothie Bowl', 4000, 'cat-healthy', IMAGES.salad, 'Avocado, banana, spinach and granola.', false, 10],
  ['v8', 'Double Smash Burger', 6500, 'cat-burger', IMAGES.burger, 'Two smashed patties, cheese and house sauce.', true, 15],
  ['v8', 'Loaded Fries', 3500, 'cat-burger', IMAGES.burger2, 'Fries with cheese sauce and pili-pili mayo.', false, 10],
];

const CUSTOMERS = [
  { id: 'cus-1', name: 'Demo Customer', phone_number: '0788123456', email: 'customer@kitchenlink.demo', status: 'active', created_at: '2026-06-01T10:00:00.000Z' },
  { id: 'cus-2', name: 'Grace Uwimana', phone_number: '0788200002', email: '', status: 'active', created_at: '2026-07-14T10:00:00.000Z' },
  { id: 'cus-3', name: 'Olivier Niyonzima', phone_number: '0788200003', email: '', status: 'active', created_at: '2026-08-02T10:00:00.000Z' },
  { id: 'cus-4', name: 'Sandrine Iradukunda', phone_number: '0788200004', email: '', status: 'active', created_at: '2026-09-21T10:00:00.000Z' },
  { id: 'cus-5', name: 'Fabrice Hakizimana', phone_number: '0788200005', email: '', status: 'suspended', created_at: '2026-05-09T10:00:00.000Z' },
];

const DRIVERS = [
  { id: 'drv-1', name: 'Demo Rider', phone: '0788300001', vehicle_type: 'motorcycle', plate_number: 'RC 123 A', rating: 4.9, is_online: true, verification_status: 'approved', completed_deliveries: 128, total_earnings_rwf: 284000, latitude: -1.9470, longitude: 30.0800, created_at: '2026-03-01T08:00:00.000Z' },
  { id: 'drv-2', name: 'Emmanuel Twagirayezu', phone: '0788300002', vehicle_type: 'motorcycle', plate_number: 'RD 452 B', rating: 4.7, is_online: true, verification_status: 'approved', completed_deliveries: 342, total_earnings_rwf: 712000, latitude: -1.9560, longitude: 30.1050, created_at: '2025-12-01T08:00:00.000Z' },
  { id: 'drv-3', name: 'Josiane Mukeshimana', phone: '0788300003', vehicle_type: 'scooter', plate_number: 'RE 019 C', rating: 4.8, is_online: false, verification_status: 'approved', completed_deliveries: 96, total_earnings_rwf: 198000, latitude: -1.9690, longitude: 30.0620, created_at: '2026-05-12T08:00:00.000Z' },
  { id: 'drv-4', name: 'Kevin Ishimwe', phone: '0788300004', vehicle_type: 'bicycle', plate_number: '', rating: 5, is_online: false, verification_status: 'pending', completed_deliveries: 0, total_earnings_rwf: 0, latitude: null, longitude: null, created_at: '2026-10-26T08:00:00.000Z' },
];

const DROP_OFFS = [
  { address: 'KG 541 St, Kibagabaga', neighborhood: 'Kibagabaga', note: 'Blue gate, call on arrival', latitude: -1.9290, longitude: 30.1110 },
  { address: 'KN 3 Rd, Nyarugenge', neighborhood: 'Nyarugenge', note: '', latitude: -1.9460, longitude: 30.0580 },
  { address: 'KG 28 Ave, Gishushu', neighborhood: 'Gishushu', note: 'Office reception, 2nd floor', latitude: -1.9520, longitude: 30.1000 },
  { address: 'KK 737 St, Niboye', neighborhood: 'Niboye', note: '', latitude: -1.9810, longitude: 30.1080 },
];

const minutesAgo = (now, minutes) => new Date(now - minutes * 60_000).toISOString();

const code6 = (seed) => String(100000 + ((seed * 7919) % 900000));

/**
 * Seed orders: [customer, vendor, [[menu index within vendor, qty]...], status,
 * minutes ago, fulfillment, drop-off index, driver].
 */
const ORDERS = [
  ['cus-2', 'v1', [[0, 2], [5, 2]], 'placed', 3, 'delivery', 0, null],
  ['cus-3', 'v1', [[1, 1], [3, 1]], 'preparing', 14, 'delivery', 2, null],
  ['cus-4', 'v1', [[2, 1], [4, 1]], 'ready', 26, 'pickup', null, null],
  ['cus-2', 'v1', [[3, 1]], 'ready', 22, 'delivery', 1, null],
  ['cus-3', 'v2', [[0, 1], [3, 2]], 'ready', 18, 'delivery', 3, null],
  ['cus-4', 'v4', [[1, 1]], 'out_for_delivery', 35, 'delivery', 2, 'drv-2'],
  ['cus-1', 'v4', [[0, 1], [3, 1]], 'delivered', 60 * 26, 'delivery', 0, 'drv-1'],
  ['cus-1', 'v5', [[1, 1], [0, 2]], 'delivered', 60 * 24 * 3, 'delivery', 0, 'drv-2'],
  ['cus-1', 'v1', [[0, 1], [1, 1]], 'delivered', 60 * 24 * 6, 'pickup', null, null],
  ['cus-2', 'v1', [[1, 2]], 'delivered', 60 * 5, 'delivery', 1, 'drv-1'],
  ['cus-3', 'v1', [[0, 1]], 'cancelled', 60 * 30, 'delivery', 2, null],
  ['cus-4', 'v1', [[3, 1], [5, 1]], 'delivered', 60 * 50, 'delivery', 3, 'drv-1'],
];

function buildOrders(now, menuByVendor) {
  return ORDERS.map(([customerId, vendorId, lines, status, ago, fulfillment, dropIndex, driverId], index) => {
    const menu = menuByVendor[vendorId];
    const items = lines.map(([i, quantity]) => ({
      menu_item_id: menu[i].id,
      name: menu[i].name,
      price_rwf: menu[i].price_rwf,
      quantity,
      image_url: menu[i].image_url,
    }));
    const subtotal = items.reduce((sum, item) => sum + item.price_rwf * item.quantity, 0);
    const deliveryFee = fulfillment === 'delivery' ? 1000 + (index % 3) * 500 : 0;
    return {
      id: `ord-${1001 + index}`,
      order_number: `KL-${String(24100 + index)}`,
      created_at: minutesAgo(now, ago),
      status,
      auto: false,
      customer_id: customerId,
      vendor_id: vendorId,
      driver_id: driverId,
      items,
      subtotal_rwf: subtotal,
      delivery_fee_rwf: deliveryFee,
      total_rwf: subtotal + deliveryFee,
      payment_method: index % 3 === 1 ? 'card' : 'mobile_money',
      payment_status: status === 'cancelled' ? 'refunded' : 'paid',
      fulfillment,
      order_type: 'immediate',
      scheduled_for: null,
      special_text: '',
      delivery_location: dropIndex == null ? null : DROP_OFFS[dropIndex],
      pickup_code: code6(index + 11),
      delivery_code: code6(index + 47),
      cancel_reason: status === 'cancelled' ? 'Customer changed their mind' : '',
      history: [{ status: 'placed', at: minutesAgo(now, ago) }],
      rejected_by: [],
    };
  });
}

const EVENT_PACKAGES = {
  v1: {
    enabled: true,
    delivery_details: 'We bring the food in heated trays and set up the buffet one hour before.',
    delivery_fee_ranges: [
      { from_km: 0, to_km: 5, fee_rwf: 5000 },
      { from_km: 5, to_km: 15, fee_rwf: 15000 },
      { from_km: 15, to_km: null, fee_rwf: 30000 },
    ],
    packages: [
      {
        id: 'pkg-v1-1',
        name: 'Wedding buffet',
        description: 'A full Rwandan buffet for weddings and big family celebrations.',
        enabled: true,
        tiers: [
          { min_guests: 50, max_guests: 150, price_per_plate_rwf: 9000 },
          { min_guests: 151, max_guests: 400, price_per_plate_rwf: 7500 },
        ],
        menu: ['Beef and goat brochettes', 'Isombe', 'Matoke', 'Rice and chips', 'Fresh salad', 'Passion juice'],
        portion: 'One full plate per guest, seconds on rice and matoke',
        service_style: 'buffet',
        service_details: 'Includes 4 serving staff and all serving dishes.',
      },
      {
        id: 'pkg-v1-2',
        name: 'Corporate lunch',
        description: 'Boxed or plated lunches for meetings, trainings and office parties.',
        enabled: true,
        tiers: [{ min_guests: 20, max_guests: 80, price_per_plate_rwf: 6500 }],
        menu: ['Grilled chicken or tilapia', 'Rice or chips', 'Vegetables', 'Fruit', 'A soft drink'],
        portion: 'One lunch box per guest',
        service_style: 'boxed',
        service_details: 'Labelled boxes, delivered 30 minutes before lunch.',
      },
    ],
  },
  v3: {
    enabled: true,
    delivery_details: 'Delivered in large pots — please have serving tables ready.',
    delivery_fee_ranges: [
      { from_km: 0, to_km: 8, fee_rwf: 4000 },
      { from_km: 8, to_km: null, fee_rwf: 12000 },
    ],
    packages: [
      {
        id: 'pkg-v3-1',
        name: 'Family gathering',
        description: 'Home-cooked food for umuganura, christenings and family days.',
        enabled: true,
        tiers: [{ min_guests: 15, max_guests: 60, price_per_plate_rwf: 5500 }],
        menu: ['Goat stew', 'Ibihaza', 'Beans', 'Rice', 'Ugali', 'Greens'],
        portion: 'Generous family-style portions',
        service_style: 'family_style',
        service_details: 'Pots and serving spoons included; collected the next day.',
      },
    ],
  },
};

const TEAM = [
  { id: 'adm-1', name: 'Demo Admin', email: 'admin@kitchenlink.demo', phone: '0788000001', role: 'super_admin', status: 'active', is_owner: true, two_factor_enabled: false, last_login_at: null, invite_expires_at: null },
  { id: 'adm-2', name: 'Solange Umutoni', email: 'support@kitchenlink.demo', phone: '0788000002', role: 'support', status: 'active', is_owner: false, two_factor_enabled: true, last_login_at: '2026-10-27T16:40:00.000Z', invite_expires_at: null },
  { id: 'adm-3', name: 'Didier Nshuti', email: 'finance@kitchenlink.demo', phone: '0788000003', role: 'finance', status: 'active', is_owner: false, two_factor_enabled: true, last_login_at: '2026-10-26T09:05:00.000Z', invite_expires_at: null },
  { id: 'adm-4', name: '', email: 'ops@kitchenlink.demo', phone: '', role: 'operations', status: 'invited', is_owner: false, two_factor_enabled: false, last_login_at: null, invite_expires_at: '2026-11-04T12:00:00.000Z' },
];

/** A fresh demo world. */
export function createSeed() {
  const now = Date.now();
  const menuItems = [];
  const menuByVendor = {};
  MENU.forEach(([vendorId, name, price, categoryId, image, description, popular, prep]) => {
    menuByVendor[vendorId] = menuByVendor[vendorId] || [];
    const item = {
      id: `m-${vendorId}-${menuByVendor[vendorId].length + 1}`,
      vendor_id: vendorId,
      name,
      description,
      price_rwf: price,
      category_id: categoryId,
      image_url: image,
      is_available: true,
      is_popular: popular,
      is_preorder: false,
      preorder_cutoff: '',
      preparation_time_minutes: prep,
      options: [],
    };
    menuByVendor[vendorId].push(item);
    menuItems.push(item);
  });

  const tomorrow = new Date(now + 24 * 3600_000);
  tomorrow.setHours(12, 0, 0, 0);
  const inThreeDays = new Date(now + 3 * 24 * 3600_000).toISOString().slice(0, 10);

  return {
    version: 2,
    categories: CATEGORIES.map((category, index) => ({ ...category, sort_order: index, is_active: true })),
    vendors: VENDORS.map((vendor) => ({ ...vendor })),
    menuItems,
    customers: CUSTOMERS.map((customer) => ({ ...customer })),
    drivers: DRIVERS.map((driver) => ({ ...driver })),
    orders: buildOrders(now, menuByVendor),
    carts: {},
    wishlists: {},
    specials: {
      v3: {
        text: 'Tomorrow: slow-cooked goat stew with ibihaza and rice — 4,000 RWF',
        cutoff_at: new Date(tomorrow.getTime() - 14 * 3600_000).toISOString(),
        delivery_at: tomorrow.toISOString(),
        is_active: true,
        is_orderable: true,
        updated_at: new Date(now).toISOString(),
      },
    },
    offers: [
      { id: 'off-1', vendor_id: 'v4', title: '2-for-1 Margherita', details: 'Every Margherita comes with a second one free, all day.', offer_date: inThreeDays },
      { id: 'off-2', vendor_id: 'v6', title: '20% off celebration cakes', details: 'Order by 6 PM the day before.', offer_date: inThreeDays },
    ],
    notifications: [
      { id: 'n-c1', audience: 'customer:cus-1', type: 'order', title: 'Order delivered', body: 'Your Nyamirambo Pizza Co. order was delivered. Enjoy!', read: true, created_at: minutesAgo(now, 60 * 26 - 40) },
      { id: 'n-c2', audience: 'customer:cus-1', type: 'offer', title: 'Offer Day coming up', body: 'Nyamirambo Pizza Co.: 2-for-1 Margherita in 3 days.', read: false, created_at: minutesAgo(now, 90) },
      { id: 'n-v1', audience: 'vendor:v1', type: 'new_order', title: 'New order', body: 'Grace Uwimana placed an order (KL-24100).', read: false, created_at: minutesAgo(now, 3) },
      { id: 'n-v2', audience: 'vendor:v1', type: 'payout', title: 'Withdrawal sent', body: '150,000 RWF was sent to 0788100001.', read: true, created_at: minutesAgo(now, 60 * 30) },
      { id: 'n-d1', audience: 'driver:drv-1', type: 'delivery_offer', title: 'Deliveries near you', body: 'Two orders are ready for pick-up near Kimihurura.', read: false, created_at: minutesAgo(now, 10) },
      { id: 'n-a1', audience: 'admin', type: 'vendor_registered', title: 'New kitchen to review', body: 'Smash Burger Gikondo is waiting for approval.', read: false, created_at: minutesAgo(now, 60 * 72) },
      { id: 'n-a2', audience: 'admin', type: 'driver_registered', title: 'New delivery worker', body: 'Kevin Ishimwe registered and is waiting for approval.', read: false, created_at: minutesAgo(now, 60 * 48) },
    ],
    withdrawals: [
      { id: 'wd-1', owner: 'vendor:v1', amount_rwf: 150000, method: 'mobile_money', method_label: 'MTN Mobile Money', account_number: '0788100001', status: 'completed', reference: 'WD-88213', created_at: minutesAgo(now, 60 * 30) },
      { id: 'wd-2', owner: 'driver:drv-1', amount_rwf: 40000, method: 'mobile_money', method_label: 'MTN Mobile Money', account_number: '0788300001', status: 'completed', reference: 'WD-88190', created_at: minutesAgo(now, 60 * 52) },
      { id: 'wd-3', owner: 'vendor:v2', amount_rwf: 80000, method: 'mobile_money', method_label: 'MTN Mobile Money', account_number: '0788100002', status: 'processing', reference: '', created_at: minutesAgo(now, 60 * 3) },
      { id: 'wd-4', owner: 'driver:drv-2', amount_rwf: 35000, method: 'mobile_money', method_label: 'Airtel Money', account_number: '0733300002', status: 'processing', reference: '', created_at: minutesAgo(now, 60 * 55) },
      { id: 'wd-5', owner: 'vendor:v4', amount_rwf: 120000, method: 'bank', method_label: 'Bank transfer', bank_name: 'Bank of Kigali', account_number: '000400987654', status: 'processing', reference: '', created_at: minutesAgo(now, 60 * 20) },
    ],
    chats: [
      {
        id: 'chat-1',
        customer_id: 'cus-1',
        vendor_id: 'v1',
        messages: [
          { id: 'msg-1', from: 'customer', body: 'Hi! Is the tilapia available tonight?', created_at: minutesAgo(now, 120) },
          { id: 'msg-2', from: 'vendor', body: 'Yes, fresh from Lake Kivu this morning 🐟', created_at: minutesAgo(now, 115) },
        ],
        read_by_customer: true,
        read_by_vendor: true,
      },
    ],
    tickets: [],
    eventPackages: JSON.parse(JSON.stringify(EVENT_PACKAGES)),
    nationwide: { v1: { enabled: true, travel_base_fee_rwf: 10000, travel_per_km_rwf: 300 } },
    refunds: [
      {
        id: 'rf-1',
        order_id: 'ord-1011',
        amount_rwf: 0, // filled in from the order below
        status: 'pending',
        destination: { type: 'mobile_money', label: 'MTN Mobile Money · 0788200003', phone: '0788200003' },
        reason: 'Customer changed their mind',
        cancelled_by: 'customer',
        reference: '',
        failure_reason: '',
        created_at: minutesAgo(now, 60 * 30),
        completed_at: null,
      },
    ],
    complaints: [
      {
        id: 'cmp-1',
        reference: 'CMP-1042',
        subject: 'Order arrived cold',
        description: 'My brochettes were cold when they arrived, and the delivery took over an hour.',
        category: 'delivery',
        priority: 'medium',
        status: 'open',
        unread: true,
        raised_by: { role: 'customer', user_id: 'cus-2', name: 'Grace Uwimana', phone: '0788200002' },
        messages: [{ id: 'cm-1', author_role: 'customer', author_name: 'Grace Uwimana', body: 'My brochettes were cold when they arrived.', at: minutesAgo(now, 60 * 4) }],
        notes: [],
        created_at: minutesAgo(now, 60 * 4),
        last_message_at: minutesAgo(now, 60 * 4),
      },
      {
        id: 'cmp-2',
        reference: 'CMP-1039',
        subject: 'Payout not received',
        description: 'My withdrawal from last week still shows as processing.',
        category: 'payment',
        priority: 'high',
        status: 'in_review',
        unread: false,
        raised_by: { role: 'driver', user_id: 'drv-2', name: 'Emmanuel Twagirayezu', phone: '0788300002' },
        messages: [
          { id: 'cm-2', author_role: 'driver', author_name: 'Emmanuel Twagirayezu', body: 'My withdrawal still shows as processing.', at: minutesAgo(now, 60 * 50) },
          { id: 'cm-3', author_role: 'admin', author_name: 'Solange Umutoni', body: 'Thanks — finance is checking it today.', at: minutesAgo(now, 60 * 46) },
        ],
        notes: [{ id: 'cn-1', author_name: 'Solange Umutoni', body: 'Asked finance to check the MoMo batch.', at: minutesAgo(now, 60 * 46) }],
        created_at: minutesAgo(now, 60 * 50),
        last_message_at: minutesAgo(now, 60 * 46),
      },
    ],
    team: TEAM.map((member) => ({ ...member })),
    audit: [
      { id: 'log-1', action: 'vendor.approve', admin_name: 'Solange Umutoni', admin_email: 'support@kitchenlink.demo', target_type: 'vendor', target_label: 'Umutsima Bakery', ip: '41.186.12.4', created_at: '2026-03-05T09:00:00.000Z' },
      { id: 'log-2', action: 'payout.complete', admin_name: 'Didier Nshuti', admin_email: 'finance@kitchenlink.demo', target_type: 'withdrawal', target_label: 'WD-88213 · 150,000 RWF', ip: '41.186.12.9', created_at: minutesAgo(now, 60 * 29) },
    ],
    banks: [
      { name: 'Bank of Kigali', digits_min: 12, digits_max: 14 },
      { name: 'Equity Bank Rwanda', digits_min: 13, digits_max: 13 },
      { name: 'I&M Bank Rwanda', digits_min: 10, digits_max: 12 },
      { name: 'BPR Bank Rwanda', digits_min: 10, digits_max: 15 },
    ],
    settings: {
      delivery_fee_ranges: [],
      timing: { warning_minutes: 10, charge_after_minutes: 15, reassign_after_minutes: 25 },
      dispatch: {
        radius_km: 5,
        max_drivers_per_broadcast: 10,
        driver_location_max_age_minutes: 10,
        rebroadcast_every_seconds: 60,
        max_active_deliveries_per_driver: 3,
        platform_delivery_max_km: 15,
      },
      max_wrong_codes: 5,
      updated_at: minutesAgo(now, 60 * 24 * 10),
    },
    late: [
      { id: 'late-1', order_id: 'ord-1010', driver_id: 'drv-1', minutes_late: 12, charge_status: 'pending', charge_rwf: 300, penalty_percent: 25, note: 'Collected 12 minutes after the grace period.' },
    ],
    owner: {
      opening: { vendor: 1200000, driver: 300000, owner: 450000 },
      destinations: [
        { id: 'dst-1', label: 'Bank of Kigali · business account', provider: 'Bank of Kigali', account_name: 'KitchenLink Ltd', account_number: '000400123456', ready: true, activates_at: null },
      ],
      withdrawals: [
        { id: 'ow-1', amount_rwf: 200000, status: 'completed', destination_id: 'dst-1', reference: 'BK-778120', failure_reason: '', source: 'manual', created_at: minutesAgo(now, 60 * 24 * 12) },
      ],
      payout_settings: {
        method: 'bank',
        account: { provider: 'Bank of Kigali', account_name: 'KitchenLink Ltd', account_number: '000400123456' },
        schedule: { mode: 'reminder', frequency: 'weekly', weekday: 5, day_of_month: 1, hour: 9, amount_mode: 'all_available', fixed_amount_rwf: 0 },
      },
      sweep: { last_at: null, last_amount_rwf: 0 },
      reconciliations: [],
    },
    admin2fa: false,
    nextId: 5000,
  };
}
