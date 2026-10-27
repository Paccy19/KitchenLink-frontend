/**
 * The kitchen's settings pages (/vendor-dashboard/profile/:section), listed
 * under "Settings" in the vendor sidebar. Account details is the default.
 */
export const VENDOR_SETTINGS_SECTIONS = [
  { id: 'account', label: 'Account details' },
  { id: 'type', label: 'Vendor type' },
  { id: 'orders', label: 'How you take orders' },
  // Nationwide events first, then the kitchen's big-event packages.
  { id: 'events', label: 'Events' },
  { id: 'location', label: 'Kitchen location' },
];

export const VENDOR_SETTINGS_BASE = '/vendor-dashboard/profile';
