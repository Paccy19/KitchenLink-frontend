/**
 * Preset delivery slots for scheduled/pre-order orders.
 *
 * The customer picks a coarse day ("Today"/"Tomorrow") plus a time slot;
 * these helpers turn those into a real ISO instant for the API and back
 * into friendly labels for display.
 */

export const SCHEDULE_DAY_OPTIONS = ['Today', 'Tomorrow'];

export const SCHEDULE_TIME_SLOTS = [
  '08:30 AM',
  '09:30 AM',
  '11:30 AM',
  '12:30 PM',
  '01:30 PM',
  '02:30 PM',
  '06:30 PM',
  '07:30 PM',
];

const parseTime = (timeLabel) => {
  const [time, meridian] = String(timeLabel || '').split(' ');
  const [h, m] = String(time).split(':').map(Number);
  const hours = (h % 12) + (meridian && meridian.toUpperCase() === 'PM' ? 12 : 0);
  return { hours, minutes: Number.isFinite(m) ? m : 0 };
};

/** Local ISO instant for a chosen day+time slot ("Today"/"Tomorrow" + "12:30 PM"). */
export const buildScheduledFor = (dayLabel, timeLabel) => {
  const target = new Date();
  if (String(dayLabel || '').toLowerCase() === 'tomorrow') {
    target.setDate(target.getDate() + 1);
  }
  const { hours, minutes } = parseTime(timeLabel);
  target.setHours(hours, minutes, 0, 0);
  return target.toISOString();
};

/** Friendly label such as "Tomorrow at 12:30 PM" from a UTC ISO instant. */
export const formatScheduledFor = (iso, { short = false } = {}) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const isTomorrow =
    date.toDateString() === new Date(now.getTime() + 86400000).toDateString();
  const dayLabel = isTomorrow ? 'Tomorrow' : 'Today';
  const time = date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
  return short ? time : `${dayLabel} at ${time}`;
};

/** Builds the basket's pre-order target from a vendor + its special. */
export const buildPreorderSpecial = (vendor, special) => {
  if (!vendor || !special) return null;
  return {
    vendorId: vendor.id,
    vendorName: vendor.name,
    text: special.text,
    cutoffAt: special.cutoffAt,
    deliveryAt: special.deliveryAt,
    cutoffLabel: formatScheduledFor(special.cutoffAt),
    deliveryLabel: formatScheduledFor(special.deliveryAt),
  };
};