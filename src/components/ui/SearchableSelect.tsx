"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, Check, X, PlusCircle, Edit3 } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  subLabel?: string;
  icon?: React.ReactNode;
  badge?: string;
}

import {
  getAllTypologies,
  isTypologyMatch as robustIsTypologyMatch,
  ProjectProfileCircle,
  TypologyBadge,
  TypologyDot,
  getTypologyConfig,
} from "@/lib/typology";

export {
  getAllTypologies,
  ProjectProfileCircle,
  TypologyBadge,
  TypologyDot,
  getTypologyConfig,
};

export const STUDIO_TYPOLOGIES = getAllTypologies();

export function isTypologyMatch(
  projectType: string | null | undefined,
  selectedTypology: string
): boolean {
  return robustIsTypologyMatch(projectType, selectedTypology);
}

export interface SearchableSelectProps {
  id?: string;
  label?: string;
  required?: boolean;
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  multiSelect?: boolean;
  values?: string[];
  onMultiChange?: (values: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  allowOther?: boolean;
  otherOptionLabel?: string;
  otherValue?: string;
  onOtherValueChange?: (val: string) => void;
  otherInputPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  helperText?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  id,
  label,
  required = false,
  options,
  value = "",
  onChange,
  multiSelect = false,
  values = [],
  onMultiChange,
  placeholder = "Select an option...",
  searchPlaceholder = "Search options...",
  allowOther = true,
  otherOptionLabel = "Other / Custom...",
  otherValue: controlledOtherValue,
  onOtherValueChange,
  otherInputPlaceholder = "Specify custom value...",
  disabled = false,
  className = "",
  helperText,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [internalOtherValue, setInternalOtherValue] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Check if current value is in standard options
  const isKnownOption = options.some((opt) => opt.value === value);
  const isOtherSelected = value === "OTHER" || (!isKnownOption && Boolean(value));

  const effectiveOtherValue = controlledOtherValue !== undefined 
    ? controlledOtherValue 
    : (!isKnownOption && value && value !== "OTHER" ? value : internalOtherValue);

  const handleOtherInputChange = (val: string) => {
    setInternalOtherValue(val);
    if (onOtherValueChange) {
      onOtherValueChange(val);
    }
  };

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return options;
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(q)) ||
        opt.value.toLowerCase().includes(q)
    );
  }, [options, searchQuery]);

  // Find active label for display in closed trigger
  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.value === value);
  }, [options, value]);

  const handleSelect = (val: string) => {
    if (multiSelect) {
      const next = values.includes(val) ? values.filter((v) => v !== val) : [...values, val];
      if (onMultiChange) onMultiChange(next);
    } else {
      if (onChange) onChange(val);
      setIsOpen(false);
    }
  };

  const handleQuickAddAsOther = () => {
    if (onChange) onChange("OTHER");
    handleOtherInputChange(searchQuery.trim());
    setIsOpen(false);
  };

  return (
    <div className={`space-y-1.5 ${className}`} ref={containerRef}>
      {label && (
        <div className="flex items-center justify-between">
          <label htmlFor={id} className="block font-semibold text-[#1F1F1F] text-xs">
            {label} {required && <span className="text-red-600">*</span>}
          </label>
          {isOtherSelected && !multiSelect && (
            <span className="text-[10px] font-medium text-[#5A81FA] bg-[#F2F4FF] px-1.5 py-0.5 rounded">
              Custom Value Active
            </span>
          )}
          {multiSelect && values.length > 0 && (
            <span className="text-[10px] font-medium text-[#5A81FA] bg-[#F2F4FF] px-1.5 py-0.5 rounded">
              {values.length} Selected
            </span>
          )}
        </div>
      )}

      {/* Main Select Trigger */}
      <div className="relative">
        <button
          type="button"
          id={id}
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className={`w-full p-2.5 bg-[#F8F9FD] border ${
            isOpen ? "border-[#5A81FA] ring-2 ring-[#5A81FA]/20" : "border-[#E2E6F0]"
          } rounded-xl text-[#1F1F1F] text-xs text-left flex items-center justify-between transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer hover:border-[#CBD5E1]`}
        >
          <div className="flex items-center gap-2 truncate pr-2">
            {multiSelect ? (
              values.length > 0 ? (
                <span className="truncate flex items-center gap-1.5">
                  <span className="font-semibold text-[#5A81FA]">{values.length} selected:</span>
                  <span className="text-[#1F1F1F] truncate">
                    {options
                      .filter((o) => values.includes(o.value))
                      .map((o) => o.label)
                      .join(", ")}
                  </span>
                </span>
              ) : (
                <span className="text-[#696E82]">{placeholder}</span>
              )
            ) : isOtherSelected ? (
              <span className="flex items-center gap-1.5 font-medium text-[#5A81FA]">
                <Edit3 className="w-3.5 h-3.5" />
                {effectiveOtherValue ? `Other: "${effectiveOtherValue}"` : "Other / Custom"}
              </span>
            ) : selectedOption ? (
              <span className="truncate flex items-center gap-1.5">
                {selectedOption.icon}
                <span className="font-medium text-[#1F1F1F]">{selectedOption.label}</span>
                {selectedOption.subLabel && (
                  <span className="text-[11px] text-[#696E82] truncate">({selectedOption.subLabel})</span>
                )}
                {selectedOption.badge && (
                  <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                    {selectedOption.badge}
                  </span>
                )}
              </span>
            ) : (
              <span className="text-[#696E82]">{placeholder}</span>
            )}
          </div>
          <ChevronDown
            className={`w-4 h-4 text-[#696E82] shrink-0 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-[#5A81FA]" : ""
            }`}
          />
        </button>

        {/* Floating Dropdown Popover */}
        {isOpen && (
          <div
            className="absolute left-0 top-full mt-1.5 w-full bg-white border border-[#E2E6F0] rounded-xl shadow-xl z-50 overflow-hidden text-xs animate-in fade-in-50 zoom-in-95 duration-100"
            role="listbox"
          >
            {/* Top Search Field (Pinned inside popover) */}
            <div className="p-2 border-b border-[#E2E6F0] bg-[#FAFBFD] sticky top-0 z-10 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-[#696E82] shrink-0 ml-1" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-transparent border-none text-xs text-[#1F1F1F] placeholder-[#696E82] focus:outline-none py-1"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setIsOpen(false);
                  }
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchQuery("");
                    searchInputRef.current?.focus();
                  }}
                  className="text-[#696E82] hover:text-[#1F1F1F] p-0.5 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Scrollable Options List */}
            <div className="max-h-56 overflow-y-auto divide-y divide-slate-50 p-1">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => {
                  const isSelected = multiSelect ? values.includes(opt.value) : opt.value === value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(opt.value)}
                      className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-[#F2F4FF] text-[#5A81FA] font-semibold"
                          : "text-[#1F1F1F] hover:bg-[#F8F9FD]"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate mr-2">
                        {opt.icon}
                        <div className="truncate">
                          <span className="block truncate">{opt.label}</span>
                          {opt.subLabel && (
                            <span className="block text-[11px] text-[#696E82] font-normal truncate">
                              {opt.subLabel}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {opt.badge && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                            {opt.badge}
                          </span>
                        )}
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#5A81FA]" />}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="px-3 py-3 text-center text-[#696E82] space-y-2">
                  <p className="text-xs">No options matching &ldquo;{searchQuery}&rdquo;</p>
                  {allowOther && searchQuery.trim() && (
                    <button
                      type="button"
                      onClick={handleQuickAddAsOther}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#F2F4FF] text-[#5A81FA] font-medium rounded-md hover:bg-[#E5EAFF] cursor-pointer text-[11px]"
                    >
                      <PlusCircle className="w-3 h-3" />
                      Use &ldquo;{searchQuery.trim()}&rdquo; as custom
                    </button>
                  )}
                </div>
              )}

              {/* Dedicated "OTHER" Option at bottom */}
              {allowOther && (
                <div className="pt-1 mt-1 border-t border-[#E2E6F0]">
                  <button
                    type="button"
                    role="option"
                    aria-selected={isOtherSelected}
                    onClick={() => handleSelect("OTHER")}
                    className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                      isOtherSelected
                        ? "bg-[#F2F4FF] text-[#5A81FA] font-semibold"
                        : "text-slate-700 hover:bg-[#F8F9FD] font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <PlusCircle className="w-3.5 h-3.5 text-[#5A81FA]" />
                      <span>{otherOptionLabel}</span>
                    </div>
                    {isOtherSelected && <Check className="w-3.5 h-3.5 text-[#5A81FA]" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Inline Custom Input when "OTHER" is selected */}
      {isOtherSelected && allowOther && (
        <div className="mt-1.5 space-y-1 animate-in fade-in-50 slide-in-from-top-1 duration-150">
          <div className="relative">
            <input
              type="text"
              required={required}
              value={effectiveOtherValue}
              onChange={(e) => handleOtherInputChange(e.target.value)}
              placeholder={otherInputPlaceholder}
              className="w-full pl-8 pr-3 py-2 bg-white border border-[#5A81FA] rounded-xl text-xs text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]/20 placeholder-[#696E82]"
            />
            <Edit3 className="w-3.5 h-3.5 text-[#5A81FA] absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
          <p className="text-[10px] text-[#696E82] pl-1">
            Specify your custom value above. It will be recorded with this deliverable.
          </p>
        </div>
      )}

      {helperText && !isOtherSelected && (
        <p className="text-[10px] text-[#696E82] pl-0.5">{helperText}</p>
      )}
    </div>
  );
};
