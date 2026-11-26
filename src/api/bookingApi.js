/**
 * Booking a table from a kitchen's page (public). Guests need no account.
 * The private booking token is shown once (it is in the link the guest
 * keeps) and is sent in the X-Booking-Token header, never in the API URL.
 *
 * @module api/bookingApi
 */
import { apiGet, apiJson, buildUrl, ApiError } from './client';

const v = (vendorId) => encodeURIComponent(vendorId);

/** GET /bookings/kitchens/:id/slots?date=YYYY-MM-DD&party_size= — free times and the kitchen's rules. */
export const fetchBookingSlots = (vendorId, params) => apiGet(`/bookings/kitchens/${v(vendorId)}/slots`, params);

/** POST /bookings/kitchens/:id — { name, phone, email, party_size, starts_at, special_requests, dietary_notes, preorder_items }. */
export const createBooking = (vendorId, body) => apiJson('POST', `/bookings/kitchens/${v(vendorId)}`, body);

/** GET /bookings/manage — the booking behind a private token. */
export const fetchBooking = (token) => apiGet('/bookings/manage', {}, { 'X-Booking-Token': token });

/** POST /bookings/manage/cancel — the guest cancels (the kitchen's deposit policy applies). */
export async function cancelBooking(token) {
  const response = await fetch(buildUrl('/bookings/manage/cancel'), {
    method: 'POST',
    headers: { Accept: 'application/json', 'X-Booking-Token': token },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(data?.error?.message || 'Could not cancel the booking.', { status: response.status, code: data?.error?.code || '' });
  return data;
}

/** GET /bookings/mine — the signed-in customer's bookings. */
export const fetchMyBookings = () => apiGet('/bookings/mine');
