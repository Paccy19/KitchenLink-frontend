/**
 * The page a notification opens when tapped. New notifications carry their
 * own `data.link`; older ones fall back to a sensible page for their type.
 *
 * @param {object} notification  raw API notification (snake_case) or a mapped
 *   one (camelCase `orderId`)
 * @param {'customer'|'vendor'|'driver'} role
 */
export function notificationLink(notification, role) {
  const link = notification?.data?.link;
  if (typeof link === 'string' && link.startsWith('/')) return link;

  const orderId = notification?.order_id || notification?.orderId || null;
  const type = notification?.type;

  if (type === 'support_message') {
    if (role === 'vendor') return '/vendor-dashboard/support';
    if (role === 'driver') return '/driver-dashboard/support';
    return '/support';
  }

  if (role === 'vendor') {
    if (type === 'payout_update') return '/vendor-dashboard/wallet';
    if (orderId) return `/vendor-dashboard/orders?order=${orderId}`;
    return '/vendor-dashboard/notifications';
  }
  if (role === 'driver') {
    if (type === 'payout_update') return '/driver-dashboard/earnings';
    return '/driver-dashboard';
  }
  return orderId ? `/track/${orderId}` : '/orders';
}
