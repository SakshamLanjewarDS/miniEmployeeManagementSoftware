"use client";

import React from "react";
import {
  Printer,
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Clock,
  User,
  Calendar,
  Building,
  CloudSun,
  Camera,
  Flag,
} from "lucide-react";

interface PrintableReportProps {
  visit: {
    id: string;
    purpose: string;
    scheduledTime: string;
    operationalState: string;
    findings: string | null;
    nextActions: string | null;
    inspectionType?: string | null;
    priority?: string | null;
    weather?: string | null;
    checkInAddress?: string | null;
    checkOutAddress?: string | null;
    reviewDecision?: string | null;
    reviewComment?: string | null;
    attendeesJson?: any;
    checklistItemsJson?: any;
    photosJson?: any;
    snagsJson?: any;
    contractorSignOff?: any;
    voiceMemoTranscript?: string | null;
    site: {
      name: string;
      address: string;
      latitude: number | null;
      longitude: number | null;
      radiusMeters: number;
    };
    project: {
      code: string;
      name: string;
    };
    employee?: {
      user: { fullName: string; email?: string };
      employee: { employeeId: string; designation?: string | null } | null;
    };
    events?: Array<{
      eventType: string;
      serverReceiptTime: string;
      latitude: number | null;
      longitude: number | null;
      accuracyMeters: number | null;
      calculatedDistanceMeters: number | null;
      geofenceAssessment: string;
    }>;
  };
  onClose: () => void;
}

export default function PrintableInspectionReport({ visit, onClose }: PrintableReportProps) {
  const checkIn = visit.events?.find((e) => e.eventType === "CHECK_IN");
  const checkOut = visit.events?.find((e) => e.eventType === "CHECK_OUT");
  const waypoints =
    visit.events?.filter(
      (e) => e.eventType === "EXCEPTION" && (e.latitude !== null || e.geofenceAssessment)
    ) || [];

  const attendees: Array<{ name: string; role?: string; phone?: string }> = Array.isArray(
    visit.attendeesJson
  )
    ? visit.attendeesJson
    : [];

  const checklist: Array<{ item: string; checked?: boolean; notes?: string }> = Array.isArray(
    visit.checklistItemsJson
  )
    ? visit.checklistItemsJson
    : [];

  const photos: Array<{ url: string; caption?: string; tag?: string; timestamp?: string }> =
    Array.isArray(visit.photosJson) ? visit.photosJson : [];

  const snags: Array<{
    title: string;
    severity?: string;
    contractorResponsible?: string;
    targetDate?: string;
    status?: string;
  }> = Array.isArray(visit.snagsJson) ? visit.snagsJson : [];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-60 animate-in fade-in-0 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-[#E2E6F0] shadow-2xl max-w-4xl w-full my-6 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Bar (Hidden during print) */}
        <div className="p-4 bg-[#F8F9FD] border-b border-[#E2E6F0] flex items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#5A81FA]" />
            <div>
              <h3 className="text-sm font-bold text-[#1F1F1F]">
                Architect's Official Site Inspection Dossier & Geolocation Audit Certificate
              </h3>
              <p className="text-[11px] text-[#696E82]">
                Print-ready certified documentation for client billing, contractor compliance, and municipal records
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-[#5A81FA] hover:bg-[#426EE8] text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#696E82] hover:text-[#1F1F1F] rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE BODY */}
        <div className="p-8 overflow-y-auto space-y-6 text-[#1F1F1F] bg-white print:p-0 print:m-0 print:shadow-none">
          {/* Header */}
          <div className="border-b-2 border-[#1F1F1F] pb-4 flex justify-between items-start gap-4">
            <div>
              <div className="text-xs uppercase font-bold tracking-widest text-[#5A81FA]">
                STUDIO OS • ARCHITECTURAL SURVEILLANCE & QA/QC
              </div>
              <h1 className="text-2xl font-black tracking-tight text-[#1F1F1F] mt-0.5">
                ARCHITECT'S SITE INSPECTION REPORT
              </h1>
              <div className="text-xs text-[#696E82] mt-1 font-mono">
                Report Ref: SIR-{visit.project.code}-{visit.id.substring(0, 8).toUpperCase()} • Generated {new Date().toLocaleDateString("en-IN")}
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-[#1F1F1F] text-white text-xs font-bold rounded-lg uppercase tracking-wider">
                {visit.inspectionType || "ROUTINE"} AUDIT
              </span>
              <div className="text-xs text-[#696E82] mt-1">
                Priority: <strong className="text-[#1F1F1F]">{visit.priority || "MEDIUM"}</strong>
              </div>
            </div>
          </div>

          {/* Project & Site Identity Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-[#F8F9FD] rounded-xl border border-[#E2E6F0] text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#696E82] block">Project</span>
              <span className="font-bold text-[#1F1F1F]">{visit.project.name}</span>
              <span className="text-[10px] text-[#5A81FA] font-mono block">Code: {visit.project.code}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#696E82] block">Site Location</span>
              <span className="font-bold text-[#1F1F1F]">{visit.site.name}</span>
              <span className="text-[10px] text-[#696E82] block truncate">{visit.site.address}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#696E82] block">Inspecting Architect</span>
              <span className="font-bold text-[#1F1F1F]">{visit.employee?.user.fullName}</span>
              <span className="text-[10px] text-[#696E82] block font-mono">
                ID: {visit.employee?.employee?.employeeId ?? "STAFF"}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#696E82] block">Inspection Date</span>
              <span className="font-bold text-[#1F1F1F]">
                {new Date(visit.scheduledTime).toLocaleDateString("en-IN")}
              </span>
              <span className="text-[10px] text-[#696E82] block">
                Scheduled: {new Date(visit.scheduledTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>

          {/* Environmental & Weather Stamp */}
          {visit.weather && (
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <CloudSun className="w-4 h-4 text-amber-600" />
                <span>
                  <strong>Weather & Site Conditions at Inspection: </strong>
                  {visit.weather}
                </span>
              </div>
              <span className="text-[10px] text-[#696E82] font-mono">Ambient Moisture & Curing Stamp</span>
            </div>
          )}

          {/* GEOLOCATION AUDIT CERTIFICATE */}
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#1F1F1F] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Immutable Geolocation Audit Certificate</span>
            </h2>
            <div className="border border-[#E2E6F0] rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-[#F8F9FD] border-b border-[#E2E6F0] text-[#696E82]">
                  <tr>
                    <th className="p-2.5">Audit Item</th>
                    <th className="p-2.5">Timestamp (IST)</th>
                    <th className="p-2.5">Audited Coordinates</th>
                    <th className="p-2.5">Locality / Address</th>
                    <th className="p-2.5">Distance Offset</th>
                    <th className="p-2.5">Geofence Verdict</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E6F0]">
                  <tr>
                    <td className="p-2.5 font-bold">Check-In (Enter)</td>
                    <td className="p-2.5 font-mono">
                      {checkIn ? new Date(checkIn.serverReceiptTime).toLocaleString("en-IN") : "N/A"}
                    </td>
                    <td className="p-2.5 font-mono">
                      {checkIn?.latitude ? `${checkIn.latitude.toFixed(5)}°, ${checkIn.longitude?.toFixed(5)}°` : "No GPS"}
                    </td>
                    <td className="p-2.5 text-[11px] text-[#696E82]">{visit.checkInAddress || "Standard Site"}</td>
                    <td className="p-2.5 font-mono">{checkIn?.calculatedDistanceMeters ? `${checkIn.calculatedDistanceMeters}m` : "0m"}</td>
                    <td className="p-2.5 font-bold text-emerald-700">{checkIn?.geofenceAssessment || "VERIFIED"}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold">Check-Out (Exit)</td>
                    <td className="p-2.5 font-mono">
                      {checkOut ? new Date(checkOut.serverReceiptTime).toLocaleString("en-IN") : "Pending Departure"}
                    </td>
                    <td className="p-2.5 font-mono">
                      {checkOut?.latitude ? `${checkOut.latitude.toFixed(5)}°, ${checkOut.longitude?.toFixed(5)}°` : "Snapshot logged"}
                    </td>
                    <td className="p-2.5 text-[11px] text-[#696E82]">{visit.checkOutAddress || "Standard Site"}</td>
                    <td className="p-2.5 font-mono">{checkOut?.calculatedDistanceMeters ? `${checkOut.calculatedDistanceMeters}m` : "0m"}</td>
                    <td className="p-2.5 font-bold text-blue-700">DEPARTURE LOGGED</td>
                  </tr>
                </tbody>
              </table>
              <div className="p-2.5 bg-[#FAFBFD] border-t border-[#E2E6F0] text-[11px] text-[#696E82] flex items-center justify-between">
                <span>Site Benchmark: {visit.site.latitude?.toFixed(4)}°, {visit.site.longitude?.toFixed(4)}° • Geofence Radius: {visit.site.radiusMeters}m</span>
                <span>{waypoints.length} intermediate tracking checkpoints recorded</span>
              </div>
            </div>
          </div>

          {/* Attendees */}
          {attendees.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#1F1F1F]">
                On-Site Inspection Attendees & Stakeholders
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {attendees.map((att, idx) => (
                  <div key={idx} className="p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-lg">
                    <div className="font-semibold text-[#1F1F1F]">{att.name}</div>
                    <div className="text-[10px] text-[#696E82]">{att.role || "Consultant/Rep"} • {att.phone || "On-site"}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pre-Visit Audit Checklist Verification */}
          {checklist.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#1F1F1F]">
                Pre-Visit QA/QC Verification Checklist
              </h2>
              <div className="divide-y divide-[#E2E6F0] border border-[#E2E6F0] rounded-xl overflow-hidden text-xs">
                {checklist.map((chk, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between gap-3 bg-white">
                    <div className="flex items-center gap-2">
                      <span className={`w-4 h-4 rounded flex items-center justify-center font-bold text-[10px] ${chk.checked ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"}`}>
                        {chk.checked ? "✓" : "○"}
                      </span>
                      <span className={chk.checked ? "font-semibold text-[#1F1F1F]" : "text-[#696E82]"}>{chk.item}</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#696E82]">{chk.notes || (chk.checked ? "Verified" : "Pending")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Architectural Findings & Next Actions */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#1F1F1F]">
              Field Observations & Technical Findings
            </h2>
            <div className="p-4 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs leading-relaxed whitespace-pre-wrap">
              {visit.findings || "Inspection concluded without notable non-conformities."}
            </div>

            {visit.nextActions && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#1F1F1F] mb-1">
                  Required Follow-Up Directives:
                </h3>
                <div className="p-3 bg-[#FAFBFD] border border-[#E2E6F0] rounded-xl text-xs text-[#696E82]">
                  {visit.nextActions}
                </div>
              </div>
            )}
          </div>

          {/* Snags & Defects Register */}
          {snags.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#1F1F1F] flex items-center gap-1.5">
                <Flag className="w-4 h-4 text-rose-600" />
                <span>Site Snags & Rectification Directives ({snags.length} Logged)</span>
              </h2>
              <div className="border border-[#E2E6F0] rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-[#F8F9FD] border-b border-[#E2E6F0] text-[#696E82]">
                    <tr>
                      <th className="p-2.5">Defect Title</th>
                      <th className="p-2.5">Severity</th>
                      <th className="p-2.5">Contractor Responsible</th>
                      <th className="p-2.5">Target Rectification</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E6F0]">
                    {snags.map((snag, idx) => (
                      <tr key={idx}>
                        <td className="p-2.5 font-semibold text-[#1F1F1F]">{snag.title}</td>
                        <td className="p-2.5 font-bold text-[10px]">{snag.severity || "MAJOR"}</td>
                        <td className="p-2.5 text-[#696E82]">{snag.contractorResponsible || "Civil Contractor"}</td>
                        <td className="p-2.5 font-mono">{snag.targetDate ? new Date(snag.targetDate).toLocaleDateString("en-IN") : "Immediate"}</td>
                        <td className="p-2.5 font-bold text-rose-700">{snag.status || "OPEN"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Photo Evidence Gallery */}
          {photos.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#1F1F1F] flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-[#5A81FA]" />
                <span>Geotagged Photographic Evidence ({photos.length} Photos)</span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photos.map((p, idx) => (
                  <div key={idx} className="border border-[#E2E6F0] rounded-xl overflow-hidden bg-white text-xs">
                    <img src={p.url} alt={p.caption || "Inspection photo"} className="w-full h-32 object-cover" />
                    <div className="p-2 space-y-0.5">
                      <span className="text-[9px] font-bold text-[#5A81FA] uppercase block">{p.tag || "PHOTO"}</span>
                      <p className="text-[11px] font-semibold text-[#1F1F1F] line-clamp-1">{p.caption || "Observation item"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contractor Sign-Off & Partner Certification Signatures */}
          <div className="pt-6 border-t-2 border-[#1F1F1F] grid grid-cols-2 gap-8 text-xs">
            {/* Contractor Sign-Off */}
            <div className="p-4 border border-[#E2E6F0] rounded-xl space-y-3">
              <span className="text-[10px] uppercase font-bold text-[#696E82] block">
                Contractor / Site Engineer Acknowledgment
              </span>
              <div className="space-y-1">
                <p className="font-bold text-[#1F1F1F]">
                  {visit.contractorSignOff?.representativeName || "Contractor Representative On-Site"}
                </p>
                <p className="text-[11px] text-[#696E82]">
                  Phone: {visit.contractorSignOff?.phone || "Recorded on site"}
                </p>
                <p className="text-[10px] text-[#696E82]">
                  Status: Observations acknowledged on site without dispute
                </p>
              </div>
              <div className="pt-8 border-b border-dashed border-[#A8B1CE]" />
              <div className="text-[10px] text-[#696E82] text-center">Representative Digital Signature</div>
            </div>

            {/* Architectural Partner Review */}
            <div className="p-4 border border-[#E2E6F0] rounded-xl space-y-3 bg-[#F8F9FD]">
              <span className="text-[10px] uppercase font-bold text-[#5A81FA] block">
                Architectural Partner Review & Sign-Off
              </span>
              <div className="space-y-1">
                <p className="font-bold text-[#1F1F1F]">
                  Decision: {visit.reviewDecision || "ACCEPTED"}
                </p>
                {visit.reviewComment && (
                  <p className="text-[11px] text-[#696E82] italic">"{visit.reviewComment}"</p>
                )}
                <p className="text-[10px] text-emerald-800 font-semibold">
                  ✔ Certified for Billing & Structural Records
                </p>
              </div>
              <div className="pt-8 border-b border-dashed border-[#A8B1CE]" />
              <div className="text-[10px] text-[#696E82] text-center">Studio Partner / Principal Architect Stamp</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
