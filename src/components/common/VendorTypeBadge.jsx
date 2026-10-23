import React from 'react';
import clsx from 'clsx';
import { getVendorType } from '../../data/vendorTypes';

/**
 * The kitchen's business type ("Home Cook", "Food Truck", …) as a coloured
 * badge. Accepts a type code or label. Each type has its own colour everywhere.
 */
export default function VendorTypeBadge({ type, size = 'sm', showIcon = true, className }) {
  const vendorType = getVendorType(type);
  const Icon = vendorType.icon;
  return (
    <span
      className={clsx(
        'vendor-type-badge inline-flex items-center gap-1 rounded-full border font-black whitespace-nowrap',
        `vendor-type-${vendorType.code}`,
        vendorType.badge,
        size === 'xs' ? 'px-2 py-0.5 text-[10px]' : size === 'md' ? 'px-3 py-1 text-xs' : 'px-2.5 py-0.5 text-[11px]',
        className,
      )}
      title={vendorType.description}
    >
      {showIcon && <Icon className={size === 'md' ? 'w-3.5 h-3.5' : 'w-3 h-3'} aria-hidden="true" />}
      {vendorType.label}
    </span>
  );
}
