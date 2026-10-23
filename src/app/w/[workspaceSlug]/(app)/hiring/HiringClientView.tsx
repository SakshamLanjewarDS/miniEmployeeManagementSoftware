"use client";

import React, { useState } from "react";
import Link from "next/link";
import { TenantContext } from "@/server/tenancy/context";
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
  templates,
}: HiringClientViewProps) {
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

  // Switch template
  const handleTemplateChange = (tpl: TemplateType) => {
    setSelectedTemplate(tpl);
    setResponsibilities(TEMPLATE_PRESETS[tpl].defaultResponsibilities);
    setPreviewData(null);
    setIssuedResult(null);
  };

  // Select existing employee
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
      setSuccessMessage("Test letter generated successfully. Review the letterhead preview below.");
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
        `Letter officially issued to ${candidateName}! Saved to document vault and employee profile.`
      );
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-[#696E82]">
          <Link href={`/w/${workspaceSlug}/team`} className="hover:text-[#1F1F1F]">
            Studio Team
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-[#1F1F1F] font-semibold">Hiring &amp; Letter Studio</span>
        </div>

        <Link
          href={`/w/${workspaceSlug}/team`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#696E82] hover:text-[#1F1F1F] rounded-xl hover:bg-white border border-transparent hover:border-[#E2E6F0] transition-all"
        >
          <Users className="w-3.5 h-3.5" />
          <span>Back to Team</span>
        </Link>
      </div>

      {/* Main Header */}
      <div className="bg-white rounded-3xl border border-[#E2E6F0] p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#1456F0] to-[#3B82F6] text-white flex items-center justify-center shadow-xs">
              <Stamp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg md:text-xl font-bold text-[#1F1F1F]">
                  Hiring &amp; Official Letters Studio
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EBF1FF] text-[#1456F0] border border-[#CEDEFF]">
                  Admin Exclusive
                </span>
              </div>
              <p className="text-xs text-[#696E82] mt-0.5">
                Generate pre-templated official letters, inspect the live test preview, and circulate directly via Software or Gmail.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
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

      {/* Step 1: Choose 1 of 4 Standard Templates */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-[#696E82] uppercase tracking-wider block">
          Step 1: Select Official Letter Template
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(["OFFER", "APPOINTMENT", "TERMINATION", "EXPERIENCE_CERTIFICATE"] as const).map(
            (tplKey) => {
              const preset = TEMPLATE_PRESETS[tplKey];
              const isSelected = selectedTemplate === tplKey;
              return (
                <button
                  key={tplKey}
                  type="button"
                  onClick={() => handleTemplateChange(tplKey)}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[110px] ${
                    isSelected
                      ? "bg-[#F4F7FF] border-[#1456F0] shadow-sm ring-1 ring-[#1456F0]"
                      : "bg-white border-[#E2E6F0] hover:border-[#CEDEFF]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        isSelected
                          ? "bg-[#1456F0] text-white"
                          : "bg-[#F8F9FE] text-[#696E82] border border-[#E2E6F0]"
                      }`}
                    >
                      {preset.badge}
                    </span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-[#1456F0]" />}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[#1F1F1F] mt-2">{preset.title}</h3>
                    <p className="text-[11px] text-[#696E82] line-clamp-2 mt-0.5 leading-relaxed">
                      {preset.description}
                    </p>
                  </div>
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* Main Split Grid: Left Form & Right Test Letter / Circulation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Letter Configuration Form */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-[#E2E6F0] p-6 shadow-2xs space-y-5">
          <div className="border-b border-[#F0F2F7] pb-3">
            <h2 className="text-sm font-bold text-[#1F1F1F]">
              Step 2: Candidate &amp; Letter Parameters
            </h2>
            <p className="text-xs text-[#696E82] mt-0.5">
              Insert candidate credentials, compensation package, and key duties.
            </p>
          </div>

          <form onSubmit={handleGenerateTestLetter} className="space-y-4 text-xs">
            {/* Candidate Source */}
            <div className="p-3 bg-[#F8F9FE] rounded-2xl border border-[#E2E6F0] space-y-2">
              <span className="font-semibold text-[#1F1F1F] block text-[11px]">Recipient Target</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCandidateSource("NEW");
                    setSelectedEmployeeId("");
                  }}
                  className={`flex-1 py-1.5 px-3 rounded-xl font-semibold text-xs transition-all ${
                    candidateSource === "NEW"
                      ? "bg-white text-[#1456F0] shadow-2xs border border-[#CEDEFF]"
                      : "text-[#696E82] hover:text-[#1F1F1F]"
                  }`}
                >
                  Selected Hire / New Candidate
                </button>
                <button
                  type="button"
                  onClick={() => setCandidateSource("EXISTING")}
                  className={`flex-1 py-1.5 px-3 rounded-xl font-semibold text-xs transition-all ${
                    candidateSource === "EXISTING"
                      ? "bg-white text-[#1456F0] shadow-2xs border border-[#CEDEFF]"
                      : "text-[#696E82] hover:text-[#1F1F1F]"
                  }`}
                >
                  Existing Colleague
                </button>
              </div>

              {candidateSource === "EXISTING" && (
                <div className="pt-2">
                  <label className="text-[11px] text-[#696E82] block mb-1">Pick Studio Colleague</label>
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => handleSelectExistingEmployee(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#E2E6F0] rounded-xl text-xs font-medium"
                  >
                    <option value="">-- Choose Colleague --</option>
                    {employees.map((emp) => (
                      <option key={emp.employeeId} value={emp.employeeId}>
                        {emp.fullName} ({emp.employeeId}) — {emp.designation || emp.department}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Candidate Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-[#1F1F1F] block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  placeholder="e.g. Ar. Aditi Sharma"
                  className="w-full p-2.5 bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl text-xs focus:bg-white focus:border-[#1456F0] outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-[#1F1F1F] block mb-1">Email (for Gmail dispatch)</label>
                <input
                  type="email"
                  required
                  value={candidateEmail}
                  onChange={(e) => setCandidateEmail(e.target.value)}
                  placeholder="e.g. aditi.sharma@example.com"
                  className="w-full p-2.5 bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl text-xs focus:bg-white focus:border-[#1456F0] outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-[#1F1F1F] block mb-1">Phone Number (Optional)</label>
                <input
                  type="tel"
                  value={candidatePhone}
                  onChange={(e) => setCandidatePhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full p-2.5 bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl text-xs focus:bg-white focus:border-[#1456F0] outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-[#1F1F1F] block mb-1">Official Designation</label>
                <input
                  type="text"
                  required
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g. Senior Project Architect"
                  className="w-full p-2.5 bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl text-xs focus:bg-white focus:border-[#1456F0] outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-[#1F1F1F] block mb-1">Studio Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl text-xs font-medium focus:bg-white focus:border-[#1456F0] outline-none"
                >
                  <option value="Architecture">Architecture</option>
                  <option value="Interior Design">Interior Design</option>
                  <option value="Landscape">Landscape</option>
                  <option value="3D Visualization">3D Visualization</option>
                  <option value="Site Supervision">Site Supervision</option>
                  <option value="Studio Operations">Studio Operations</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-[#1F1F1F] block mb-1">Annual CTC / Compensation (INR)</label>
                <input
                  type="text"
                  required
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  placeholder="e.g. 7,50,000"
                  className="w-full p-2.5 bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl text-xs focus:bg-white focus:border-[#1456F0] outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-[#1F1F1F] block mb-1">
                  {selectedTemplate === "OFFER" ? "Scheduled Joining Date" : "Effective Date"}
                </label>
                <input
                  type="date"
                  required
                  value={selectedTemplate === "OFFER" ? joinDate : effectiveDate}
                  onChange={(e) =>
                    selectedTemplate === "OFFER"
                      ? setJoinDate(e.target.value)
                      : setEffectiveDate(e.target.value)
                  }
                  className="w-full p-2.5 bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl text-xs focus:bg-white focus:border-[#1456F0] outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-[#1F1F1F] block mb-1">Reporting Lead / Partner</label>
                <input
                  type="text"
                  required
                  value={reportingManager}
                  onChange={(e) => setReportingManager(e.target.value)}
                  placeholder="e.g. Studio Partner"
                  className="w-full p-2.5 bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl text-xs focus:bg-white focus:border-[#1456F0] outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-[#1F1F1F]">Roles &amp; Key Responsibilities</label>
                <span className="text-[10px] text-[#696E82]">Inserted in letter body</span>
              </div>
              <textarea
                rows={4}
                required
                value={responsibilities}
                onChange={(e) => setResponsibilities(e.target.value)}
                placeholder="List key architectural deliverables and duties..."
                className="w-full p-3 bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl text-xs focus:bg-white focus:border-[#1456F0] outline-none resize-none leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={previewLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#1456F0] hover:bg-[#0E46D0] text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {previewLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
              <span>{previewLoading ? "Generating Test Letter..." : "Generate Test Letter"}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Live Testing Letter & Circulation Bar */}
        <div className="lg:col-span-7 space-y-5">
          {/* Step 3: Analysis & Circulation Center */}
          <div className="bg-white rounded-3xl border border-[#E2E6F0] p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F0F2F7] pb-3">
              <div>
                <h2 className="text-sm font-bold text-[#1F1F1F]">
                  Step 3: Test Verification &amp; One-Click Circulation
                </h2>
                <p className="text-xs text-[#696E82] mt-0.5">
                  Verify letter details below. Once satisfied, circulate via Software or direct Gmail.
                </p>
              </div>

              {previewData && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span>Test Preview Ready</span>
                </span>
              )}
            </div>

            {/* Circulation Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={handleIssueToSoftware}
                disabled={!previewData || issuingSoftware}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {issuingSoftware ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                <span>
                  {issuingSoftware ? "Issuing to Software..." : "Share to Employee on Software"}
                </span>
              </button>

              <a
                href={issuedResult?.gmailUrl || previewData?.gmailUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (!previewData) {
                    e.preventDefault();
                    setError("Generate test letter first before sharing via Gmail.");
                  }
                }}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white text-xs font-bold shadow-xs transition-all ${
                  previewData
                    ? "bg-[#EA4335] hover:bg-[#D93025] cursor-pointer"
                    : "bg-slate-300 cursor-not-allowed pointer-events-none"
                }`}
              >
                <Mail className="w-4 h-4" />
                <span>Share directly on Gmail</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={copyEmailText}
                disabled={!previewData}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1456F0] hover:underline disabled:opacity-40"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? "Email text copied to clipboard!" : "Copy Greeting & Letter Summary"}</span>
              </button>

              {previewData?.mailtoUrl && (
                <a
                  href={previewData.mailtoUrl}
                  className="text-xs text-[#696E82] hover:text-[#1F1F1F] hover:underline"
                >
                  Open in desktop email
                </a>
              )}
            </div>

            {issuedResult && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Official Letter Issued (Ref: {issuedResult.letter?.letterNumber})</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  Assigned Employee ID: <span className="font-mono font-bold">{issuedResult.assignedEmployeeId}</span>. The letter has been permanently locked, rendered into signed A4 PDF, and published to the recipient portal.
                </p>
              </div>
            )}
          </div>

          {/* Official Letterhead Live Preview Sheet */}
          <div className="bg-white rounded-3xl border border-[#E2E6F0] p-6 sm:p-8 shadow-sm space-y-6 min-h-[500px]">
            {previewData ? (
              <div className="space-y-6">
                {/* Letterhead Header */}
                <div className="flex items-start justify-between border-b-2 border-[#1F1F1F] pb-4">
                  <div>
                    <h2 className="text-xl font-extrabold tracking-tight text-[#1F1F1F]">
                      100% DESIGN STUDIO
                    </h2>
                    <p className="text-[10px] tracking-wider uppercase text-[#696E82] font-semibold mt-0.5">
                      Architecture • Urban Design • Interior Architecture
                    </p>
                    <p className="text-[10px] text-[#696E82] mt-0.5">
                      Studio 100, Design Boulevard, Mumbai, India • designadmin08@gmail.com
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="inline-block px-2.5 py-1 rounded bg-[#F8F9FE] border border-[#E2E6F0] font-mono text-[10px] font-bold text-[#1456F0]">
                      {previewData.referenceNumber}
                    </span>
                    <p className="text-[10px] text-[#696E82] mt-1 font-medium">
                      Date: {previewData.dateStr}
                    </p>
                  </div>
                </div>

                {/* Recipient Block */}
                <div className="text-xs space-y-0.5">
                  <p className="text-[10px] uppercase font-bold text-[#696E82]">To:</p>
                  <p className="font-bold text-sm text-[#1F1F1F]">{candidateName}</p>
                  <p className="text-[#696E82]">{candidateEmail}</p>
                  {candidatePhone && <p className="text-[#696E82]">{candidatePhone}</p>}
                </div>

                {/* Letter Title */}
                <div className="text-center py-2 border-y border-[#F0F2F7]">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#1F1F1F]">
                    {previewData.title}
                  </h3>
                </div>

                {/* Body Content */}
                <div className="text-xs text-[#1F1F1F] leading-relaxed whitespace-pre-wrap font-sans space-y-2">
                  {previewData.bodyContent}
                </div>

                {/* Signatory Block */}
                <div className="pt-8 border-t border-[#F0F2F7] flex items-end justify-between">
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
    </div>
  );
}
