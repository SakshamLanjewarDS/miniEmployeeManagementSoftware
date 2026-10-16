"use client";

import React, { useEffect } from "react";
import { X, SlidersHorizontal, RotateCcw, Check } from "lucide-react";

interface MobileFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  activeCount?: number;
  onReset?: () => void;
  resultCount?: number;
  children: React.ReactNode;
}

export function MobileFilterDrawer({
  isOpen,
  onClose,
  title = "Filter Options",
  activeCount = 0,
  onReset,
  resultCount,
  children,
}: MobileFilterDrawerProps) {
  // Lock body scroll while drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center overflow-hidden animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-[28px] sm:rounded-2xl border-t sm:border border-slate-200 w-full max-w-lg max-h-[88vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200 overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Grabber Handle (iOS/Android native sheet style) */}
        <div className="w-10 h-1.5 rounded-full bg-slate-300 mx-auto mt-2.5 -mb-1 sm:hidden shrink-0" />

        {/* Header */}
        <div className="p-4 sm:p-5 pb-3 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#3562E8] flex items-center justify-center shrink-0">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base leading-tight">{title}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {activeCount > 0 ? (
                  <span className="text-[#3562E8] font-semibold">{activeCount} active filter{activeCount > 1 ? "s" : ""} applied</span>
                ) : (
                  "Refine displayed records"
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close filters"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Filter Form Controls */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {children}
        </div>

        {/* Sticky Action Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between gap-3 shrink-0 pb-safe">
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              disabled={activeCount === 0}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="flex-1 max-w-[240px] ml-auto py-2.5 px-4 bg-[#3562E8] hover:bg-[#254fc7] text-white font-bold text-xs rounded-xl shadow-md shadow-[#3562E8]/25 flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>
              {resultCount !== undefined
                ? `Show ${resultCount} Results`
                : "Apply Filters"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default MobileFilterDrawer;
