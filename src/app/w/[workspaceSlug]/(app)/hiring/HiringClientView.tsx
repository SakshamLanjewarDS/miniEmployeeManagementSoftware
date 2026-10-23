"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { TenantContext } from "@/server/tenancy/context";
import { EmployeeDocumentVaultView } from "@/components/documents/EmployeeDocumentVaultView";
import { EmployeeDocumentRecordItem } from "@/server/modules/documents/service";
import {
  FileText,
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  UserPlus,
  Shield,
  Briefcase,
  Calendar,
  Building,
  DollarSign,
  User,
  ArrowRight,
  Eye,
  RefreshCw,
  Stamp,
  Users,
  FolderArchive,
  Search,
  Filter,
  ShieldCheck,
  X,
  CreditCard,
  GraduationCap,
  Clock,
  AlertTriangle,
  Sparkles,
  Phone,
} from "lucide-react";

interface EmployeeOption {
  id: string;
  membershipId: string;
  employeeId: string;
  fullName: string;
  email: string;
  phone?: string | null;
  department?: string | null;
  designation?: string | null;
}

interface LetterTemplateOption {
  id: string;
  type: string;
  title: string;
  description?: string | null;
}

interface HiringClientViewProps {
  workspaceSlug: string;
  context: TenantContext;
  employees: EmployeeOption[];
  templates: LetterTemplateOption[];
  initialDocumentRecords?: EmployeeDocumentRecordItem[];
}

type TemplateType = "OFFER" | "APPOINTMENT" | "TERMINATION" | "EXPERIENCE_CERTIFICATE";

const TEMPLATE_PRESETS: Record<
  TemplateType,
  {
    title: string;
    description: string;
    defaultResponsibilities: string;
    badge: string;
  }
> = {
  OFFER: {
    title: "Employment Offer Letter",
    description: "Formal offer extending compensation, role, joining schedule, and acceptance terms.",
    defaultResponsibilities:
      "• Lead and execute architectural design packages from schematic design through municipal approvals.\n• Coordinate with MEP, structural consultants, and studio draughtspersons.\n• Ensure quality compliance with studio drawing delivery standards and milestone schedules.",
    badge: "Hiring Offer",
  },
  APPOINTMENT: {
    title: "Formal Letter of Appointment",
    description: "Official appointment setting operational terms, responsibilities, and studio policies.",
    defaultResponsibilities:
      "• Architectural concept development, BIM/CAD drawing sets, and site coordination.\n• Represent the studio in client design presentations and technical consultant reviews.\n• Uphold statutory drawing governance and Four-Eyes quality assurance protocols.",
    badge: "Official Appointment",
  },
  TERMINATION: {
    title: "Notice of Employment Termination",
    description: "Formal contract conclusion notice with asset return requirements and clearance schedule.",
    defaultResponsibilities:
      "Mutual separation / contractual conclusion. Complete handover of all active CAD files, site logs, and studio keys.",
    badge: "Contract Conclusion",
  },
  EXPERIENCE_CERTIFICATE: {
    title: "Certificate of Experience & Completion",
    description: "Official certificate verifying tenure, project contributions, and conduct upon completion.",
    defaultResponsibilities:
      "Delivered comprehensive architectural services across high-end residential, commercial, and masterplanning projects.",
    badge: "Tenure Completion",
  },
};

export default function HiringClientView({
  workspaceSlug,
  context,
  employees,
  templates: _templates,
  initialDocumentRecords = [],
}: HiringClientViewProps) {
  // Top-Level Hub Navigation
  const [activeHubTab, setActiveHubTab] = useState<"HIRING_LETTERS" | "EMPLOYEE_RECORDS">("HIRING_LETTERS");

  // --- TAB 1: HIRING & LETTERS STUDIO STATE ---
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>("OFFER");
  const [candidateSource, setCandidateSource] = useState<"NEW" | "EXISTING">("NEW");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");

  // Form Fields
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [candidatePhone, setCandidatePhone] = useState("");
  const [designation, setDesignation] = useState("Architectural Project Lead");
  const [department, setDepartment] = useState("Architecture");
  const [salary, setSalary] = useState("7,50,000");
  const [joinDate, setJoinDate] = useState(new Date().toISOString().split("T")[0]);
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split("T")[0]);
  const [reportingManager, setReportingManager] = useState("Studio Partner / Lead");
  const [responsibilities, setResponsibilities] = useState(
    TEMPLATE_PRESETS.OFFER.defaultResponsibilities
  );

  // Preview & Circulation State
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Software Issuance State
  const [issuingSoftware, setIssuingSoftware] = useState(false);
  const [issuedResult, setIssuedResult] = useState<any>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // --- TAB 2: EMPLOYEE DOCUMENT RECORDS STATE ---
  const [documentRecords, setDocumentRecords] = useState<EmployeeDocumentRecordItem[]>(initialDocumentRecords);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "PENDING_REVIEW" | "VERIFIED" | "INCOMPLETE" | "OWNER_EXEMPT"
  >("ALL");
  const [selectedRecordForVault, setSelectedRecordForVault] = useState<EmployeeDocumentRecordItem | null>(null);

  // Switch letter template
  const handleTemplateChange = (tpl: TemplateType) => {
    setSelectedTemplate(tpl);
    setResponsibilities(TEMPLATE_PRESETS[tpl].defaultResponsibilities);
    setPreviewData(null);
    setIssuedResult(null);
  };

  // Select existing employee for letter
  const handleSelectExistingEmployee = (empId: string) => {
    setSelectedEmployeeId(empId);
    const emp = employees.find((e) => e.employeeId === empId);
    if (emp) {
      setCandidateName(emp.fullName);
      setCandidateEmail(emp.email);
      setCandidatePhone(emp.phone || "");
      if (emp.designation) setDesignation(emp.designation);
      if (emp.department) setDepartment(emp.department);
    }
  };

  // Generate Test / Preview Letter
  const handleGenerateTestLetter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateName.trim() || !candidateEmail.trim()) {
      setError("Please provide candidate full name and email.");
      return;
    }

    try {
      setPreviewLoading(true);
      setError(null);
      setIssuedResult(null);

      const res = await fetch(`/api/letters?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "PREVIEW_HIRING",
          templateType: selectedTemplate,
          candidateName: candidateName.trim(),
          candidateEmail: candidateEmail.trim().toLowerCase(),
          candidatePhone: candidatePhone.trim() || undefined,
          designation: designation.trim(),
          department: department.trim(),
          salary: salary.trim(),
          joinDate,
          effectiveDate,
          reportingManager: reportingManager.trim(),
          responsibilities: responsibilities.trim(),
          existingEmployeeId: candidateSource === "EXISTING" ? selectedEmployeeId : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to generate test letter");

      setPreviewData(json);
      setSuccessMessage("Test letter generated successfully. Inspect the letterhead preview on the right.");
    } catch (err: any) {
      setError(err.message || "Failed to generate test letter");
    } finally {
      setPreviewLoading(false);
    }
  };

  // Share to Employee on Software (Issue directly)
  const handleIssueToSoftware = async () => {
    if (!candidateName.trim() || !candidateEmail.trim()) {
      setError("Please provide candidate full name and email.");
      return;
    }

    try {
      setIssuingSoftware(true);
      setError(null);

      const res = await fetch(`/api/letters?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ISSUE_HIRING",
          templateType: selectedTemplate,
          candidateName: candidateName.trim(),
          candidateEmail: candidateEmail.trim().toLowerCase(),
          candidatePhone: candidatePhone.trim() || undefined,
          designation: designation.trim(),
          department: department.trim(),
          salary: salary.trim(),
          joinDate,
          effectiveDate,
          reportingManager: reportingManager.trim(),
          responsibilities: responsibilities.trim(),
          existingEmployeeId: candidateSource === "EXISTING" ? selectedEmployeeId : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to issue letter on software");

      setIssuedResult(json);
      setSuccessMessage(
        `Letter officially issued to ${candidateName}! Saved to private document vault and employee profile.`
      );
      // Refresh document records in background
      refreshDocumentRecords();
    } catch (err: any) {
      setError(err.message || "Failed to issue letter on software");
    } finally {
      setIssuingSoftware(false);
    }
  };

  const copyEmailText = () => {
    const textToCopy = issuedResult?.emailBody || previewData?.emailBody;
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Refresh document records from server
  const refreshDocumentRecords = async () => {
    try {
      setRecordsLoading(true);
      const res = await fetch(`/api/documents?workspaceSlug=${workspaceSlug}&action=ALL_RECORDS`);
      if (!res.ok) throw new Error("Failed to load records");
      const json = await res.json();
      setDocumentRecords(json);
    } catch (err: any) {
      console.error("Error refreshing document records:", err);
    } finally {
      setRecordsLoading(false);
    }
  };

  // Filtered document records
  const filteredRecords = useMemo(() => {
    return documentRecords.filter((rec) => {
      // Query filter
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        rec.fullName.toLowerCase().includes(q) ||
        rec.employeeId.toLowerCase().includes(q) ||
        rec.email.toLowerCase().includes(q) ||
        (rec.department && rec.department.toLowerCase().includes(q)) ||
        (rec.designation && rec.designation.toLowerCase().includes(q));

      if (!matchesQuery) return false;

      // Status filter
      if (statusFilter === "ALL") return true;
      if (statusFilter === "PENDING_REVIEW") return rec.complianceState === "PENDING_REVIEW";
      if (statusFilter === "VERIFIED") return rec.complianceState === "VERIFIED";
      if (statusFilter === "INCOMPLETE")
        return rec.complianceState === "INCOMPLETE" || rec.complianceState === "ACTION_REQUIRED";
      if (statusFilter === "OWNER_EXEMPT") return rec.complianceState === "OWNER_EXEMPT";
      return true;
    });
  }, [documentRecords, searchQuery, statusFilter]);

  // Telemetry metrics for records
  const metrics = useMemo(() => {
    const total = documentRecords.length;
    const verified = documentRecords.filter((r) => r.complianceState === "VERIFIED").length;
    const pending = documentRecords.filter((r) => r.complianceState === "PENDING_REVIEW").length;
    const incomplete = documentRecords.filter(
      (r) => r.complianceState === "INCOMPLETE" || r.complianceState === "ACTION_REQUIRED"
    ).length;
    const exempt = documentRecords.filter((r) => r.complianceState === "OWNER_EXEMPT").length;

    return { total, verified, pending, incomplete, exempt };
  }, [documentRecords]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Breadcrumb & Quick Link */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-[#696E82]">
          <Link href={`/w/${workspaceSlug}/team`} className="hover:text-[#1F1F1F]">
            Studio Team
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-[#1F1F1F] font-semibold">Hiring &amp; Records Hub</span>
        </div>

        <Link
          href={`/w/${workspaceSlug}/team`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#696E82] hover:text-[#1F1F1F] rounded-xl hover:bg-white border border-transparent hover:border-[#E2E6F0] transition-all"
        >
          <Users className="w-3.5 h-3.5" />
          <span>Back to Team</span>
        </Link>
      </div>

      {/* Main Studio Banner */}
      <div className="bg-white rounded-3xl border border-[#E2E6F0] p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#1456F0] to-[#3B82F6] text-white flex items-center justify-center shadow-xs">
              <Stamp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg md:text-xl font-bold text-[#1F1F1F]">
                  Hiring &amp; Studio Records Hub
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EBF1FF] text-[#1456F0] border border-[#CEDEFF]">
                  Admin &amp; Owner Authority
                </span>
              </div>
              <p className="text-xs text-[#696E82] mt-0.5">
                Generate pre-templated official letters, inspect the live test preview, and audit staff compliance records employee-wise.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Hub Tabs Header */}
      <div className="flex border-b border-[#E2E6F0] space-x-1 sm:space-x-2">
        <button
          type="button"
          onClick={() => setActiveHubTab("HIRING_LETTERS")}
          className={`flex items-center gap-2 py-3 px-4 font-bold text-xs rounded-t-2xl border-b-2 transition-all cursor-pointer ${
            activeHubTab === "HIRING_LETTERS"
              ? "border-[#1456F0] text-[#1456F0] bg-white shadow-2xs"
              : "border-transparent text-[#696E82] hover:text-[#1F1F1F] hover:bg-white/60"
          }`}
        >
          <Stamp className="w-4 h-4" />
          <span>Hiring &amp; Letter Studio</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveHubTab("EMPLOYEE_RECORDS")}
          className={`flex items-center gap-2 py-3 px-4 font-bold text-xs rounded-t-2xl border-b-2 transition-all cursor-pointer ${
            activeHubTab === "EMPLOYEE_RECORDS"
              ? "border-[#1456F0] text-[#1456F0] bg-white shadow-2xs"
              : "border-transparent text-[#696E82] hover:text-[#1F1F1F] hover:bg-white/60"
          }`}
        >
          <FolderArchive className="w-4 h-4" />
          <span>Employee Document Records</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF1FF] text-[#1456F0]">
            {documentRecords.length}
          </span>
        </button>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-700 hover:text-rose-900">
            ✕
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-700 hover:text-emerald-900">
            ✕
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 1: HIRING & LETTER STUDIO */}
      {/* ======================================================== */}
      {activeHubTab === "HIRING_LETTERS" && (
        <div className="space-y-6">
          {/* Step 1: Choose 1 of 4 Standard Templates */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-[#696E82] uppercase tracking-wider block">
              Step 1: Select Official Letter Template
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {(["OFFER", "APPOINTMENT", "TERMINATION", "EXPERIENCE_CERTIFICATE"] as TemplateType[]).map(
                (tpl) => {
                  const isSelected = selectedTemplate === tpl;
                  const info = TEMPLATE_PRESETS[tpl];
                  return (
                    <button
                      key={tpl}
                      type="button"
                      onClick={() => handleTemplateChange(tpl)}
                      className={`text-left p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? "bg-[#F4F7FF] border-[#1456F0] shadow-xs ring-1 ring-[#1456F0]"
                          : "bg-white border-[#E2E6F0] hover:border-slate-300 hover:bg-[#FBFBFE]"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isSelected
                                ? "bg-[#1456F0] text-white"
                                : "bg-slate-100 text-[#696E82]"
                            }`}
                          >
                            {info.badge}
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-[#1456F0]" />}
                        </div>
                        <h3 className="text-xs font-bold text-[#1F1F1F] leading-snug">{info.title}</h3>
                        <p className="text-[11px] text-[#696E82] mt-1 line-clamp-2 leading-relaxed">
                          {info.description}
                        </p>
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* Step 2: Split View - Form on Left, Letterhead Preview on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Form & Parameters */}
            <div className="lg:col-span-6 bg-white rounded-3xl border border-[#E2E6F0] p-6 shadow-2xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E6F0]">
                <div>
                  <h2 className="text-sm font-bold text-[#1F1F1F]">
                    Step 2: Candidate &amp; Role Parameters
                  </h2>
                  <p className="text-[11px] text-[#696E82]">
                    Input candidate information to generate an instant formatted letterhead preview.
                  </p>
                </div>
              </div>

              {/* Source Mode Toggle */}
              <div className="flex items-center p-1 bg-[#F8F9FE] rounded-2xl border border-[#E2E6F0]">
                <button
                  type="button"
                  onClick={() => {
                    setCandidateSource("NEW");
                    setSelectedEmployeeId("");
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    candidateSource === "NEW"
                      ? "bg-white text-[#1456F0] shadow-2xs"
                      : "text-[#696E82] hover:text-[#1F1F1F]"
                  }`}
                >
                  New Onboarding Candidate
                </button>
                <button
                  type="button"
                  onClick={() => setCandidateSource("EXISTING")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    candidateSource === "EXISTING"
                      ? "bg-white text-[#1456F0] shadow-2xs"
                      : "text-[#696E82] hover:text-[#1F1F1F]"
                  }`}
                >
                  Existing Studio Employee
                </button>
              </div>

              {/* Existing Employee Dropdown */}
              {candidateSource === "EXISTING" && (
                <div>
                  <label className="text-xs font-bold text-[#1F1F1F] mb-1.5 block">
                    Select Employee <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => handleSelectExistingEmployee(e.target.value)}
                    className="w-full text-xs bg-[#FBFBFE] border border-[#E2E6F0] rounded-xl px-3 py-2.5 focus:border-[#1456F0] focus:ring-1 focus:ring-[#1456F0] outline-hidden text-[#1F1F1F]"
                  >
                    <option value="">-- Choose employee to generate letter --</option>
                    {employees.map((emp) => (
                      <option key={emp.employeeId} value={emp.employeeId}>
                        {emp.fullName} ({emp.employeeId}) — {emp.designation || "Associate"}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Form Input Fields */}
              <form onSubmit={handleGenerateTestLetter} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs font-bold text-[#1F1F1F] mb-1 block">
                      Candidate Full Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-[#696E82] absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        value={candidateName}
                        onChange={(e) => setCandidateName(e.target.value)}
                        placeholder="e.g. Ar. Priya Sharma"
                        className="w-full text-xs bg-[#FBFBFE] border border-[#E2E6F0] rounded-xl pl-9 pr-3 py-2.5 focus:border-[#1456F0] focus:ring-1 focus:ring-[#1456F0] outline-hidden text-[#1F1F1F]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#1F1F1F] mb-1 block">
                      Candidate Email (for Gmail share) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-[#696E82] absolute left-3 top-3" />
                      <input
                        type="email"
                        required
                        value={candidateEmail}
                        onChange={(e) => setCandidateEmail(e.target.value)}
                        placeholder="candidate@gmail.com"
                        className="w-full text-xs bg-[#FBFBFE] border border-[#E2E6F0] rounded-xl pl-9 pr-3 py-2.5 focus:border-[#1456F0] focus:ring-1 focus:ring-[#1456F0] outline-hidden text-[#1F1F1F]"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="text-xs font-bold text-[#1F1F1F] mb-1 block">
                      Designation
                    </label>
                    <div className="relative">
                      <Briefcase className="w-3.5 h-3.5 text-[#696E82] absolute left-3 top-3" />
                      <input
                        type="text"
                        value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                        placeholder="Project Architect"
                        className="w-full text-xs bg-[#FBFBFE] border border-[#E2E6F0] rounded-xl pl-9 pr-3 py-2.5 focus:border-[#1456F0] focus:ring-1 focus:ring-[#1456F0] outline-hidden text-[#1F1F1F]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#1F1F1F] mb-1 block">
                      Department
                    </label>
                    <div className="relative">
                      <Building className="w-3.5 h-3.5 text-[#696E82] absolute left-3 top-3" />
                      <input
                        type="text"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        placeholder="Architecture"
                        className="w-full text-xs bg-[#FBFBFE] border border-[#E2E6F0] rounded-xl pl-9 pr-3 py-2.5 focus:border-[#1456F0] focus:ring-1 focus:ring-[#1456F0] outline-hidden text-[#1F1F1F]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#1F1F1F] mb-1 block">
                      Package / CTC (INR)
                    </label>
                    <div className="relative">
                      <DollarSign className="w-3.5 h-3.5 text-[#696E82] absolute left-3 top-3" />
                      <input
                        type="text"
                        value={salary}
                        onChange={(e) => setSalary(e.target.value)}
                        placeholder="8,50,000"
                        className="w-full text-xs bg-[#FBFBFE] border border-[#E2E6F0] rounded-xl pl-9 pr-3 py-2.5 focus:border-[#1456F0] focus:ring-1 focus:ring-[#1456F0] outline-hidden text-[#1F1F1F]"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="text-xs font-bold text-[#1F1F1F] mb-1 block">
                      Joining Date
                    </label>
                    <div className="relative">
                      <Calendar className="w-3.5 h-3.5 text-[#696E82] absolute left-3 top-3" />
                      <input
                        type="date"
                        value={joinDate}
                        onChange={(e) => setJoinDate(e.target.value)}
                        className="w-full text-xs bg-[#FBFBFE] border border-[#E2E6F0] rounded-xl pl-9 pr-3 py-2.5 focus:border-[#1456F0] focus:ring-1 focus:ring-[#1456F0] outline-hidden text-[#1F1F1F]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#1F1F1F] mb-1 block">
                      Effective Date
                    </label>
                    <div className="relative">
                      <Calendar className="w-3.5 h-3.5 text-[#696E82] absolute left-3 top-3" />
                      <input
                        type="date"
                        value={effectiveDate}
                        onChange={(e) => setEffectiveDate(e.target.value)}
                        className="w-full text-xs bg-[#FBFBFE] border border-[#E2E6F0] rounded-xl pl-9 pr-3 py-2.5 focus:border-[#1456F0] focus:ring-1 focus:ring-[#1456F0] outline-hidden text-[#1F1F1F]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#1F1F1F] mb-1 block">
                      Reporting Lead
                    </label>
                    <input
                      type="text"
                      value={reportingManager}
                      onChange={(e) => setReportingManager(e.target.value)}
                      placeholder="Studio Lead / Partner"
                      className="w-full text-xs bg-[#FBFBFE] border border-[#E2E6F0] rounded-xl px-3 py-2.5 focus:border-[#1456F0] focus:ring-1 focus:ring-[#1456F0] outline-hidden text-[#1F1F1F]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#1F1F1F] mb-1 block">
                    Key Responsibilities / Deliverables
                  </label>
                  <textarea
                    rows={4}
                    value={responsibilities}
                    onChange={(e) => setResponsibilities(e.target.value)}
                    placeholder="Bullet points of contractual duties..."
                    className="w-full text-xs bg-[#FBFBFE] border border-[#E2E6F0] rounded-xl p-3 focus:border-[#1456F0] focus:ring-1 focus:ring-[#1456F0] outline-hidden text-[#1F1F1F] leading-relaxed resize-none"
                  />
                </div>

                {/* Submit Action */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={previewLoading}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 bg-gradient-to-r from-[#1456F0] to-[#3B82F6] hover:from-[#0E46D0] hover:to-[#2563EB] text-white text-xs font-bold rounded-2xl shadow-sm transition-all cursor-pointer disabled:opacity-50 min-h-[44px]"
                  >
                    {previewLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Rendering Test Letter...</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4" />
                        <span>Generate Test Letter</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Right Column: Live Letterhead Test Preview & Dispatch Actions */}
            <div className="lg:col-span-6 bg-white rounded-3xl border border-[#E2E6F0] p-6 shadow-2xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E6F0]">
                <div>
                  <h2 className="text-sm font-bold text-[#1F1F1F]">
                    Live Letterhead Preview &amp; Share
                  </h2>
                  <p className="text-[11px] text-[#696E82]">
                    Verify the formatted document before circulation via Software or Gmail.
                  </p>
                </div>

                {previewData && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    Test Preview Mode
                  </span>
                )}
              </div>

              {previewData ? (
                <div className="space-y-5">
                  {/* Two Sharing Options */}
                  <div className="p-4 rounded-2xl bg-[#F8FAFF] border border-[#CEDEFF] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1456F0]">
                        Letter Ready for Distribution
                      </span>
                      <span className="text-[10px] text-[#696E82]">
                        Ref: {previewData.previewNumber}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Option 1: Share to Employee on Software */}
                      <button
                        type="button"
                        onClick={handleIssueToSoftware}
                        disabled={issuingSoftware || Boolean(issuedResult)}
                        className="flex items-center justify-center gap-2 py-3 px-4 bg-[#1456F0] hover:bg-[#0E46D0] disabled:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer min-h-[44px]"
                      >
                        {issuingSoftware ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Issuing into Profile...</span>
                          </>
                        ) : issuedResult ? (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Saved on Software</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4" />
                            <span>Share on Software</span>
                          </>
                        )}
                      </button>

                      {/* Option 2: Share directly on Gmail */}
                      <a
                        href={previewData.gmailComposeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 py-3 px-4 bg-white hover:bg-slate-50 text-[#1F1F1F] border border-[#E2E6F0] hover:border-slate-300 text-xs font-bold rounded-xl shadow-2xs transition-all cursor-pointer min-h-[44px]"
                      >
                        <Mail className="w-4 h-4 text-rose-500" />
                        <span>Share on Gmail</span>
                        <ExternalLink className="w-3 h-3 text-[#696E82]" />
                      </a>
                    </div>

                    {/* Copy greeting text fallback */}
                    <div className="flex items-center justify-between pt-1 text-[11px] text-[#696E82]">
                      <span>Sender: designadmin08@gmail.com</span>
                      <button
                        type="button"
                        onClick={copyEmailText}
                        className="inline-flex items-center gap-1 text-[#1456F0] hover:underline font-semibold cursor-pointer"
                      >
                        {copiedLink ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Copied Text!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Email Text</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Rendered Letterhead Sheet */}
                  <div className="border border-[#E2E6F0] rounded-2xl p-6 bg-white shadow-xs space-y-4 font-sans text-xs">
                    {/* Header Letterhead */}
                    <div className="border-b-2 border-[#1456F0] pb-4 flex items-center justify-between">
                      <div>
                        <h2 className="text-sm font-extrabold tracking-tight text-[#1F1F1F]">
                          100% DESIGN STUDIO
                        </h2>
                        <p className="text-[10px] text-[#696E82]">
                          Architecture • BIM Governance • Project Deliverables
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-mono font-bold text-[#1456F0] bg-[#EBF1FF] px-2 py-0.5 rounded-md">
                          {previewData.previewNumber}
                        </span>
                        <p className="text-[10px] text-[#696E82] mt-0.5">{previewData.dateStr}</p>
                      </div>
                    </div>

                    {/* Candidate Reference */}
                    <div className="bg-[#F8F9FE] p-3 rounded-xl border border-[#E2E6F0] text-[11px] space-y-1">
                      <p>
                        <strong>Issued To:</strong> {previewData.candidateName}
                      </p>
                      <p>
                        <strong>Designation:</strong> {previewData.designation} &bull;{" "}
                        <strong>Department:</strong> {previewData.department}
                      </p>
                      {candidatePhone && (
                        <p>
                          <strong>Contact Phone:</strong> {candidatePhone}
                        </p>
                      )}
                      <p>
                        <strong>Email Address:</strong> {previewData.candidateEmail}
                      </p>
                    </div>

                    {/* Letter Title */}
                    <h3 className="text-center font-bold text-sm text-[#1F1F1F] underline decoration-[#1456F0] decoration-2 underline-offset-4 pt-1">
                      {previewData.title}
                    </h3>

                    {/* Letter Body Content */}
                    <div className="text-xs text-[#2A2E3D] whitespace-pre-wrap leading-relaxed space-y-3 bg-[#FCFCFD] p-4 rounded-xl border border-dashed border-[#E2E6F0]">
                      {previewData.body}
                    </div>

                    {/* Signatory Footer */}
                    <div className="pt-4 border-t border-[#E2E6F0] flex items-center justify-between text-xs">
                      <div className="space-y-1">
                        <div className="w-24 h-8 border-b border-dashed border-slate-300" />
                        <p className="font-bold text-xs text-[#1F1F1F]">{previewData.signatoryName}</p>
                        <p className="text-[10px] text-[#696E82]">{previewData.signatoryTitle}</p>
                        <p className="text-[10px] text-[#696E82]">100% DESIGN Studio</p>
                      </div>

                      <div className="text-right">
                        <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#F8F9FE] text-[#696E82] border border-[#E2E6F0]">
                          Official Sealed Document
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-24 text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-[#F8F9FE] text-[#696E82] flex items-center justify-center mx-auto border border-[#E2E6F0]">
                    <FileText className="w-7 h-7" />
                  </div>
                  <h3 className="text-sm font-bold text-[#1F1F1F]">No Test Letter Generated Yet</h3>
                  <p className="text-xs text-[#696E82] max-w-sm mx-auto leading-relaxed">
                    Fill in candidate and role details on the left, then click <strong>&quot;Generate Test Letter&quot;</strong> to preview the official studio letterhead document.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: EMPLOYEE DOCUMENT RECORDS (STORED EMPLOYEE-WISE) */}
      {/* ======================================================== */}
      {activeHubTab === "EMPLOYEE_RECORDS" && (
        <div className="space-y-6">
          {/* Telemetry Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-[#E2E6F0] p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#696E82]">Total Staff</span>
                <Users className="w-4 h-4 text-[#1456F0]" />
              </div>
              <p className="text-xl font-bold text-[#1F1F1F] mt-2 font-mono">{metrics.total}</p>
              <span className="text-[10px] text-[#696E82]">Workspace Members</span>
            </div>

            <div className="bg-white rounded-2xl border border-emerald-100 p-4 shadow-2xs bg-emerald-50/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-800">Fully Verified</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-xl font-bold text-emerald-700 mt-2 font-mono">{metrics.verified}</p>
              <span className="text-[10px] text-emerald-600">All 3 Documents Approved</span>
            </div>

            <div className="bg-white rounded-2xl border border-amber-100 p-4 shadow-2xs bg-amber-50/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-800">Pending HR Review</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-xl font-bold text-amber-700 mt-2 font-mono">{metrics.pending}</p>
              <span className="text-[10px] text-amber-600">Awaiting Admin Verification</span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#696E82]">Incomplete / Missing</span>
                <AlertCircle className="w-4 h-4 text-rose-500" />
              </div>
              <p className="text-xl font-bold text-rose-600 mt-2 font-mono">{metrics.incomplete}</p>
              <span className="text-[10px] text-[#696E82]">Pending Employee Upload</span>
            </div>
          </div>

          {/* Search & Status Filters Bar */}
          <div className="bg-white rounded-2xl border border-[#E2E6F0] p-4 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#696E82] absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff records by name, employee ID, or department..."
                className="w-full text-xs bg-[#FBFBFE] border border-[#E2E6F0] rounded-xl pl-9.5 pr-4 py-2.5 focus:border-[#1456F0] focus:ring-1 focus:ring-[#1456F0] outline-hidden text-[#1F1F1F]"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-[#696E82] font-semibold flex items-center gap-1 mr-1">
                <Filter className="w-3.5 h-3.5" /> Filter:
              </span>

              {[
                { key: "ALL", label: "All" },
                { key: "PENDING_REVIEW", label: "Pending Review" },
                { key: "VERIFIED", label: "Verified" },
                { key: "INCOMPLETE", label: "Incomplete" },
                { key: "OWNER_EXEMPT", label: "Owner Exempt" },
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setStatusFilter(f.key as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === f.key
                      ? "bg-[#1456F0] text-white shadow-2xs"
                      : "bg-[#F8F9FE] text-[#696E82] hover:text-[#1F1F1F] border border-[#E2E6F0]"
                  }`}
                >
                  {f.label}
                </button>
              ))}

              <button
                type="button"
                onClick={refreshDocumentRecords}
                disabled={recordsLoading}
                title="Refresh Records"
                className="p-2 text-[#696E82] hover:text-[#1F1F1F] rounded-xl hover:bg-[#F8F9FE] border border-[#E2E6F0] transition-all cursor-pointer ml-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${recordsLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Employee Records Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRecords.map((rec) => {
              const isOwner = rec.isOwner;

              return (
                <div
                  key={rec.id}
                  className="bg-white rounded-3xl border border-[#E2E6F0] p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-4"
                >
                  {/* Card Header: Avatar + Details + Compliance Pill */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#1456F0] to-[#5A81FA] text-white font-bold text-xs flex items-center justify-center shadow-2xs shrink-0">
                          {rec.fullName
                            .split(" ")
                            .map((p) => p[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-[#1F1F1F] leading-tight">
                            {rec.fullName}
                          </h3>
                          <p className="text-[11px] text-[#696E82] font-mono mt-0.5">
                            {rec.employeeId}
                          </p>
                        </div>
                      </div>

                      {/* Compliance Status Pill */}
                      {isOwner ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF1FF] text-[#1456F0] border border-[#CEDEFF] shrink-0">
                          Owner Exempt
                        </span>
                      ) : rec.complianceState === "VERIFIED" ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="w-3 h-3" /> Verified (3/3)
                        </span>
                      ) : rec.complianceState === "PENDING_REVIEW" ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3" /> Pending Review
                        </span>
                      ) : rec.complianceState === "ACTION_REQUIRED" ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 shrink-0">
                          <AlertTriangle className="w-3 h-3" /> Needs Attention
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-[#696E82] border border-slate-200 shrink-0">
                          Incomplete ({rec.verifiedCount}/3)
                        </span>
                      )}
                    </div>

                    {/* Role & Department Meta */}
                    <div className="flex items-center gap-2 text-[11px] text-[#696E82] mb-3">
                      <span>{rec.designation || "Studio Associate"}</span>
                      <span>&bull;</span>
                      <span>{rec.department || "Architecture"}</span>
                    </div>

                    {/* Breakdown of 3 Mandatory Documents */}
                    {isOwner ? (
                      <div className="p-3.5 rounded-2xl bg-[#F8FAFF] border border-[#CEDEFF] text-[11px] text-[#1456F0] flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 shrink-0" />
                        <span>Studio Partner — Sovereign partner exempt from document filing.</span>
                      </div>
                    ) : (
                      <div className="space-y-2 bg-[#FBFBFE] p-3 rounded-2xl border border-[#E2E6F0] text-xs">
                        {/* 1. Aadhaar Card */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-[11px] text-[#1F1F1F]">
                            <CreditCard className="w-3.5 h-3.5 text-[#696E82]" />
                            <span className="font-semibold">Aadhaar Card</span>
                          </div>
                          {rec.documents.aadhaar?.status === "VERIFIED" ? (
                            <span className="text-[10px] font-mono text-emerald-600 font-bold flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              {rec.documents.aadhaar.metadataJson?.maskedNumber || "Verified"}
                            </span>
                          ) : rec.documents.aadhaar?.status === "PENDING_REVIEW" ? (
                            <span className="text-[10px] font-mono text-amber-600 font-bold flex items-center gap-1">
                              <Clock className="w-3 h-3" /> In Review
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Not Uploaded</span>
                          )}
                        </div>

                        {/* 2. Degree Certificate */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-[11px] text-[#1F1F1F]">
                            <GraduationCap className="w-3.5 h-3.5 text-[#696E82]" />
                            <span className="font-semibold">Degree / Diploma</span>
                          </div>
                          {rec.documents.degree?.status === "VERIFIED" ? (
                            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 truncate max-w-[140px]">
                              <Check className="w-3 h-3" />
                              {rec.documents.degree.metadataJson?.degreeName || "Verified"}
                            </span>
                          ) : rec.documents.degree?.status === "PENDING_REVIEW" ? (
                            <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                              <Clock className="w-3 h-3" /> In Review
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Not Uploaded</span>
                          )}
                        </div>

                        {/* 3. Bank Passbook */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-[11px] text-[#1F1F1F]">
                            <Building className="w-3.5 h-3.5 text-[#696E82]" />
                            <span className="font-semibold">Bank Passbook</span>
                          </div>
                          {rec.documents.bankPassbook?.status === "VERIFIED" ? (
                            <span className="text-[10px] font-mono text-emerald-600 font-bold flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              {rec.documents.bankPassbook.metadataJson?.bankLast4
                                ? `•••• ${rec.documents.bankPassbook.metadataJson.bankLast4}`
                                : "Verified"}
                            </span>
                          ) : rec.documents.bankPassbook?.status === "PENDING_REVIEW" ? (
                            <span className="text-[10px] font-mono text-amber-600 font-bold flex items-center gap-1">
                              <Clock className="w-3 h-3" /> In Review
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Not Uploaded</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Action */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedRecordForVault(rec)}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#F8F9FE] hover:bg-[#EBF1FF] text-[#1456F0] border border-[#E2E6F0] hover:border-[#CEDEFF] text-xs font-bold rounded-xl transition-all cursor-pointer min-h-[40px]"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect Document Vault</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredRecords.length === 0 && (
            <div className="bg-white rounded-3xl border border-[#E2E6F0] p-12 text-center space-y-3">
              <FolderArchive className="w-10 h-10 text-[#696E82] mx-auto" />
              <h3 className="text-sm font-bold text-[#1F1F1F]">No Matching Employee Records</h3>
              <p className="text-xs text-[#696E82]">
                Try adjusting your search query or status filter to locate employee records.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SLIDE-OVER DRAWER: INSPECT EMPLOYEE DOCUMENT VAULT */}
      {/* ======================================================== */}
      {selectedRecordForVault && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-[#F8FAFC] h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="bg-white border-b border-[#E2E6F0] px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#1456F0] to-[#3B82F6] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  {selectedRecordForVault.fullName
                    .split(" ")
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-[#1F1F1F]">
                      {selectedRecordForVault.fullName}
                    </h2>
                    <span className="font-mono text-[10px] text-[#1456F0] bg-[#EBF1FF] px-2 py-0.5 rounded-md font-bold">
                      {selectedRecordForVault.employeeId}
                    </span>
                  </div>
                  <p className="text-xs text-[#696E82]">
                    {selectedRecordForVault.designation || "Associate"} &bull;{" "}
                    {selectedRecordForVault.department || "Architecture"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedRecordForVault(null);
                  refreshDocumentRecords();
                }}
                className="p-2 text-[#696E82] hover:text-[#1F1F1F] rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body: Mounts EmployeeDocumentVaultView */}
            <div className="flex-1 overflow-y-auto p-6">
              {selectedRecordForVault.isOwner ? (
                <div className="bg-white rounded-2xl border border-[#CEDEFF] p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#EBF1FF] text-[#1456F0] flex items-center justify-center mx-auto shadow-xs">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-[#1F1F1F]">Studio Sovereign Owner</h4>
                  <p className="text-xs text-[#696E82] max-w-md mx-auto leading-relaxed">
                    Studio Partners and Sovereign Owners hold platform equity and are exempt from mandatory employment document filing.
                  </p>
                </div>
              ) : (
                <EmployeeDocumentVaultView
                  context={context}
                  employeeId={selectedRecordForVault.employeeId}
                  canManageHR={true}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
