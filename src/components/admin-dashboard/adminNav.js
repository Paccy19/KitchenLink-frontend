import {
  LayoutDashboard,
  ClipboardList,
  Bike,
  Store,
  Users,
  CreditCard,
  Wallet,
  Tags,
  MessageSquareWarning,
  MessagesSquare,
  RotateCcw,
  BarChart3,
  ScrollText,
  Settings,
  Landmark,
  BookOpen,
  UsersRound,
} from 'lucide-react';

/**
 * The admin panel, grouped by the same categories as team roles
 * (backend config/adminAccess.js). Each page needs one permission; a team
 * member only sees, and can only open, the pages their role allows.
 * `owner: true` pages are for the owner (super admin) only.
 */
export const ADMIN_SECTIONS = [
  {
    id: 'overview',
    label: 'Overview',
    items: [{ to: '/admin-dashboard', label: 'Overview', icon: LayoutDashboard, end: true, permission: 'dashboard:read' }],
  },
  {
    id: 'operations',
    label: 'Operations',
    items: [
      { to: '/admin-dashboard/orders', label: 'Orders', icon: ClipboardList, permission: 'orders:read' },
      { to: '/admin-dashboard/deliveries', label: 'Deliveries', icon: Bike, permission: 'deliveries:read' },
      { to: '/admin-dashboard/vendors', label: 'Vendors', icon: Store, permission: 'vendors:read' },
      { to: '/admin-dashboard/drivers', label: 'Delivery Workers', icon: Bike, permission: 'drivers:read' },
      { to: '/admin-dashboard/users', label: 'Customers', icon: Users, permission: 'users:read' },
      { to: '/admin-dashboard/categories', label: 'Categories', icon: Tags, permission: 'categories:read' },
    ],
  },
  {
    id: 'support',
    label: 'Support',
    items: [
      { to: '/admin-dashboard/complaints', label: 'Support & Complaints', icon: MessageSquareWarning, permission: 'complaints:read' },
      { to: '/admin-dashboard/chats', label: 'Customer–Kitchen Chats', icon: MessagesSquare, permission: 'chats:read' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    items: [
      { to: '/admin-dashboard/payments', label: 'Payments', icon: CreditCard, permission: 'payments:read' },
      { to: '/admin-dashboard/payouts', label: 'Payouts', icon: Wallet, permission: 'payouts:read' },
      { to: '/admin-dashboard/refunds', label: 'Refunds', icon: RotateCcw, permission: 'refunds:read' },
      { to: '/admin-dashboard/books', label: 'Platform Books', icon: BookOpen, permission: 'wallet:read' },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    items: [{ to: '/admin-dashboard/analytics', label: 'Analytics', icon: BarChart3, permission: 'analytics:read' }],
  },
  {
    id: 'owner',
    label: 'Owner',
    items: [
      { to: '/admin-dashboard/team', label: 'Team', icon: UsersRound, permission: 'team:manage', owner: true },
      { to: '/admin-dashboard/platform', label: "Owner's Money", icon: Landmark, owner: true },
      { to: '/admin-dashboard/audit', label: 'Audit Log', icon: ScrollText, permission: 'actions:read', owner: true },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    items: [{ to: '/admin-dashboard/settings', label: 'My account', icon: Settings }],
  },
];

export const allowed = (item, { can, isOwner }) =>
  (!item.owner || isOwner) && (!item.permission || can(item.permission));

/** Sections with only the pages this admin may open. */
export const visibleSections = (access) =>
  ADMIN_SECTIONS.map((section) => ({ ...section, items: section.items.filter((item) => allowed(item, access)) })).filter(
    (section) => section.items.length > 0,
  );

/** The menu item a path belongs to (longest match), or null. */
export const itemForPath = (pathname) => {
  const clean = pathname.replace(/\/+$/, '') || '/';
  let best = null;
  ADMIN_SECTIONS.forEach((section) =>
    section.items.forEach((item) => {
      const match = item.end ? clean === item.to : clean === item.to || clean.startsWith(`${item.to}/`);
      if (match && (!best || item.to.length > best.to.length)) best = item;
    }),
  );
  return best;
};
