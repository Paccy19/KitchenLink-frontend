import React from 'react';

/** A numbered checkout section: "1 Delivery Destination", "2 …", with an optional header action. */
export default function StepCard({ step, title, action = null, className = 'space-y-4', children }) {
  return (
    <div className={`bg-white rounded-3xl p-6 border border-stone-200/80 shadow-sm ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#faf6f2] text-[#542813] border border-[#ebd7c5] flex items-center justify-center font-black text-xs">
            {step}
          </div>
          <h3 className="font-extrabold text-gray-900 text-base">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
