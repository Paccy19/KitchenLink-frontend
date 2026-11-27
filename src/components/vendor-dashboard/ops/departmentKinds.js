/**
 * Kinds of team a dish can go to (server department categories), with words
 * in dish names that suggest them. Used to guess a dish's department.
 */
export const KINDS = [
  { id: 'restaurant', label: 'Kitchen', words: [] },
  { id: 'bakery', label: 'Bakery', words: ['cake', 'bread', 'croissant', 'muffin', 'pastry', 'cookie', 'donut', 'doughnut', 'mandazi', 'samosa', 'pie', 'bun'] },
  { id: 'coffee', label: 'Coffee', words: ['coffee', 'tea', 'latte', 'cappuccino', 'espresso', 'americano', 'macchiato', 'mocha', 'chai', 'icyayi'] },
  { id: 'bar', label: 'Bar', words: ['beer', 'wine', 'cocktail', 'whisky', 'whiskey', 'vodka', 'gin', 'rum', 'primus', 'mutzig', 'skol'] },
  { id: 'juice_bar', label: 'Juice bar', words: ['juice', 'smoothie', 'milkshake', 'shake'] },
  { id: 'desserts', label: 'Desserts', words: ['ice cream', 'dessert', 'sundae', 'pudding'] },
];

/** The kind a dish name suggests, among `allowed` kind ids (Kitchen when nothing matches). */
export const guessKind = (name, allowed = KINDS.map((k) => k.id)) => {
  const text = String(name || '').toLowerCase();
  const hit = KINDS.find((k) => allowed.includes(k.id) && k.words.some((w) => text.includes(w)));
  return hit ? hit.id : allowed.includes('restaurant') ? 'restaurant' : allowed[0];
};
