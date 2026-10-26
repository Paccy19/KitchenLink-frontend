import React from 'react';
import { Clock } from 'lucide-react';
import StepCard from './StepCard';
import { formatScheduledFor, scheduleDayLabel } from '../../utils/schedule';

/** Checkout step 2: when the order is delivered or ready to collect. */
export default function ScheduleSection({
  orderType,
  isPickup,
  preorderSpecial,
  scheduledFor,
  scheduledDate,
  scheduledTime,
  apiEnabled,
}) {
  const scheduleLabel =
    orderType === 'immediate'
      ? isPickup ? 'Pick up as soon as it is ready' : 'Immediate Delivery'
      : orderType === 'preorder'
        ? isPickup ? 'Pre-Order · pickup' : 'Pre-Order'
        : isPickup ? 'Scheduled Pickup' : 'Scheduled Delivery';

  const scheduleDescription =
    orderType === 'immediate'
      ? isPickup
        ? "You get a pickup code right after ordering — it shows on your order page. Give it to the kitchen when you collect."
        : 'Estimated delivery time: 25–35 minutes after kitchen preparation'
      : orderType === 'preorder' && preorderSpecial
        ? `${preorderSpecial.text} — ${isPickup ? 'ready to collect' : 'arrives'} by ${formatScheduledFor(scheduledFor)}`
        : `${isPickup ? 'Ready to collect' : 'Scheduled to arrive'}: ${scheduleDayLabel(scheduledDate)} at ${scheduledTime}`;

  return (
    <StepCard step={2} title={isPickup ? 'Pickup Time' : 'Delivery Schedule'} className="space-y-3">
      <div className="p-3.5 rounded-2xl bg-[#faf6f2] border border-[#ebd7c5] flex items-center gap-3">
        <Clock className="w-5 h-5 text-[#8a5332] flex-shrink-0" />
        <div className="text-xs">
          <span className="font-bold text-[#3d1b0c]">{scheduleLabel}</span>
          <p className="text-stone-600 mt-0.5">{scheduleDescription}</p>
          {orderType === 'preorder' && preorderSpecial && (
            <p className="text-[11px] font-semibold text-[#8a5332] mt-1">
              Order before {preorderSpecial.cutoffLabel} · you pay now, the kitchen is notified straight away
            </p>
          )}
        </div>
      </div>
      {apiEnabled && orderType !== 'immediate' && !isPickup && (
        <p className="text-xs font-semibold text-stone-500">
          Please keep this delivery time free — your delivery worker is dispatched close to the scheduled time.
        </p>
      )}
    </StepCard>
  );
}
