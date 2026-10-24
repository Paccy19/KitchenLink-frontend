/**
 * Suggestions for the "area" of a Kigali address: every sector of the three
 * districts plus well-known neighbourhoods. Only suggestions — customers can
 * type any area, since KitchenLink serves the whole city.
 */
const SECTORS = {
  Gasabo: [
    'Bumbogo', 'Gatsata', 'Gikomero', 'Gisozi', 'Jabana', 'Jali', 'Kacyiru', 'Kimihurura',
    'Kimironko', 'Kinyinya', 'Ndera', 'Nduba', 'Remera', 'Rusororo', 'Rutunga',
    'Nyarutarama', 'Kibagabaga', 'Gacuriro', 'Kagugu',
  ],
  Kicukiro: [
    'Gahanga', 'Gatenga', 'Gikondo', 'Kagarama', 'Kanombe', 'Kicukiro', 'Kigarama', 'Masaka',
    'Niboye', 'Nyarugunga', 'Kabeza',
  ],
  Nyarugenge: [
    'Gitega', 'Kanyinya', 'Kigali', 'Kimisagara', 'Mageragere', 'Muhima', 'Nyakabanda',
    'Nyamirambo', 'Nyarugenge', 'Rwezamenyo', 'Kiyovu', 'Downtown / CBD',
  ],
};

export const KIGALI_DISTRICTS = Object.keys(SECTORS);

export const KIGALI_AREAS = Object.entries(SECTORS)
  .flatMap(([district, areas]) => areas.map((area) => `${area}, ${district}`))
  .sort((a, b) => a.localeCompare(b));
