import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentTenantContext } from "@/server/auth/session";
import { findProjectDetail } from "@/server/modules/projects/repository";
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  MapPin,
  FileCheck2,
  Receipt,
  Users,
  Building,
  ArrowLeft,
  ChevronRight,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import { ProjectProfileCircle, TypologyBadge } from "@/lib/typology";

interface ProjectDetailPageProps {
  params: Promise<{ workspaceSlug: string; projectId: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function ProjectDetailPage({ params, searchParams }: ProjectDetailPageProps) {
  const { workspaceSlug, projectId } = await params;
  const { tab = "overview" } = await searchParams;

  const ctx = await getCurrentTenantContext(workspaceSlug);
  if (!ctx) return null;

  const project = await findProjectDetail(ctx, projectId);
  if (!project) notFound();

  const tabs = [
    { key: "overview", label: "Overview & Phases" },
    { key: "tasks", label: `Tasks (${project.tasks.length})` },
    { key: "team", label: `Team (${project.members.length})` },
    { key: "contractors", label: `Contractors & Quotes (${project.contractors.length})` },
    { key: "consultants", label: `Consultants (${project.consultants.length})` },
    { key: "visits", label: `Site Visits` },
    { key: "drawings", label: `Drawings (${project.documents.length})` },
    ...(ctx.role === "OWNER" || ctx.hasFinanceAccess
      ? [{ key: "finance", label: "Project Finance" }]
      : []),
  ];

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#696E82]">
        <Link href={`/w/${ctx.tenantSlug}/projects`} className="hover:text-[#1F1F1F] flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Projects</span>
        </Link>
        <span>/</span>
        <span className="font-mono font-bold text-[#5A81FA]">{project.code}</span>
        <span>/</span>
        <span className="text-[#1F1F1F] font-semibold">{project.name}</span>
      </div>

      {/* Project Header Banner */}
      <div className="bg-white border border-[#E2E6F0] rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-[#5A81FA] bg-[#F2F4FF] px-2.5 py-1 rounded border border-[#CEDEFF]">
                {project.code}
              </span>
              <TypologyBadge typology={project.projectType} size="sm" />
              <span className="text-xs font-semibold text-[#696E82] bg-[#F8F9FD] px-2.5 py-1 rounded border border-[#E2E6F0]">
                Phase: {project.currentPhase || "Brief"}
              </span>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {project.status}
              </span>
              {ctx.role === "OWNER" || ctx.role === "ADMIN" ? (
                <Link
                  href={`/w/${ctx.tenantSlug}/projects`}
                  className="text-[10px] font-bold text-[#5A81FA] bg-[#F2F4FF] hover:bg-[#E5EAFF] px-2 py-0.5 rounded border border-[#CEDEFF] inline-flex items-center gap-1 transition-colors cursor-pointer"
                  title="Click to edit project from portfolio manager"
                >
                  <ShieldAlert className="w-3 h-3 text-[#5A81FA]" />
                  <span>Admin / Owner Edit Mode</span>
                </Link>
              ) : (
                <span className="text-[10px] font-semibold text-[#696E82] bg-gray-100 px-2 py-0.5 rounded border border-gray-200 inline-flex items-center gap-1">
                  <span>🔒 View-Only Mode (Employee)</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              <ProjectProfileCircle typology={project.projectType} name={project.name} size="lg" />
              <h1 className="text-2xl font-bold tracking-tight text-[#1F1F1F]">{project.name}</h1>
            </div>
            <p className="text-xs text-[#696E82]">{project.description}</p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-4 bg-[#F8F9FD] p-3.5 rounded-xl border border-[#E2E6F0] shrink-0">
            <div>
              <span className="text-[10px] text-[#696E82] uppercase font-semibold block">Task Completion</span>
              <span className="text-sm font-bold text-[#1F1F1F]">{project.taskProgress.percentage}%</span>
            </div>
            {project.budget && (
              <div className="border-l border-[#E2E6F0] pl-4">
                <span className="text-[10px] text-[#696E82] uppercase font-semibold block">Budget</span>
                <span className="text-sm font-bold text-[#5A81FA]">
                  {project.currency} {Number(project.budget).toLocaleString("en-IN")}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 overflow-x-auto border-t border-[#E2E6F0] pt-3">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={`/w/${ctx.tenantSlug}/projects/${project.id}?tab=${t.key}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                tab === t.key
                  ? "bg-[#5A81FA] text-white font-semibold shadow-2xs"
                  : "text-[#696E82] hover:bg-[#F2F4FF] hover:text-[#1F1F1F]"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>

      {/* TAB CONTENT */}

      {/* 1. Overview Tab */}
      {tab === "overview" && (
        <div className="space-y-6">
          {/* Architectural Phases Timeline */}
          <div className="bg-white border border-[#E2E6F0] rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-[#1F1F1F]">Architectural Phases Sequence</h3>
                <p className="text-xs text-[#696E82]">
                  {project.phaseProgress.label} • Current: <strong className="text-[#5A81FA]">{project.currentPhase || "Brief"}</strong>
                </p>
              </div>
              {ctx.role === "OWNER" || ctx.role === "ADMIN" ? (
                <Link
                  href={`/w/${ctx.tenantSlug}/projects`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#F2F4FF] hover:bg-[#E5EAFF] text-[#5A81FA] text-xs font-bold transition-colors cursor-pointer border border-[#CEDEFF] self-start sm:self-auto"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-[#5A81FA]" />
                  <span>Manipulate Phase & Progress →</span>
                </Link>
              ) : (
                <span className="text-[11px] text-[#696E82] italic">
                  Phase advancement authorized by Studio Partners
                </span>
              )}
            </div>

            {/* Progress bar */}
            <div className="w-full bg-[#F2F4FF] h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#5A81FA] h-full rounded-full transition-all duration-500"
                style={{ width: `${project.phaseProgress.percentage}%` }}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-1">
              {project.phases.map((ph) => {
                const isCompleted = ph.status === "COMPLETED";
                const isCurrent = ph.status === "IN_PROGRESS";
                const isDelayed = ph.status === "DELAYED";
                return (
                  <div
                    key={ph.id}
                    className={`p-3 rounded-xl border text-center space-y-1 transition-all ${
                      isCompleted
                        ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                        : isCurrent
                        ? "bg-[#F2F4FF] border-[#5A81FA] ring-1 ring-[#5A81FA] text-[#1F1F1F] font-bold shadow-2xs"
                        : isDelayed
                        ? "bg-amber-50 border-amber-200 text-amber-900"
                        : "bg-[#F8F9FD] border-[#E2E6F0] text-[#696E82]"
                    }`}
                  >
                    <div className="text-[10px] font-mono text-[#696E82]">{ph.sortOrder}.</div>
                    <div className="text-xs font-semibold truncate" title={ph.phaseName}>
                      {ph.phaseName}
                    </div>
                    <div className="text-[9px] font-bold uppercase tracking-wider">
                      {isCompleted ? "✓ Completed" : isCurrent ? "⚡ Active" : ph.status.replace("_", " ")}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-[#E2E6F0] rounded-2xl p-6 shadow-2xs space-y-3">
              <h3 className="text-sm font-bold text-[#1F1F1F]">Client & Site Details</h3>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[#696E82] block text-[10px]">Client Name</span>
                  <span className="font-semibold text-[#1F1F1F]">{project.primaryClient?.name || "Direct / Private"}</span>
                </div>
                <div>
                  <span className="text-[#696E82] block text-[10px]">Client Company</span>
                  <span className="text-[#696E82]">{project.primaryClient?.company || "Private"}</span>
                </div>
                <div>
                  <span className="text-[#696E82] block text-[10px]">Site Address & City</span>
                  <span className="text-[#1F1F1F]">{project.siteAddress || "—"}{project.siteCity ? `, ${project.siteCity}` : ""}</span>
                </div>
                {project.googleMapLocation && (
                  <div>
                    <span className="text-[#696E82] block text-[10px]">Map Location</span>
                    <a
                      href={project.googleMapLocation.startsWith("http") ? project.googleMapLocation : `https://maps.google.com/?q=${encodeURIComponent(project.googleMapLocation)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#5A81FA] underline font-medium break-all hover:text-[#426EE8] transition-colors"
                    >
                      View on Google Maps →
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white border border-[#E2E6F0] rounded-2xl p-6 shadow-2xs space-y-3">
              <h3 className="text-sm font-bold text-[#1F1F1F]">Project Leadership & Team</h3>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[#696E82] block text-[10px]">Project Architect</span>
                  <span className="font-semibold text-[#1F1F1F]">
                    {project.projectArchitect?.user.fullName
                      ? `${project.projectArchitect.user.fullName} (${project.projectArchitect.employee?.designation || "Architect"})`
                      : "Unassigned"}
                  </span>
                </div>
                <div>
                  <span className="text-[#696E82] block text-[10px]">Project Manager</span>
                  <span className="font-semibold text-[#1F1F1F]">
                    {project.projectManager?.user.fullName
                      ? `${project.projectManager.user.fullName} (${project.projectManager.employee?.designation || "Project Manager"})`
                      : "Unassigned"}
                  </span>
                </div>
                <div>
                  <span className="text-[#696E82] block text-[10px]">Project Coordinator</span>
                  <span className="font-semibold text-[#1F1F1F]">
                    {project.projectCoordinator?.user.fullName
                      ? `${project.projectCoordinator.user.fullName} (${project.projectCoordinator.employee?.designation || "Coordinator"})`
                      : "Unassigned"}
                  </span>
                </div>
                <div>
                  <span className="text-[#696E82] block text-[10px]">Assigned Studio Members</span>
                  <span className="text-[#696E82]">{project.members.length} team members</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#E2E6F0] rounded-2xl p-6 shadow-2xs space-y-3">
              <h3 className="text-sm font-bold text-[#1F1F1F]">Spatial & Financial Metrics</h3>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[#696E82] block text-[10px]">Plot Area</span>
                  <span className="font-semibold text-[#1F1F1F]">{project.plotArea || "—"}</span>
                </div>
                <div>
                  <span className="text-[#696E82] block text-[10px]">Total Construction Area</span>
                  <span className="font-semibold text-[#1F1F1F]">{project.constructionArea || "—"}</span>
                </div>
                <div>
                  <span className="text-[#696E82] block text-[10px]">Budget</span>
                  <span className="font-semibold text-[#5A81FA]">
                    {project.budget ? `${project.currency || "INR"} ${Number(project.budget).toLocaleString("en-IN")}` : "Not Disclosed / Open"}
                  </span>
                </div>
                <div>
                  <span className="text-[#696E82] block text-[10px]">Timeline</span>
                  <span className="text-[#696E82]">
                    {project.startDate ? new Date(project.startDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : "Start TBD"}
                    {" → "}
                    {project.targetDate ? new Date(project.targetDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : "End TBD"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Tasks Tab */}
      {tab === "tasks" && (
        <div className="bg-white border border-[#E2E6F0] rounded-2xl p-6 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-[#1F1F1F]">Project Deliverables & Workflows</h3>
          <div className="divide-y divide-[#E2E6F0]">
            {project.tasks.map((t) => (
              <div key={t.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#1F1F1F]">{t.title}</div>
                  <div className="text-[11px] text-[#696E82]">
                    Assignee: {t.assignee?.user.fullName || "Unassigned"} • Phase: {t.phase?.phaseName || "N/A"}
                  </div>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#F2F4FF] text-[#696E82]">
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Contractors & Quotations Tab */}
      {tab === "contractors" && (
        <div className="bg-white border border-[#E2E6F0] rounded-2xl p-6 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-[#1F1F1F]">Engaged Contractors & Project Quotations</h3>
          <div className="space-y-4">
            {project.contractors.map((pc) => (
              <div key={pc.id} className="border border-[#E2E6F0] rounded-xl p-4 bg-[#F8F9FD] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-[#1F1F1F]">{pc.contractor.firmName}</h4>
                    <p className="text-xs text-[#696E82]">
                      Contact: {pc.contractor.name} ({pc.contractor.contact}) • Trade: {pc.contractor.trade}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                    {pc.engagementStatus}
                  </span>
                </div>

                {/* Quotations for this project */}
                <div className="pt-2 border-t border-[#E2E6F0]">
                  <span className="text-[11px] font-bold text-[#696E82] block mb-2">Project Quotations</span>
                  {pc.quotations.length === 0 ? (
                    <span className="text-xs text-[#696E82]">No quotations submitted for this project.</span>
                  ) : (
                    <div className="space-y-2">
                      {pc.quotations.map((q) => (
                        <div
                          key={q.id}
                          className="bg-white p-3 rounded-lg border border-[#E2E6F0] flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-mono font-bold text-[#5A81FA]">{q.quotationNumber}</span>
                            <span className="text-[#696E82] ml-2">(Rev {q.revision})</span>
                            <div className="text-[11px] text-[#696E82] mt-0.5">{q.notes}</div>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-[#1F1F1F]">
                              {q.currency} {Number(q.amount).toLocaleString("en-IN")}
                            </span>
                            <div className="text-[10px] text-amber-700 font-semibold">{q.status}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3b. Consultants Tab */}
      {tab === "consultants" && (
        <div className="bg-white border border-[#E2E6F0] rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#1F1F1F]">Specialist & Engineering Consultants</h3>
              <p className="text-xs text-[#696E82]">Structural, MEP, landscape, and technical consultants engaged on this project</p>
            </div>
            <Link
              href={`/w/${ctx.tenantSlug}/consultants`}
              className="px-3 py-1.5 bg-[#5A81FA] text-white text-xs font-semibold rounded-lg hover:bg-[#426EE8] transition-colors"
            >
              Consultant Directory →
            </Link>
          </div>

          {project.consultants.length === 0 ? (
            <p className="text-xs text-[#696E82] italic p-4 text-center">No consultants currently linked to this project.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {project.consultants.map((pc) => (
                <div key={pc.id} className="border border-[#E2E6F0] rounded-xl p-4 bg-[#F8F9FD] space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-[#1F1F1F]">{pc.consultant.name}</h4>
                      {pc.consultant.firmName && (
                        <div className="text-xs text-[#696E82] font-medium">{pc.consultant.firmName}</div>
                      )}
                    </div>
                    <span className="font-mono text-[10px] font-bold text-[#5A81FA] bg-white px-2 py-0.5 rounded border border-[#CEDEFF]">
                      {pc.consultant.discipline}
                    </span>
                  </div>

                  {pc.scope && <p className="text-xs text-[#696E82]">Scope: {pc.scope}</p>}

                  <div className="pt-2 border-t border-[#E2E6F0] text-[11px] text-[#696E82] space-y-0.5">
                    {pc.consultant.contact && <div>Phone: {pc.consultant.contact}</div>}
                    {pc.consultant.email && <div>Email: {pc.consultant.email}</div>}
                    {pc.consultant.firmAddress && <div className="truncate">Address: {pc.consultant.firmAddress}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3c. Drawings & Blueprints Tab */}
      {tab === "drawings" && (
        <div className="bg-white border border-[#E2E6F0] rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#1F1F1F]">Architectural Drawings & Revision Control</h3>
              <p className="text-xs text-[#696E82]">Sheets, floor plans, sections, and revision history for {project.code}</p>
            </div>
            <Link
              href={`/w/${ctx.tenantSlug}/drawings?projectId=${project.id}`}
              className="px-3 py-1.5 bg-[#5A81FA] text-white text-xs font-semibold rounded-lg hover:bg-[#426EE8] transition-colors"
            >
              Open Drawing Library →
            </Link>
          </div>

          {project.documents.length === 0 ? (
            <p className="text-xs text-[#696E82] italic p-4 text-center">No drawings registered for this project yet.</p>
          ) : (
            <div className="divide-y divide-[#E2E6F0]">
              {project.documents.map((doc) => {
                const latest = doc.versions[0];
                const latestApproved = doc.versions.find((v) => v.approvalState === "APPROVED");
                return (
                  <div key={doc.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        {doc.drawingNumber && (
                          <span className="font-mono font-bold text-[#5A81FA] bg-[#F2F4FF] px-2 py-0.5 rounded border border-[#CEDEFF]">
                            {doc.drawingNumber}
                          </span>
                        )}
                        <span className="font-bold text-[#1F1F1F]">{doc.title}</span>
                        <span className="text-[10px] text-[#696E82] bg-[#F2F4FF] px-1.5 py-0.5 rounded">
                          {doc.discipline}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#696E82] mt-1 flex items-center gap-3">
                        <span>Revisions: {doc.versions.length}</span>
                        <span>Latest: <strong>{latest ? latest.revision : "None"}</strong> ({latest?.approvalState})</span>
                        {latestApproved ? (
                          <span className="text-emerald-700 font-semibold">Latest Approved: {latestApproved.revision} ✔</span>
                        ) : (
                          <span className="italic">No approved revision</span>
                        )}
                      </div>
                    </div>

                    {latest && (
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={`/api/storage/files/${latest.fileId}?download=true&workspaceSlug=${ctx.tenantSlug}`}
                          className="px-2.5 py-1 bg-[#F2F4FF] hover:bg-[#F2F4FF] text-[#1F1F1F] font-semibold rounded-lg border border-[#E2E6F0] transition-colors"
                        >
                          Download {latest.revision}
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3d. Site Visits Tab */}
      {tab === "visits" && (
        <div className="bg-white border border-[#E2E6F0] rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#1F1F1F]">Project Site Visits & Geofence Logs</h3>
              <p className="text-xs text-[#696E82]">Scheduled inspections, active check-ins, and verified logs</p>
            </div>
            <Link
              href={`/w/${ctx.tenantSlug}/visits`}
              className="px-3 py-1.5 bg-[#5A81FA] text-white text-xs font-semibold rounded-lg hover:bg-[#426EE8] transition-colors"
            >
              All Site Visits →
            </Link>
          </div>

          {project.sites.length === 0 ? (
            <p className="text-xs text-[#696E82] italic p-4 text-center">No active construction sites defined for this project.</p>
          ) : (
            <div className="space-y-4">
              {project.sites.map((site) => (
                <div key={site.id} className="border border-[#E2E6F0] rounded-xl p-4 bg-[#F8F9FD] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-[#1F1F1F]">{site.name}</h4>
                      <p className="text-[11px] text-[#696E82]">{site.address}</p>
                    </div>
                    <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-[#E2E6F0]">
                      Radius: {site.radiusMeters}m
                    </span>
                  </div>

                  <div className="pt-2 border-t border-[#E2E6F0] space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#696E82] block">Recent Visits</span>
                    {site.visits.length === 0 ? (
                      <p className="text-[11px] text-[#696E82] italic">No visit logs on record.</p>
                    ) : (
                      site.visits.map((v) => (
                        <div key={v.id} className="bg-white p-2.5 rounded-lg border border-[#E2E6F0] flex items-center justify-between text-xs">
                          <div>
                            <span className="font-semibold text-[#1F1F1F]">{v.purpose}</span>
                            <div className="text-[11px] text-[#696E82]">
                              Architect: {v.employee.user.fullName} • {new Date(v.scheduledTime).toLocaleDateString("en-IN")}
                            </div>
                          </div>
                          <span className="font-mono text-[10px] font-bold text-[#5A81FA] bg-[#F2F4FF] px-2 py-0.5 rounded border border-[#CEDEFF]">
                            {v.operationalState}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. Finance Tab */}
      {tab === "finance" && (
        <div className="bg-white border border-[#E2E6F0] rounded-2xl p-6 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-4">
            <div>
              <h3 className="text-sm font-bold text-[#1F1F1F]">Project Financial Ledger</h3>
              <p className="text-xs text-[#696E82]">Planned budgets, invoiced client fee milestones, and verified expenses</p>
            </div>
            <span className="text-xs font-bold text-[#5A81FA] bg-[#F2F4FF] px-2.5 py-1 rounded border border-[#CEDEFF]">
              Permission-Gated View
            </span>
          </div>

          {/* Budget Categories */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#696E82] mb-3">Planned Budgets</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {project.budgets.map((b) => (
                <div key={b.id} className="p-3 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs space-y-1">
                  <span className="text-[#696E82] block text-[10px]">{b.category}</span>
                  <span className="font-bold text-[#1F1F1F]">
                    {b.currency} {Number(b.plannedAmount).toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Fee Milestones & Payments */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#696E82] mb-3">Client Fee Milestones</h4>
            <div className="space-y-2">
              {project.feeMilestones.map((fm) => (
                <div key={fm.id} className="p-3 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-[#1F1F1F]">{fm.title}</span>
                    <div className="text-[11px] text-[#696E82]">
                      Target Date: {new Date(fm.milestoneDate).toLocaleDateString("en-IN")}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-[#5A81FA]">
                      {fm.currency} {Number(fm.amount).toLocaleString("en-IN")}
                    </span>
                    <span className="block text-[10px] font-semibold text-emerald-700">{fm.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. Team Tab */}
      {tab === "team" && (
        <div className="bg-white border border-[#E2E6F0] rounded-2xl p-6 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-[#1F1F1F]">Assigned Studio Members</h3>
          <div className="divide-y divide-[#E2E6F0]">
            {project.members.map((m) => (
              <div key={m.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-[#1F1F1F]">{m.membership.user.fullName}</span>
                  <span className="text-[#696E82] ml-2">({m.membership.employee?.employeeId})</span>
                  <div className="text-[11px] text-[#696E82]">{m.projectRole}</div>
                </div>
                <span className="text-[11px] font-semibold text-[#5A81FA]">{m.membership.role}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
