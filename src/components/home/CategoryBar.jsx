import React from 'react';
import { LayoutGrid } from 'lucide-react';
import HomeCardRow, { RowCardIcon, RowCardImage, rowCardClass } from './HomeCardRow';
import { CategoryBarSkeleton } from '../common/Skeleton';

const isImageUrl = (value = '') =>
  /^(https?:)?\/\//i.test(value) || value.startsWith('data:image') || value.startsWith('/');

const PHOTO = (name) => `/images/home/food/${name}.jpg`;

/**
 * A food photo for a category, from words in its name (the categories are
 * the live ones from the server; admins can rename or add them). First match
 * wins; anything unknown gets a general plate.
 */
const PHOTO_RULES = [
  [/pizza/, 'pizza'],
  // Before "fast": "breakfast" contains it.
  [/breakfast|pancake/, 'pancakes'],
  [/burger|\bfast|street|snack/, 'burger'],
  [/grill|brochette|bbq|barbecue|kebab|skewer/, 'skewers'],
  [/meat|steak|dinner/, 'steak'],
  [/healthy|salad|vegan|vegetarian|meal prep/, 'salad'],
  [/rice|bowl|lunch|prepared/, 'bowl'],
  [/pasta|noodle/, 'pasta'],
  [/bread|bakery/, 'bread'],
  [/pastr|croissant/, 'toast'],
  [/cake|cookie|biscuit/, 'cake'],
  [/dessert|sweet|ice cream/, 'dessert'],
  [/coffee|tea|cafe/, 'coffee'],
  [/drink|juice|smoothie|beverage/, 'juice'],
  [/local|rwanda|african|traditional|signature|restaurant|catering|general/, 'plate'],
];
const photoFor = (name = '') => {
  const lower = name.toLowerCase();
  const rule = PHOTO_RULES.find(([pattern]) => pattern.test(lower));
  return PHOTO(rule ? rule[1] : 'plate');
};

function CategoryCard({ name, image, active, onClick, label, title, icon: Icon = null }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-label={label}
      title={title}
      onClick={onClick}
      className={rowCardClass(active)}
    >
      {/* "All": an icon tile instead of a photo, as in the design. */}
      {Icon ? <RowCardIcon icon={Icon} active={active} /> : <RowCardImage src={image} />}
      <span className="block px-2 py-2.5 text-xs sm:text-[13px] font-bold leading-tight text-center line-clamp-2">
        {name}
      </span>
    </button>
  );
}

/**
 * "Popular Food Categories" row on the homepage: photo cards for the live
 * categories (an image an admin uploaded for a category is used first).
 * Tapping one opens the kitchens filtered by it, exactly as before.
 *
 * @param {{categories:Array, activeId?:string|null,
 *          onSelect:(categoryId:string|null)=>void, loading?:boolean}} props
 */
export default function CategoryBar({
  categories = [],
  activeId = null,
  onSelect,
  loading = false,
  title = 'Explore by Category',
  subtitle = 'Curated cuisines crafted by local culinary experts',
}) {
  if (loading && categories.length === 0) return <CategoryBarSkeleton />;

  return (
    <HomeCardRow
      ariaLabel="Food categories"
      title={title}
      subtitle={subtitle}
      scrollLabel="categories"
      listProps={{ role: 'tablist', 'aria-label': 'Categories' }}
    >
        <CategoryCard
          name="All"
          icon={LayoutGrid}
          active={activeId === null}
          label="Browse all kitchens"
          onClick={() => onSelect?.(null)}
        />
        {categories.map((category) => {
          const uploaded = category.iconUrl && isImageUrl(category.iconUrl) ? category.iconUrl : '';
          return (
            <CategoryCard
              key={category.id}
              name={category.name}
              image={uploaded || photoFor(category.name)}
              active={activeId === category.id}
              label={`Browse ${category.name}`}
              title={category.description || category.name}
              onClick={() => onSelect?.(category.id)}
            />
          );
        })}
    </HomeCardRow>
  );
}
