import React from 'react';

export default function ProductSkeletonCard() {
  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden flex flex-col h-full animate-pulse shadow-xs">
      {/* Skeleton Image Area */}
      <div className="relative aspect-[4/5] bg-gray-200/70 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
        <div className="absolute top-3 left-3">
          <div className="w-12 h-4 bg-gray-300/80 rounded-full" />
        </div>
      </div>

      {/* Skeleton Content Box */}
      <div className="p-4 flex flex-col flex-grow text-left space-y-3">
        {/* Category & Weight row */}
        <div className="flex justify-between items-center">
          <div className="w-16 h-3 bg-gray-200 rounded" />
          <div className="w-10 h-3 bg-gray-200 rounded" />
        </div>

        {/* Title skeleton (2 lines) */}
        <div className="space-y-1.5 h-10 flex flex-col justify-center">
          <div className="w-5/6 h-3.5 bg-gray-200 rounded" />
          <div className="w-3/4 h-3.5 bg-gray-200 rounded" />
        </div>

        {/* Rating stars skeleton */}
        <div className="flex items-center gap-1">
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="w-3 h-3 bg-gray-200 rounded-full" />
            ))}
          </div>
          <div className="w-8 h-2.5 bg-gray-200 rounded ml-1" />
        </div>

        {/* Price & Action Button skeleton */}
        <div className="mt-auto pt-2 space-y-3">
          <div className="w-20 h-5 bg-gray-200 rounded" />
          <div className="w-full h-8 bg-gray-200 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
