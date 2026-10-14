"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

export interface StatusOption {
  value: string;
  label: string;
  subLabel: string;
  icon: React.ReactNode;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  itemActiveBg: string;
  itemActiveBorder: string;
  itemHoverBg: string;
  dotColor: string;
}

export const STATUS_OPTIONS: StatusOption[] = [
  {
    value: "TODO",
    label: "Todo",
    subLabel: "Pending work",
    icon: "📋",
    badgeBg: "bg-slate-100",
    badgeText: "text-slate-800",
    badgeBorder: "border-slate-300",
    itemActiveBg: "bg-slate-100",
    itemActiveBorder: "border-slate-200",
    itemHoverBg: "hover:bg-slate-50",
    dotColor: "bg-slate-500",
  },
  {
    value: "STARTED",
    label: "Started",
    subLabel: "Commenced",
    icon: "▶",
    badgeBg: "bg-sky-50",
    badgeText: "text-sky-900",
    badgeBorder: "border-sky-300",
    itemActiveBg: "bg-sky-50",
    itemActiveBorder: "border-sky-200",
    itemHoverBg: "hover:bg-sky-50/70",
    dotColor: "bg-sky-500",
  },
  {
    value: "ONGOING",
    label: "Ongoing",
    subLabel: "In progress",
    icon: "⚡",
    badgeBg: "bg-blue-50",
    badgeText: "text-blue-900",
    badgeBorder: "border-blue-300",
    itemActiveBg: "bg-blue-50",
    itemActiveBorder: "border-blue-200",
    itemHoverBg: "hover:bg-blue-50/70",
    dotColor: "bg-blue-600",
  },
  {
    value: "CHECKING",
    label: "Checking",
    subLabel: "Waiting review",
    icon: "🔍",
    badgeBg: "bg-purple-50",
    badgeText: "text-purple-900",
    badgeBorder: "border-purple-300",
    itemActiveBg: "bg-purple-50",
    itemActiveBorder: "border-purple-200",
    itemHoverBg: "hover:bg-purple-50/70",
    dotColor: "bg-purple-600",
  },
  {
    value: "CHANGES_REQUESTED",
    label: "Revision",
    subLabel: "Changes requested",
    icon: "🔄",
    badgeBg: "bg-rose-50",
    badgeText: "text-rose-900",
    badgeBorder: "border-rose-300",
    itemActiveBg: "bg-rose-50",
    itemActiveBorder: "border-rose-200",
    itemHoverBg: "hover:bg-rose-50/70",
    dotColor: "bg-rose-500",
  },
  {
    value: "COMPLETED",
    label: "Completed",
    subLabel: "Done & approved",
    icon: "✔",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-900",
    badgeBorder: "border-emerald-300",
    itemActiveBg: "bg-emerald-50",
    itemActiveBorder: "border-emerald-200",
    itemHoverBg: "hover:bg-emerald-50/70",
    dotColor: "bg-emerald-500",
  },
];

export function normalizeStatusOption(status: string): StatusOption {
  const norm = (status || "").toUpperCase();
  if (norm === "COMPLETED") return STATUS_OPTIONS[5]; // Completed
  if (norm === "CHANGES_REQUESTED" || norm === "REVISION") return STATUS_OPTIONS[4]; // Revision
  if (norm === "IN_REVIEW" || norm === "WAITING_REVIEW" || norm === "CHECKING") return STATUS_OPTIONS[3]; // Checking
  if (norm === "ONGOING" || norm === "IN_PROGRESS") return STATUS_OPTIONS[2]; // Ongoing
  if (norm === "STARTED") return STATUS_OPTIONS[1]; // Started
  return STATUS_OPTIONS[0]; // Todo (NOT_STARTED or TODO)
}

export interface TaskStatusDropdownProps {
  currentStatus: string;
  isLoading?: boolean;
  onSelectStatus: (newStatus: string) => void;
  className?: string;
  variant?: "badge" | "select";
  fullWidth?: boolean;
}

export function TaskStatusDropdown({
  currentStatus,
  isLoading = false,
  onSelectStatus,
  className = "",
  variant = "select",
  fullWidth = true,
}: TaskStatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerBtnRef = useRef<HTMLButtonElement>(null);

  const activeOption = useMemo(() => normalizeStatusOption(currentStatus), [currentStatus]);

  // Determine open direction based on viewport bounds
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLoading) return;
    if (!isOpen && triggerBtnRef.current) {
      const rect = triggerBtnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      // Prefer upward if space below is limited
      setOpenUpward(spaceBelow < 310 && spaceAbove > 260);
    }
    setIsOpen((prev) => !prev);
  };

  // Close dropdown on click outside or Escape key
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (val: string) => {
    setIsOpen(false);
    onSelectStatus(val);
  };

  return (
    <div className={`relative ${fullWidth ? "w-full flex-1 min-w-0" : "inline-block"} ${className}`} ref={dropdownRef}>
      {/* TRIGGER BUTTON */}
      {variant === "select" ? (
        <button
          ref={triggerBtnRef}
          type="button"
          disabled={isLoading}
          onClick={handleToggle}
          className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-all cursor-pointer shadow-2xs hover:bg-slate-50 border-slate-200/90 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100"
          title={`Status: ${activeOption.label}`}
          aria-label={`Status: ${activeOption.label}`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm leading-none shrink-0 select-none">{activeOption.icon}</span>
            <span className="truncate text-slate-900 font-bold">{activeOption.label}</span>
          </div>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 ml-1.5" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1.5" />
          )}
        </button>
      ) : (
        <button
          ref={triggerBtnRef}
          type="button"
          disabled={isLoading}
          onClick={handleToggle}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-2xs hover:shadow-xs hover:brightness-98 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-100 ${activeOption.badgeBg} ${activeOption.badgeText} ${activeOption.badgeBorder}`}
          title={`Status: ${activeOption.label}`}
          aria-label={`Status: ${activeOption.label}`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className="text-sm leading-none shrink-0 select-none">{activeOption.icon}</span>
          <span>{activeOption.label}</span>
          {isOpen ? (
            <ChevronUp className="w-3.5 h-3.5 opacity-70 ml-0.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 opacity-70 ml-0.5" />
          )}
        </button>
      )}

      {/* FLOATING DROPDOWN POPUP (Matching exact screenshot with 2-line item layout and icons) */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Change status"
          className={`absolute left-0 sm:left-auto sm:right-0 w-60 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-[0_12px_36px_rgba(15,23,42,0.14)] border border-slate-200/90 p-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-100 ${
            openUpward ? "bottom-full mb-1.5" : "top-full mt-1.5"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Options List: 2-line items (Icon + Title on line 1, Sublabel on line 2) */}
          <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
            {STATUS_OPTIONS.map((opt) => {
              const isSelected = activeOption.value === opt.value;

              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full px-3 py-2 rounded-xl flex items-center justify-between text-left transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? `${opt.itemActiveBg} shadow-2xs ${opt.itemActiveBorder} border`
                      : `${opt.itemHoverBg} border border-transparent`
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] leading-none shrink-0 select-none">
                        {opt.icon}
                      </span>
                      <span className="text-[13px] font-bold text-slate-900 leading-tight">
                        {opt.label}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-normal leading-tight mt-0.5">
                      {opt.subLabel}
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-[#3562E8] stroke-[2.5] shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
