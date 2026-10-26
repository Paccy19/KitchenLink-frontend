import { Coins, CreditCard, Smartphone, Wallet } from 'lucide-react';

export const PAYMENT_METHODS = [
  {
    code: 'mobile_money',
    label: 'Mobile Money',
    hint: 'MTN or Airtel — +25078, +25079 or +25073',
    icon: Smartphone,
  },
  {
    code: 'card',
    label: 'Cards',
    hint: 'Visa or Mastercard via secure checkout',
    icon: CreditCard,
  },
  {
    code: 'ekash',
    label: 'eKash',
    hint: 'Pay instantly from your eKash wallet',
    icon: Coins,
  },
  {
    code: 'wallet',
    label: 'Wallet',
    hint: 'Pay from the wallet linked to your phone',
    icon: Wallet,
  },
];

export const EMPTY_PAYMENT_INPUTS = {
  mobile_money: { phone: '' },
  card: { card_number: '', card_expiry: '', card_cvv: '' },
  ekash: { phone: '' },
  wallet: { phone: '' },
};

// Mobile Money only supports MTN (078, 079) and Airtel (073).
const MOBILE_MONEY_PHONE_REGEX = /^0(78|79|73)\d{7}$/;
const MOBILE_PHONE_REGEX = /^0(72|73|78|79)\d{7}$/;

const normalizeRwandanPhone = (raw) => {
  let digits = String(raw ?? '').replace(/[^\d]/g, '');
  if (digits.startsWith('250')) digits = digits.slice(3);
  if (!digits.startsWith('0')) digits = `0${digits}`;
  return digits;
};

export const formatCardNumber = (raw) =>
  String(raw ?? '')
    .replace(/[^\d]/g, '')
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, '$1 ');

export const formatCardExpiry = (raw) => {
  const digits = String(raw ?? '').replace(/[^\d]/g, '').slice(0, 4);
  return digits.length >= 3 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};

// Validates the inputs for the selected method and returns the payload that
// gets persisted with the order. The CVV is validated but never sent/stored.
export const buildPaymentDetails = (paymentMethod, paymentInputs) => {
  if (paymentMethod === 'card') {
    const { card_number, card_expiry, card_cvv } = paymentInputs.card;
    const cardNumber = String(card_number ?? '').replace(/\s/g, '');
    if (!/^\d{13,19}$/.test(cardNumber)) {
      return { error: 'Enter a valid card number (13–19 digits).' };
    }
    const expiry = String(card_expiry ?? '').trim();
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) {
      return { error: 'Enter the card expiry as MM/YY.' };
    }
    if (!/^\d{3,4}$/.test(String(card_cvv ?? '').trim())) {
      return { error: 'Enter the card CVV (3–4 digits).' };
    }
    return { details: { card_number: cardNumber, card_expiry: expiry } };
  }

  const phone = normalizeRwandanPhone(paymentInputs[paymentMethod]?.phone);
  const regex =
    paymentMethod === 'mobile_money' ? MOBILE_MONEY_PHONE_REGEX : MOBILE_PHONE_REGEX;
  if (!regex.test(phone)) {
    return {
      error:
        paymentMethod === 'mobile_money'
          ? 'Enter a valid MTN or Airtel number (+25078, +25079 or +25073).'
          : 'Enter a valid Rwandan mobile number (e.g. 0788123456).',
    };
  }
  return { details: { phone } };
};
