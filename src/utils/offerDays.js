const pad = (value) => String(value).padStart(2, '0');

/** Local calendar day ("YYYY-MM-DD") `addDays` from today. */
export const dayFromToday = (addDays = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + addDays);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/** "Fri 24 Oct" for an offer day ("YYYY-MM-DD"). */
export const formatOfferDay = (day, { long = false } = {}) => {
  if (!day) return '';
  const date = new Date(`${day}T12:00:00`);
  if (Number.isNaN(date.getTime())) return day;
  return date.toLocaleDateString(undefined, {
    weekday: long ? 'long' : 'short',
    day: 'numeric',
    month: long ? 'long' : 'short',
  });
};

/** "Tomorrow", "In 3 days"… relative to today. */
export const offerCountdown = (day) => {
  const target = new Date(`${day}T00:00:00`);
  const today = new Date(`${dayFromToday(0)}T00:00:00`);
  const days = Math.round((target - today) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
};
