"use client";

import React from "react";
import { Edit2, Trash2, Eye, SlidersHorizontal } from "lucide-react";
import { useFormFieldAdmin } from "./FormFieldAdminContext";

export interface AdminFieldActionsProps {
  formId: string;
  fieldKey: string;
  label: string;
  placeholder?: string;
  helperText?: string;
  required?: boolean;
  isCustomField?: boolean;
  className?: string;
}

export function AdminFieldActions({
  formId,
  fieldKey,
  label,
  placeholder,
  helperText,
  required,
  isCustomField = false,
  className = "",
}: AdminFieldActionsProps) {
  const { isAdmin, openEditField, openDeleteField } = useFormFieldAdmin();

  if (!isAdmin) return null;

  return (
    <div className={`inline-flex items-center gap-1 opacity-80 hover:opacity-100 transition-opacity shrink-0 ml-1.5 ${className}`}>
      {/* Edit Field Icon (Admin only) */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          openEditField({
            formId,
            fieldKey,
            currentLabel: label,
            currentPlaceholder: placeholder,
            currentHelperText: helperText,
            isRequired: required,
            isCustomField,
          });
        }}
        title={`Edit "${label}" settings (Admin)`}
        className="p-1 rounded-md text-slate-400 hover:text-[#5A81FA] hover:bg-[#5A81FA]/10 transition-colors cursor-pointer group"
      >
        <Edit2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
      </button>

      {/* Delete / Hide Field Icon (Admin only) */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          openDeleteField({
            formId,
            fieldKey,
            currentLabel: label,
            isCustomField,
          });
        }}
        title={`Remove "${label}" from form (Admin)`}
        className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer group"
      >
        <Trash2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
      </button>
    </div>
  );
}

/**
 * Top toolbar for Form Modals showing Admin Controls status and Restore button
 */
export function AdminFormHeaderToolbar({
  formId,
  className = "",
}: {
  formId: string;
  className?: string;
}) {
  const { isAdmin, configs, openRestoreModal } = useFormFieldAdmin();

  if (!isAdmin) return null;

  const hiddenCount = Object.values(configs).filter((c) => c.isHidden && c.formId === formId).length;

  return (
    <div className={`flex items-center justify-between px-3 py-1.5 bg-[#F2F4FF] border border-[#5A81FA]/20 rounded-xl text-[11px] font-medium text-slate-700 ${className}`}>
      <div className="flex items-center gap-1.5 text-[#5A81FA]">
        <SlidersHorizontal className="w-3.5 h-3.5" />
        <span className="font-semibold">Admin Form Field Controls Active</span>
      </div>
      {hiddenCount > 0 ? (
        <button
          type="button"
          onClick={() => openRestoreModal(formId)}
          className="px-2 py-0.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
        >
          <Eye className="w-3 h-3" />
          <span>Restore Removed Fields ({hiddenCount})</span>
        </button>
      ) : (
        <span className="text-[10px] text-slate-400 font-normal">Pencil / Trash on fields available to Admins</span>
      )}
    </div>
  );
}

/**
 * Universal wrapper for any form input field that provides:
 * 1. Automatic hiding if removed by Admin
 * 2. Automatic label and helperText override
 * 3. Edit (pencil) and Delete (trash) icons next to label
 */
export interface AdminFieldProps {
  formId: string;
  fieldKey: string;
  label?: string;
  placeholder?: string;
  helperText?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function AdminField({
  formId,
  fieldKey,
  label,
  placeholder,
  helperText,
  required,
  className = "",
  children,
}: AdminFieldProps) {
  const { getFieldConfig, isFieldHidden } = useFormFieldAdmin();

  if (isFieldHidden(formId, fieldKey)) {
    return null;
  }

  const customConfig = getFieldConfig(formId, fieldKey);
  const effectiveLabel = customConfig?.label ?? label;
  const effectiveHelper = customConfig?.helperText ?? helperText;
  const effectiveRequired = customConfig?.required !== undefined ? customConfig.required : required;

  return (
    <div className={`space-y-1 ${className}`}>
      {effectiveLabel && (
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center">
            <label className="text-xs font-semibold text-[#1F1F1F]">
              {effectiveLabel} {effectiveRequired && <span className="text-red-600">*</span>}
            </label>
            <AdminFieldActions
              formId={formId}
              fieldKey={fieldKey}
              label={effectiveLabel}
              placeholder={customConfig?.placeholder ?? placeholder}
              helperText={effectiveHelper}
              required={effectiveRequired}
            />
          </div>
        </div>
      )}
      {children}
      {effectiveHelper && (
        <p className="text-[10px] text-[#696E82] pl-0.5 leading-tight">{effectiveHelper}</p>
      )}
    </div>
  );
}

/**
 * Compact field label with Admin Edit & Delete action icons
 */
export function AdminFieldLabel({
  formId,
  fieldKey,
  label,
  required,
  placeholder,
  helperText,
  className = "",
}: {
  formId: string;
  fieldKey: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  helperText?: string;
  className?: string;
}) {
  const { getFieldConfig } = useFormFieldAdmin();
  const customConfig = getFieldConfig(formId, fieldKey);
  const effectiveLabel = customConfig?.label ?? label;
  const effectiveRequired = customConfig?.required !== undefined ? customConfig.required : required;

  return (
    <div className={`flex items-center ${className}`}>
      <span className="text-xs font-semibold text-[#1F1F1F]">
        {effectiveLabel} {effectiveRequired && <span className="text-red-600">*</span>}
      </span>
      <AdminFieldActions
        formId={formId}
        fieldKey={fieldKey}
        label={effectiveLabel}
        placeholder={customConfig?.placeholder ?? placeholder}
        helperText={customConfig?.helperText ?? helperText}
        required={effectiveRequired}
      />
    </div>
  );
}

