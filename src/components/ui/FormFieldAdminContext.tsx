"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Edit2, Trash2, X, AlertTriangle, RotateCcw, Check, Sparkles, Shield, Eye, EyeOff } from "lucide-react";

export interface FormFieldConfig {
  formId: string;
  fieldKey: string;
  label?: string;
  placeholder?: string;
  helperText?: string;
  required?: boolean;
  isHidden?: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export interface FieldTargetMeta {
  formId: string;
  fieldKey: string;
  currentLabel: string;
  currentPlaceholder?: string;
  currentHelperText?: string;
  isRequired?: boolean;
  isCustomField?: boolean;
}

interface FormFieldAdminContextType {
  isAdmin: boolean;
  workspaceSlug: string;
  configs: Record<string, FormFieldConfig>;
  getFieldConfig: (formId: string, fieldKey: string) => FormFieldConfig | undefined;
  isFieldHidden: (formId: string, fieldKey: string) => boolean;
  openEditField: (meta: FieldTargetMeta) => void;
  openDeleteField: (meta: FieldTargetMeta) => void;
  openRestoreModal: (formId?: string) => void;
  restoreField: (formId: string, fieldKey: string) => Promise<void>;
  refreshConfigs: () => Promise<void>;
}

const FormFieldAdminContext = createContext<FormFieldAdminContextType | null>(null);

export function useFormFieldAdmin() {
  const ctx = useContext(FormFieldAdminContext);
  if (!ctx) {
    // Return safe fallback for components outside provider
    return {
      isAdmin: false,
      workspaceSlug: "",
      configs: {},
      getFieldConfig: () => undefined,
      isFieldHidden: () => false,
      openEditField: () => {},
      openDeleteField: () => {},
      openRestoreModal: () => {},
      restoreField: async () => {},
      refreshConfigs: async () => {},
    };
  }
  return ctx;
}

interface FormFieldAdminProviderProps {
  children: React.ReactNode;
  userRole?: string;
  workspaceSlug: string;
}

export function FormFieldAdminProvider({
  children,
  userRole,
  workspaceSlug,
}: FormFieldAdminProviderProps) {
  const isAdmin = userRole === "ADMIN" || userRole === "OWNER";
  const [configs, setConfigs] = useState<Record<string, FormFieldConfig>>({});

  // Active Modals
  const [editTarget, setEditTarget] = useState<FieldTargetMeta | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FieldTargetMeta | null>(null);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [restoreModalFilterFormId, setRestoreModalFilterFormId] = useState<string | undefined>();

  // Edit form state
  const [editLabel, setEditLabel] = useState("");
  const [editPlaceholder, setEditPlaceholder] = useState("");
  const [editHelperText, setEditHelperText] = useState("");
  const [editRequired, setEditRequired] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const refreshConfigs = useCallback(async () => {
    try {
      const res = await fetch(`/api/form-fields?workspaceSlug=${workspaceSlug}`);
      if (res.ok) {
        const data = await res.json();
        setConfigs(data.configs || {});
      }
    } catch {
      // silently handle network glitch
    }
  }, [workspaceSlug]);

  useEffect(() => {
    if (workspaceSlug) {
      refreshConfigs();
    }
  }, [workspaceSlug, refreshConfigs]);

  const getFieldConfig = useCallback(
    (formId: string, fieldKey: string): FormFieldConfig | undefined => {
      return configs[`${formId}:${fieldKey}`];
    },
    [configs]
  );

  const isFieldHidden = useCallback(
    (formId: string, fieldKey: string): boolean => {
      const cfg = configs[`${formId}:${fieldKey}`];
      return Boolean(cfg?.isHidden);
    },
    [configs]
  );

  const openEditField = (meta: FieldTargetMeta) => {
    if (!isAdmin) return;
    const existing = getFieldConfig(meta.formId, meta.fieldKey);
    setEditTarget(meta);
    setEditLabel(existing?.label !== undefined ? existing.label : meta.currentLabel);
    setEditPlaceholder(existing?.placeholder !== undefined ? existing.placeholder : meta.currentPlaceholder || "");
    setEditHelperText(existing?.helperText !== undefined ? existing.helperText : meta.currentHelperText || "");
    setEditRequired(existing?.required !== undefined ? existing.required : Boolean(meta.isRequired));
  };

  const openDeleteField = (meta: FieldTargetMeta) => {
    if (!isAdmin) return;
    setDeleteTarget(meta);
  };

  const openRestoreModal = (formId?: string) => {
    setRestoreModalFilterFormId(formId);
    setRestoreModalOpen(true);
  };

  // Save Edit Field Settings
  const handleSaveEdit = async () => {
    if (!editTarget) return;
    setIsSubmitting(true);
    try {
      const payload: FormFieldConfig = {
        formId: editTarget.formId,
        fieldKey: editTarget.fieldKey,
        label: editLabel.trim(),
        placeholder: editPlaceholder.trim() || undefined,
        helperText: editHelperText.trim() || undefined,
        required: editRequired,
        isHidden: false,
      };

      const res = await fetch(`/api/form-fields?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update field configuration");
      }

      const key = `${editTarget.formId}:${editTarget.fieldKey}`;
      setConfigs((prev) => ({ ...prev, [key]: payload }));
      showToast(`Field "${editLabel}" updated successfully.`);
      setEditTarget(null);
    } catch (err: any) {
      showToast(err.message || "Failed to save field settings", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm Hide/Delete Field
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/form-fields?workspaceSlug=${workspaceSlug}&formId=${encodeURIComponent(deleteTarget.formId)}&fieldKey=${encodeURIComponent(deleteTarget.fieldKey)}&label=${encodeURIComponent(deleteTarget.currentLabel)}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to remove field");
      }

      const key = `${deleteTarget.formId}:${deleteTarget.fieldKey}`;
      setConfigs((prev) => ({
        ...prev,
        [key]: {
          formId: deleteTarget.formId,
          fieldKey: deleteTarget.fieldKey,
          label: deleteTarget.currentLabel,
          isHidden: true,
        },
      }));

      showToast(`Field "${deleteTarget.currentLabel}" removed from this form.`);
      setDeleteTarget(null);
    } catch (err: any) {
      showToast(err.message || "Failed to remove field", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Restore Field
  const restoreField = async (formId: string, fieldKey: string) => {
    try {
      const res = await fetch(`/api/form-fields?workspaceSlug=${workspaceSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formId, fieldKey }),
      });

      if (!res.ok) {
        throw new Error("Failed to restore field");
      }

      const key = `${formId}:${fieldKey}`;
      setConfigs((prev) => {
        const next = { ...prev };
        if (next[key]) {
          next[key] = { ...next[key], isHidden: false };
        }
        return next;
      });

      showToast("Field restored to form successfully.");
    } catch (err: any) {
      showToast(err.message || "Failed to restore field", "error");
    }
  };

  // List of hidden fields for restore modal
  const hiddenFieldsList = Object.values(configs).filter(
    (c) => c.isHidden && (!restoreModalFilterFormId || c.formId === restoreModalFilterFormId)
  );

  return (
    <FormFieldAdminContext.Provider
      value={{
        isAdmin,
        workspaceSlug,
        configs,
        getFieldConfig,
        isFieldHidden,
        openEditField,
        openDeleteField,
        openRestoreModal,
        restoreField,
        refreshConfigs,
      }}
    >
      {children}

      {/* Floating Status Toast */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200 ${
            toastMessage.type === "success"
              ? "bg-[#1F1F1F] text-white border border-slate-700"
              : "bg-red-600 text-white border border-red-700"
          }`}
        >
          {toastMessage.type === "success" ? (
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-white shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 1. ADMIN EDIT FIELD MODAL */}
      {editTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#5A81FA] text-white flex items-center justify-center shrink-0">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-[#1F1F1F]">Edit Form Field Settings</h3>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      Admin
                    </span>
                  </div>
                  <p className="text-[11px] text-[#696E82]">Customize field appearance & validation for this studio</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="text-[#696E82] hover:text-[#1F1F1F] p-1 rounded-lg hover:bg-[#F2F4FF]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Field Identifier</label>
                <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-600 select-all">
                  {editTarget.formId} → {editTarget.fieldKey}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">
                  Field Label <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  placeholder="e.g. Project Code / Title"
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Placeholder Text</label>
                <input
                  type="text"
                  value={editPlaceholder}
                  onChange={(e) => setEditPlaceholder(e.target.value)}
                  placeholder="e.g. Enter project identifier..."
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Helper / Instruction Text</label>
                <input
                  type="text"
                  value={editHelperText}
                  onChange={(e) => setEditHelperText(e.target.value)}
                  placeholder="e.g. Unique project identifier assigned by principal architect"
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl">
                <div>
                  <span className="font-bold text-slate-800 block">Required Field</span>
                  <span className="text-[11px] text-[#696E82]">Must be filled before form submission</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editRequired}
                    onChange={(e) => setEditRequired(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#5A81FA]"></div>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#E2E6F0]">
              <button
                type="button"
                onClick={() => {
                  setEditLabel(editTarget.currentLabel);
                  setEditPlaceholder(editTarget.currentPlaceholder || "");
                  setEditHelperText(editTarget.currentHelperText || "");
                  setEditRequired(Boolean(editTarget.isRequired));
                }}
                className="px-3 py-1.5 text-[11px] text-[#696E82] hover:text-[#1F1F1F] flex items-center gap-1 font-semibold hover:bg-slate-100 rounded-lg transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Default</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="px-3.5 py-1.5 bg-[#F2F4FF] hover:bg-[#E5EAFF] text-[#696E82] hover:text-[#1F1F1F] font-semibold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting || !editLabel.trim()}
                  onClick={handleSaveEdit}
                  className="px-4 py-1.5 bg-[#5A81FA] hover:bg-[#426EE8] text-white font-semibold rounded-xl text-xs shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? "Saving..." : "Save Settings"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. ADMIN DELETE / HIDE FIELD CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1F1F1F]">Remove Field from Form?</h3>
                <p className="text-[11px] text-[#696E82]">Studio Administrator Action</p>
              </div>
            </div>

            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl space-y-1.5 text-xs text-red-800">
              <p className="font-semibold">
                Are you sure you want to remove <span className="font-bold underline">"{deleteTarget.currentLabel}"</span>?
              </p>
              <p className="text-[11px] text-red-700 leading-relaxed">
                This field will be hidden from the form for all users in this workspace. You can restore this field at any time from the form's Admin settings.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 bg-[#F2F4FF] hover:bg-[#E5EAFF] text-[#696E82] font-semibold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-xs shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isSubmitting ? "Removing..." : "Remove Field"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. ADMIN RESTORE HIDDEN FIELDS MODAL */}
      {restoreModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1F1F1F]">Hidden Form Fields ({hiddenFieldsList.length})</h3>
                  <p className="text-[11px] text-[#696E82]">Un-hide and restore removed fields for this studio</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRestoreModalOpen(false)}
                className="text-[#696E82] hover:text-[#1F1F1F] p-1 rounded-lg hover:bg-[#F2F4FF]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 py-1">
              {hiddenFieldsList.length === 0 ? (
                <div className="text-center py-8 text-slate-400 space-y-2">
                  <EyeOff className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-semibold">No fields are currently hidden.</p>
                  <p className="text-[11px] text-slate-400">All configured standard and custom fields are visible.</p>
                </div>
              ) : (
                hiddenFieldsList.map((f) => (
                  <div
                    key={`${f.formId}:${f.fieldKey}`}
                    className="flex items-center justify-between p-3 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl hover:border-[#5A81FA]/40 transition-colors"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-800">{f.label || f.fieldKey}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {f.formId} • {f.fieldKey}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => restoreField(f.formId, f.fieldKey)}
                      className="px-3 py-1.5 bg-[#5A81FA] hover:bg-[#426EE8] text-white font-semibold rounded-lg text-xs flex items-center gap-1 shadow-xs transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore Field</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-[#E2E6F0]">
              <button
                type="button"
                onClick={() => setRestoreModalOpen(false)}
                className="px-4 py-2 bg-[#F2F4FF] hover:bg-[#E5EAFF] text-[#696E82] font-semibold rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </FormFieldAdminContext.Provider>
  );
}
