"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  FileSpreadsheet,
  Upload,
  Download,
  X,
  CheckCircle2,
  AlertCircle,
  Users,
  Wrench,
  Briefcase,
  Building,
  FolderKanban,
  ArrowRight,
  Eye,
  FileText,
  KeyRound,
  Copy,
  Check,
  MessageSquare,
  ExternalLink,
  Sparkles,
  Mail,
} from "lucide-react";
import { parseCsv } from "@/server/modules/csv/csv-parser";

export type CsvTargetType =
  | "employees"
  | "contractors"
  | "consultants"
  | "clients"
  | "projects"
  | "all";

interface CsvImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceSlug: string;
  defaultType?: CsvTargetType;
  lockedType?: boolean;
  onSuccess?: () => void;
}

const TYPE_CONFIG: Record<
  CsvTargetType,
  {
    title: string;
    description: string;
    icon: React.ElementType;
    expectedColumns: string[];
    note: string;
    targetTabUrl: (slug: string) => string;
    targetTabName: string;
  }
> = {
  employees: {
    title: "Studio Team (Employees)",
    description: "Generate staff members, assign credentials, and populate your studio team.",
    icon: Users,
    expectedColumns: [
      "Full Name",
      "Contact",
      "Alternate Contact",
      "Work Mail",
      "Department",
      "Designation",
    ],
    note: "Auto-generates sequential Employee IDs (EMP-001, EMP-002...) and initial passwords. Team members appear immediately in Studio Team.",
    targetTabUrl: (slug) => `/w/${slug}/team`,
    targetTabName: "Studio Team",
  },
  contractors: {
    title: "Contractors & Vendors",
    description: "Import trade contractors, material vendors, fabricators, and suppliers.",
    icon: Wrench,
    expectedColumns: [
      "Contractor Name / Vendor Name",
      "Company Name",
      "Type / Service",
      "Contact",
      "Alternate Contact",
      "Email",
      "Projects",
      "Office Location",
    ],
    note: "Supports both Contractor Details and Vendor Details. Records appear in Contractors directory and link to projects automatically.",
    targetTabUrl: (slug) => `/w/${slug}/contractors`,
    targetTabName: "Contractors",
  },
  consultants: {
    title: "Consultants Directory",
    description: "Import structural, MEP, landscape, and HVAC engineering consultants.",
    icon: Briefcase,
    expectedColumns: [
      "Consultant Name",
      "Company Name",
      "Type of service",
      "Designation",
      "Email",
      "Contact",
      "Alternate Contact",
      "Firm Location",
      "Project",
    ],
    note: "Consultants are registered with their engineering specialization, contact points, and linked project records.",
    targetTabUrl: (slug) => `/w/${slug}/consultants`,
    targetTabName: "Consultants",
  },
  clients: {
    title: "Clients Directory",
    description: "Import property developers, private villa clients, and corporate leads.",
    icon: Building,
    expectedColumns: [
      "Client Name",
      "Projects",
      "Client Type",
      "Email",
      "Contact No",
      "Location",
      "Notes (Extra info.)",
    ],
    note: "Clients can be assigned as the primary billing owner for studio architectural projects.",
    targetTabUrl: (slug) => `/w/${slug}/directory`,
    targetTabName: "Directory",
  },
  projects: {
    title: "Studio Projects",
    description: "Import architectural projects, phase tracking, timelines, and client links.",
    icon: FolderKanban,
    expectedColumns: [
      "Project name",
      "Clients",
      "Project type",
      "Phase",
      "Starting - Deadline",
      "Other info",
    ],
    note: "Auto-generates unique project codes (PRJ-001...), matches or creates client profiles, and sets timeline dates.",
    targetTabUrl: (slug) => `/w/${slug}/projects`,
    targetTabName: "Projects",
  },
};

export function CsvImportExportModal({
  isOpen,
  onClose,
  workspaceSlug,
  defaultType = "employees",
  lockedType = true,
  onSuccess,
}: CsvImportExportModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"import" | "export">("import");
  const [selectedType, setSelectedType] = useState<CsvTargetType>(defaultType);
  const [csvText, setCsvText] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sendCredentials, setSendCredentials] = useState<boolean>(true);
  const [defaultPassword, setDefaultPassword] = useState<string>("StudioPassword2026!");
  const [customMessage, setCustomMessage] = useState<string>(
    "Welcome to 100% DESIGN Studio OS! Please find your official login credentials below. You can log in and review your assigned projects and tasks."
  );
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [allCopied, setAllCopied] = useState<boolean>(false);
  const [autoDetectedBadge, setAutoDetectedBadge] = useState<CsvTargetType | null>(null);
  const [importResult, setImportResult] = useState<{
    importedCount: number;
    failedCount: number;
    created: any[];
    errors: { row: number; identifier: string; error: string }[];
    breakdown?: Record<string, { imported: number; failed: number }>;
  } | null>(null);

  const handleResetForm = React.useCallback(() => {
    setCsvText("");
    setFileName("");
    setPreviewRows([]);
    setPreviewHeaders([]);
    setError(null);
    setImportResult(null);
    setAutoDetectedBadge(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  // Synchronize state when defaultType changes or modal opens
  React.useEffect(() => {
    if (defaultType) {
      setSelectedType(defaultType);
      handleResetForm();
    }
  }, [defaultType, isOpen, handleResetForm]);

  if (!isOpen) return null;

  const currentConfig = TYPE_CONFIG[selectedType];

  const detectCategoryFromContent = (text: string, fName: string): CsvTargetType | null => {
    if (lockedType) return null;
    const lowerName = fName.toLowerCase();
    if (lowerName.includes("project")) return "projects";
    if (lowerName.includes("vendor") || lowerName.includes("contractor")) return "contractors";
    if (lowerName.includes("client")) return "clients";
    if (lowerName.includes("consultant")) return "consultants";
    if (lowerName.includes("employee") || lowerName.includes("staff") || lowerName.includes("team")) return "employees";

    if (
      text.includes("===") ||
      text.includes("[Vendors]") ||
      text.includes("[Clients]") ||
      text.includes("[Projects]") ||
      text.includes("Client details") ||
      text.includes("Contractors details") ||
      text.includes("Vendor details")
    ) {
      const markers = (text.match(/===|\[|details/gi) || []).length;
      if (markers >= 2) return "all";
    }

    try {
      const parsed = parseCsv(text);
      if (parsed.length > 0) {
        const headers = Object.keys(parsed[0]).map((k) => k.toLowerCase());
        if (headers.some((k) => k === "category" || k === "type" || k === "tab")) {
          return "all";
        }
        if (
          headers.some(
            (k) =>
              k.includes("deadline") ||
              k.includes("phase") ||
              (k.includes("project") &&
                !k.includes("consultant") &&
                !k.includes("contractor") &&
                !k.includes("vendor") &&
                !k.includes("client"))
          )
        ) {
          return "projects";
        }
        if (
          headers.some(
            (k) =>
              k.includes("trade") ||
              k.includes("vendor") ||
              k.includes("contractor") ||
              k.includes("service") ||
              k.includes("office location")
          )
        ) {
          return "contractors";
        }
        if (
          headers.some(
            (k) =>
              k.includes("discipline") ||
              k.includes("consultant") ||
              k.includes("firm location")
          )
        ) {
          return "consultants";
        }
        if (
          headers.some(
            (k) =>
              k.includes("client") ||
              (k.includes("company") && !headers.some((x) => x.includes("designation")))
          )
        ) {
          return "clients";
        }
        if (
          headers.some(
            (k) =>
              k.includes("department") ||
              k.includes("designation") ||
              k.includes("employee")
          )
        ) {
          return "employees";
        }
      }
    } catch {
      // ignore
    }
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvText(content);
      try {
        const parsed = parseCsv(content);
        setPreviewRows(parsed.slice(0, 5));
        if (parsed.length > 0) {
          setPreviewHeaders(Object.keys(parsed[0]));
        } else {
          setPreviewHeaders([]);
        }

        const detected = detectCategoryFromContent(content, file.name);
        if (detected) {
          setSelectedType(detected);
          setAutoDetectedBadge(detected);
        }
      } catch {
        setError("Could not parse CSV format. Please ensure valid comma-separated values.");
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvText(content);
      try {
        const parsed = parseCsv(content);
        setPreviewRows(parsed.slice(0, 5));
        if (parsed.length > 0) {
          setPreviewHeaders(Object.keys(parsed[0]));
        } else {
          setPreviewHeaders([]);
        }

        const detected = detectCategoryFromContent(content, file.name);
        if (detected) {
          setSelectedType(detected);
          setAutoDetectedBadge(detected);
        }
      } catch {
        setError("Could not parse CSV format. Please ensure valid comma-separated values.");
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadTemplate = () => {
    window.open(`/api/csv/template?type=${selectedType}`, "_blank");
  };

  const handleExportData = () => {
    window.open(`/api/csv/export?workspaceSlug=${workspaceSlug}&type=${selectedType}`, "_blank");
  };

  const handleExecuteImport = async () => {
    if (!csvText.trim()) {
      setError("Please select or upload a CSV file first.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/csv/import?workspaceSlug=${workspaceSlug}&type=${selectedType}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceSlug,
          type: selectedType,
          csvText,
          sendCredentials,
          defaultPassword,
          customMessage,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Import failed. Please check your CSV data.");
      } else {
        setImportResult(data.result);
        if (onSuccess) onSuccess();
        router.refresh();
      }
    } catch {
      setError("Network or server connection failed while uploading CSV.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-[#E2E6F0] shadow-2xl max-w-3xl w-full my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E6F0] flex items-center justify-between bg-[#F8F9FD]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#5A81FA]/10 text-[#5A81FA] flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1F1F1F]">
                {selectedType === "employees"
                  ? "Studio Team: Import Employees from CSV"
                  : selectedType === "contractors"
                  ? "Contractors & Vendors CSV Data (Import & Export)"
                  : selectedType === "consultants"
                  ? "Consultants Directory CSV Data (Import & Export)"
                  : selectedType === "projects"
                  ? "Studio Projects CSV Data (Import & Export)"
                  : "Clients Directory CSV Data (Import & Export)"}
              </h2>
              <p className="text-xs text-[#696E82]">
                {selectedType === "employees"
                  ? "Bulk import studio staff, auto-generate sequential EMP IDs and issue login credentials"
                  : selectedType === "contractors"
                  ? "Bulk import or export trade contractors, material vendors, suppliers & site contacts"
                  : selectedType === "consultants"
                  ? "Bulk import or export structural, MEP, landscape, and HVAC engineering consultants"
                  : selectedType === "projects"
                  ? "Bulk import or export studio architectural projects, deadlines, phases & clients"
                  : "Bulk import or export client profiles, contact numbers & site requirements"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#696E82] hover:text-[#1F1F1F] hover:bg-[#E2E6F0] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab & Type Selector */}
        <div className="p-6 border-b border-[#E2E6F0] space-y-4">
          {/* Main Action Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                setActiveTab("import");
                handleResetForm();
              }}
              className={`flex-1 py-2 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                activeTab === "import"
                  ? "bg-[#5A81FA] text-white border-[#5A81FA] shadow-xs"
                  : "bg-white text-[#696E82] border-[#E2E6F0] hover:bg-[#F8F9FD]"
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Import Data from CSV</span>
            </button>
            <button
              onClick={() => {
                setActiveTab("export");
                handleResetForm();
              }}
              className={`flex-1 py-2 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                activeTab === "export"
                  ? "bg-[#5A81FA] text-white border-[#5A81FA] shadow-xs"
                  : "bg-white text-[#696E82] border-[#E2E6F0] hover:bg-[#F8F9FD]"
              }`}
            >
              <Download className="w-4 h-4" />
              <span>Export Studio Data to CSV</span>
            </button>
          </div>

          {/* Purpose / Target Selector (Only shown if NOT locked to a specific page) */}
          {!lockedType && (
            <div>
              <label className="block text-xs font-semibold text-[#1F1F1F] uppercase tracking-wider mb-2">
                Select Data Purpose / Target Category:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {(["employees", "contractors", "consultants", "clients", "projects"] as CsvTargetType[]).map((t) => {
                  const conf = TYPE_CONFIG[t];
                  const Icon = conf.icon;
                  const isSelected = selectedType === t;
                  return (
                    <button
                      key={t}
                      onClick={() => {
                        setSelectedType(t);
                        handleResetForm();
                      }}
                      className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                        isSelected
                          ? "bg-[#F2F4FF] border-[#5A81FA] text-[#2C308D] shadow-xs ring-1 ring-[#5A81FA]"
                          : "bg-white border-[#E2E6F0] text-[#696E82] hover:bg-[#F8F9FD] hover:text-[#1F1F1F]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <Icon className={`w-4 h-4 ${isSelected ? "text-[#5A81FA]" : "text-[#696E82]"}`} />
                        {isSelected && <span className="w-2 h-2 rounded-full bg-[#5A81FA]" />}
                      </div>
                      <span className="text-xs font-bold leading-tight mt-1">{conf.title.split("(")[0].trim()}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Auto-detected notification banner */}
          {autoDetectedBadge && (
            <div className="p-3 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-xl text-xs flex items-center justify-between gap-2 animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  <strong>Auto-Detected Category:</strong> Switched to <strong>{TYPE_CONFIG[autoDetectedBadge].title.split("(")[0].trim()}</strong> based on your CSV columns.
                </span>
              </div>
              <span className="text-[10px] text-indigo-700 bg-white/70 px-2 py-0.5 rounded border border-indigo-200">
                Respected page will be updated
              </span>
            </div>
          )}

          {/* Target Explanation Card */}
          <div className="bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl p-4 flex items-start gap-3">
            <currentConfig.icon className="w-5 h-5 text-[#5A81FA] shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <div className="font-bold text-[#1F1F1F]">{currentConfig.title}</div>
              <p className="text-[#696E82]">{currentConfig.description}</p>
              <div className="text-[11px] text-[#2C308D] font-medium pt-1">
                {currentConfig.note}
              </div>
            </div>
          </div>

          {activeTab === "import" ? (
            <div className="space-y-5">
              {/* Expected Columns Pill List + Download Template Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#E2E6F0] rounded-xl p-4">
                <div>
                  <div className="text-xs font-bold text-[#1F1F1F] mb-1.5">
                    Expected CSV Column Headers:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {currentConfig.expectedColumns.map((col) => (
                      <span
                        key={col}
                        className="bg-[#CEDEFF]/50 text-[#2C308D] border border-[#CEDEFF] px-2 py-0.5 rounded text-[11px] font-mono font-medium"
                      >
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="bg-white border border-[#E2E6F0] text-[#1F1F1F] hover:bg-[#F8F9FD] px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs shrink-0 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-[#5A81FA]" />
                  <span>Download Sample CSV</span>
                </button>
              </div>

              {/* Upload Dropzone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#CEDEFF] hover:border-[#5A81FA] bg-[#F8F9FD] hover:bg-[#F2F4FF]/50 rounded-2xl p-6 text-center cursor-pointer transition-all"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-12 h-12 mx-auto rounded-2xl bg-white border border-[#CEDEFF] flex items-center justify-center shadow-xs mb-3 text-[#5A81FA]">
                  <Upload className="w-6 h-6" />
                </div>
                {fileName ? (
                  <div>
                    <div className="text-xs font-bold text-[#1F1F1F] flex items-center justify-center gap-1.5">
                      <FileText className="w-4 h-4 text-[#5A81FA]" />
                      <span>{fileName}</span>
                    </div>
                    <p className="text-[11px] text-[#696E82] mt-1">
                      Click to choose a different CSV file
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="text-xs font-bold text-[#1F1F1F]">
                      Click to browse or drag and drop your CSV file here
                    </div>
                    <p className="text-[11px] text-[#696E82] mt-1">
                      Supports comma-delimited (.csv) files up to 10MB
                    </p>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Employee Generation Credential & Notification Options */}
              {selectedType === "employees" && !importResult && (
                <div className="bg-[#F8F9FD] border border-[#CEDEFF] rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#1F1F1F]">
                    <KeyRound className="w-4 h-4 text-[#5A81FA]" />
                    <span>Employee Credential Dispatch & Notification Options</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      id="csvSendCreds"
                      checked={sendCredentials}
                      onChange={(e) => setSendCredentials(e.target.checked)}
                      className="rounded border-[#E2E6F0] text-[#5A81FA] focus:ring-[#5A81FA]"
                    />
                    <label htmlFor="csvSendCreds" className="text-xs text-[#1F1F1F] font-medium cursor-pointer">
                      Send login ID & password notification to each employee directly (via Outbox Email & in-app alert)
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] font-semibold text-[#696E82] block mb-1">
                        Default Initial Password
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={defaultPassword}
                          onChange={(e) => setDefaultPassword(e.target.value)}
                          className="flex-1 px-3 py-1.5 text-xs bg-white border border-[#E2E6F0] rounded-lg font-mono text-[#1F1F1F]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const gen = "Studio#" + Math.random().toString(36).substring(2, 8).toUpperCase() + "!";
                            setDefaultPassword(gen);
                          }}
                          className="px-2.5 py-1.5 bg-white border border-[#E2E6F0] hover:bg-[#F2F4FF] text-[#5A81FA] rounded-lg text-[11px] font-medium transition-colors"
                          title="Generate random password"
                        >
                          Generate
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-[#696E82] block mb-1">
                        Welcome Note / Custom Message for Staff
                      </label>
                      <input
                        type="text"
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        placeholder="e.g. Welcome to 100% DESIGN Studio team!"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-[#E2E6F0] rounded-lg text-[#1F1F1F]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Import Results Box */}
              {importResult && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>
                        Import Completed: {importResult.importedCount} record(s) added successfully!
                      </span>
                    </div>

                    {selectedType === "employees" && importResult.created?.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const lines = importResult.created.map(
                            (c) =>
                              `${c.employeeId}: ${c.fullName} | Email: ${c.email} | Password: ${c.temporaryPassword || defaultPassword}`
                          );
                          const text = `100% DESIGN Studio — Issued Employee Credentials\n\n` + lines.join("\n");
                          navigator.clipboard.writeText(text);
                          setAllCopied(true);
                          setTimeout(() => setAllCopied(false), 2500);
                        }}
                        className="bg-white border border-emerald-300 text-emerald-900 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        {allCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{allCopied ? "All Copied!" : "Copy All Issued Credentials"}</span>
                      </button>
                    )}
                  </div>

                  {/* Multi-category breakdown if available */}
                  {importResult.breakdown && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-1">
                      {Object.entries(importResult.breakdown).map(([catKey, counts]) => {
                        const label =
                          catKey === "contractors"
                            ? "Vendors & Contractors"
                            : catKey === "employees"
                            ? "Studio Staff"
                            : catKey === "consultants"
                            ? "Consultants"
                            : catKey === "projects"
                            ? "Projects"
                            : "Clients";
                        const targetUrl =
                          catKey === "contractors"
                            ? `/w/${workspaceSlug}/contractors`
                            : catKey === "clients"
                            ? `/w/${workspaceSlug}/directory`
                            : catKey === "consultants"
                            ? `/w/${workspaceSlug}/consultants`
                            : catKey === "projects"
                            ? `/w/${workspaceSlug}/projects`
                            : `/w/${workspaceSlug}/team`;

                        return (
                          <div
                            key={catKey}
                            className="bg-white border border-emerald-200 rounded-lg p-2.5 text-center shadow-xs"
                          >
                            <div className="text-[10px] uppercase font-bold tracking-wider text-[#696E82]">
                              {label}
                            </div>
                            <div className="text-lg font-bold text-emerald-700 mt-0.5">
                              {counts.imported}
                            </div>
                            <div className="text-[10px] text-gray-500">
                              {counts.failed > 0 ? `${counts.failed} failed` : "Imported"}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                router.push(targetUrl);
                              }}
                              className="mt-1 text-[10px] text-[#5A81FA] hover:underline font-semibold block w-full text-center"
                            >
                              Go to {label} &rarr;
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Issued Credentials Table for Employees */}
                  {selectedType === "employees" && importResult.created?.length > 0 && (
                    <div className="mt-2 border border-emerald-200 bg-white rounded-xl overflow-hidden">
                      <div className="px-3 py-2 bg-emerald-100/60 font-semibold text-emerald-950 text-[11px] flex justify-between items-center">
                        <span>Issued Login Credentials for Studio Team ({importResult.created.length})</span>
                        <span className="text-[10px] text-emerald-800">
                          {sendCredentials ? "✓ Notifications queued in Outbox" : "Direct generation"}
                        </span>
                      </div>
                      <div className="max-h-48 overflow-y-auto divide-y divide-emerald-100">
                        {importResult.created.map((c: any, idx: number) => {
                          const pwd = c.temporaryPassword || defaultPassword;
                          const singleText = `🏢 100% DESIGN Studio — Login Credentials\nHello ${c.fullName},\n\n• Login: http://localhost:3000/w/${workspaceSlug}/login\n• Employee ID: ${c.employeeId}\n• Email: ${c.email}\n• Password: ${pwd}\n\n${customMessage}`;
                          const waUrl = c.phone
                            ? `https://wa.me/${c.phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(singleText)}`
                            : `https://wa.me/?text=${encodeURIComponent(singleText)}`;

                          const companyMail = "designadmin08@gmail.com";
                          const gmailSubject = `[100% DESIGN Studio] Your Studio OS Login Credentials (${c.employeeId})`;
                          const gmailUrl = `https://mail.google.com/mail/u/?authuser=${encodeURIComponent(
                            companyMail
                          )}&view=cm&fs=1&to=${encodeURIComponent(c.email)}&su=${encodeURIComponent(
                            gmailSubject
                          )}&body=${encodeURIComponent(singleText)}`;

                          return (
                            <div key={idx} className="p-2.5 flex items-center justify-between gap-2 hover:bg-emerald-50/50">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-[#5A81FA]">{c.employeeId}</span>
                                  <span className="font-semibold text-[#1F1F1F]">{c.fullName}</span>
                                  <span className="text-[#696E82] text-[10px]">({c.designation})</span>
                                </div>
                                <div className="text-[11px] text-[#696E82]">
                                  Email: <span className="text-[#1F1F1F] font-mono">{c.email}</span> &bull; Password:{" "}
                                  <span className="text-[#2563EB] font-mono font-bold">{pwd}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <a
                                  href={gmailUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-1 bg-[#EA4335] hover:bg-[#D93025] text-white rounded text-[10px] font-semibold flex items-center gap-1 transition-colors"
                                  title="Send credentials directly via Gmail (designadmin08@gmail.com)"
                                >
                                  <Mail className="w-3 h-3" />
                                  <span>Gmail</span>
                                </a>
                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-semibold flex items-center gap-1 transition-colors"
                                  title="Send credentials directly via WhatsApp"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                  <span>WhatsApp</span>
                                </a>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(singleText);
                                    setCopiedIdx(idx);
                                    setTimeout(() => setCopiedIdx(null), 2000);
                                  }}
                                  className="px-2 py-1 bg-white border border-[#E2E6F0] hover:bg-[#F8F9FD] text-[#1F1F1F] rounded text-[10px] font-medium flex items-center gap-1 transition-colors"
                                  title="Copy login details"
                                >
                                  {copiedIdx === idx ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                  <span>{copiedIdx === idx ? "Copied" : "Copy"}</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {importResult.failedCount > 0 && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px] space-y-1">
                      <div className="font-bold">
                        {importResult.failedCount} row(s) had errors and were skipped:
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 max-h-24 overflow-y-auto">
                        {importResult.errors.map((err, idx) => (
                          <li key={idx}>
                            Row {err.row} ({err.identifier}): {err.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-emerald-200">
                    <span className="text-[11px] text-emerald-800">
                      The records are now live in your workspace.
                    </span>
                    <button
                      onClick={() => {
                        onClose();
                        router.push(currentConfig.targetTabUrl(workspaceSlug));
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <span>Go to {currentConfig.targetTabName}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* CSV Preview Table (first 5 rows) */}
              {previewRows.length > 0 && !importResult && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#1F1F1F]">
                    <span className="flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-[#5A81FA]" />
                      <span>Data Preview (First {previewRows.length} rows parsed)</span>
                    </span>
                    <span className="text-[11px] text-[#696E82]">
                      Total {previewHeaders.length} columns detected
                    </span>
                  </div>
                  <div className="overflow-x-auto border border-[#E2E6F0] rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F8F9FD] border-b border-[#E2E6F0] text-[#696E82]">
                        <tr>
                          {previewHeaders.map((h, i) => (
                            <th key={i} className="py-2 px-3 font-semibold whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E6F0]">
                        {previewRows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-[#F8F9FD]">
                            {previewHeaders.map((h, cIdx) => (
                              <td key={cIdx} className="py-2 px-3 text-[#1F1F1F] whitespace-nowrap">
                                {row[h] || <span className="text-[#A8B1CE] italic">—</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Export Tab */
            <div className="space-y-4">
              <div className="bg-white border border-[#E2E6F0] rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-[#1F1F1F] flex items-center gap-2">
                  <Download className="w-4 h-4 text-[#5A81FA]" />
                  <span>Download {currentConfig.title} Records</span>
                </h3>
                <p className="text-xs text-[#696E82]">
                  Exports all active and archived records for {currentConfig.title.toLowerCase()} from this workspace.
                  The generated CSV is protected against CSV Formula Injection (OWASP mitigation compliant) and compatible with Microsoft Excel, Apple Numbers, and Google Sheets.
                </p>

                <div className="pt-2">
                  <button
                    onClick={handleExportData}
                    className="bg-[#5A81FA] hover:bg-[#426EE8] text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download {currentConfig.title} CSV</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#E2E6F0] bg-[#F8F9FD] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#696E82] hover:text-[#1F1F1F] hover:bg-[#E2E6F0] transition-colors"
          >
            Close
          </button>

          {activeTab === "import" && !importResult && (
            <button
              onClick={handleExecuteImport}
              disabled={loading || !csvText}
              className="bg-[#5A81FA] hover:bg-[#426EE8] disabled:opacity-50 text-white px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing CSV...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Confirm & Import CSV</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
