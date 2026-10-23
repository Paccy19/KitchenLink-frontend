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

const isoDay = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** Local midnight of a day value: "Today", "Tomorrow" or "YYYY-MM-DD". */
const dayStart = (dayValue) => {
  const value = String(dayValue || '');
  const target = new Date();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  if (value.toLowerCase() === 'tomorrow') target.setDate(target.getDate() + 1);
  target.setHours(0, 0, 0, 0);
  return target;
};

/** Local ISO instant for a chosen day+time slot ("Today"/"Tomorrow"/"2026-10-30" + "12:30 PM"). */
export const buildScheduledFor = (dayValue, timeLabel) => {
  const target = dayStart(dayValue);
  const { hours, minutes } = parseTime(timeLabel);
  target.setHours(hours, minutes, 0, 0);
  return target.toISOString();
};

/** "Today", "Tomorrow" or "Fri 30 Oct" for a day value. */
export const scheduleDayLabel = (dayValue) => {
  const value = String(dayValue || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return dayStart(value).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
};

/**
 * Time slots on a day that still meet the kitchen's notice (e.g. a caterer
 * needs 24 hours) and fall inside how far ahead it takes orders.
 */
export const scheduleTimeSlots = (dayValue, rules) => {
  const lead = (rules?.minLeadMinutes ?? 45) * 60 * 1000;
  const maxAhead = (rules?.maxDaysAhead ?? 7) * 24 * 60 * 60 * 1000;
  const now = Date.now();
  return SCHEDULE_TIME_SLOTS.filter((slot) => {
    const at = new Date(buildScheduledFor(dayValue, slot)).getTime();
    return at >= now + lead && at <= now + maxAhead;
  });
};

/** The days a customer may pick for this kitchen (only days with a free slot). */
export const scheduleDayOptions = (rules) => {
  const maxDays = rules?.maxDaysAhead ?? 7;
  const options = [];
  for (let offset = 0; offset <= maxDays; offset += 1) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    const value = offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : isoDay(date);
    if (scheduleTimeSlots(value, rules).length) options.push({ value, label: scheduleDayLabel(value) });
  }
  return options;
};

/** Friendly label such as "Tomorrow at 12:30 PM" from a UTC ISO instant. */
export const formatScheduledFor = (iso, { short = false } = {}) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isTomorrow =
    date.toDateString() === new Date(now.getTime() + 86400000).toDateString();
  // Caterers and meal-prep kitchens take orders days ahead.
  const dayLabel = isToday
    ? 'Today'
    : isTomorrow
      ? 'Tomorrow'
      : date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
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