"use client";

import React from "react";
import { X, AlertCircle } from "lucide-react";

/* ==========================================================================
   1. FORM MODAL CONTAINER & HEADER
   ========================================================================== */
export interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  iconBgColor?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
  children: React.ReactNode;
}

export const FormModal: React.FC<FormModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  maxWidth = "xl",
  children,
}) => {
  if (!isOpen) return null;

  const maxWidthClass = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
  }[maxWidth];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div
        className={`bg-white border border-[#E2E6F0] rounded-2xl ${maxWidthClass} w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150`}
      >
        <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
          <div className="flex items-center gap-2.5">
            {icon && (
              <div className="w-8 h-8 rounded-lg bg-[#5A81FA] text-white flex items-center justify-center shrink-0 shadow-xs">
                {icon}
              </div>
            )}
            <div>
              <h3 className="text-base font-bold text-[#1F1F1F] leading-snug">{title}</h3>
              {subtitle && <p className="text-xs text-[#696E82] mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#696E82] hover:text-[#1F1F1F] p-1 rounded-lg hover:bg-[#F2F4FF] cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

/* ==========================================================================
   2. FORM FIELD WRAPPER
   ========================================================================== */
export interface FormFieldProps {
  label?: string;
  required?: boolean;
  htmlFor?: string;
  helperText?: string;
  error?: string | null;
  className?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required,
  htmlFor,
  helperText,
  error,
  className = "",
  action,
  children,
}) => {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label htmlFor={htmlFor} className="block font-semibold text-[#1F1F1F] text-xs">
            {label} {required && <span className="text-red-600">*</span>}
          </label>
          {action && <div className="text-[11px]">{action}</div>}
        </div>
      )}
      {children}
      {helperText && !error && (
        <p className="text-[10px] text-[#696E82] pl-0.5 leading-tight">{helperText}</p>
      )}
      {error && (
        <div className="flex items-center gap-1 text-[11px] text-red-600 pl-0.5">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

/* ==========================================================================
   3. STANDARD FORM INPUT & TEXTAREA
   ========================================================================== */
export interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ className = "", error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full p-2.5 bg-[#F8F9FD] border ${
          error ? "border-red-500 ring-1 ring-red-500" : "border-[#E2E6F0]"
        } rounded-xl text-[#1F1F1F] text-xs focus:outline-none focus:ring-2 focus:ring-[#5A81FA] placeholder-[#696E82] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        {...props}
      />
    );
  }
);
FormInput.displayName = "FormInput";

export interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ className = "", error, rows = 2, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={`w-full p-2.5 bg-[#F8F9FD] border ${
          error ? "border-red-500 ring-1 ring-red-500" : "border-[#E2E6F0]"
        } rounded-xl text-[#1F1F1F] text-xs focus:outline-none focus:ring-2 focus:ring-[#5A81FA] placeholder-[#696E82] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        {...props}
      />
    );
  }
);
FormTextarea.displayName = "FormTextarea";

/* ==========================================================================
   4. FORM ACTIONS / FOOTER
   ========================================================================== */
export interface FormActionsProps {
  onCancel: () => void;
  submitLabel?: string;
  submittingLabel?: string;
  isSubmitting?: boolean;
  disabled?: boolean;
  submitIcon?: React.ReactNode;
  className?: string;
}

export const FormActions: React.FC<FormActionsProps> = ({
  onCancel,
  submitLabel = "Save Changes",
  submittingLabel = "Saving...",
  isSubmitting = false,
  disabled = false,
  submitIcon,
  className = "",
}) => {
  return (
    <div className={`flex justify-end gap-2 pt-4 border-t border-[#E2E6F0] ${className}`}>
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 bg-[#F2F4FF] hover:bg-[#E5EAFF] text-[#696E82] hover:text-[#1F1F1F] font-semibold rounded-xl text-xs cursor-pointer transition-colors"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={isSubmitting || disabled}
        className="px-5 py-2 bg-[#5A81FA] hover:bg-[#426EE8] text-white font-semibold rounded-xl text-xs shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5 transition-colors"
      >
        {isSubmitting ? (
          <span>{submittingLabel}</span>
        ) : (
          <>
            {submitIcon}
            <span>{submitLabel}</span>
          </>
        )}
      </button>
    </div>
  );
};
