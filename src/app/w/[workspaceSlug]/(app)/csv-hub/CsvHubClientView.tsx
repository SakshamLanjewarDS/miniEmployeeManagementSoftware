"use client";

import React, { useState } from "react";
import {
  FileSpreadsheet,
  Upload,
  Download,
  Users,
  Wrench,
  Briefcase,
  Building,
  FolderKanban,
  CheckCircle2,
  HelpCircle,
  FileText,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { CsvImportExportModal, CsvTargetType } from "@/components/csv/CsvImportExportModal";

interface CsvHubClientViewProps {
  workspaceSlug: string;
  userRole: string;
}

export function CsvHubClientView({ workspaceSlug, userRole }: CsvHubClientViewProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<CsvTargetType>("employees");

  const openModal = (type: CsvTargetType) => {
    setModalType(type);
    setModalOpen(true);
  };

  const handleDownloadTemplate = (type: string) => {
    window.open(`/api/csv/template?type=${type}`, "_blank");
  };

  const handleExport = (type: string) => {
    window.open(`/api/csv/export?workspaceSlug=${workspaceSlug}&type=${type}`, "_blank");
  };

  const cards = [
    {
      type: "employees" as CsvTargetType,
      title: "Studio Team (Employee Generation)",
      subtitle: "Bulk generate studio team members, assign credentials, and set departments.",
      icon: Users,
      badge: "Staff Accounts",
      badgeColor: "bg-[#5A81FA]/10 text-[#5A81FA] border-[#5A81FA]/20",
      headers: [
        "Full Name",
        "Contact",
        "Alternate Contact",
        "Work Mail",
        "Department",
        "Designation",
      ],
      description:
        "Upload a CSV with staff details. The system automatically creates their active user account, generates sequential Employee IDs (EMP-002, EMP-003, etc.), and assigns initial credentials. You can edit and customize them directly from Studio Team.",
      targetUrl: `/w/${workspaceSlug}/team`,
      targetLabel: "View Studio Team",
    },
    {
      type: "contractors" as CsvTargetType,
      title: "Contractors & Vendors Directory",
      subtitle: "Import masonry contractors, material vendors, fabricators, and trade suppliers.",
      icon: Wrench,
      badge: "Vendors & Contractors",
      badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
      headers: [
        "Contractor Name",
        "Company Name",
        "Type",
        "Contact",
        "Alternate Contact",
        "Email",
        "Projects",
        "Office Location",
      ],
      description:
        "Supports both 'Contractors details' and 'Vendor details'. Records appear in Contractors directory and link to projects automatically.",
      targetUrl: `/w/${workspaceSlug}/contractors`,
      targetLabel: "View Contractors",
    },
    {
      type: "consultants" as CsvTargetType,
      title: "Consultants Directory",
      subtitle: "Import structural engineers, MEP specialists, and landscape architects.",
      icon: Briefcase,
      badge: "Engineering Disciplines",
      badgeColor: "bg-purple-50 text-purple-800 border-purple-200",
      headers: [
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
      description:
        "Import specialized consultants and assign them to specific engineering disciplines for drawing reviews.",
      targetUrl: `/w/${workspaceSlug}/consultants`,
      targetLabel: "View Consultants",
    },
    {
      type: "clients" as CsvTargetType,
      title: "Clients Directory",
      subtitle: "Import project owners, private villa clients, and corporate accounts.",
      icon: Building,
      badge: "Client CRM",
      badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
      headers: [
        "Client Name",
        "Projects",
        "Client Type",
        "Email",
        "Contact No",
        "Location",
        "Notes (Extra info.)",
      ],
      description:
        "Import client records and associate them with residential, commercial, or institutional projects.",
      targetUrl: `/w/${workspaceSlug}/directory`,
      targetLabel: "View Clients",
    },
    {
      type: "projects" as CsvTargetType,
      title: "Studio Projects",
      subtitle: "Import architectural projects, phase tracking, timelines, and client links.",
      icon: FolderKanban,
      badge: "Projects & Architecture",
      badgeColor: "bg-blue-50 text-blue-800 border-blue-200",
      headers: [
        "Project name",
        "Clients",
        "Project type",
        "Phase",
        "Starting - Deadline",
        "Other info",
      ],
      description:
        "Import architectural commissions. The engine parses timelines (starting - deadline), links or registers the primary client, and seeds architectural phases.",
      targetUrl: `/w/${workspaceSlug}/projects`,
      targetLabel: "View Projects",
    },
    {
      type: "all" as CsvTargetType,
      title: "Master Multi-Tab / All-in-One CSV",
      subtitle: "Bulk import or export all tabs (Clients, Vendors, Contractors, Consultants, Projects, Employees) in one unified file.",
      icon: Sparkles,
      badge: "Multi-Category Master",
      badgeColor: "bg-indigo-50 text-indigo-800 border-indigo-200",
      headers: [
        "=== CLIENT DETAILS ===",
        "=== CONTRACTORS & VENDOR DETAILS ===",
        "=== CONSULTANT DETAILS ===",
        "=== PROJECTS DETAILS ===",
        "=== STUDIO TEAM (EMPLOYEES) ===",
      ],
      description:
        "Have an Excel spreadsheet with multiple tabs? Export your tabs or use our all-in-one format. The engine automatically routes records to their respective pages (Clients to Directory, Vendors to Contractors, Consultants to Consultants, Projects to Projects, Staff to Studio Team).",
      targetUrl: `/w/${workspaceSlug}/csv-hub`,
      targetLabel: "Master Hub",
    },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="border-b border-[#E2E6F0] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#5A81FA] uppercase tracking-wider mb-1">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Studio Data Migration & Management</span>
            <span>•</span>
            <span>RFC 4180 & OWASP Formula Injection Protected</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1F1F1F]">CSV Data Hub</h1>
          <p className="text-xs text-[#696E82] mt-1 max-w-2xl">
            Import and export records across all studio modules. Choose the target category below to download sample CSV templates, upload new batches, or export existing studio data.
          </p>
        </div>

        <button
          onClick={() => openModal("employees")}
          className="bg-[#5A81FA] hover:bg-[#426EE8] text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 shrink-0 transition-all cursor-pointer self-start md:self-auto"
        >
          <Upload className="w-4 h-4" />
          <span>Launch Quick Import / Export</span>
        </button>
      </div>

      {/* Workflow Guide Card */}
      <div className="bg-gradient-to-r from-[#F2F4FF] to-white border border-[#CEDEFF] rounded-2xl p-6 shadow-2xs">
        <div className="flex items-center gap-2 text-xs font-bold text-[#2C308D] uppercase tracking-wider mb-2">
          <Sparkles className="w-4 h-4 text-[#5A81FA]" />
          <span>How Employee Generation via CSV Works</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[#1F1F1F] mt-4">
          <div className="bg-white/80 border border-[#CEDEFF]/60 rounded-xl p-4 space-y-1.5">
            <div className="font-bold text-[#2C308D] flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-[#5A81FA] text-white text-[10px] flex items-center justify-center font-bold">1</span>
              <span>Upload Employee CSV</span>
            </div>
            <p className="text-[#696E82] text-[11px]">
              Provide columns: <strong>Full Name, Contact, Alternate Contact, Work Mail, Department, Designation</strong>.
            </p>
          </div>

          <div className="bg-white/80 border border-[#CEDEFF]/60 rounded-xl p-4 space-y-1.5">
            <div className="font-bold text-[#2C308D] flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-[#5A81FA] text-white text-[10px] flex items-center justify-center font-bold">2</span>
              <span>Automatic ID & Account Setup</span>
            </div>
            <p className="text-[#696E82] text-[11px]">
              The server assigns sequential IDs (EMP-002, EMP-003...) and default credentials, populating the Studio Team.
            </p>
          </div>

          <div className="bg-white/80 border border-[#CEDEFF]/60 rounded-xl p-4 space-y-1.5">
            <div className="font-bold text-[#2C308D] flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-[#5A81FA] text-white text-[10px] flex items-center justify-center font-bold">3</span>
              <span>Edit, Customize & Assign</span>
            </div>
            <p className="text-[#696E82] text-[11px]">
              Open the Studio Team tab to edit roles (Boss, Admin, Employee), update passwords, or assign projects.
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Purpose Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.type}
              className="bg-white border border-[#E2E6F0] rounded-2xl p-6 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-5"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-[#F8F9FD] border border-[#E2E6F0] flex items-center justify-center text-[#5A81FA]">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${card.badgeColor}`}
                  >
                    {card.badge}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-[#1F1F1F]">{card.title}</h3>
                  <p className="text-xs text-[#696E82] mt-0.5">{card.subtitle}</p>
                </div>

                <p className="text-xs text-[#1F1F1F]/80 leading-relaxed bg-[#F8F9FD] p-3 rounded-xl border border-[#E2E6F0]/80">
                  {card.description}
                </p>

                <div>
                  <div className="text-[11px] font-bold text-[#696E82] uppercase tracking-wider mb-1.5">
                    Recognized Headers:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {card.headers.map((h) => (
                      <span
                        key={h}
                        className="bg-[#CEDEFF]/40 text-[#2C308D] border border-[#CEDEFF]/70 px-2 py-0.5 rounded text-[10px] font-mono font-medium"
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-[#E2E6F0] flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadTemplate(card.type)}
                    className="bg-white border border-[#E2E6F0] hover:bg-[#F8F9FD] text-[#1F1F1F] px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-[#5A81FA]" />
                    <span>Sample Template</span>
                  </button>
                  <button
                    onClick={() => handleExport(card.type)}
                    className="bg-white border border-[#E2E6F0] hover:bg-[#F8F9FD] text-[#696E82] hover:text-[#1F1F1F] px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                </div>

                <button
                  onClick={() => openModal(card.type)}
                  className="bg-[#5A81FA] hover:bg-[#426EE8] text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import CSV</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      <CsvImportExportModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        workspaceSlug={workspaceSlug}
        defaultType={modalType}
      />
    </div>
  );
}
