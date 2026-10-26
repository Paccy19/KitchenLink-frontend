import React from 'react';
import StepCard from './StepCard';
import { PAYMENT_METHODS, formatCardExpiry, formatCardNumber } from './paymentMethods';
import { PHONE_MAX_LENGTH, sanitizePhoneInput } from '../../utils/validation';

const inputClass =
  'w-full text-xs p-3 rounded-xl border border-stone-200 bg-white text-gray-900 outline-none focus:border-[#542813] focus:ring-2 focus:ring-[#542813]/15 transition';

/** Checkout step 3: pick a payment method and fill in its card or phone details. */
export default function PaymentSection({ paymentMethod, onMethodChange, paymentInputs, onInputChange }) {
  return (
    <StepCard step={3} title="Payment Method">
      <div className="space-y-2.5">
        {PAYMENT_METHODS.map((method) => {
          const Icon = method.icon;
          const selected = paymentMethod === method.code;
          return (
            <div
              key={method.code}
              className={`rounded-2xl border transition ${
                selected
                  ? 'border-[#542813] bg-[#faf6f2] ring-1 ring-[#542813]/20 shadow-sm'
                  : 'border-stone-200 hover:bg-stone-50'
              }`}
            >
              <label className="flex items-center justify-between p-4 cursor-pointer">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="pay_method"
                    checked={selected}
                    onChange={() => onMethodChange(method.code)}
                    className="accent-[#542813]"
                  />
                  <div>
                    <div className="font-bold text-xs text-gray-900">{method.label}</div>
                    <p className="text-[11px] text-stone-500">{method.hint}</p>
                  </div>
                </div>
                <Icon className="w-5 h-5 text-stone-400" />
              </label>

              {selected && (
                <div className="px-4 pb-4 space-y-2">
                  {method.code === 'card' ? (
                    <>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="cc-number"
                        value={paymentInputs.card.card_number}
                        onChange={(e) =>
                          onInputChange('card', 'card_number', formatCardNumber(e.target.value))
                        }
                        placeholder="Card number"
                        className={inputClass}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="cc-exp"
                          value={paymentInputs.card.card_expiry}
                          onChange={(e) =>
                            onInputChange('card', 'card_expiry', formatCardExpiry(e.target.value))
                          }
                          placeholder="Expiry (MM/YY)"
                          className={inputClass}
                        />
                        <input
                          type="password"
                          inputMode="numeric"
                          autoComplete="cc-csc"
                          value={paymentInputs.card.card_cvv}
                          onChange={(e) =>
                            onInputChange(
                              'card',
                              'card_cvv',
                              e.target.value.replace(/[^\d]/g, '').slice(0, 4)
                            )
                          }
                          placeholder="CVV"
                          className={inputClass}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <input
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        maxLength={PHONE_MAX_LENGTH}
                        value={paymentInputs[method.code].phone}
                        onChange={(e) => onInputChange(method.code, 'phone', sanitizePhoneInput(e.target.value))}
                        placeholder={
                          method.code === 'mobile_money'
                            ? 'Phone number e.g. +250788123456'
                            : 'Phone number e.g. 0788123456'
                        }
                        className={inputClass}
                      />
                      {method.code === 'mobile_money' && (
                        <p className="text-[10px] font-medium text-stone-500">
                          Supported networks: MTN (+25078, +25079) and Airtel (+25073).
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </StepCard>
  );
}
