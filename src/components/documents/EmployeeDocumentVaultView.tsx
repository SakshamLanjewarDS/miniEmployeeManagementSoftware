"use client";

import React, { useState, useEffect } from "react";
import { TenantContext } from "@/server/tenancy/context";
import {
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Eye,
  Download,
  Shield,
  ShieldAlert,
  Loader2,
  Trash2,
  FileCheck,
  RefreshCw,
} from "lucide-react";

interface EmployeeDocumentVaultViewProps {
  context: TenantContext;
  employeeId: string;
  canManageHR?: boolean;
}

export function EmployeeDocumentVaultView({
  context,
  employeeId,
  canManageHR = false,
}: EmployeeDocumentVaultViewProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Upload modal states
  const [uploadCategory, setUploadCategory] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [maskedNumber, setMaskedNumber] = useState("");
  const [degreeName, setDegreeName] = useState("");
  const [bankLast4, setBankLast4] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Review modal states
  const [reviewDoc, setReviewDoc] = useState<any>(null);
  const [reviewDecision, setReviewDecision] = useState<"VERIFIED" | "REJECTED" | "REPLACEMENT_REQUESTED">("VERIFIED");
  const [reviewRemarks, setReviewRemarks] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Preview modal states
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);

  const isSelf = context.employeeId === employeeId;
  const isOwner = context.role === "OWNER";
  const canReview = (canManageHR || isOwner) && (!isSelf || isOwner);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `/api/documents?workspaceSlug=${context.tenantSlug}&employeeId=${employeeId}`
      );
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to load documents");
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || "Failed to fetch document vault");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [context.tenantSlug, employeeId]);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !uploadCategory) return;

    try {
      setIsUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("category", uploadCategory);
      formData.append("title", `${uploadCategory.replace(/_/g, " ")} Document`);
      if (maskedNumber) formData.append("maskedNumber", maskedNumber);
      if (degreeName) formData.append("degreeName", degreeName);
      if (bankLast4) formData.append("bankLast4", bankLast4);

      const res = await fetch(
        `/api/documents?workspaceSlug=${context.tenantSlug}&employeeId=${employeeId}`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to upload document");
      }

      setUploadCategory(null);
      setSelectedFile(null);
      setMaskedNumber("");
      setDegreeName("");
      setBankLast4("");
      await fetchDocuments();
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewDoc) return;

    try {
      setIsSubmittingReview(true);
      setError(null);

      const res = await fetch(
        `/api/documents/${reviewDoc.id}/review?workspaceSlug=${context.tenantSlug}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decision: reviewDecision,
            remarks: reviewRemarks,
          }),
        }
      );

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to submit review");
      }

      setReviewDoc(null);
      setReviewRemarks("");
      await fetchDocuments();
    } catch (err: any) {
      setError(err.message || "Review submission failed");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-3 bg-white rounded-3xl border border-[#E2E6F0]">
        <Loader2 className="w-6 h-6 animate-spin text-[#1456F0]" />
        <p className="text-xs text-[#696E82]">Loading secure document vault...</p>
      </div>
    );
  }

  const mandatoryCategories = [
    {
      key: "AADHAAR",
      title: "Aadhaar Card",
      subtitle: "Government Identity (prefer masked copy, last 4 digits visible)",
      icon: Shield,
    },
    {
      key: "DEGREE",
      title: "Graduation Degree",
      subtitle: "Highest architectural or professional degree certificate",
      icon: FileCheck,
    },
    {
      key: "BANK_PASSBOOK",
      title: "Bank Passbook / Account Page",
      subtitle: "Account details page for salary deposits (no transaction history required)",
      icon: FileText,
    },
  ];

  const docsMap = new Map<string, any>();
  if (data?.documents) {
    for (const d of data.documents) {
      docsMap.set(d.category, d);
    }
  }

  return (
    <div className="space-y-6">
      {/* Vault Status Header */}
      <div className="p-6 bg-white rounded-3xl border border-[#E2E6F0] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#1F1F1F]">Secure Document Vault</h2>
            {data?.stats?.isDocumentationComplete ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Documentation Complete
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <Clock className="w-3.5 h-3.5" />
                {data?.stats?.progressString || "Pending documents"}
              </span>
            )}
          </div>
          <p className="text-xs text-[#696E82] mt-1">
            Private encrypted employee files. Access is audited and restricted to authorized HR reviewers and the employee.
          </p>
        </div>

        <button
          onClick={fetchDocuments}
          className="self-start md:self-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white border border-[#E2E6F0] text-[#1F1F1F] hover:bg-[#F8F9FE] shadow-2xs transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#696E82]" />
          <span>Refresh vault</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 shadow-2xs">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Mandatory Onboarding Document Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {mandatoryCategories.map((cat) => {
          const doc = docsMap.get(cat.key);
          const isUploaded = Boolean(doc);
          const isVerified = doc?.status === "VERIFIED";
          const isPending = doc?.status === "PENDING_REVIEW";
          const isRejected = doc?.status === "REJECTED" || doc?.status === "REPLACEMENT_REQUESTED";
          const isQuarantined = doc?.scanStatus === "QUARANTINED" || doc?.scanStatus === "UNSCANNED";

          return (
            <div
              key={cat.key}
              className={`p-5 rounded-3xl border bg-white shadow-2xs flex flex-col justify-between transition-all ${
                isVerified
                  ? "border-emerald-200"
                  : isRejected
                  ? "border-rose-200"
                  : "border-[#E2E6F0]"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="w-10 h-10 rounded-2xl bg-[#F4F6FB] text-[#1456F0] flex items-center justify-center shrink-0">
                    <cat.icon className="w-5 h-5" />
                  </div>
                  {isVerified ? (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Verified
                    </span>
                  ) : isPending ? (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      Pending review
                    </span>
                  ) : isRejected ? (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                      {doc.status.replace(/_/g, " ")}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                      Missing
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-[#1F1F1F] mt-3">{cat.title}</h3>
                <p className="text-[11px] text-[#696E82] mt-0.5">{cat.subtitle}</p>

                {doc && (
                  <div className="mt-4 p-3 rounded-2xl bg-[#F8F9FE] border border-[#E8ECF4] space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between text-[#1F1F1F] font-medium">
                      <span>Version {doc.version}</span>
                      <span className="text-[#696E82]">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Quarantine Scan State */}
                    <div className="flex items-center gap-1.5 mt-1">
                      {isQuarantined ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          <ShieldAlert className="w-3 h-3" />
                          Quarantined (Pending Scanner)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <Shield className="w-3 h-3" />
                          Scan Clean
                        </span>
                      )}
                    </div>

                    {doc.reviewerRemarks && (
                      <div className="text-[10px] text-[#696E82] pt-1 border-t border-[#E2E6F0]">
                        <span className="font-semibold text-[#1F1F1F]">Remarks:</span>{" "}
                        {doc.reviewerRemarks}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-[#F2F4F8] flex items-center gap-2">
                {isUploaded ? (
                  <>
                    {doc.privateFile && !isQuarantined ? (
                      <a
                        href={`/api/storage/files/${doc.privateFile.id}?workspaceSlug=${context.tenantSlug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-1.5 px-3 rounded-xl bg-white border border-[#E2E6F0] text-[#1F1F1F] text-xs font-semibold hover:bg-[#F8F9FE] text-center shadow-2xs"
                      >
                        View
                      </a>
                    ) : (
                      <span className="flex-1 py-1.5 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 text-xs font-medium text-center cursor-not-allowed">
                        Quarantined
                      </span>
                    )}

                    {canReview && isPending && (
                      <button
                        onClick={() => setReviewDoc(doc)}
                        className="py-1.5 px-3 rounded-xl bg-[#1456F0] text-white text-xs font-semibold hover:bg-[#0E46D0] shadow-2xs"
                      >
                        Review
                      </button>
                    )}

                    {(!isVerified || canManageHR) && (
                      <button
                        onClick={() => setUploadCategory(cat.key)}
                        className="p-1.5 rounded-xl border border-[#E2E6F0] text-[#696E82] hover:bg-[#F8F9FE]"
                        title="Upload replacement"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => setUploadCategory(cat.key)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#1456F0] text-white text-xs font-semibold hover:bg-[#0E46D0] shadow-2xs transition-all"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload document</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload Modal */}
      {uploadCategory && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E2E6F0] shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-[#1F1F1F]">
              Upload {uploadCategory.replace(/_/g, " ")}
            </h3>
            <p className="text-xs text-[#696E82] mt-0.5">
              Allowed formats: PDF, JPG, PNG (Max 25MB). Encrypted/password-protected PDFs are rejected for security compliance.
            </p>

            <form onSubmit={handleUploadSubmit} className="mt-4 space-y-4">
              {uploadCategory === "AADHAAR" && (
                <div>
                  <label className="text-xs font-medium text-[#1F1F1F] block mb-1">
                    Masked Aadhaar Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="XXXX-XXXX-1234"
                    value={maskedNumber}
                    onChange={(e) => setMaskedNumber(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-[#E2E6F0] focus:outline-[#1456F0]"
                  />
                </div>
              )}

              {uploadCategory === "DEGREE" && (
                <div>
                  <label className="text-xs font-medium text-[#1F1F1F] block mb-1">
                    Degree & Specialization
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bachelor of Architecture (B.Arch)"
                    value={degreeName}
                    onChange={(e) => setDegreeName(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-[#E2E6F0] focus:outline-[#1456F0]"
                  />
                </div>
              )}

              {uploadCategory === "BANK_PASSBOOK" && (
                <div>
                  <label className="text-xs font-medium text-[#1F1F1F] block mb-1">
                    Bank Account Last 4 Digits
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 8842"
                    maxLength={4}
                    value={bankLast4}
                    onChange={(e) => setBankLast4(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-[#E2E6F0] focus:outline-[#1456F0]"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-[#1F1F1F] block mb-1">
                  Select Document File *
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  required
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-[#696E82] file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#EBF1FF] file:text-[#1456F0] hover:file:bg-[#DBE7FF]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F2F4F8]">
                <button
                  type="button"
                  onClick={() => setUploadCategory(null)}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl text-[#696E82] hover:bg-[#F8F9FE]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !selectedFile}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[#1456F0] text-white hover:bg-[#0E46D0] disabled:opacity-50"
                >
                  {isUploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Upload Document</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewDoc && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E2E6F0] shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-[#1F1F1F]">
              Review Document: {reviewDoc.title}
            </h3>
            <p className="text-xs text-[#696E82] mt-0.5">
              Four-eyes verification policy: Verify or reject with formal audit remarks.
            </p>

            <form onSubmit={handleReviewSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-[#1F1F1F] block mb-1">
                  Verification Decision
                </label>
                <select
                  value={reviewDecision}
                  onChange={(e) => setReviewDecision(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-[#E2E6F0] bg-white focus:outline-[#1456F0]"
                >
                  <option value="VERIFIED">Verified (Approved)</option>
                  <option value="REPLACEMENT_REQUESTED">Replacement Requested</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-[#1F1F1F] block mb-1">
                  Review Remarks / Reason
                </label>
                <textarea
                  rows={3}
                  placeholder={
                    reviewDecision === "VERIFIED"
                      ? "Document meets standard studio identity/onboarding requirements."
                      : "Explain why replacement or rejection is required..."
                  }
                  value={reviewRemarks}
                  onChange={(e) => setReviewRemarks(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-[#E2E6F0] focus:outline-[#1456F0]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F2F4F8]">
                <button
                  type="button"
                  onClick={() => setReviewDoc(null)}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl text-[#696E82] hover:bg-[#F8F9FE]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[#1456F0] text-white hover:bg-[#0E46D0] disabled:opacity-50"
                >
                  {isSubmittingReview && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Submit Review</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
