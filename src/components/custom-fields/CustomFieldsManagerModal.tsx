"use client";

import React, { useState } from "react";
import {
  SlidersHorizontal,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  X,
  Eye,
  ArrowUp,
  ArrowDown,
  Layers,
  Sparkles,
  HelpCircle,
  Hash,
  Calendar,
  Type,
  ListFilter,
  ToggleLeft,
  FileText,
  Link as LinkIcon,
} from "lucide-react";
import { CustomFieldDefinition, CustomFieldType } from "@/server/modules/custom-fields/repository";

interface CustomFieldsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceSlug: string;
  initialEntity?: string;
  onFieldsUpdated?: () => void;
}

export function CustomFieldsManagerModal({
  isOpen,
  onClose,
  workspaceSlug,
  initialEntity = "PROJECT",
  onFieldsUpdated,
}: CustomFieldsManagerModalProps) {
  const [entity, setEntity] = useState(initialEntity);
  const [fields, setFields] = useState<CustomFieldDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"list" | "create">("list");

  // Form State
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [key, setKey] = useState("");
  const [type, setType] = useState<CustomFieldType>("text");
  const [placeholder, setPlaceholder] = useState("");
  const [category, setCategory] = useState("General Attributes");
  const [required, setRequired] = useState(false);
  const [showOnCard, setShowOnCard] = useState(true);
  const [showInFilters, setShowInFilters] = useState(true);
  const [options, setOptions] = useState<string[]>([]);
  const [newOptionInput, setNewOptionInput] = useState("");

  // Feedback messages
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Fetch fields whenever modal opens or entity changes
  const fetchFields = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/custom-fields?workspaceSlug=${workspaceSlug}&entity=${entity}`);
      if (res.ok) {
        const data = await res.json();
        setFields(data.fields || []);
      }
    } catch {
      setErrorMessage("Failed to load custom fields");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      fetchFields();
    }
  }, [isOpen, entity]);

  if (!isOpen) return null;

  // Auto-generate key from label
  const handleLabelChange = (newLabel: string) => {
    setLabel(newLabel);
    if (!editingFieldId) {
      const autoKey = newLabel
        .trim()
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
        .replace(/[^a-zA-Z0-9]/g, "");
      setKey(autoKey);
    }
  };

  const handleAddOption = () => {
    if (newOptionInput.trim() && !options.includes(newOptionInput.trim())) {
      setOptions([...options, newOptionInput.trim()]);
      setNewOptionInput("");
    }
  };

  const handleRemoveOption = (optToRemove: string) => {
    setOptions(options.filter((o) => o !== optToRemove));
  };

  const resetForm = () => {
    setEditingFieldId(null);
    setLabel("");
    setKey("");
    setType("text");
    setPlaceholder("");
    setCategory("General Attributes");
    setRequired(false);
    setShowOnCard(true);
    setShowInFilters(true);
    setOptions([]);
    setNewOptionInput("");
    setActiveTab("list");
  };

  const handleEditField = (field: CustomFieldDefinition) => {
    setEditingFieldId(field.id);
    setLabel(field.label);
    setKey(field.key);
    setType(field.type);
    setPlaceholder(field.placeholder || "");
    setCategory(field.category || "General Attributes");
    setRequired(field.required);
    setShowOnCard(field.showOnCard);
    setShowInFilters(field.showInFilters);
    setOptions(field.options || []);
    setActiveTab("create");
  };

  const handleSaveField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/custom-fields?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingFieldId || undefined,
          entity,
          key: key.trim() || undefined,
          label: label.trim(),
          type,
          placeholder: placeholder.trim() || undefined,
          category: category.trim() || undefined,
          options: type === "select" ? options : undefined,
          required,
          showOnCard,
          showInFilters,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to save field");
      } else {
        setSuccessMessage(`Field "${label}" ${editingFieldId ? "updated" : "created"} successfully!`);
        resetForm();
        await fetchFields();
        if (onFieldsUpdated) onFieldsUpdated();
      }
    } catch {
      setErrorMessage("Network error saving field");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteField = async (fieldId: string, fieldLabel: string) => {
    if (!confirm(`Are you sure you want to remove the field "${fieldLabel}" from the ${entity} form?`)) return;

    try {
      const res = await fetch(
        `/api/custom-fields?workspaceSlug=${workspaceSlug}&fieldId=${fieldId}&entity=${entity}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setSuccessMessage(`Field "${fieldLabel}" removed.`);
        setFields(fields.filter((f) => f.id !== fieldId));
        if (onFieldsUpdated) onFieldsUpdated();
      } else {
        setErrorMessage("Failed to delete field");
      }
    } catch {
      setErrorMessage("Network error deleting field");
    }
  };

  const handleMoveOrder = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= fields.length) return;

    const reordered = [...fields];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    // Update sortOrder
    const updated = reordered.map((f, i) => ({ ...f, sortOrder: i + 1 }));
    setFields(updated);

    try {
      await fetch(`/api/custom-fields?workspaceSlug=${workspaceSlug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity, fields: updated }),
      });
      if (onFieldsUpdated) onFieldsUpdated();
    } catch {
      // silent
    }
  };

  const getTypeIcon = (t: CustomFieldType) => {
    switch (t) {
      case "number":
        return <Hash className="w-3.5 h-3.5 text-blue-600" />;
      case "date":
        return <Calendar className="w-3.5 h-3.5 text-purple-600" />;
      case "select":
        return <ListFilter className="w-3.5 h-3.5 text-amber-600" />;
      case "boolean":
        return <ToggleLeft className="w-3.5 h-3.5 text-emerald-600" />;
      case "textarea":
        return <FileText className="w-3.5 h-3.5 text-indigo-600" />;
      case "url":
        return <LinkIcon className="w-3.5 h-3.5 text-teal-600" />;
      default:
        return <Type className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#E2E6F0] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#4865F6] text-white flex items-center justify-center shadow-xs">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#0F172A]">Custom Form Fields Manager</h3>
                <span className="text-[10px] font-bold bg-[#F2F4FF] text-[#4865F6] px-2 py-0.5 rounded-full border border-[#CEDEFF]">
                  Zero-Code Studio Engine
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Add, reorder, or edit fields in your forms without writing or deploying code.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Entity Switcher & Tab Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F8F9FD] p-2.5 rounded-xl border border-[#E2E6F0] text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Target Module:</span>
            <select
              value={entity}
              onChange={(e) => {
                setEntity(e.target.value);
                resetForm();
              }}
              className="p-1.5 bg-white border border-[#E2E6F0] rounded-lg font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#4865F6]"
            >
              <option value="PROJECT">Projects Form & Cards</option>
              <option value="TASK">Tasks & Deliverables Form</option>
              <option value="TEAM">Studio Team & Staff Form</option>
              <option value="CONTRACTOR">Contractor Directory Form</option>
              <option value="CONSULTANT">Consultant Directory Form</option>
            </select>
          </div>

          <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-[#E2E6F0]">
            <button
              type="button"
              onClick={() => setActiveTab("list")}
              className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                activeTab === "list" ? "bg-[#4865F6] text-white shadow-2xs" : "text-slate-600 hover:text-black"
              }`}
            >
              Active Fields ({fields.length})
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setActiveTab("create");
              }}
              className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === "create" ? "bg-[#4865F6] text-white shadow-2xs" : "text-slate-600 hover:text-black"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{editingFieldId ? "Edit Field" : "Add Field"}</span>
            </button>
          </div>
        </div>

        {/* Feedback Banners */}
        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-700 font-bold hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-900 rounded-xl text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-red-700 font-bold hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 1: ACTIVE FIELDS LIST                            */}
        {/* ==================================================== */}
        {activeTab === "list" && (
          <div className="space-y-3">
            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading custom fields configuration...</div>
            ) : fields.length === 0 ? (
              <div className="p-8 border-2 border-dashed border-[#E2E6F0] rounded-2xl text-center space-y-2">
                <Sparkles className="w-8 h-8 text-[#4865F6] mx-auto opacity-50" />
                <h4 className="text-sm font-bold text-slate-800">No custom fields created yet for {entity}</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Click "+ Add Field" above to introduce custom project attributes that automatically show up in forms and cards.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("create")}
                  className="px-4 py-2 bg-[#4865F6] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#3851D6] cursor-pointer mt-2"
                >
                  Create Your First Field
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[#E2E6F0] border border-[#E2E6F0] rounded-xl overflow-hidden text-xs">
                {fields.map((f, index) => (
                  <div key={f.id} className="p-3.5 bg-white hover:bg-slate-50 transition-colors flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Reorder Buttons */}
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveOrder(index, "up")}
                          className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={index === fields.length - 1}
                          onClick={() => handleMoveOrder(index, "down")}
                          className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Field Meta */}
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-800">{f.label}</span>
                          <span className="inline-flex items-center gap-1 font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                            {getTypeIcon(f.type)}
                            <span>{f.type}</span>
                          </span>
                          {f.required && (
                            <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 rounded">
                              Required
                            </span>
                          )}
                          {f.showOnCard && (
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 rounded">
                              On Card
                            </span>
                          )}
                          {f.showInFilters && (
                            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 rounded">
                              In Filters
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2">
                          <span className="font-mono">key: {f.key}</span>
                          {f.category && <span>• {f.category}</span>}
                          {f.type === "select" && f.options && (
                            <span>• {f.options.length} options</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEditField(f)}
                        className="p-1.5 text-slate-500 hover:text-[#4865F6] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Field Configuration"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteField(f.id, f.label)}
                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Field"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 2: ADD / EDIT CUSTOM FIELD FORM                  */}
        {/* ==================================================== */}
        {activeTab === "create" && (
          <form onSubmit={handleSaveField} className="space-y-4 text-xs">
            <div className="bg-[#F8F9FD] p-3 rounded-xl border border-[#E2E6F0] mb-2">
              <span className="font-bold text-slate-700 block">
                {editingFieldId ? "Edit Field Configuration" : "Define New Field"}
              </span>
              <p className="text-[11px] text-slate-500">
                This field will automatically render in the {entity} Add & Edit forms and on project cards without code changes.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Field Display Label <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={label}
                  onChange={(e) => handleLabelChange(e.target.value)}
                  placeholder="e.g. Plot Area (sq.ft) or Sanction Date"
                  className="w-full p-2.5 bg-white border border-[#E2E6F0] rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4865F6]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  System Field Key (JSON identifier)
                </label>
                <input
                  type="text"
                  required
                  value={key}
                  onChange={(e) => setKey(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                  placeholder="e.g. plotAreaSqft"
                  className="w-full p-2.5 bg-white border border-[#E2E6F0] rounded-xl font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4865F6]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Field Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as CustomFieldType)}
                  className="w-full p-2.5 bg-white border border-[#E2E6F0] rounded-xl text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#4865F6]"
                >
                  <option value="text">🔤 Short Text (Single line)</option>
                  <option value="number">🔢 Number (Numeric / Sqft / Amount)</option>
                  <option value="date">📅 Date (Date picker)</option>
                  <option value="select">📋 Dropdown / Select (Choose 1 option)</option>
                  <option value="boolean">☑️ Yes / No Switch (Boolean)</option>
                  <option value="textarea">📝 Long Text / Multiline</option>
                  <option value="url">🌐 Web Link / Map URL</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Category / Group</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Site & Zoning, Approvals, Financial"
                  className="w-full p-2.5 bg-white border border-[#E2E6F0] rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4865F6]"
                />
              </div>
            </div>

            {/* Dropdown Options Builder (if type === select) */}
            {type === "select" && (
              <div className="p-3 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl space-y-2">
                <label className="block font-bold text-slate-700">Dropdown Options</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newOptionInput}
                    onChange={(e) => setNewOptionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddOption();
                      }
                    }}
                    placeholder="Type an option and press Enter (e.g. Residential, Commercial)"
                    className="flex-1 p-2 bg-white border border-[#E2E6F0] rounded-lg text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="px-3 py-2 bg-[#4865F6] text-white font-bold rounded-lg cursor-pointer text-xs"
                  >
                    Add Option
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {options.length === 0 ? (
                    <span className="text-[11px] text-slate-400 italic">No options added yet.</span>
                  ) : (
                    options.map((opt) => (
                      <span
                        key={opt}
                        className="inline-flex items-center gap-1 bg-white border border-[#CEDEFF] text-[#4865F6] px-2 py-1 rounded-lg text-xs font-semibold"
                      >
                        <span>{opt}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(opt)}
                          className="text-slate-400 hover:text-red-600 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-700 mb-1">Placeholder / Helper Text</label>
              <input
                type="text"
                value={placeholder}
                onChange={(e) => setPlaceholder(e.target.value)}
                placeholder="e.g. Enter area in square feet..."
                className="w-full p-2.5 bg-white border border-[#E2E6F0] rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4865F6]"
              />
            </div>

            {/* Display Switches */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={required}
                  onChange={(e) => setRequired(e.target.checked)}
                  className="rounded text-[#4865F6] focus:ring-[#4865F6] w-4 h-4"
                />
                <span>Required Field</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={showOnCard}
                  onChange={(e) => setShowOnCard(e.target.checked)}
                  className="rounded text-[#4865F6] focus:ring-[#4865F6] w-4 h-4"
                />
                <span>Show on Card</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={showInFilters}
                  onChange={(e) => setShowInFilters(e.target.checked)}
                  className="rounded text-[#4865F6] focus:ring-[#4865F6] w-4 h-4"
                />
                <span>Show in Filters</span>
              </label>
            </div>

            {/* LIVE PREVIEW BOX */}
            <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-xl space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#4865F6] uppercase">
                <Eye className="w-3.5 h-3.5" />
                <span>Live Interactive Form Preview</span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                <label className="block font-bold text-slate-800 text-xs">
                  {label || "Sample Field Label"}{" "}
                  {required && <span className="text-red-500">*</span>}
                </label>
                {type === "select" ? (
                  <select className="w-full p-2 border border-slate-200 rounded-lg text-xs" disabled>
                    <option>{placeholder || `Select ${label || "option"}...`}</option>
                    {options.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                ) : type === "boolean" ? (
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                    <input type="checkbox" className="w-4 h-4 rounded text-[#4865F6]" disabled />
                    <span>Yes / Active</span>
                  </label>
                ) : type === "textarea" ? (
                  <textarea
                    rows={2}
                    placeholder={placeholder || "Enter details..."}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                    disabled
                  />
                ) : (
                  <input
                    type={type}
                    placeholder={placeholder || `Enter ${label || "value"}...`}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                    disabled
                  />
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E6F0]">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !label.trim()}
                className="px-5 py-2 bg-[#4865F6] hover:bg-[#3851D6] text-white font-bold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
              >
                {saving ? "Saving..." : editingFieldId ? "Update Field" : "Create & Activate Field"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
