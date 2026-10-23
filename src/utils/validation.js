/**
 * Shared email and Rwandan phone rules for every form (sign-in, sign-up,
 * profiles, checkout, withdrawals, refunds). The backend applies the same rules.
 */

// Rwandan mobile numbers: MTN 078/079, Airtel 072/073.
// Accepted as 07XXXXXXXX (10 digits) or +2507XXXXXXXX / 2507XXXXXXXX.
const RW_PHONE_REGEX = /^(?:\+?250|0)7[2389]\d{7}$/;
const RW_MOMO_REGEX = /^(?:\+?250|0)7[389]\d{7}$/;

// name@domain.tld — letters/digits/._%+- before the @, a real domain with a 2+ letter ending after it.
const EMAIL_REGEX =
  /^[A-Za-z0-9](?:[A-Za-z0-9._%+-]{0,62}[A-Za-z0-9_%+-])?@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}$/;

export const EMAIL_MAX_LENGTH = 254;
/** Longest phone a field may hold: "+250" + 9 digits. */
export const PHONE_MAX_LENGTH = 13;

export const PHONE_PLACEHOLDER = '07XXXXXXXX';
export const PHONE_ERROR = 'Enter a valid Rwandan number: 07XXXXXXXX or +2507XXXXXXXX (MTN or Airtel).';
export const MOMO_PHONE_ERROR = 'Enter a valid MTN or Airtel Mobile Money number (078, 079 or 073).';
export const EMAIL_ERROR = 'Enter a valid email address, e.g. name@example.com.';

const compactPhone = (value) => String(value ?? '').replace(/[\s\-().]/g, '');

/**
 * Keeps only what a Rwandan number can contain while the user types: a leading "+"
 * and digits, cut at the number's full length (10 for 07…, 12 for 250…, 13 for +250…).
 */
export function sanitizePhoneInput(value) {
  let next = String(value ?? '').replace(/[^\d+]/g, '');
  next = next.replace(/(?!^)\+/g, '');
  const max = next.startsWith('+') ? 13 : next.startsWith('250') ? 12 : 10;
  return next.slice(0, max);
}

/** Removes spaces (an email never has one) and caps the length. */
export function sanitizeEmailInput(value) {
  return String(value ?? '').replace(/\s/g, '').slice(0, EMAIL_MAX_LENGTH);
}

export function isValidRwandaPhone(value) {
  return RW_PHONE_REGEX.test(compactPhone(value));
}

/** MTN (078, 079) or Airtel (073) — the networks Mobile Money payments go through. */
export function isValidMomoPhone(value) {
  return RW_MOMO_REGEX.test(compactPhone(value));
}

/** Any accepted form → local 07XXXXXXXX. */
export function toLocalRwandaPhone(value) {
  let digits = compactPhone(value).replace(/\D/g, '');
  if (digits.startsWith('250')) digits = digits.slice(3);
  if (!digits.startsWith('0')) digits = `0${digits}`;
  return digits;
}

export function isValidEmail(value) {
  const email = String(value ?? '').trim();
  return email.length <= EMAIL_MAX_LENGTH && !email.includes('..') && EMAIL_REGEX.test(email);
}

/** Longest name for any account (customer, kitchen, owner, delivery worker, admin). Matches the backend. */
export const NAME_MAX_LENGTH = 50;

/**
 * Person names start every word with a capital letter, as the user types:
 * "jean paul" → "Jean Paul", "jean-pierre o'neil" → "Jean-Pierre O'Neil".
 * Also drops leading/double spaces and stops at NAME_MAX_LENGTH. Kitchen names are not changed.
 */
export function formatNameInput(value) {
  return String(value ?? '')
    .replace(/^\s+/, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/(^|[\s'-])(\p{Ll})/gu, (_, separator, letter) => separator + letter.toUpperCase())
    .slice(0, NAME_MAX_LENGTH);
}
