"use client";

import React from "react";
import { CustomFieldDefinition } from "@/server/modules/custom-fields/repository";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Sparkles, Calendar, Hash, Type, ListFilter, ToggleLeft, FileText, Link as LinkIcon } from "lucide-react";
import { useFormFieldAdmin } from "@/components/ui/FormFieldAdminContext";
import { AdminFieldActions } from "@/components/ui/AdminFieldActions";

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
  const { getFieldConfig, isFieldHidden } = useFormFieldAdmin();

  if (!fields || fields.length === 0) return null;

  // Filter out any fields hidden by Admin
  const visibleFields = fields.filter((f) => !isFieldHidden(f.entity || "PROJECT", f.key));

  if (visibleFields.length === 0) return null;

  return (
    <div className="space-y-4 pt-3 border-t border-[#E2E6F0]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#5A81FA] uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Configured Studio Attributes ({visibleFields.length})</span>
        </div>
        <span className="text-[10px] text-slate-400 font-medium">Dynamic Custom Fields</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
        {visibleFields.map((field) => {
          const formId = field.entity || "PROJECT";
          const customConfig = getFieldConfig(formId, field.key);
          const effectiveLabel = customConfig?.label ?? field.label;
          const effectivePlaceholder = customConfig?.placeholder ?? field.placeholder;
          const effectiveRequired = customConfig?.required !== undefined ? customConfig.required : field.required;
          const val = values[field.key] !== undefined ? values[field.key] : "";

          const adminActions = (
            <AdminFieldActions
              formId={formId}
              fieldKey={field.key}
              label={effectiveLabel}
              placeholder={effectivePlaceholder}
              required={effectiveRequired}
              isCustomField={true}
            />
          );

          switch (field.type) {
            case "select":
              return (
                <div key={field.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="font-bold text-slate-700">
                        {effectiveLabel} {effectiveRequired && <span className="text-red-500">*</span>}
                      </span>
                      {adminActions}
                    </div>
                  </div>
                  <SearchableSelect
                    id={field.id}
                    required={effectiveRequired}
                    disabled={disabled}
                    value={val}
                    onChange={(newVal) => onChange(field.key, newVal)}
                    placeholder={effectivePlaceholder || `Select ${effectiveLabel}...`}
                    searchPlaceholder={`Search ${effectiveLabel}...`}
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
                  <div className="flex items-center">
                    <span className="font-bold text-slate-700">
                      {effectiveLabel} {effectiveRequired && <span className="text-red-500">*</span>}
                    </span>
                    {adminActions}
                  </div>
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <label className="block font-bold text-slate-700">
                        {effectiveLabel} {effectiveRequired && <span className="text-red-500">*</span>}
                      </label>
                      {adminActions}
                    </div>
                  </div>
                  <textarea
                    rows={2}
                    disabled={disabled}
                    required={effectiveRequired}
                    value={val}
                    onChange={(e) => onChange(field.key, e.target.value)}
                    placeholder={effectivePlaceholder || `Enter ${effectiveLabel}...`}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5A81FA] disabled:opacity-60"
                  />
                </div>
              );

            case "date":
              return (
                <div key={field.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <label className="block font-bold text-slate-700">
                        {effectiveLabel} {effectiveRequired && <span className="text-red-500">*</span>}
                      </label>
                      {adminActions}
                    </div>
                  </div>
                  <input
                    type="date"
                    disabled={disabled}
                    required={effectiveRequired}
                    value={val ? String(val).split("T")[0] : ""}
                    onChange={(e) => onChange(field.key, e.target.value)}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5A81FA] disabled:opacity-60"
                  />
                </div>
              );

            case "number":
              return (
                <div key={field.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <label className="block font-bold text-slate-700">
                        {effectiveLabel} {effectiveRequired && <span className="text-red-500">*</span>}
                      </label>
                      {adminActions}
                    </div>
                  </div>
                  <input
                    type="number"
                    step="any"
                    disabled={disabled}
                    required={effectiveRequired}
                    value={val}
                    placeholder={effectivePlaceholder || "0"}
                    onChange={(e) => onChange(field.key, e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5A81FA] disabled:opacity-60"
                  />
                </div>
              );

            case "url":
              return (
                <div key={field.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <label className="block font-bold text-slate-700">
                        {effectiveLabel} {effectiveRequired && <span className="text-red-500">*</span>}
                      </label>
                      {adminActions}
                    </div>
                  </div>
                  <input
                    type="url"
                    disabled={disabled}
                    required={effectiveRequired}
                    value={val}
                    placeholder={effectivePlaceholder || "https://..."}
                    onChange={(e) => onChange(field.key, e.target.value)}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5A81FA] disabled:opacity-60"
                  />
                </div>
              );

            case "text":
            default:
              return (
                <div key={field.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <label className="block font-bold text-slate-700">
                        {effectiveLabel} {effectiveRequired && <span className="text-red-500">*</span>}
                      </label>
                      {adminActions}
                    </div>
                  </div>
                  <input
                    type="text"
                    disabled={disabled}
                    required={effectiveRequired}
                    value={val}
                    placeholder={effectivePlaceholder || `Enter ${effectiveLabel}...`}
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
