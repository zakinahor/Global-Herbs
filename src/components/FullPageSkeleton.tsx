import React from 'react';
import ProductSkeletonCard from './ProductSkeletonCard';

export default function FullPageSkeleton() {
  return (
    <div className="min-h-screen bg-white flex flex-col w-full animate-pulse select-none pointer-events-none">
      {/* 1. Top Notice Bar Skeleton */}
      <div className="bg-zinc-950 text-zinc-400 py-2 px-4 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500/80 animate-ping" />
            <div className="w-48 h-3 bg-zinc-800 rounded-md" />
          </div>
          <div className="hidden md:flex items-center gap-4">
            <div className="w-32 h-3 bg-zinc-800 rounded-md" />
            <div className="w-24 h-3 bg-zinc-800 rounded-md" />
          </div>
        </div>
      </div>

      {/* 2. Main Header Skeleton */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between gap-4">
          {/* Logo Skeleton */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-200" />
            <div className="space-y-1.5">
              <div className="w-32 h-4 bg-gray-300 rounded" />
              <div className="w-20 h-2.5 bg-gray-200 rounded" />
            </div>
          </div>

          {/* Search Bar Skeleton */}
          <div className="hidden sm:flex flex-1 max-w-md mx-6">
            <div className="w-full h-10 bg-gray-100 rounded-xl border border-gray-200/80" />
          </div>

          {/* Nav Links & Actions Skeleton */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-5 mr-4">
              <div className="w-12 h-3.5 bg-gray-200 rounded" />
              <div className="w-12 h-3.5 bg-gray-200 rounded" />
              <div className="w-14 h-3.5 bg-gray-200 rounded" />
            </div>
            <div className="w-9 h-9 rounded-lg bg-gray-100" />
            <div className="w-24 h-9 rounded-lg bg-emerald-800/20" />
          </div>
        </div>

        {/* Category Navigation Strip Skeleton */}
        <div className="border-t border-gray-100 bg-gray-50/50 py-2.5 px-4 overflow-x-hidden">
          <div className="max-w-7xl mx-auto flex items-center gap-6">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 flex-shrink-0">
                <div className="w-3.5 h-3.5 rounded bg-gray-300/70" />
                <div className="w-16 h-3 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* 3. Hero Section Skeleton */}
      <section className="bg-zinc-950 text-white py-16 px-4 relative overflow-hidden">
        <div className="max-w-7xl mx-auto grid md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-7 space-y-5">
            <div className="w-36 h-6 bg-emerald-900/60 rounded-full" />
            <div className="space-y-2">
              <div className="w-4/5 h-9 bg-zinc-800 rounded-lg" />
              <div className="w-3/5 h-9 bg-zinc-800 rounded-lg" />
            </div>
            <div className="w-full max-w-lg space-y-2 pt-2">
              <div className="w-full h-3.5 bg-zinc-800/80 rounded" />
              <div className="w-5/6 h-3.5 bg-zinc-800/80 rounded" />
            </div>
            <div className="flex gap-4 pt-4">
              <div className="w-36 h-11 bg-emerald-600/40 rounded-lg" />
              <div className="w-36 h-11 bg-zinc-800 rounded-lg" />
            </div>
          </div>

          <div className="md:col-span-5 hidden md:block">
            <div className="aspect-4/3 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
              <div className="w-24 h-4 bg-emerald-800/40 rounded" />
              <div className="w-full h-3 bg-zinc-800 rounded" />
              <div className="w-full h-3 bg-zinc-800 rounded" />
              <div className="w-2/3 h-3 bg-zinc-800 rounded" />
              <div className="pt-4 flex justify-between items-center border-t border-zinc-800">
                <div className="w-20 h-6 bg-zinc-800 rounded" />
                <div className="w-16 h-6 bg-emerald-900/50 rounded" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Catalog & Sidebar Section Skeleton */}
      <main className="max-w-7xl mx-auto px-4 py-10 w-full flex-grow">
        {/* Breadcrumb & Section Header Skeleton */}
        <div className="border-b border-gray-100 pb-6 mb-8 flex justify-between items-end">
          <div className="space-y-2">
            <div className="w-32 h-3 bg-gray-200 rounded" />
            <div className="w-48 h-7 bg-gray-300 rounded-md" />
          </div>
          <div className="w-36 h-9 bg-gray-100 rounded-lg" />
        </div>

        {/* Sidebar + Product Grid Skeleton */}
        <div className="grid md:grid-cols-12 gap-8 items-start">
          {/* Sidebar Skeleton */}
          <div className="hidden md:block md:col-span-3 space-y-6">
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 space-y-4">
              <div className="w-28 h-4 bg-gray-300 rounded" />
              <div className="space-y-2.5 pt-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex justify-between items-center py-1">
                    <div className="w-24 h-3.5 bg-gray-200 rounded" />
                    <div className="w-6 h-3 bg-gray-200 rounded-full" />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 space-y-3">
              <div className="w-24 h-4 bg-gray-300 rounded" />
              <div className="w-full h-2 bg-gray-200 rounded-full mt-2" />
              <div className="flex justify-between items-center pt-2">
                <div className="w-14 h-3 bg-gray-200 rounded" />
                <div className="w-14 h-3 bg-gray-200 rounded" />
              </div>
            </div>
          </div>

          {/* Product Grid Skeleton */}
          <div className="col-span-12 md:col-span-9">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {Array.from({ length: 8 }).map((_, idx) => (
                <ProductSkeletonCard key={idx} />
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* 5. Footer Skeleton */}
      <footer className="bg-zinc-950 border-t border-zinc-800 py-8 px-4 text-zinc-600 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-800" />
            <div className="w-32 h-4 bg-zinc-800 rounded" />
          </div>
          <div className="flex gap-6">
            <div className="w-16 h-3 bg-zinc-800 rounded" />
            <div className="w-16 h-3 bg-zinc-800 rounded" />
            <div className="w-16 h-3 bg-zinc-800 rounded" />
          </div>
        </div>
      </footer>
    </div>
  );
}
