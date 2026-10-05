"use client";

import React from "react";
import { CustomFieldDefinition } from "@/server/modules/custom-fields/repository";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Sparkles, Calendar, Hash, Type, ListFilter, ToggleLeft, FileText, Link as LinkIcon } from "lucide-react";

interface DynamicFormFieldsProps {
  fields: CustomFieldDefinition[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  disabled?: boolean;
}

export function DynamicFormFields({
  fields,
  values,
  onChange,
  disabled = false,
}: DynamicFormFieldsProps) {
  if (!fields || fields.length === 0) return null;

  // Group fields by category if available
  const categories = Array.from(new Set(fields.map((f) => f.category || "Additional Studio Attributes")));

  return (
    <div className="space-y-4 pt-3 border-t border-[#E2E6F0]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#5A81FA] uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Configured Studio Attributes ({fields.length})</span>
        </div>
        <span className="text-[10px] text-slate-400 font-medium">Dynamic Custom Fields</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
        {fields.map((field) => {
          const val = values[field.key] !== undefined ? values[field.key] : "";

          switch (field.type) {
            case "select":
              return (
                <div key={field.id}>
                  <SearchableSelect
                    id={field.id}
                    label={field.label}
                    required={field.required}
                    disabled={disabled}
                    value={val}
                    onChange={(newVal) => onChange(field.key, newVal)}
                    placeholder={field.placeholder || `Select ${field.label}...`}
                    searchPlaceholder={`Search ${field.label}...`}
                    allowOther={true}
                    options={(field.options || []).map((opt) => ({
                      value: opt,
                      label: opt,
                    }))}
                  />
                </div>
              );

            case "boolean":
              return (
                <div key={field.id} className="flex items-center justify-between p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl self-end">
                  <span className="font-bold text-slate-700">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={disabled}
                      checked={Boolean(val)}
                      onChange={(e) => onChange(field.key, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#5A81FA]"></div>
                  </label>
                </div>
              );

            case "textarea":
              return (
                <div key={field.id} className="col-span-full space-y-1">
                  <label className="block font-bold text-slate-700">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  <textarea
                    rows={2}
                    disabled={disabled}
                    required={field.required}
                    value={val}
                    onChange={(e) => onChange(field.key, e.target.value)}
                    placeholder={field.placeholder || `Enter ${field.label}...`}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5A81FA] disabled:opacity-60"
                  />
                </div>
              );

            case "date":
              return (
                <div key={field.id} className="space-y-1">
                  <label className="block font-bold text-slate-700">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="date"
                    disabled={disabled}
                    required={field.required}
                    value={val ? String(val).split("T")[0] : ""}
                    onChange={(e) => onChange(field.key, e.target.value)}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5A81FA] disabled:opacity-60"
                  />
                </div>
              );

            case "number":
              return (
                <div key={field.id} className="space-y-1">
                  <label className="block font-bold text-slate-700">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="number"
                    step="any"
                    disabled={disabled}
                    required={field.required}
                    value={val}
                    placeholder={field.placeholder || "0"}
                    onChange={(e) => onChange(field.key, e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5A81FA] disabled:opacity-60"
                  />
                </div>
              );

            case "url":
              return (
                <div key={field.id} className="space-y-1">
                  <label className="block font-bold text-slate-700">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="url"
                    disabled={disabled}
                    required={field.required}
                    value={val}
                    placeholder={field.placeholder || "https://..."}
                    onChange={(e) => onChange(field.key, e.target.value)}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5A81FA] disabled:opacity-60"
                  />
                </div>
              );

            case "text":
            default:
              return (
                <div key={field.id} className="space-y-1">
                  <label className="block font-bold text-slate-700">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    disabled={disabled}
                    required={field.required}
                    value={val}
                    placeholder={field.placeholder || `Enter ${field.label}...`}
                    onChange={(e) => onChange(field.key, e.target.value)}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5A81FA] disabled:opacity-60"
                  />
                </div>
              );
          }
        })}
      </div>
    </div>
  );
}
