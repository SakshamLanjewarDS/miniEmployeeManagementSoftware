"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Mail,
  Send,
  Users,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  MessageSquare,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Filter,
  Eye,
  RefreshCw,
  Mic,
} from "lucide-react";
import { EmployeeItem } from "@/app/w/[workspaceSlug]/(app)/team/TeamClientView";
import { correctGrammar } from "@/lib/grammar/grammarEngine";
import { SearchableDropdown } from "@/components/ui/SearchableDropdown";

interface BulkMailModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceSlug: string;
  allEmployees: EmployeeItem[];
  initiallySelectedIds: string[];
  onDispatchSuccess?: () => void;
}

type TemplateType = "LEAVE_NOTICE" | "FUNCTION_GREETING" | "CIRCULAR" | "CREDENTIALS" | "CUSTOM";

interface TemplateConfig {
  type: TemplateType;
  title: string;
  icon: string;
  badgeColor: string;
  defaultSubject: string;
  defaultBody: string;
}

const TEMPLATES: TemplateConfig[] = [
  {
    type: "LEAVE_NOTICE",
    title: "Leave & Holiday Notice",
    icon: "🏖️",
    badgeColor: "bg-amber-100 text-amber-900 border-amber-300",
    defaultSubject: "[100% DESIGN Studio] Official Notice: Studio Holiday & Leave Schedule for {name} ({employeeId})",
    defaultBody: `Hello {name},

Please note the official studio leave schedule and upcoming holiday guidelines for 100% DESIGN Studio.

• Employee Name: {name}
• Employee ID: {employeeId}
• Designation: {designation} ({department})
• Date of Notice: {date}

Important Guidelines:
1. The studio will observe scheduled festival and public holidays as per the architectural calendar.
2. Please ensure all CAD drawings, 3D renders, and site visit logs are submitted before taking leave.
3. For emergency client requests or urgent project revisions, please coordinate with your Project Lead.

Login Portal: {loginUrl}

Warm regards,
Saksham Lanjewar
Studio Administrator & Owner
100% DESIGN Studio`,
  },
  {
    type: "FUNCTION_GREETING",
    title: "Festival & Function Greeting",
    icon: "🎉",
    badgeColor: "bg-purple-100 text-purple-900 border-purple-300",
    defaultSubject: "[100% DESIGN Studio] Warm Greetings & Celebration Invitation for {name} ({employeeId})",
    defaultBody: `Dear {name},

On behalf of 100% DESIGN Studio, we extend our warmest greetings and heartfelt festive wishes to you and your loved ones!

• Team Member: {name}
• Employee ID: {employeeId}
• Department: {department}

You are cordially invited to our upcoming Studio Annual Celebration & Team Get-Together:
📅 Event: Studio Celebration & Architectural Showcase
📍 Venue: 100% DESIGN Studio Main Hall
👔 Dress Code: Festive / Studio Casuals

Thank you for your continuous creativity, dedication, and passion towards creating outstanding architectural spaces.

Warm wishes,
Management & Partners
100% DESIGN Studio`,
  },
  {
    type: "CIRCULAR",
    title: "Studio Circular & Review",
    icon: "📢",
    badgeColor: "bg-blue-100 text-blue-900 border-blue-300",
    defaultSubject: "[100% DESIGN Studio] Project Review & Architecture Workflow Circular ({employeeId})",
    defaultBody: `Hello {name},

This is an official administrative circular regarding upcoming project milestones and design documentation reviews.

• Assigned Member: {name}
• Employee ID: {employeeId}
• Designation: {designation}
• Studio Practice: {workspace}

Action Required:
1. Ensure all assigned task checklists are updated in Studio OS before 6:00 PM this Friday.
2. Submit latest revision drawing files for Partner sign-off.
3. Synchronize site visit inspection logs and contractor notes.

Access your assigned tasks: {loginUrl}

Regards,
Studio Administration
100% DESIGN Studio`,
  },
  {
    type: "CREDENTIALS",
    title: "Credentials & Access",
    icon: "🔐",
    badgeColor: "bg-emerald-100 text-emerald-900 border-emerald-300",
    defaultSubject: "[100% DESIGN Studio] Your Studio OS Login Credentials & Access Details ({employeeId})",
    defaultBody: `Hello {name},

Here are your official 100% DESIGN Studio OS system access details:

• Portal URL: {loginUrl}
• Employee ID: {employeeId}
• Registered Email: {email}
• Designation: {designation}
• Department: {department}

Please keep your login credentials secure. You can log in anytime to review your assigned architecture projects, drawings, and task timelines.

If you need your password reset or credentials updated, please contact the Studio Administrator.

100% DESIGN Studio`,
  },
  {
    type: "CUSTOM",
    title: "Custom Announcement",
    icon: "✏️",
    badgeColor: "bg-gray-100 text-gray-900 border-gray-300",
    defaultSubject: "[100% DESIGN Studio] Important Studio Update for {name} ({employeeId})",
    defaultBody: `Hello {name},

We have an important announcement for all members of {workspace}.

• Name: {name}
• ID: {employeeId}
• Designation: {designation}

[Type your custom announcement message here...]

Regards,
100% DESIGN Studio Management`,
  },
];

const AVAILABLE_VARIABLES = [
  { tag: "{name}", label: "Full Name", sample: "Saksham Lanjewar" },
  { tag: "{employeeId}", label: "Employee ID", sample: "EMP-001" },
  { tag: "{email}", label: "Work Email", sample: "designsaksham1@gmail.com" },
  { tag: "{designation}", label: "Designation", sample: "Principal Architect" },
  { tag: "{department}", label: "Department", sample: "Design & Planning" },
  { tag: "{workspace}", label: "Workspace Name", sample: "100% DESIGN Studio" },
  { tag: "{date}", label: "Today's Date", sample: "1 October 2026" },
  { tag: "{loginUrl}", label: "Login Portal URL", sample: "http://localhost:3000/w/100percentdesign/login" },
];

export default function BulkMailModal({
  isOpen,
  onClose,
  workspaceSlug,
  allEmployees,
  initiallySelectedIds,
  onDispatchSuccess,
}: BulkMailModalProps) {
  const companyEmail = "designadmin08@gmail.com";

  // Selected employee IDs
  const [selectedIds, setSelectedIds] = useState<string[]>(initiallySelectedIds);
  const [selectedTemplateType, setSelectedTemplateType] = useState<TemplateType>("LEAVE_NOTICE");
  const [subject, setSubject] = useState<string>(TEMPLATES[0].defaultSubject);
  const [bodyText, setBodyText] = useState<string>(TEMPLATES[0].defaultBody);
  const [previewEmployeeId, setPreviewEmployeeId] = useState<string>(
    allEmployees[0]?.membershipId || ""
  );

  // Dispatch state
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [dispatchResult, setDispatchResult] = useState<any | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"compose" | "preview" | "recipients">("compose");

  // Keep selectedIds updated when initiallySelectedIds change upon opening
  React.useEffect(() => {
    if (initiallySelectedIds.length > 0) {
      setSelectedIds(initiallySelectedIds);
      if (initiallySelectedIds[0]) setPreviewEmployeeId(initiallySelectedIds[0]);
    } else {
      // Default to selecting all active employees
      const activeIds = allEmployees.filter((e) => e.isActive).map((e) => e.membershipId);
      setSelectedIds(activeIds);
      if (activeIds[0]) setPreviewEmployeeId(activeIds[0]);
    }
  }, [isOpen, initiallySelectedIds, allEmployees]);

  const selectedEmployees = useMemo(() => {
    return allEmployees.filter((e) => selectedIds.includes(e.membershipId));
  }, [allEmployees, selectedIds]);

  const previewEmployee = useMemo(() => {
    return (
      allEmployees.find((e) => e.membershipId === previewEmployeeId) ||
      selectedEmployees[0] ||
      allEmployees[0]
    );
  }, [allEmployees, previewEmployeeId, selectedEmployees]);

  // Handle template selection
  const handleSelectTemplate = (tmpl: TemplateConfig) => {
    setSelectedTemplateType(tmpl.type);
    setSubject(tmpl.defaultSubject);
    setBodyText(tmpl.defaultBody);
  };

  // Interpolation helper
  const interpolate = (text: string, emp: EmployeeItem | undefined) => {
    if (!emp) return text;
    const currentDate = new Date().toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return text
      .replace(/\{name\}/gi, emp.fullName)
      .replace(/\{employeeId\}/gi, emp.employeeId)
      .replace(/\{email\}/gi, emp.email)
      .replace(/\{designation\}/gi, emp.designation || "Architect")
      .replace(/\{department\}/gi, emp.department || "Architecture")
      .replace(/\{workspace\}/gi, "100% DESIGN Studio")
      .replace(/\{date\}/gi, currentDate)
      .replace(/\{companyEmail\}/gi, companyEmail)
      .replace(/\{loginUrl\}/gi, `http://localhost:3000/w/${workspaceSlug}/login`);
  };

  // Insert variable tag into body text
  const insertVariable = (tag: string) => {
    setBodyText((prev) => prev + " " + tag);
  };

  // Toggle single employee selection
  const toggleEmployee = (membershipId: string) => {
    setSelectedIds((prev) =>
      prev.includes(membershipId)
        ? prev.filter((id) => id !== membershipId)
        : [...prev, membershipId]
    );
  };

  // Select all active
  const selectAllActive = () => {
    const activeIds = allEmployees.filter((e) => e.isActive).map((e) => e.membershipId);
    setSelectedIds(activeIds);
  };

  // Clear all
  const clearAll = () => {
    setSelectedIds([]);
  };

  // Group Gmail broadcast URL
  const groupGmailUrl = useMemo(() => {
    if (selectedEmployees.length === 0) return "#";
    const bccList = selectedEmployees.map((e) => e.email).join(",");
    const sampleSubject = interpolate(subject, selectedEmployees[0]);
    const sampleBody = interpolate(bodyText, selectedEmployees[0]);

    return `https://mail.google.com/mail/u/?authuser=${encodeURIComponent(
      companyEmail
    )}&view=cm&fs=1&bcc=${encodeURIComponent(bccList)}&su=${encodeURIComponent(
      sampleSubject
    )}&body=${encodeURIComponent(sampleBody)}`;
  }, [selectedEmployees, subject, bodyText, companyEmail]);

  // Dispatch to Outbox
  const handleDispatchToOutbox = async () => {
    if (selectedEmployees.length === 0) {
      setError("Please select at least one employee recipient.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/notifications/bulk?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceSlug,
          templateType: selectedTemplateType,
          subjectTemplate: subject,
          bodyTemplate: bodyText,
          recipients: selectedEmployees.map((e) => ({
            membershipId: e.membershipId,
            employeeId: e.employeeId,
            fullName: e.fullName,
            email: e.email,
            phone: e.phone,
            designation: e.designation,
            department: e.department,
          })),
          createInAppNotification: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to dispatch notifications");
      } else {
        setDispatchResult(data);
        if (onDispatchSuccess) onDispatchSuccess();
      }
    } catch {
      setError("Network error while dispatching bulk communications");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#E2E6F0] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E6F0] bg-[#F8F9FD] flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EA4335]/10 text-[#EA4335] flex items-center justify-center border border-[#EA4335]/20">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#1F1F1F]">
                  Bulk Employee Mail & Announcement
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EA4335] text-white">
                  {selectedEmployees.length} Recipient{selectedEmployees.length !== 1 ? "s" : ""}
                </span>
              </div>
              <p className="text-xs text-[#696E82] flex items-center gap-1.5 mt-0.5">
                <span>Official Sender:</span>
                <strong className="text-[#1F1F1F] font-mono font-semibold">
                  {companyEmail}
                </strong>
                <span>&bull; Direct Gmail Web & Outbox Integration</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#696E82] hover:text-[#1F1F1F] hover:bg-[#E2E6F0] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Dispatch View */}
        {dispatchResult ? (
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-emerald-950">
                  Bulk Communication Successfully Dispatched!
                </h3>
                <p className="text-xs text-emerald-800 mt-1">
                  Queued <strong>{dispatchResult.outboxEntriesCreated}</strong> email
                  notifications in the Studio Outbox and posted{" "}
                  <strong>{dispatchResult.inAppNotificationsCreated}</strong> in-app alerts to
                  employee dashboards.
                </p>
              </div>
            </div>

            {/* Quick 1-Click Launch All in Gmail */}
            <div className="p-4 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-[#1F1F1F]">
                  Send Broadcast in One Go via Gmail
                </div>
                <div className="text-[11px] text-[#696E82]">
                  Opens Gmail Web with all {dispatchResult.totalRecipients} emails in BCC from{" "}
                  <strong>{companyEmail}</strong>
                </div>
              </div>
              <a
                href={dispatchResult.groupGmailUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-[#EA4335] hover:bg-[#D93025] text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors shrink-0"
              >
                <Mail className="w-4 h-4" />
                <span>Open Group Compose in Gmail</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Individual Dispatched List */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-[#1F1F1F] block">
                Individual Personalized Actions ({dispatchResult.dispatchedRecipients.length}):
              </span>
              <div className="divide-y divide-[#E2E6F0] border border-[#E2E6F0] rounded-xl max-h-72 overflow-y-auto bg-white">
                {dispatchResult.dispatchedRecipients.map(
                  (r: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#F8F9FD]"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[11px] text-[#5A81FA]">
                            {r.employeeId}
                          </span>
                          <span className="font-bold text-xs text-[#1F1F1F]">{r.fullName}</span>
                          <span className="text-[10px] text-[#696E82]">({r.email})</span>
                        </div>
                        <div className="text-[11px] text-[#696E82] truncate max-w-md">
                          Sub: {r.personalizedSubject}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={r.gmailUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 bg-[#EA4335] hover:bg-[#D93025] text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                          title="Open personalized compose in Gmail"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>Gmail</span>
                        </a>

                        {r.whatsappUrl && (
                          <a
                            href={r.whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                            title="Send personalized message via WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `${r.personalizedSubject}\n\n${r.personalizedBody}`
                            );
                            setCopiedId(r.membershipId);
                            setTimeout(() => setCopiedId(null), 2000);
                          }}
                          className="px-2.5 py-1.5 bg-white border border-[#E2E6F0] hover:bg-[#F8F9FD] text-[#1F1F1F] rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                        >
                          {copiedId === r.membershipId ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-[#696E82]" />
                          )}
                          <span>{copiedId === r.membershipId ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-[#E2E6F0] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDispatchResult(null)}
                className="px-4 py-2 border border-[#E2E6F0] hover:bg-[#F8F9FD] rounded-xl text-xs font-semibold text-[#1F1F1F] transition-colors"
              >
                Compose Another Notice
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-[#1F1F1F] hover:bg-black text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Main Compose View */
          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* Template Selector Bar */}
            <div className="p-4 border-b border-[#E2E6F0] bg-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1F1F1F] uppercase tracking-wider">
                  Select Announcement Template
                </span>
                <span className="text-[11px] text-[#696E82]">
                  Customizable with dynamic tags: <code className="text-[#5A81FA]">{`{name}`}</code>,{" "}
                  <code className="text-[#5A81FA]">{`{employeeId}`}</code>
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {TEMPLATES.map((tmpl) => {
                  const isSelected = selectedTemplateType === tmpl.type;
                  return (
                    <button
                      key={tmpl.type}
                      type="button"
                      onClick={() => handleSelectTemplate(tmpl)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#1F1F1F] text-white shadow-xs"
                          : "bg-[#F8F9FD] border border-[#E2E6F0] text-[#1F1F1F] hover:bg-[#EEF2FF]"
                      }`}
                    >
                      <span>{tmpl.icon}</span>
                      <span>{tmpl.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Navigation Tabs (Compose / Live Preview / Recipients) */}
            <div className="px-6 border-b border-[#E2E6F0] bg-[#F8F9FD] flex gap-4 text-xs font-semibold text-[#696E82]">
              <button
                type="button"
                onClick={() => setActiveTab("compose")}
                className={`py-2.5 border-b-2 transition-colors cursor-pointer ${
                  activeTab === "compose"
                    ? "border-[#EA4335] text-[#EA4335]"
                    : "border-transparent hover:text-[#1F1F1F]"
                }`}
              >
                1. Edit Subject & Content
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`py-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1 ${
                  activeTab === "preview"
                    ? "border-[#EA4335] text-[#EA4335]"
                    : "border-transparent hover:text-[#1F1F1F]"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>2. Live Preview as Employee</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("recipients")}
                className={`py-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1 ${
                  activeTab === "recipients"
                    ? "border-[#EA4335] text-[#EA4335]"
                    : "border-transparent hover:text-[#1F1F1F]"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>3. Selected Recipients ({selectedEmployees.length})</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* TAB 1: COMPOSE */}
              {activeTab === "compose" && (
                <div className="space-y-4">
                  {/* Subject line */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-[#1F1F1F]">
                        Email Subject
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const { correctedText } = correctGrammar(subject);
                          setSubject(correctedText);
                        }}
                        className="text-[11px] text-[#5A81FA] hover:text-[#426EE8] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Auto-correct grammar & spelling in subject (or Ctrl+Shift+G)"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Fix Grammar</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Email Subject..."
                      className="w-full px-3.5 py-2.5 text-xs bg-white border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#EA4335] focus:border-transparent font-medium"
                    />
                  </div>

                  {/* Dynamic Variable Chips */}
                  <div>
                    <div className="text-[11px] font-semibold text-[#696E82] mb-1.5 flex items-center justify-between">
                      <span>Click to Insert Dynamic Personalized Variable:</span>
                      <span className="text-[10px] text-[#A8B1CE]">
                        Substitutes each employee's details automatically
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {AVAILABLE_VARIABLES.map((v) => (
                        <button
                          key={v.tag}
                          type="button"
                          onClick={() => insertVariable(v.tag)}
                          className="px-2.5 py-1 bg-[#F8F9FD] border border-[#CEDEFF] hover:bg-[#EEF2FF] hover:border-[#5A81FA] text-[#2563EB] rounded-lg text-[11px] font-mono font-medium flex items-center gap-1 transition-all cursor-pointer"
                          title={`Insert ${v.label} (e.g. ${v.sample})`}
                        >
                          <span className="font-bold">+</span>
                          <span>{v.tag}</span>
                          <span className="text-[10px] text-[#696E82] font-sans">({v.label})</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Email Body */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-[#1F1F1F]">
                        Email Body Content
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const { correctedText } = correctGrammar(bodyText);
                          setBodyText(correctedText);
                        }}
                        className="text-[11px] text-[#5A81FA] hover:text-[#426EE8] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Auto-correct grammar & spelling in body text (or Ctrl+Shift+G)"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Fix Grammar</span>
                      </button>
                    </div>
                    <textarea
                      rows={11}
                      value={bodyText}
                      onChange={(e) => setBodyText(e.target.value)}
                      placeholder="Type your message content here (Voice dictation supported via Ctrl+Shift+V)..."
                      className="w-full p-3.5 text-xs bg-white border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#EA4335] focus:border-transparent font-mono leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: LIVE PREVIEW */}
              {activeTab === "preview" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl">
                    <div className="text-xs font-semibold text-[#1F1F1F]">
                      Simulate and preview how the email appears for:
                    </div>
                    <div className="w-full sm:w-[280px]">
                      <SearchableDropdown
                        size="sm"
                        optionType="employee"
                        searchable={true}
                        clearable={false}
                        value={previewEmployee?.membershipId || ""}
                        onChange={(val) => setPreviewEmployeeId(val as string)}
                        placeholder="Select recipient to preview..."
                        searchPlaceholder="Search recipient..."
                        options={selectedEmployees.map((e) => ({
                          value: e.membershipId,
                          label: e.fullName,
                          employeeId: e.employeeId,
                          email: e.email,
                          type: "employee" as const,
                        }))}
                      />
                    </div>
                  </div>

                  {/* Mock Email Client Preview Card */}
                  <div className="border border-[#E2E6F0] rounded-2xl overflow-hidden bg-white shadow-xs">
                    {/* Fake Browser / Email Bar */}
                    <div className="p-3 bg-[#1F1F1F] text-white flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block" />
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                        <span className="font-semibold text-white/80 ml-2">
                          100% DESIGN Studio — Recipient View
                        </span>
                      </div>
                      <span className="text-[10px] text-white/60">Asia/Kolkata</span>
                    </div>

                    <div className="p-5 space-y-4 bg-white">
                      <div className="border-b border-[#E2E6F0] pb-3 space-y-1.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-[#696E82] font-semibold w-16">Subject:</span>
                          <span className="font-bold text-[#1F1F1F]">
                            {interpolate(subject, previewEmployee)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[#696E82] font-semibold w-16">From:</span>
                          <span className="font-mono text-[#1F1F1F]">
                            100% DESIGN Studio &lt;{companyEmail}&gt;
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[#696E82] font-semibold w-16">To:</span>
                          <span className="font-mono text-[#1F1F1F]">
                            {previewEmployee?.fullName} &lt;{previewEmployee?.email}&gt;
                          </span>
                        </div>
                      </div>

                      {/* Rendered Body */}
                      <div className="p-4 bg-[#F8F9FD] rounded-xl border border-[#E2E6F0] text-xs text-[#1F1F1F] whitespace-pre-wrap font-sans leading-relaxed">
                        {interpolate(bodyText, previewEmployee)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: RECIPIENTS */}
              {activeTab === "recipients" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E2E6F0]">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#1F1F1F]">
                        Target Studio Recipients
                      </span>
                      <span className="px-2 py-0.5 bg-[#EA4335]/10 text-[#EA4335] text-[11px] font-bold rounded-full">
                        {selectedEmployees.length} of {allEmployees.length} selected
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={selectAllActive}
                        className="text-xs text-[#5A81FA] hover:underline font-semibold"
                      >
                        Select All Active
                      </button>
                      <span className="text-[#E2E6F0]">&bull;</span>
                      <button
                        type="button"
                        onClick={clearAll}
                        className="text-xs text-[#696E82] hover:text-[#1F1F1F]"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto p-1">
                    {allEmployees.map((emp) => {
                      const isSelected = selectedIds.includes(emp.membershipId);
                      return (
                        <label
                          key={emp.membershipId}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                            isSelected
                              ? "bg-[#FEF2F2] border-[#EA4335]/40 text-[#1F1F1F]"
                              : "bg-white border-[#E2E6F0] text-[#696E82] hover:bg-[#F8F9FD]"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleEmployee(emp.membershipId)}
                              className="rounded border-[#E2E6F0] text-[#EA4335] focus:ring-[#EA4335]"
                            />
                            <div className="truncate">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-[#1F1F1F] truncate">
                                  {emp.fullName}
                                </span>
                                <span className="font-mono text-[10px] text-[#5A81FA] font-bold">
                                  {emp.employeeId}
                                </span>
                              </div>
                              <div className="text-[10px] text-[#696E82] truncate">
                                {emp.email} &bull; {emp.designation || "Architect"}
                              </div>
                            </div>
                          </div>

                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                              emp.isActive
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {emp.isActive ? "Active" : "Inactive"}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions Footer */}
            <div className="p-4 border-t border-[#E2E6F0] bg-[#F8F9FD] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 text-xs text-[#696E82]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                <span>
                  Ready to send to <strong>{selectedEmployees.length}</strong> studio employee
                  {selectedEmployees.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-[#E2E6F0] hover:bg-white rounded-xl text-xs font-semibold text-[#696E82] transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                {/* Direct 1-Click Gmail Broadcast Web Link */}
                <a
                  href={groupGmailUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-[#EA4335] hover:bg-[#D93025] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                  title="Open Gmail directly with designadmin08@gmail.com and all recipients in BCC"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Open in Gmail Web</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                {/* Queue Outbox & In-App Alerts */}
                <button
                  type="button"
                  disabled={submitting || selectedEmployees.length === 0}
                  onClick={handleDispatchToOutbox}
                  className="px-4 py-2 bg-[#1F1F1F] hover:bg-black text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                  title="Queue personalized emails in Studio Outbox & alert employees in-app"
                >
                  {submitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {submitting
                      ? "Dispatching..."
                      : `Dispatch Personalized Outbox (${selectedEmployees.length})`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
