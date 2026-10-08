import React from 'react';
import clsx from 'clsx';

/** Generic shimmer block — pass size/shape via className. */
export function Skeleton({ className, ...props }) {
  return (
    <div
      aria-hidden="true"
      className={clsx('animate-pulse rounded-xl bg-gray-200/80', className)}
      {...props}
    />
  );
}

/** Vendor card skeleton with fixed aspect banner (no layout shift). */
export function VendorCardSkeleton({ className }) {
  return (
    <div
      className={clsx('bg-white rounded-3xl border border-gray-100 overflow-hidden', className)}
      aria-hidden="true"
    >
      <Skeleton className="h-44 w-full rounded-none" />
      <div className="p-5 space-y-3">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-3 w-full" />
      </div>
    </div>
  );
}

/** Compact horizontally-scrolling vendor card skeleton. */
export function VendorTileSkeleton() {
  return (
    <div className="min-w-[260px] max-w-[260px] bg-white rounded-3xl border border-gray-100 overflow-hidden" aria-hidden="true">
      <Skeleton className="h-36 w-full rounded-none" />
      <div className="p-4 space-y-2.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

/** Dish card skeleton. */
export function DishCardSkeleton() {
  return (
    <div className="min-w-[180px] max-w-[180px] bg-white rounded-3xl border border-gray-100 overflow-hidden" aria-hidden="true">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="p-4 space-y-2.5">
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-5 w-24" />
      </div>
    </div>
  );
}

/** Horizontal row of category pills. */
export function CategoryBarSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden" aria-hidden="true">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="flex flex-col items-center gap-2 min-w-[64px]">
          <Skeleton className="h-14 w-14 rounded-2xl" />
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}

/** Full home feed skeleton. */
export function HomeFeedSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading your feed">
      <Skeleton className="h-12 w-full rounded-2xl" />
      <CategoryBarSkeleton />
      <div className="space-y-3">
        <Skeleton className="h-5 w-48" />
        <div className="flex gap-4 overflow-hidden">
          <VendorTileSkeleton />
          <VendorTileSkeleton />
          <VendorTileSkeleton />
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-56" />
        <div className="flex gap-4 overflow-hidden">
          <DishCardSkeleton />
          <DishCardSkeleton />
          <DishCardSkeleton />
        </div>
      </div>
    </div>
  );
}

/** Storefront skeleton (banner + info + menu rows). */
export function StorefrontSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading kitchen">
      <Skeleton className="h-64 sm:h-80 w-full rounded-none" />
      <div className="px-4 space-y-3">
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-28 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-white rounded-3xl border border-gray-100 p-4 flex gap-4">
              <Skeleton className="h-24 w-24 flex-shrink-0" />
              <div className="flex-1 space-y-2.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Simple list-row skeleton for search results. */
export function ResultRowSkeleton() {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-4 flex gap-4 items-center" aria-hidden="true">
      <Skeleton className="h-20 w-20 flex-shrink-0" />
      <div className="flex-1 space-y-2.5">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}
