import React from "react";

export default function AppLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="border-b border-[#E2E6F0] pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-3 w-40 bg-[#E2E6F0] rounded-md" />
          <div className="h-7 w-64 bg-[#CEDEFF] rounded-lg" />
          <div className="h-3 w-80 bg-[#F2F4FF] rounded-md" />
        </div>
        <div className="h-9 w-28 bg-[#E2E6F0] rounded-xl self-start sm:self-auto" />
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-[#E2E6F0] rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="flex justify-between items-center">
              <div className="h-2.5 w-20 bg-[#E2E6F0] rounded" />
              <div className="w-5 h-5 bg-[#F2F4FF] rounded-full" />
            </div>
            <div className="h-7 w-16 bg-[#CEDEFF] rounded-lg" />
            <div className="h-2.5 w-32 bg-[#F2F4FF] rounded" />
          </div>
        ))}
      </div>

      {/* Main Content Skeleton Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white border border-[#E2E6F0] rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex justify-between items-center">
              <div className="h-4 w-28 bg-[#CEDEFF] rounded" />
              <div className="h-4 w-16 bg-[#F2F4FF] rounded-full" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full bg-[#F2F4FF] rounded" />
              <div className="h-3 w-4/5 bg-[#F2F4FF] rounded" />
            </div>
            <div className="pt-4 border-t border-[#E2E6F0] flex justify-between items-center">
              <div className="h-3 w-24 bg-[#F2F4FF] rounded" />
              <div className="h-3 w-20 bg-[#E2E6F0] rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
