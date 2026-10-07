"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Search,
  ChevronDown,
  Check,
  X,
  Users,
  FolderKanban,
  Building2,
  HardHat,
  Compass,
  Briefcase,
  Layers,
  MapPin,
  Clock,
  AlertCircle,
  PlusCircle,
  Edit3,
  Loader2,
  RefreshCw,
  Minus,
  CheckSquare,
} from "lucide-react";
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

/* ==========================================================================
   DROPDOWN OPTION INTERFACE
   ========================================================================== */
export type OptionCategory =
  | "employee"
  | "project"
  | "client"
  | "contractor"
  | "consultant"
  | "department"
  | "designation"
  | "status"
  | "priority"
  | "phase"
  | "location"
  | "default"
  | "other";

export interface DropdownOption {
  value: string;
  label: string;
  subLabel?: string;
  badge?: string;
  icon?: React.ReactNode;
  avatarUrl?: string;
  avatarText?: string;
  employeeId?: string;
  projectCode?: string;
  department?: string;
  email?: string;
  category?: OptionCategory;
  disabled?: boolean;
}

// Backward-compatible alias
export type SelectOption = DropdownOption;

/* ==========================================================================
   COMPONENT PROPS INTERFACE
   ========================================================================== */
export interface SearchableDropdownProps {
  id?: string;
  name?: string;
  label?: string;
  required?: boolean;
  options: DropdownOption[];
  value?: string;
  values?: string[];
  onChange?: (value: string) => void;
  onMultiChange?: (values: string[]) => void;
  multiple?: boolean;
  multiSelect?: boolean; // alias for multiple
  searchable?: boolean; // default true
  clearable?: boolean; // default true
  disabled?: boolean;
  loading?: boolean;
  error?: string | boolean | null;
  onRetry?: () => void;
  placeholder?: string;
  searchPlaceholder?: string;
  optionType?: OptionCategory | "auto";
  size?: "sm" | "md" | "lg";
  className?: string;
  triggerClassName?: string;
  popoverClassName?: string;
  helperText?: string;
  allowOther?: boolean;
  otherOptionLabel?: string;
  otherValue?: string;
  onOtherValueChange?: (val: string) => void;
  otherInputPlaceholder?: string;
  selectAllLabel?: string;
  showSelectAll?: boolean;
  minWidth?: number | string;
  maxWidth?: number | string;
  align?: "left" | "right";
  renderOption?: (option: DropdownOption, isSelected: boolean) => React.ReactNode;
  renderTriggerValue?: (selected: DropdownOption | DropdownOption[] | null) => React.ReactNode;
}

// Backward-compatible props alias
export type SearchableSelectProps = SearchableDropdownProps;

/* ==========================================================================
   HELPER UTILITIES
   ========================================================================== */
function extractInitials(name: string): string {
  if (!name) return "??";
  const clean = name
    .replace(/\(.*?\)/g, "")
    .replace(/\[.*?\]/g, "")
    .replace(/—.*$/g, "")
    .replace(/[^a-zA-Z\s]/g, "")
    .trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return name.slice(0, 2).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function parseEmployeeInfo(opt: DropdownOption): {
  isEmployee: boolean;
  cleanName: string;
  empId?: string;
  designation?: string;
} {
  const isExplicit = opt.category === "employee";
  const hasEmpBadge = Boolean(opt.employeeId || (opt.badge && /^EMP/i.test(opt.badge)));
  const hasEmpInLabel = /\((EMP-[0-9a-zA-Z_-]+)\)/i.test(opt.label);
  const hasEmpInSub = opt.subLabel ? /\((EMP-[0-9a-zA-Z_-]+)\)/i.test(opt.subLabel) : false;

  if (!isExplicit && !hasEmpBadge && !hasEmpInLabel && !hasEmpInSub) {
    return { isEmployee: false, cleanName: opt.label };
  }

  let empId = opt.employeeId || (opt.badge && /^EMP/i.test(opt.badge) ? opt.badge : undefined);
  let cleanName = opt.label;

  const matchLabel = opt.label.match(/\((EMP-[0-9a-zA-Z_-]+)\)/i);
  if (matchLabel) {
    empId = empId || matchLabel[1];
    cleanName = opt.label.replace(/\(EMP-[0-9a-zA-Z_-]+\)/i, "").trim();
  }

  const matchSub = opt.subLabel?.match(/\((EMP-[0-9a-zA-Z_-]+)\)/i);
  if (matchSub) {
    empId = empId || matchSub[1];
  }

  // Clean trailing "— (You)" or role annotations if desired
  cleanName = cleanName.replace(/\s+—\s+\(You\)/i, " (You)").trim();

  let designation = opt.subLabel;
  if (designation && empId) {
    designation = designation.replace(/\(EMP-[0-9a-zA-Z_-]+\)/i, "").trim();
  }

  return {
    isEmployee: true,
    cleanName,
    empId,
    designation,
  };
}

/* ==========================================================================
   MAIN COMPONENT: SEARCHABLE DROPDOWN
   ========================================================================== */
export const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  id,
  name,
  label,
  required = false,
  options = [],
  value = "",
  values = [],
  onChange,
  onMultiChange,
  multiple,
  multiSelect,
  searchable = true,
  clearable = true,
  disabled = false,
  loading = false,
  error = null,
  onRetry,
  placeholder = "Select an option...",
  searchPlaceholder,
  optionType = "auto",
  size = "md",
  className = "",
  triggerClassName = "",
  popoverClassName = "",
  helperText,
  allowOther = false,
  otherOptionLabel = "+ Other / Custom...",
  otherValue: controlledOtherValue,
  onOtherValueChange,
  otherInputPlaceholder = "Specify custom value...",
  selectAllLabel,
  showSelectAll,
  minWidth,
  maxWidth,
  align = "left",
  renderOption,
  renderTriggerValue,
}) => {
  const isMulti = Boolean(multiple ?? multiSelect);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [internalOtherValue, setInternalOtherValue] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Determine whether "OTHER" is active
  const isKnownOption = options.some((opt) => opt.value === value);
  const isOtherSelected =
    !isMulti && (value === "OTHER" || (!isKnownOption && Boolean(value)));

  const effectiveOtherValue =
    controlledOtherValue !== undefined
      ? controlledOtherValue
      : !isKnownOption && value && value !== "OTHER"
      ? value
      : internalOtherValue;

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

  // Focus search input when popover opens
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(-1);
      if (searchable) {
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 30);
      }
    } else {
      setSearchQuery("");
    }
  }, [isOpen, searchable]);

  // Filter options
  const filteredOptions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return options;

    return options.filter((opt) => {
      const matchLabel = opt.label.toLowerCase().includes(q);
      const matchSub = opt.subLabel ? opt.subLabel.toLowerCase().includes(q) : false;
      const matchVal = opt.value.toLowerCase().includes(q);
      const matchBadge = opt.badge ? opt.badge.toLowerCase().includes(q) : false;
      const matchEmp = opt.employeeId ? opt.employeeId.toLowerCase().includes(q) : false;
      const matchProj = opt.projectCode ? opt.projectCode.toLowerCase().includes(q) : false;
      const matchEmail = opt.email ? opt.email.toLowerCase().includes(q) : false;
      const matchDept = opt.department ? opt.department.toLowerCase().includes(q) : false;

      return (
        matchLabel ||
        matchSub ||
        matchVal ||
        matchBadge ||
        matchEmp ||
        matchProj ||
        matchEmail ||
        matchDept
      );
    });
  }, [options, searchQuery]);

  // Selected Option(s) resolution
  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.value === value) || null;
  }, [options, value]);

  const selectedOptions = useMemo(() => {
    if (!isMulti) return [];
    return options.filter((opt) => values.includes(opt.value));
  }, [options, values, isMulti]);

  // Multi-select select-all state
  const isAllSelected = useMemo(() => {
    if (!isMulti || filteredOptions.length === 0) return false;
    return filteredOptions.every((opt) => values.includes(opt.value));
  }, [isMulti, filteredOptions, values]);

  const isSomeSelected = useMemo(() => {
    if (!isMulti || isAllSelected || filteredOptions.length === 0) return false;
    return filteredOptions.some((opt) => values.includes(opt.value));
  }, [isMulti, isAllSelected, filteredOptions, values]);

  // Handlers
  const handleSelect = useCallback(
    (val: string) => {
      if (isMulti) {
        const next = values.includes(val)
          ? values.filter((v) => v !== val)
          : [...values, val];
        if (onMultiChange) onMultiChange(next);
      } else {
        if (onChange) onChange(val);
        setIsOpen(false);
      }
    },
    [isMulti, values, onMultiChange, onChange]
  );

  const handleToggleSelectAll = useCallback(() => {
    if (!isMulti) return;
    if (isAllSelected) {
      // Deselect filtered options
      const filteredVals = new Set(filteredOptions.map((o) => o.value));
      const next = values.filter((v) => !filteredVals.has(v));
      if (onMultiChange) onMultiChange(next);
    } else {
      // Select all filtered options
      const combined = new Set([...values, ...filteredOptions.map((o) => o.value)]);
      if (onMultiChange) onMultiChange(Array.from(combined));
    }
  }, [isMulti, isAllSelected, filteredOptions, values, onMultiChange]);

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isMulti) {
        if (onMultiChange) onMultiChange([]);
      } else {
        if (onChange) onChange("");
      }
    },
    [isMulti, onMultiChange, onChange]
  );

  const handleQuickAddAsOther = useCallback(() => {
    if (onChange) onChange("OTHER");
    handleOtherInputChange(searchQuery.trim());
    setIsOpen(false);
  }, [onChange, searchQuery]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredOptions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredOptions.length - 1
      );
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      const target = filteredOptions[highlightedIndex];
      if (target && !target.disabled) {
        handleSelect(target.value);
      }
    } else if (e.key === "Home") {
      e.preventDefault();
      setHighlightedIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setHighlightedIndex(filteredOptions.length - 1);
    }
  };

  // Dynamic search placeholder
  const effectiveSearchPlaceholder = useMemo(() => {
    if (searchPlaceholder) return searchPlaceholder;
    if (optionType === "employee") return "Search employees by name or ID...";
    if (optionType === "project") return "Search projects by code or title...";
    if (optionType === "client") return "Search clients...";
    if (optionType === "contractor") return "Search contractors...";
    if (optionType === "consultant") return "Search consultants...";
    return "Search options...";
  }, [searchPlaceholder, optionType]);

  // Contextual icon / avatar rendering for options
  const renderOptionContent = (opt: DropdownOption, isSelected: boolean) => {
    if (renderOption) {
      return renderOption(opt, isSelected);
    }

    // 1. Employee Option (Matches Reference Image)
    const empInfo = parseEmployeeInfo(opt);
    if (empInfo.isEmployee || optionType === "employee" || opt.category === "employee") {
      const initials = opt.avatarText || extractInitials(empInfo.cleanName);
      return (
        <div className="flex items-center gap-2.5 min-w-0">
          {opt.avatarUrl ? (
            <img
              src={opt.avatarUrl}
              alt={empInfo.cleanName}
              className="w-8 h-8 rounded-full object-cover shrink-0 shadow-2xs border border-[#DFE5F2]"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#E8ECE5] text-[#334155] font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
              {initials}
            </div>
          )}
          <div className="min-w-0 flex flex-col">
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-semibold text-[#111B35] text-xs truncate">
                {empInfo.cleanName}
              </span>
              {empInfo.empId && (
                <span className="text-[11px] font-mono font-medium text-[#52617C] shrink-0">
                  ({empInfo.empId})
                </span>
              )}
            </div>
            {empInfo.designation && (
              <span className="text-[11px] text-[#7A869E] truncate leading-tight">
                {empInfo.designation}
              </span>
            )}
          </div>
        </div>
      );
    }

    // 2. Project Option
    if (optionType === "project" || opt.category === "project" || opt.projectCode) {
      return (
        <div className="flex items-center gap-2.5 min-w-0">
          {opt.icon || (
            <div className="w-7 h-7 rounded-lg bg-[#F1F4FF] text-[#5878FF] flex items-center justify-center shrink-0 border border-[#CEDEFF]">
              <FolderKanban className="w-3.5 h-3.5" />
            </div>
          )}
          <div className="min-w-0 flex flex-col">
            <div className="flex items-center gap-1.5 truncate">
              {opt.projectCode && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#F1F4FF] text-[#5878FF] border border-[#CEDEFF] shrink-0">
                  {opt.projectCode}
                </span>
              )}
              <span className="font-semibold text-[#111B35] text-xs truncate">
                {opt.label}
              </span>
            </div>
            {opt.subLabel && (
              <span className="text-[11px] text-[#7A869E] truncate leading-tight">
                {opt.subLabel}
              </span>
            )}
          </div>
        </div>
      );
    }

    // 3. Client Option
    if (optionType === "client" || opt.category === "client") {
      return (
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-full bg-[#F1F4FF] text-[#5878FF] flex items-center justify-center shrink-0 border border-[#CEDEFF]">
            <Building2 className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0 flex flex-col">
            <span className="font-semibold text-[#111B35] text-xs truncate">
              {opt.label}
            </span>
            {opt.subLabel && (
              <span className="text-[11px] text-[#7A869E] truncate leading-tight">
                {opt.subLabel}
              </span>
            )}
          </div>
        </div>
      );
    }

    // 4. Contractor Option
    if (optionType === "contractor" || opt.category === "contractor") {
      return (
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
            <HardHat className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0 flex flex-col">
            <span className="font-semibold text-[#111B35] text-xs truncate">
              {opt.label}
            </span>
            {opt.subLabel && (
              <span className="text-[11px] text-[#7A869E] truncate leading-tight">
                {opt.subLabel}
              </span>
            )}
          </div>
        </div>
      );
    }

    // 5. Consultant Option
    if (optionType === "consultant" || opt.category === "consultant") {
      return (
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 border border-purple-200">
            <Compass className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0 flex flex-col">
            <span className="font-semibold text-[#111B35] text-xs truncate">
              {opt.label}
            </span>
            {opt.subLabel && (
              <span className="text-[11px] text-[#7A869E] truncate leading-tight">
                {opt.subLabel}
              </span>
            )}
          </div>
        </div>
      );
    }

    // 6. Department Option
    if (optionType === "department" || opt.category === "department") {
      return (
        <div className="flex items-center gap-2 min-w-0">
          <Briefcase className="w-3.5 h-3.5 text-[#5878FF] shrink-0" />
          <span className="font-semibold text-[#111B35] text-xs truncate">
            {opt.label}
          </span>
        </div>
      );
    }

    // 7. Phase Option
    if (optionType === "phase" || opt.category === "phase") {
      return (
        <div className="flex items-center gap-2 min-w-0">
          <Layers className="w-3.5 h-3.5 text-[#5878FF] shrink-0" />
          <span className="font-semibold text-[#111B35] text-xs truncate">
            {opt.label}
          </span>
          {opt.subLabel && (
            <span className="text-[11px] text-[#7A869E] truncate">({opt.subLabel})</span>
          )}
        </div>
      );
    }

    // 8. Location Option
    if (optionType === "location" || opt.category === "location") {
      return (
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
          <span className="font-semibold text-[#111B35] text-xs truncate">
            {opt.label}
          </span>
        </div>
      );
    }

    // Default Fallback Option
    return (
      <div className="flex items-center gap-2 min-w-0">
        {opt.icon}
        <div className="min-w-0 flex flex-col">
          <span className="font-semibold text-[#111B35] text-xs truncate">
            {opt.label}
          </span>
          {opt.subLabel && (
            <span className="text-[11px] text-[#7A869E] truncate leading-tight">
              {opt.subLabel}
            </span>
          )}
        </div>
      </div>
    );
  };

  // Size styling classes for the trigger
  const triggerSizeClasses = {
    sm: "py-1.5 px-2.5 text-xs rounded-lg min-h-[34px]",
    md: "py-2.5 px-3 text-xs rounded-xl min-h-[42px]",
    lg: "py-3 px-3.5 text-sm rounded-xl min-h-[48px]",
  }[size];

  return (
    <div
      className={`space-y-1.5 relative ${className}`}
      ref={containerRef}
      onKeyDown={handleKeyDown}
    >
      {/* Optional Form Field Label */}
      {label && (
        <div className="flex items-center justify-between">
          <label htmlFor={id} className="block font-semibold text-[#111B35] text-xs">
            {label} {required && <span className="text-rose-600">*</span>}
          </label>
          {isOtherSelected && !isMulti && (
            <span className="text-[10px] font-semibold text-[#5878FF] bg-[#F1F4FF] px-2 py-0.5 rounded-md border border-[#CEDEFF]">
              Custom Value Active
            </span>
          )}
          {isMulti && values.length > 0 && (
            <span className="text-[10px] font-semibold text-[#5878FF] bg-[#F1F4FF] px-2 py-0.5 rounded-md border border-[#CEDEFF]">
              {values.length} Selected
            </span>
          )}
        </div>
      )}

      {/* Main Dropdown Trigger */}
      <div className="relative">
        <button
          type="button"
          id={id}
          name={name}
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-disabled={disabled}
          className={`w-full bg-white border ${
            error
              ? "border-rose-400 ring-2 ring-rose-400/20"
              : isOpen
              ? "border-[#5878FF] ring-2 ring-[#5878FF]/20"
              : "border-[#DFE5F2] hover:border-[#5878FF]/60"
          } ${triggerSizeClasses} text-[#111B35] text-left flex items-center justify-between transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-2xs ${triggerClassName}`}
        >
          <div className="flex items-center gap-2 truncate pr-2 flex-1 min-w-0">
            {renderTriggerValue ? (
              renderTriggerValue(isMulti ? selectedOptions : selectedOption)
            ) : isMulti ? (
              values.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                  {selectedOptions.slice(0, 2).map((opt) => (
                    <span
                      key={opt.value}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F1F4FF] text-[#5878FF] font-semibold text-[11px] border border-[#CEDEFF] max-w-[130px] truncate"
                    >
                      <span className="truncate">{opt.label}</span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(opt.value);
                        }}
                        className="hover:text-rose-600 cursor-pointer p-0.5"
                      >
                        <X className="w-2.5 h-2.5" />
                      </span>
                    </span>
                  ))}
                  {selectedOptions.length > 2 && (
                    <span className="text-[11px] font-semibold text-[#52617C] bg-[#EEF2EA] px-1.5 py-0.5 rounded-md">
                      +{selectedOptions.length - 2} more
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-[#7A869E]">{placeholder}</span>
              )
            ) : isOtherSelected ? (
              <span className="flex items-center gap-1.5 font-semibold text-[#5878FF]">
                <Edit3 className="w-3.5 h-3.5" />
                <span className="truncate">
                  {effectiveOtherValue ? `Other: "${effectiveOtherValue}"` : "Other / Custom"}
                </span>
              </span>
            ) : selectedOption ? (
              <div className="flex items-center gap-2 truncate">
                {(() => {
                  const empInfo = parseEmployeeInfo(selectedOption);
                  if (empInfo.isEmployee || optionType === "employee") {
                    const initials = selectedOption.avatarText || extractInitials(empInfo.cleanName);
                    return (
                      <div className="w-5 h-5 rounded-full bg-[#E8ECE5] text-[#334155] font-bold text-[10px] flex items-center justify-center shrink-0">
                        {initials}
                      </div>
                    );
                  }
                  return selectedOption.icon;
                })()}
                <span className="font-semibold text-[#111B35] truncate text-xs">
                  {selectedOption.label}
                </span>
                {selectedOption.badge && (
                  <span className="text-[10px] bg-[#F1F4FF] text-[#5878FF] px-1.5 py-0.5 rounded font-mono font-bold shrink-0 border border-[#CEDEFF]">
                    {selectedOption.badge}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-[#7A869E]">{placeholder}</span>
            )}
          </div>

          {/* Right Action Icons: Clear & Chevron */}
          <div className="flex items-center gap-1 shrink-0 ml-1">
            {clearable && !disabled && (isMulti ? values.length > 0 : Boolean(value)) && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                title="Clear selection"
                className="p-1 text-[#7A869E] hover:text-[#111B35] hover:bg-[#F1F4FF] rounded-md cursor-pointer transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            )}
            <ChevronDown
              className={`w-4 h-4 text-[#7A869E] transition-transform duration-200 ${
                isOpen ? "rotate-180 text-[#5878FF]" : ""
              }`}
            />
          </div>
        </button>

        {/* Floating White Popover Panel (16px corners, soft shadow, thin border) */}
        {isOpen && (
          <div
            className={`absolute ${
              align === "right" ? "right-0" : "left-0"
            } top-full mt-1.5 w-full bg-white border border-[#DFE5F2] rounded-2xl shadow-[0_12px_32px_-4px_rgba(17,27,53,0.12),0_4px_12px_-2px_rgba(17,27,53,0.06)] z-50 overflow-hidden text-xs animate-in fade-in-50 zoom-in-95 duration-150 p-2 ${popoverClassName}`}
            style={{
              minWidth: minWidth ?? "260px",
              maxWidth: maxWidth,
            }}
            role="listbox"
          >
            {/* Fixed Search Field at Top (Pill shape, blue focus border, clear button) */}
            {searchable && (
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 text-[#7A869E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={effectiveSearchPlaceholder}
                  className="w-full pl-8 pr-7 py-2 bg-[#F7F8FD] border border-[#DFE5F2] focus:border-[#5878FF] focus:bg-white rounded-full text-xs text-[#111B35] placeholder-[#7A869E] focus:outline-none transition-all shadow-2xs"
                  onClick={(e) => e.stopPropagation()}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchQuery("");
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7A869E] hover:text-[#111B35] p-0.5 rounded cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {/* Multi-Select "All" Row */}
            {isMulti && (showSelectAll !== false) && filteredOptions.length > 0 && (
              <div className="pb-1 mb-1 border-b border-[#DFE5F2]">
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className={`w-full text-left px-2.5 py-2 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                    isAllSelected
                      ? "bg-[#EEF2EA] text-[#111B35] font-semibold"
                      : isSomeSelected
                      ? "bg-[#F1F4FF] text-[#5878FF] font-semibold"
                      : "text-[#111B35] hover:bg-[#F1F4FF]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {optionType === "employee" ? (
                      <div className="w-8 h-8 rounded-full bg-[#E8ECE5] text-[#334155] font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                        <Users className="w-4 h-4 text-[#5878FF]" />
                      </div>
                    ) : optionType === "project" ? (
                      <div className="w-7 h-7 rounded-lg bg-[#F1F4FF] text-[#5878FF] flex items-center justify-center shrink-0 border border-[#CEDEFF]">
                        <FolderKanban className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <CheckSquare className="w-4 h-4 text-[#5878FF]" />
                    )}
                    <span className="font-semibold text-xs">
                      {selectAllLabel ||
                        (optionType === "employee"
                          ? "All employees"
                          : optionType === "project"
                          ? "All projects"
                          : "Select All")}
                    </span>
                  </div>
                  {isAllSelected ? (
                    <Check className="w-4 h-4 text-[#5878FF] stroke-[2.5]" />
                  ) : isSomeSelected ? (
                    <Minus className="w-4 h-4 text-[#5878FF] stroke-[2.5]" />
                  ) : null}
                </button>
              </div>
            )}

            {/* Scrollable Option List */}
            <div
              ref={listRef}
              className="max-h-[260px] overflow-y-auto space-y-1 pr-1"
            >
              {loading ? (
                <div className="p-4 text-center text-[#7A869E] flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#5878FF]" />
                  <span>Loading options...</span>
                </div>
              ) : error ? (
                <div className="p-3 text-center space-y-2">
                  <div className="flex items-center justify-center gap-1.5 text-rose-600 text-xs font-semibold">
                    <AlertCircle className="w-4 h-4" />
                    <span>Unable to load options</span>
                  </div>
                  {onRetry && (
                    <button
                      type="button"
                      onClick={onRetry}
                      className="px-3 py-1 bg-[#F1F4FF] text-[#5878FF] hover:bg-[#E2E8FF] rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 mx-auto cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Retry</span>
                    </button>
                  )}
                </div>
              ) : filteredOptions.length > 0 ? (
                filteredOptions.map((opt, index) => {
                  const isSelected = isMulti
                    ? values.includes(opt.value)
                    : opt.value === value;
                  const isHighlighted = highlightedIndex === index;

                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={opt.disabled}
                      onClick={() => !opt.disabled && handleSelect(opt.value)}
                      className={`w-full text-left px-2.5 py-2 rounded-xl flex items-center justify-between transition-colors cursor-pointer min-h-[44px] ${
                        isSelected
                          ? "bg-[#EEF2EA] text-[#111B35]"
                          : isHighlighted
                          ? "bg-[#F1F4FF] text-[#111B35]"
                          : "text-[#111B35] hover:bg-[#F1F4FF]"
                      } ${opt.disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                    >
                      {/* Left Option Content */}
                      <div className="flex-1 min-w-0 pr-2">
                        {renderOptionContent(opt, isSelected)}
                      </div>

                      {/* Right Check Icon (Blue check matching reference) */}
                      <div className="shrink-0 flex items-center gap-1.5 ml-1">
                        {opt.badge && !opt.employeeId && (
                          <span className="text-[10px] bg-[#F1F4FF] text-[#5878FF] px-1.5 py-0.5 rounded font-mono font-bold border border-[#CEDEFF]">
                            {opt.badge}
                          </span>
                        )}
                        {isSelected && (
                          <Check className="w-4 h-4 text-[#5878FF] stroke-[2.5]" />
                        )}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="px-3 py-4 text-center text-[#7A869E] space-y-2">
                  <p className="text-xs">
                    No options found {searchQuery ? `matching "${searchQuery}"` : ""}
                  </p>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="text-xs font-semibold text-[#5878FF] hover:underline cursor-pointer block mx-auto"
                    >
                      Clear search
                    </button>
                  )}
                  {allowOther && searchQuery.trim() && (
                    <button
                      type="button"
                      onClick={handleQuickAddAsOther}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#F1F4FF] text-[#5878FF] font-semibold rounded-lg hover:bg-[#E2E8FF] cursor-pointer text-xs mt-2 border border-[#CEDEFF]"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Use &ldquo;{searchQuery.trim()}&rdquo; as custom</span>
                    </button>
                  )}
                </div>
              )}

              {/* Dedicated "OTHER" Option at bottom */}
              {allowOther && !isMulti && (
                <div className="pt-1 mt-1 border-t border-[#DFE5F2]">
                  <button
                    type="button"
                    role="option"
                    aria-selected={isOtherSelected}
                    onClick={() => handleSelect("OTHER")}
                    className={`w-full text-left px-2.5 py-2 rounded-xl flex items-center justify-between transition-colors cursor-pointer min-h-[44px] ${
                      isOtherSelected
                        ? "bg-[#EEF2EA] text-[#111B35] font-semibold"
                        : "text-[#52617C] hover:bg-[#F1F4FF] font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <PlusCircle className="w-4 h-4 text-[#5878FF]" />
                      <span className="text-xs font-semibold">{otherOptionLabel}</span>
                    </div>
                    {isOtherSelected && (
                      <Check className="w-4 h-4 text-[#5878FF] stroke-[2.5]" />
                    )}
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
              className="w-full pl-8 pr-3 py-2 bg-white border border-[#5878FF] rounded-xl text-xs text-[#111B35] focus:outline-none focus:ring-2 focus:ring-[#5878FF]/20 placeholder-[#7A869E]"
            />
            <Edit3 className="w-3.5 h-3.5 text-[#5878FF] absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
          <p className="text-[10px] text-[#7A869E] pl-1">
            Specify custom value above. It will be recorded with this record.
          </p>
        </div>
      )}

      {/* Optional Helper text */}
      {helperText && !isOtherSelected && (
        <p className="text-[10px] text-[#7A869E] pl-0.5">{helperText}</p>
      )}

      {/* Field Error Message */}
      {typeof error === "string" && error && (
        <div className="flex items-center gap-1 text-[11px] text-rose-600 pl-0.5 font-medium">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

// Aliases for full backward compatibility
export const SearchableSelect = SearchableDropdown;

// Default export for maximum compatibility
export default SearchableDropdown;
