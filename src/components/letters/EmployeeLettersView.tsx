"use client";

import React, { useState, useEffect } from "react";
import { TenantContext } from "@/server/tenancy/context";
import {
  FileText,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Download,
  Loader2,
  RefreshCw,
  Stamp,
  Send,
  ShieldCheck,
  FileCheck,
} from "lucide-react";

interface EmployeeLettersViewProps {
  context: TenantContext;
  employeeId: string;
  canManageHR?: boolean;
}

export function EmployeeLettersView({
  context,
  employeeId,
  canManageHR = false,
}: EmployeeLettersViewProps) {
  const [loading, setLoading] = useState(true);
  const [letters, setLetters] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // New draft modal
  const [isNewDraftOpen, setIsNewDraftOpen] = useState(false);
  const [selectedTemplateType, setSelectedTemplateType] = useState<string>("OFFER");
  const [salaryOverride, setSalaryOverride] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split("T")[0]);
  const [isGenerating, setIsGenerating] = useState(false);

  // View / Edit letter modal
  const [viewLetter, setViewLetter] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedBody, setEditedBody] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);

  // Acknowledgment modal
  const [ackLetter, setAckLetter] = useState<any>(null);
  const [ackNotes, setAckNotes] = useState("");
  const [isAcknowledging, setIsAcknowledging] = useState(false);

  const isSelf = context.employeeId === employeeId;
  const isOwner = context.role === "OWNER";
  const canManage = canManageHR || isOwner;

  const fetchLetters = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `/api/letters?workspaceSlug=${context.tenantSlug}&employeeId=${employeeId}`
      );
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to load letters");
      }
      const json = await res.json();
      setLetters(json);
    } catch (err: any) {
      setError(err.message || "Failed to load letters");
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    if (!canManage) return;
    try {
      const res = await fetch(
        `/api/letters/templates?workspaceSlug=${context.tenantSlug}`
      );
      if (res.ok) {
        const json = await res.json();
        setTemplates(json);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchLetters();
    fetchTemplates();
  }, [context.tenantSlug, employeeId]);

  const handleGenerateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsGenerating(true);
      setError(null);

      const res = await fetch(`/api/letters?workspaceSlug=${context.tenantSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateType: selectedTemplateType,
          employeeId,
          overrides: {
            salary: salaryOverride || undefined,
            effectiveDate,
          },
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to create draft");
      }

      setIsNewDraftOpen(false);
      setSalaryOverride("");
      await fetchLetters();
    } catch (err: any) {
      setError(err.message || "Draft generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!viewLetter) return;
    try {
      setIsSaving(true);
      setError(null);

      const res = await fetch(
        `/api/letters/${viewLetter.id}?workspaceSlug=${context.tenantSlug}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bodyContent: editedBody }),
        }
      );

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to save draft");
      }

      setIsEditing(false);
      const updated = await res.json();
      setViewLetter(updated);
      await fetchLetters();
    } catch (err: any) {
      setError(err.message || "Failed to update draft");
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!viewLetter) return;
    try {
      setIsSaving(true);
      setError(null);

      const res = await fetch(
        `/api/letters/${viewLetter.id}/approve?workspaceSlug=${context.tenantSlug}`,
        {
          method: "POST",
        }
      );

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Approval failed");
      }

      const updated = await res.json();
      setViewLetter(updated);
      await fetchLetters();
    } catch (err: any) {
      setError(err.message || "Approval failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleIssue = async () => {
    if (!viewLetter) return;
    try {
      setIsIssuing(true);
      setError(null);

      const res = await fetch(
        `/api/letters/${viewLetter.id}?workspaceSlug=${context.tenantSlug}`,
        {
          method: "POST",
        }
      );

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Issuance failed");
      }

      const issued = await res.json();
      setViewLetter(issued);
      await fetchLetters();
    } catch (err: any) {
      setError(err.message || "Issuance failed");
    } finally {
      setIsIssuing(false);
    }
  };

  const handleAcknowledge = async () => {
    if (!ackLetter) return;
    try {
      setIsAcknowledging(true);
      setError(null);

      const res = await fetch(
        `/api/letters/${ackLetter.id}/acknowledge?workspaceSlug=${context.tenantSlug}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: ackNotes }),
        }
      );

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Acknowledgment failed");
      }

      setAckLetter(null);
      setAckNotes("");
      await fetchLetters();
    } catch (err: any) {
      setError(err.message || "Acknowledgment failed");
    } finally {
      setIsAcknowledging(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-3 bg-white rounded-3xl border border-[#E2E6F0]">
        <Loader2 className="w-6 h-6 animate-spin text-[#1456F0]" />
        <p className="text-xs text-[#696E82]">Loading official HR letters...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 bg-white rounded-3xl border border-[#E2E6F0] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#1F1F1F]">Official HR Letters</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EBF1FF] text-[#1456F0]">
              {letters.length} letter{letters.length !== 1 ? "s" : ""}
            </span>
          </div>
          <p className="text-xs text-[#696E82] mt-1">
            Formal company letterhead letters, offers, appointments, and certificates. Numbered with concurrency-safe sequential references.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canManage && (
            <button
              onClick={() => setIsNewDraftOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#1456F0] text-white hover:bg-[#0E46D0] shadow-2xs transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Generate Letter Draft</span>
            </button>
          )}

          <button
            onClick={fetchLetters}
            className="p-2 rounded-xl border border-[#E2E6F0] text-[#696E82] hover:bg-[#F8F9FE]"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 shadow-2xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Letters List */}
      {letters.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-[#E2E6F0] shadow-2xs">
          <FileText className="w-10 h-10 text-[#696E82] mx-auto mb-3 opacity-40" />
          <h3 className="text-sm font-bold text-[#1F1F1F]">No Letters Issued Yet</h3>
          <p className="text-xs text-[#696E82] mt-1 max-w-sm mx-auto">
            Official employment letters, appointments, and salary revisions will appear here once drafted or issued.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {letters.map((letter) => {
            const isIssued = letter.status === "ISSUED";
            const isApproved = letter.status === "APPROVED";
            const isDraft = letter.status === "DRAFT";
            const isAcknowledged = Boolean(letter.acknowledgedAt);

            return (
              <div
                key={letter.id}
                className="p-5 rounded-3xl border border-[#E2E6F0] bg-white shadow-2xs flex flex-col justify-between hover:border-[#CEDEFF] transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-semibold text-[#1456F0] bg-[#EBF1FF] px-2.5 py-0.5 rounded-md">
                      {letter.letterNumber || "DRAFT REF"}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        isIssued
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : isApproved
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {letter.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-[#1F1F1F] mt-3">{letter.title}</h3>

                  <div className="mt-3 p-3 rounded-2xl bg-[#F8F9FE] border border-[#E8ECF4] text-[11px] space-y-1">
                    <div className="flex items-center justify-between text-[#696E82]">
                      <span>Created</span>
                      <span className="font-medium text-[#1F1F1F]">
                        {new Date(letter.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {letter.issuedAt && (
                      <div className="flex items-center justify-between text-[#696E82]">
                        <span>Issued On</span>
                        <span className="font-medium text-[#1F1F1F]">
                          {new Date(letter.issuedAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}

                    {isAcknowledged ? (
                      <div className="flex items-center gap-1.5 text-emerald-700 font-semibold pt-1 border-t border-[#E2E6F0]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Acknowledged on {new Date(letter.acknowledgedAt).toLocaleDateString()}</span>
                      </div>
                    ) : isIssued && isSelf ? (
                      <div className="flex items-center gap-1.5 text-amber-700 font-medium pt-1 border-t border-[#E2E6F0]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Pending your formal acknowledgment</span>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-[#F2F4F8] flex items-center gap-2">
                  <button
                    onClick={() => {
                      setViewLetter(letter);
                      setEditedBody(letter.bodyContent);
                      setIsEditing(false);
                    }}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-white border border-[#E2E6F0] text-[#1F1F1F] text-xs font-semibold hover:bg-[#F8F9FE] text-center shadow-2xs"
                  >
                    View Details
                  </button>

                  {isIssued && letter.renderedPdfFile && (
                    <a
                      href={`/api/storage/files/${letter.renderedPdfFile.id}?workspaceSlug=${context.tenantSlug}&download=true`}
                      className="py-1.5 px-3 rounded-xl bg-[#EBF1FF] text-[#1456F0] text-xs font-semibold hover:bg-[#DBE7FF] flex items-center gap-1"
                      title="Download PDF"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </a>
                  )}

                  {isIssued && isSelf && !isAcknowledged && (
                    <button
                      onClick={() => setAckLetter(letter)}
                      className="py-1.5 px-3 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 flex items-center gap-1"
                    >
                      <Stamp className="w-3.5 h-3.5" />
                      <span>Acknowledge</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Draft Modal */}
      {isNewDraftOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E2E6F0] shadow-xl w-full max-w-lg p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-[#1F1F1F]">Generate Letter Draft</h3>
            <p className="text-xs text-[#696E82] mt-0.5">
              Select an official studio template. Employee details and signatory are auto-filled.
            </p>

            <form onSubmit={handleGenerateDraft} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-[#1F1F1F] block mb-1">
                  Letter Template *
                </label>
                <select
                  value={selectedTemplateType}
                  onChange={(e) => setSelectedTemplateType(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-[#E2E6F0] bg-white focus:outline-[#1456F0]"
                >
                  <option value="OFFER">Offer Letter</option>
                  <option value="APPOINTMENT">Letter of Appointment</option>
                  <option value="JOINING_CONFIRMATION">Joining Confirmation</option>
                  <option value="EMPLOYEE_JOINING_REPORT">Employee Joining Report</option>
                  <option value="PROBATION_CONFIRMATION">Probation Confirmation</option>
                  <option value="PROBATION_EXTENSION">Probation Extension</option>
                  <option value="SALARY_REVISION">Salary Revision / Increment</option>
                  <option value="PROMOTION">Promotion / Designation Change</option>
                  <option value="TRANSFER">Transfer / Studio Reassignment</option>
                  <option value="EXPERIENCE_CERTIFICATE">Certificate of Experience</option>
                  <option value="RELIEVING">Relieving Letter</option>
                  <option value="TERMINATION">Notice of Termination</option>
                  <option value="EMPLOYMENT_VERIFICATION">Employment Verification</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-[#1F1F1F] block mb-1">
                  Effective / Joining Date
                </label>
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-[#E2E6F0] focus:outline-[#1456F0]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#1F1F1F] block mb-1">
                  Salary / Compensation Terms (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 8,50,000 per annum"
                  value={salaryOverride}
                  onChange={(e) => setSalaryOverride(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-[#E2E6F0] focus:outline-[#1456F0]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F2F4F8]">
                <button
                  type="button"
                  onClick={() => setIsNewDraftOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl text-[#696E82] hover:bg-[#F8F9FE]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[#1456F0] text-white hover:bg-[#0E46D0] disabled:opacity-50"
                >
                  {isGenerating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Generate Draft</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View / Edit Letter Modal */}
      {viewLetter && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E2E6F0] shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#F2F4F8]">
              <div>
                <h3 className="text-base font-bold text-[#1F1F1F]">{viewLetter.title}</h3>
                <span className="text-xs text-[#696E82]">
                  Status: {viewLetter.status} | Ref: {viewLetter.letterNumber || "DRAFT"}
                </span>
              </div>
              <button
                onClick={() => setViewLetter(null)}
                className="text-[#696E82] hover:text-[#1F1F1F] text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {viewLetter.status !== "ISSUED" && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800">
                  ⚠️ This letter is in {viewLetter.status} status. It contains a draft watermark until officially issued. Editing an approved draft will reset approval back to Draft.
                </div>
              )}

              {isEditing ? (
                <div>
                  <label className="text-xs font-medium text-[#1F1F1F] block mb-1">
                    Letter Body Content (Real Text)
                  </label>
                  <textarea
                    rows={12}
                    value={editedBody}
                    onChange={(e) => setEditedBody(e.target.value)}
                    className="w-full text-xs font-sans p-3 rounded-2xl border border-[#E2E6F0] focus:outline-[#1456F0]"
                  />
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-[#F8F9FE] border border-[#E2E6F0] whitespace-pre-wrap text-xs text-[#1F1F1F] leading-relaxed font-sans">
                  {viewLetter.bodyContent}
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="pt-3 border-t border-[#F2F4F8] flex items-center justify-between">
              <div>
                {viewLetter.renderedPdfFile && (
                  <a
                    href={`/api/storage/files/${viewLetter.renderedPdfFile.id}?workspaceSlug=${context.tenantSlug}&download=true`}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#EBF1FF] text-[#1456F0] hover:bg-[#DBE7FF]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Official PDF</span>
                  </a>
                )}
              </div>

              <div className="flex items-center gap-2">
                {canManage && viewLetter.status !== "ISSUED" && (
                  <>
                    {isEditing ? (
                      <button
                        onClick={handleSaveDraft}
                        disabled={isSaving}
                        className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-[#1456F0] text-white hover:bg-[#0E46D0]"
                      >
                        {isSaving ? "Saving..." : "Save Draft"}
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-[#E2E6F0] text-[#1F1F1F] hover:bg-[#F8F9FE]"
                      >
                        Edit Body
                      </button>
                    )}

                    {viewLetter.status === "DRAFT" && (
                      <button
                        onClick={handleApprove}
                        disabled={isSaving}
                        className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Approve Draft
                      </button>
                    )}

                    <button
                      onClick={handleIssue}
                      disabled={isIssuing}
                      className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      {isIssuing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Issue Official Letter</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setViewLetter(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-xl text-[#696E82] hover:bg-[#F8F9FE]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Acknowledgment Modal */}
      {ackLetter && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E2E6F0] shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-[#1F1F1F]">Acknowledge Receipt</h3>
            <p className="text-xs text-[#696E82] mt-0.5">
              Confirm that you have received and read '{ackLetter.title}' (Ref: {ackLetter.letterNumber}).
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-[#1F1F1F] block mb-1">
                  Acknowledgment Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Received and accepted terms."
                  value={ackNotes}
                  onChange={(e) => setAckNotes(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-[#E2E6F0] focus:outline-[#1456F0]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F2F4F8]">
                <button
                  type="button"
                  onClick={() => setAckLetter(null)}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl text-[#696E82] hover:bg-[#F8F9FE]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAcknowledge}
                  disabled={isAcknowledging}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isAcknowledging && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Acknowledgment</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
