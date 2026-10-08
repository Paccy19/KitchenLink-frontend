export const CATEGORIES = [
  { id: 'all', name: 'All Cuisines', icon: 'utensils', count: 48 },
  { id: 'local', name: 'Local Food', icon: 'soup', count: 18, description: 'Traditional Rwandan meals: Isombe, Ugali, Matooke, Brochettes' },
  { id: 'african', name: 'African Food', icon: 'flame', count: 14, description: 'Rich pan-African specialties & spiced stews' },
  { id: 'fast_food', name: 'Fast Food', icon: 'sandwich', count: 22, description: 'Burgers, crispy chicken, fries & wraps' },
  { id: 'healthy', name: 'Healthy & Meal-Prep', icon: 'salad', count: 12, description: 'Nutrient-rich bowls, keto, high-protein portions' },
  { id: 'bakery', name: 'Bakery & Pastries', icon: 'croissant', count: 15, description: 'Fresh loaves, croissants, custom cakes & snacks' },
  { id: 'breakfast', name: 'Breakfast & Brunch', icon: 'coffee', count: 16, description: 'Pancakes, omelets, Rwandan spiced tea & coffee' },
  { id: 'lunch', name: 'Lunch Specials', icon: 'clock', count: 29, description: 'Quick hearty midday combos & lunch boxes' },
  { id: 'dinner', name: 'Dinner & Grill', icon: 'beef', count: 24, description: 'Grilled steaks, fish, BBQ & family platters' },
  { id: 'drinks', name: 'Juices & Drinks', icon: 'cup-soda', count: 19, description: 'Fresh tropical juices, iced teas, mocktails' },
  { id: 'desserts', name: 'Desserts & Sweets', icon: 'cake', count: 11, description: 'Cakes, tarts, ice cream & sweet bites' },
];

export const VENDOR_TYPES = [
  { id: 'all', label: 'All Kitchens', badgeColor: 'bg-stone-100 text-stone-800' },
  { id: 'Home Cook', label: 'Home Cooks', badgeColor: 'bg-[#f5ebe1] text-[#3d1b0c] border-[#ebd7c5]' },
  { id: 'Restaurant', label: 'Restaurants', badgeColor: 'bg-stone-100 text-stone-800 border-stone-300' },
  { id: 'Café', label: 'Cafés', badgeColor: 'bg-[#faf6f2] text-[#542813] border-[#d9bda6]' },
  { id: 'Bakery', label: 'Bakeries', badgeColor: 'bg-amber-50 text-amber-900 border-amber-200' },
  { id: 'Food Truck', label: 'Food Trucks', badgeColor: 'bg-stone-100 text-stone-700 border-stone-200' },
  { id: 'Professional Chef', label: 'Private Chefs', badgeColor: 'bg-[#2b1206] text-white border-[#2b1206]' },
  { id: 'Caterer', label: 'Caterers & Meal Prep', badgeColor: 'bg-[#ebd7c5] text-[#3d1b0c] border-[#d9bda6]' },
  { id: 'Juice Bar', label: 'Juice & Beverages', badgeColor: 'bg-emerald-50 text-emerald-900 border-emerald-200' }
];

export const VENDORS = [
  {
    id: 'vendor-1',
    name: 'Mama Grace Kitchen',
    type: 'Home Cook',
    owner: 'Grace Mukamana',
    tagline: 'Authentic home-cooked Rwandan comfort dishes prepared with motherly love',
    rating: 4.9,
    reviewsCount: 142,
    prepTime: '20–30 min',
    location: 'Kimironko, Kigali',
    address: 'KG 11 Ave, near Kimironko Market',
    distance: '1.2 km',
    deliveryFee: 1000,
    minOrder: 3000,
    isOpen: true,
    operatingHours: '09:00 AM – 09:30 PM',
    acceptsPreorder: true,
    specialPreorderNotice: "Tomorrow's Special: Authentic Slow-cooked Goat & Pilau! Order before 10:00 AM.",
    coverImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1000&q=80',
    avatarImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
    tags: ['Local Food', 'Lunch', 'Dinner', 'Home Style'],
    description: 'Mama Grace started cooking from her Kimironko home kitchen for neighbors and now serves wholesome, freshly prepared Rwandan meals. Every dish uses fresh market produce and traditional recipes passed down through generations.',
    menu: [
      {
        id: 'dish-101',
        name: 'Isombe & Ugali with Beef Broth',
        category: 'Local Food',
        price: 3500,
        prepTime: '25 min',
        description: 'Finely pounded cassava leaves simmered with peanut paste, marrow bone beef broth, served with piping hot soft white ugali.',
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
        popular: true,
        isPreorder: false,
        options: [
          { name: 'Spice Level', choices: ['Mild', 'Medium (Akabanga touch)', 'Hot (Extra Akabanga)'] },
          { name: 'Side Choice', choices: ['White Ugali', 'Boiled Cassava', 'Sweet Potatoes'] }
        ]
      },
      {
        id: 'dish-102',
        name: 'Whole Spiced Chicken & Fragrant Rice',
        category: 'Local Food',
        price: 5000,
        prepTime: '30 min',
        description: 'Tender seasoned chicken quarter braised in tomato-onion gravy, accompanied by aromatic steamed rice and fresh kachumbari salad.',
        image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=600&q=80',
        popular: true,
        isPreorder: false,
        options: [
          { name: 'Chicken Part', choices: ['Drumstick & Thigh', 'Breast & Wing'] },
          { name: 'Salad Dressing', choices: ['House Vinaigrette', 'Spicy Lemon Chili'] }
        ]
      },
      {
        id: 'dish-103',
        name: 'Beef Stew & Golden Fried Chips',
        category: 'Local Food',
        price: 6000,
        prepTime: '25 min',
        description: 'Chunks of tender local beef simmered in rich pepper and garlic gravy, served with freshly hand-cut crispy potato chips.',
        image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
        popular: true,
        isPreorder: false,
        options: [
          { name: 'Chips Seasoning', choices: ['Plain Salt', 'Spicy Piri Piri', 'Garlic Herb'] }
        ]
      },
      {
        id: 'dish-104',
        name: "Tomorrow's Special: Slow-Cooked Goat Pilau",
        category: 'Dinner',
        price: 7500,
        prepTime: 'Scheduled',
        description: 'Marinated tender goat meat slow-cooked with spiced basmati rice, cardamom, cinnamon, served with banana and avocado salsa.',
        image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
        popular: false,
        isPreorder: true,
        preorderCutoff: 'Order before 10:00 AM for 12:30 PM delivery',
        options: [
          { name: 'Portion Size', choices: ['Single Regular', 'Double Feast (+3,500 RWF)'] }
        ]
      },
      {
        id: 'dish-105',
        name: 'Fresh Passion Fruit Juice (1L Bottle)',
        category: 'Drinks',
        price: 2500,
        prepTime: '5 min',
        description: 'Cold-pressed 100% natural passion fruit from Musanze with a splash of pure cane syrup.',
        image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80',
        popular: false,
        isPreorder: false,
        options: [
          { name: 'Sugar Preference', choices: ['Light Sugar', 'No Added Sugar', 'Standard Sweet'] }
        ]
      }
    ]
  },
  {
    id: 'vendor-2',
    name: "Chef Patrick's Gourmet Grill",
    type: 'Professional Chef',
    owner: 'Patrick Nshimiyimana',
    tagline: 'Flame-grilled prime meats and artisanal brochettes crafted by a culinary chef',
    rating: 4.95,
    reviewsCount: 218,
    prepTime: '30–45 min',
    location: 'Kiyovu, Kigali',
    address: 'KN 31 St, Kiyovu Hill',
    distance: '2.8 km',
    deliveryFee: 1500,
    minOrder: 5000,
    isOpen: true,
    operatingHours: '12:00 PM – 11:00 PM',
    acceptsPreorder: true,
    specialPreorderNotice: 'Weekend BBQ Platters open for pre-booking with 15% bonus sides.',
    coverImage: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1000&q=80',
    avatarImage: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=300&q=80',
    tags: ['Dinner', 'African Food', 'Local Food'],
    description: 'Former hotel executive chef Patrick brings five-star grilling directly to your doorstep. Specializing in charcoal-grilled goat brochettes, whole Lake Kivu tilapia, and roasted plantains.',
    menu: [
      {
        id: 'dish-201',
        name: 'Chef Prime Goat Brochettes (3 Skewers)',
        category: 'Dinner',
        price: 4500,
        prepTime: '25 min',
        description: 'Charcoal flame-grilled tender goat skewers seasoned with rosemary, garlic, and signature secret spice blend.',
        image: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=600&q=80',
        popular: true,
        isPreorder: false,
        options: [
          { name: 'Chili Dip', choices: ['Original Akabanga', 'Smoked BBQ Chili', 'Garlic Mayo'] },
          { name: 'Included Side', choices: ['Roasted Plantains (Igitoki)', 'Crispy Fries', 'Pili Grilled Bread'] }
        ]
      },
      {
        id: 'dish-202',
        name: 'Whole Lake Kivu Grilled Tilapia',
        category: 'Dinner',
        price: 9000,
        prepTime: '40 min',
        description: 'Fresh grilled whole tilapia marinated with fresh herbs, bell peppers, ginger, lime, served with grilled plantains and spicy onion salad.',
        image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=600&q=80',
        popular: true,
        isPreorder: false,
        options: [
          { name: 'Spiciness', choices: ['Mildly Seasoned', 'Spicy Rwanda Style'] }
        ]
      },
      {
        id: 'dish-203',
        name: 'Roasted Plantains (Igitoki cyokeje)',
        category: 'Local Food',
        price: 2000,
        prepTime: '20 min',
        description: 'Charred sweet plantains brushed with lightly salted herb butter.',
        image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80',
        popular: false,
        isPreorder: false,
        options: []
      }
    ]
  },
  {
    id: 'vendor-3',
    name: "Aline's Artisan Bakery",
    type: 'Bakery',
    owner: 'Aline Uwamahoro',
    tagline: 'Warm daily artisanal breads, butter croissants, and gourmet pastries',
    rating: 4.85,
    reviewsCount: 96,
    prepTime: '15–20 min',
    location: 'Remera, Kigali',
    address: 'KG 17 Ave, Gisimenti Corner',
    distance: '2.1 km',
    deliveryFee: 1000,
    minOrder: 2500,
    isOpen: true,
    operatingHours: '07:00 AM – 08:00 PM',
    acceptsPreorder: true,
    specialPreorderNotice: 'Order customized celebration cakes 24 hours in advance.',
    coverImage: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1000&q=80',
    avatarImage: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=300&q=80',
    tags: ['Bakery', 'Breakfast', 'Desserts'],
    description: 'Aline started baking from her kitchen counter in Remera. Today she crafts Parisian-quality croissants, sourdough loaves, Rwandan cinnamon rolls, and gourmet meat pies.',
    menu: [
      {
        id: 'dish-301',
        name: 'French Butter Croissants (Box of 2)',
        category: 'Bakery',
        price: 3000,
        prepTime: '10 min',
        description: 'Golden flaky layers made with pure imported butter, freshly baked every morning.',
        image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80',
        popular: true,
        isPreorder: false,
        options: [
          { name: 'Filling', choices: ['Classic Butter', 'Chocolate Ganache (+500 RWF)', 'Almond Cream (+700 RWF)'] }
        ]
      },
      {
        id: 'dish-302',
        name: 'Spiced Beef Meat Pie',
        category: 'Bakery',
        price: 2000,
        prepTime: '10 min',
        description: 'Crusty golden pastry stuffed with seasoned minced beef, onions, diced carrots, and mild thyme.',
        image: 'https://images.unsplash.com/photo-1621236378699-8597fee6a1ce?auto=format&fit=crop&w=600&q=80',
        popular: true,
        isPreorder: false,
        options: []
      },
      {
        id: 'dish-303',
        name: 'Carrot & Cinnamon Walnut Cake Slice',
        category: 'Desserts',
        price: 2800,
        prepTime: '5 min',
        description: 'Moist spiced carrot cake topped with creamy whipped cream-cheese frosting.',
        image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80',
        popular: false,
        isPreorder: false,
        options: []
      }
    ]
  },
  {
    id: 'vendor-4',
    name: 'Kigali Delight Café',
    type: 'Café',
    owner: 'Emmanuel Habimana',
    tagline: 'Specialty Rwandan single-origin coffee, wholesome all-day breakfast & gourmet toasts',
    rating: 4.78,
    reviewsCount: 165,
    prepTime: '15–25 min',
    location: 'Nyarutarama, Kigali',
    address: 'KG 9 Ave, Nyarutarama Lakeside',
    distance: '3.4 km',
    deliveryFee: 1500,
    minOrder: 4000,
    isOpen: true,
    operatingHours: '07:30 AM – 09:00 PM',
    acceptsPreorder: true,
    specialPreorderNotice: 'Morning breakfast packages available for scheduling.',
    coverImage: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1000&q=80',
    avatarImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    tags: ['Breakfast', 'Drinks', 'Healthy'],
    description: 'Serving premium Maraba single-origin arabica beans paired with nourishing avocado sourdough toasts, fluffy pancake stacks, and tropical acai bowls.',
    menu: [
      {
        id: 'dish-401',
        name: 'Avocado & Poached Egg Sourdough Toast',
        category: 'Breakfast',
        price: 4500,
        prepTime: '15 min',
        description: 'Toasted country bread topped with mashed Rwandan Hass avocado, free-range poached eggs, chili flakes, and chia seeds.',
        image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80',
        popular: true,
        isPreorder: false,
        options: [
          { name: 'Egg Style', choices: ['Poached Soft', 'Scrambled', 'Sunny Side Up'] },
          { name: 'Add-on', choices: ['None', 'Smoked Salmon (+2,000 RWF)', 'Crispy Bacon (+1,500 RWF)'] }
        ]
      },
      {
        id: 'dish-402',
        name: 'Rwandan Spiced Café Latte',
        category: 'Drinks',
        price: 2200,
        prepTime: '10 min',
        description: 'Double shot of Maraba espresso infused with cardamom, steamed milk, and light cinnamon froth.',
        image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80',
        popular: true,
        isPreorder: false,
        options: [
          { name: 'Milk Choice', choices: ['Full Cream Milk', 'Oat Milk (+500 RWF)', 'Almond Milk (+500 RWF)'] }
        ]
      }
    ]
  },
  {
    id: 'vendor-5',
    name: 'Urban Taco & Burger Truck',
    type: 'Food Truck',
    owner: 'David Kayitare',
    tagline: 'Smash burgers, loaded cheese fries, and crispy birria tacos on wheels',
    rating: 4.88,
    reviewsCount: 310,
    prepTime: '20–30 min',
    location: 'Downtown Kigali',
    address: 'KN 2 Roundabout, Downtown Plaza',
    distance: '4.2 km',
    deliveryFee: 1800,
    minOrder: 4500,
    isOpen: true,
    operatingHours: '11:30 AM – 11:30 PM',
    acceptsPreorder: false,
    specialPreorderNotice: null,
    coverImage: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=1000&q=80',
    avatarImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
    tags: ['Fast Food', 'Lunch', 'Dinner'],
    description: 'The coolest mobile kitchen in town! Freshly ground local beef smash burgers, melted cheddar, pickles, and crispy spiced seasoned fries.',
    menu: [
      {
        id: 'dish-501',
        name: 'Double Smash Cheeseburger & Fries Combo',
        category: 'Fast Food',
        price: 6500,
        prepTime: '20 min',
        description: 'Two smashed beef patties, double melted cheddar, caramelized onions, house burger sauce on a toasted brioche bun, served with fries.',
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
        popular: true,
        isPreorder: false,
        options: [
          { name: 'Sauce', choices: ['Smoky House Burger Sauce', 'Spicy Mayo', 'Classic Ketchup & Mustard'] },
          { name: 'Drink Add-on', choices: ['No Drink', 'Cold Soda (+1,000 RWF)', 'Mineral Water (+600 RWF)'] }
        ]
      },
      {
        id: 'dish-502',
        name: 'Crispy Fried Chicken Burger',
        category: 'Fast Food',
        price: 5500,
        prepTime: '20 min',
        description: 'Golden buttermilk fried chicken breast, tangy slaw, house pickles, garlic mayo on toasted sesame bun.',
        image: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&w=600&q=80',
        popular: true,
        isPreorder: false,
        options: [
          { name: 'Heat Level', choices: ['Crispy Original', 'Spicy Buffalo Drizzle'] }
        ]
      }
    ]
  },
  {
    id: 'vendor-6',
    name: 'Mama Furaha Catering & Meal Prep',
    type: 'Caterer',
    owner: 'Furaha Jeannette',
    tagline: 'Wholesome weekly meal plans and high-protein ready-to-eat balanced bowls',
    rating: 4.92,
    reviewsCount: 88,
    prepTime: '30–45 min',
    location: 'Gisozi, Kigali',
    address: 'KG 33 Ave, Gisozi Ridge',
    distance: '3.9 km',
    deliveryFee: 1500,
    minOrder: 5000,
    isOpen: true,
    operatingHours: '08:00 AM – 07:00 PM',
    acceptsPreorder: true,
    specialPreorderNotice: 'Weekly 5-Meal Prep packs: Save 20% by pre-ordering on Sundays!',
    coverImage: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1000&q=80',
    avatarImage: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
    tags: ['Healthy', 'Local Food', 'African Food'],
    description: 'Furaha specializes in nutrient-packed, balanced home cooking for busy professionals and families. Portion controlled, low oil, and packed with lean proteins.',
    menu: [
      {
        id: 'dish-601',
        name: 'High-Protein Grilled Chicken & Sweet Potato Bowl',
        category: 'Healthy',
        price: 4800,
        prepTime: '25 min',
        description: 'Herb-grilled chicken breast, roasted sweet potatoes, sautéed green beans, avocado cubes, and light honey mustard drizzle.',
        image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
        popular: true,
        isPreorder: false,
        options: [
          { name: 'Carb Base', choices: ['Sweet Potatoes', 'Brown Rice', 'Quinoa (+800 RWF)'] }
        ]
      },
      {
        id: 'dish-602',
        name: 'Pre-order: Family Sunday Rwandan Feast (4-5 Pax)',
        category: 'Lunch',
        price: 24000,
        prepTime: 'Scheduled',
        description: 'Complete family set: Whole stewed chicken, tender beef in peanut sauce, Isombe, fried plantains, Chapati, and steaming basmati rice.',
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80',
        popular: false,
        isPreorder: true,
        preorderCutoff: 'Order 1 day ahead for guaranteed delivery',
        options: []
      }
    ]
  },
  {
    id: 'vendor-7',
    name: 'Green Vitality Juice & Smoothie Bar',
    type: 'Juice Bar',
    owner: 'Sonia Umutoni',
    tagline: '100% Raw cold-pressed juices, immunity boosters, and energizing smoothies',
    rating: 4.81,
    reviewsCount: 74,
    prepTime: '10–15 min',
    location: 'Kacyiru, Kigali',
    address: 'KG 7 Ave, Near Embassy District',
    distance: '2.5 km',
    deliveryFee: 1000,
    minOrder: 2500,
    isOpen: true,
    operatingHours: '07:00 AM – 08:30 PM',
    acceptsPreorder: true,
    specialPreorderNotice: 'Daily detox 3-pack subscriptions available.',
    coverImage: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=1000&q=80',
    avatarImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    tags: ['Drinks', 'Healthy', 'Breakfast'],
    description: 'Fresh organic Rwandan fruits and vegetables pressed daily. No water, no refined sugar, no preservatives.',
    menu: [
      {
        id: 'dish-701',
        name: 'Kigali Glow Detox (Beetroot, Ginger, Apple, Lemon)',
        category: 'Drinks',
        price: 2500,
        prepTime: '10 min',
        description: 'Deep ruby cold-pressed juice packed with antioxidants, nitric oxide, and zesty ginger kick.',
        image: 'https://images.unsplash.com/photo-1622597467836-f3285f2131b7?auto=format&fit=crop&w=600&q=80',
        popular: true,
        isPreorder: false,
        options: [
          { name: 'Bottle Size', choices: ['500ml Regular', '1 Litre (+1,800 RWF)'] }
        ]
      },
      {
        id: 'dish-702',
        name: 'Tropical Mango Passion Smoothie',
        category: 'Drinks',
        price: 3000,
        prepTime: '10 min',
        description: 'Ripe Ruhengeri mango blended with tangy passionfruit, Greek yoghurt, and honey drizzle.',
        image: 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?auto=format&fit=crop&w=600&q=80',
        popular: true,
        isPreorder: false,
        options: [
          { name: 'Base', choices: ['Greek Yoghurt', 'Coconut Milk (Vegan)', 'Almond Milk'] }
        ]
      }
    ]
  },
  {
    id: 'vendor-8',
    name: 'Chez John Rwandan Bistro',
    type: 'Restaurant',
    owner: 'John Mugisha',
    tagline: 'Renowned traditional Rwandan buffet, Akabenz, grilled tilapia, and ugali',
    rating: 4.75,
    reviewsCount: 380,
    prepTime: '25–40 min',
    location: 'Gikondo, Kigali',
    address: 'KK 15 Rd, Gikondo Commercial Hub',
    distance: '4.8 km',
    deliveryFee: 2000,
    minOrder: 4000,
    isOpen: true,
    operatingHours: '11:00 AM – 10:30 PM',
    acceptsPreorder: true,
    specialPreorderNotice: 'Pre-order Akabenz platters for evening gatherings.',
    coverImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1000&q=80',
    avatarImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80',
    tags: ['Restaurant', 'Local Food', 'Lunch', 'Dinner'],
    description: 'A classic Kigali establishment celebrating traditional flavors. Well known for famous spiced Akabenz (pork stew), slow-simmered beef, and traditional sides.',
    menu: [
      {
        id: 'dish-801',
        name: 'Famous Spiced Akabenz (Dry Fried)',
        category: 'Local Food',
        price: 6500,
        prepTime: '30 min',
        description: 'Crispy browned marinated pork belly chunks tossed with fiery green peppers, red onions, garlic, and fresh coriander.',
        image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
        popular: true,
        isPreorder: false,
        options: [
          { name: 'Preparation', choices: ['Dry Crispy Fried', 'Wet Rich Gravy'] },
          { name: 'Side', choices: ['Golden Fries', 'Boiled Plantains', 'Cassava Sticks'] }
        ]
      },
      {
        id: 'dish-802',
        name: 'Traditional Rwandan Lunch Platter',
        category: 'Lunch',
        price: 5000,
        prepTime: '20 min',
        description: 'Generous platter with stewed beef, rich beans in gravy, Isombe greens, sweet potatoes, and steamed rice.',
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
        popular: true,
        isPreorder: false,
        options: []
      }
    ]
  }
];

export const INITIAL_USER = {
  id: 'cust-001',
  name: 'Kevin Mugabo',
  phone: '+250 788 123 456',
  email: 'kevin.mugabo@example.rw',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
  defaultLocation: 'Kimironko, Kigali',
  addresses: [
    {
      id: 'addr-1',
      title: 'Home',
      street: 'KG 11 Ave, House #24',
      district: 'Kimironko, Gasabo',
      city: 'Kigali',
      instructions: 'Gate is black, ring bell twice',
      isDefault: true
    },
    {
      id: 'addr-2',
      title: 'Office / Work',
      street: 'KG 7 Ave, Kigali Heights, 3rd Floor',
      district: 'Kacyiru, Gasabo',
      city: 'Kigali',
      instructions: 'Leave at reception desk with security',
      isDefault: false
    }
  ],
  savedPaymentMethods: [
    { id: 'pay-1', type: 'Mobile Money', provider: 'MTN MoMo', number: '0788 123 456', isDefault: true },
    { id: 'pay-2', type: 'Mobile Money', provider: 'Airtel Money', number: '0738 987 654', isDefault: false },
    { id: 'pay-3', type: 'Card', provider: 'Visa ending in 4022', number: '•••• 4022', isDefault: false }
  ]
};

export const INITIAL_ORDERS = [
  {
    id: 'ORD-2026-9041',
    createdAt: '2026-10-07T13:45:00Z',
    vendorId: 'vendor-1',
    vendorName: 'Mama Grace Kitchen',
    vendorType: 'Home Cook',
    vendorLocation: 'Kimironko',
    vendorAvatar: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=150&q=80',
    orderType: 'Immediate',
    status: 'delivered',
    items: [
      { id: 'dish-101', name: 'Isombe & Ugali with Beef Broth', price: 3500, quantity: 2, selectedOptions: { 'Spice Level': 'Medium (Akabanga touch)' } },
      { id: 'dish-105', name: 'Fresh Passion Fruit Juice (1L Bottle)', price: 2500, quantity: 1, selectedOptions: { 'Sugar Preference': 'Light Sugar' } }
    ],
    pricing: {
      subtotal: 9500,
      deliveryFee: 1000,
      total: 10500
    },
    payment: {
      method: 'MTN Mobile Money',
      methodCode: 'momo',
      status: 'paid',
      transactionId: 'TXN-MOMO-883910'
    },
    deliveryAddress: {
      title: 'Home',
      street: 'KG 11 Ave, House #24, Kimironko'
    },
    driver: {
      name: 'Eric Manzi',
      phone: '+250 782 555 123',
      vehicle: 'Motorcycle TVS (RAC 412 B)',
      rating: 4.9
    },
    rated: true,
    rating: 5,
    review: 'Mama Grace makes the best Isombe in Kigali! Arrived hot and fresh.'
  },
  {
    id: 'ORD-2026-9042',
    createdAt: '2026-10-08T07:30:00Z',
    vendorId: 'vendor-3',
    vendorName: "Aline's Artisan Bakery",
    vendorType: 'Bakery',
    vendorLocation: 'Remera',
    vendorAvatar: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=150&q=80',
    orderType: 'Immediate',
    status: 'out_for_delivery',
    items: [
      { id: 'dish-301', name: 'French Butter Croissants (Box of 2)', price: 3000, quantity: 2, selectedOptions: { 'Filling': 'Chocolate Ganache (+500 RWF)' } },
      { id: 'dish-302', name: 'Spiced Beef Meat Pie', price: 2000, quantity: 2, selectedOptions: {} }
    ],
    pricing: {
      subtotal: 10000,
      deliveryFee: 1000,
      total: 11000
    },
    payment: {
      method: 'MTN Mobile Money',
      methodCode: 'momo',
      status: 'paid',
      transactionId: 'TXN-MOMO-994122'
    },
    deliveryAddress: {
      title: 'Office / Work',
      street: 'KG 7 Ave, Kigali Heights, 3rd Floor'
    },
    driver: {
      name: 'Claude Hakizimana',
      phone: '+250 789 777 890',
      vehicle: 'Motorcycle Bajaj (RAF 819 K)',
      rating: 4.85
    },
    estimatedDeliveryTime: '20–25 minutes',
    rated: false
  }
];
