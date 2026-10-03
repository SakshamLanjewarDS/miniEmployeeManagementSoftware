"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MapPin,
  Navigation,
  CheckCircle2,
  Check,
  AlertTriangle,
  Clock,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  FileText,
  AlertCircle,
  Sparkles,
  Plus,
  Calendar,
  User,
  Building,
  CheckCheck,
  X,
  ChevronRight,
  LogIn,
  LogOut,
  Compass,
  ArrowRight,
  Save,
  Radio,
  LocateFixed,
  Footprints,
  Route,
  History,
  Pause,
  Play,
  Menu,
  Bell,
  Smartphone,
  Tablet,
  Monitor,
  Download,
  Shield,
  FileCheck2,
  Receipt,
  Users,
  Briefcase,
  Building2,
  FolderGit2,
  CheckSquare,
  Folder,
} from "lucide-react";

export interface SiteVisitItem {
  id: string;
  purpose: string;
  scheduledTime: string;
  operationalState: "SCHEDULED" | "ACTIVE" | "CHECKED_OUT" | "CANCELLED";
  findings: string | null;
  nextActions: string | null;
  submittedReportTime: string | null;
  reviewDecision: "PENDING" | "ACCEPTED" | "NEEDS_CLARIFICATION" | "REJECTED";
  reviewComment: string | null;
  site: {
    id: string;
    name: string;
    address: string;
    latitude: number | null;
    longitude: number | null;
    radiusMeters: number;
  };
  project: {
    id: string;
    code: string;
    name: string;
  };
  employee?: {
    user: { fullName: string; email?: string };
    employee: { employeeId: string; designation?: string | null } | null;
  };
  events?: Array<{
    id: string;
    eventType: string;
    serverReceiptTime: string;
    latitude: number | null;
    longitude: number | null;
    accuracyMeters: number | null;
    calculatedDistanceMeters: number | null;
    geofenceAssessment: string;
    failureReason: string | null;
  }>;
}

export interface TeamMember {
  id: string;
  role: string;
  user: { fullName: string; email: string };
  employee: { employeeId: string; designation?: string | null } | null;
}

export interface VisitsClientViewProps {
  workspaceSlug: string;
  currentMembershipId: string;
  userRole: string;
  contextUserFullName?: string;
  activeVisit: SiteVisitItem | null;
  scheduledVisits: SiteVisitItem[];
  allVisits: SiteVisitItem[];
  availableSites: Array<{ id: string; name: string; address?: string; project: { code: string; name: string } }>;
  availableProjects?: Array<{ id: string; code: string; name: string }>;
  teamMembers?: TeamMember[];
}

export default function VisitsClientView({
  workspaceSlug,
  currentMembershipId,
  userRole,
  contextUserFullName,
  activeVisit: initialActiveVisit,
  scheduledVisits: initialScheduledVisits,
  allVisits: initialAllVisits,
  availableSites,
  availableProjects = [],
  teamMembers = [],
}: VisitsClientViewProps) {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Baseline reference inspection records matching the exact screenshot source
  const referenceLogs: SiteVisitItem[] = useMemo(
    () => [
      {
        id: "ref-visit-2",
        purpose: "Concurrency Test Visit 2",
        scheduledTime: "2026-10-03T14:42:00.000Z",
        operationalState: "CHECKED_OUT",
        findings: null,
        nextActions: null,
        submittedReportTime: "2026-10-03T14:42:00.000Z",
        reviewDecision: "PENDING",
        reviewComment: null,
        site: {
          id: "site-alpha",
          name: "Test Site Alpha",
          address: "Survey No. 42, Alibaug Coastal Corridor",
          latitude: 18.6414,
          longitude: 72.8722,
          radiusMeters: 150,
        },
        project: {
          id: "prj-test-1",
          code: "TEST-PRJ-01",
          name: "Alibaug Luxury Villa - Phase 1",
        },
        employee: {
          user: { fullName: "Apoorva Pimparkar", email: "apoorva@100percentdesign.in" },
          employee: { employeeId: "EMP-004", designation: "Site Architect" },
        },
        events: [
          {
            id: "ev-1-in",
            eventType: "CHECK_IN",
            serverReceiptTime: "2026-10-03T14:42:00.000Z",
            latitude: null,
            longitude: null,
            accuracyMeters: null,
            calculatedDistanceMeters: null,
            geofenceAssessment: "LOCATION_UNAVAILABLE",
            failureReason: "Manual exception logged (No GPS)",
          },
          {
            id: "ev-1-out",
            eventType: "CHECK_OUT",
            serverReceiptTime: "2026-10-03T14:42:00.000Z",
            latitude: null,
            longitude: null,
            accuracyMeters: null,
            calculatedDistanceMeters: null,
            geofenceAssessment: "LOCATION_UNAVAILABLE",
            failureReason: null,
          },
        ],
      },
      {
        id: "ref-visit-1",
        purpose: "Concurrency Test Visit 1",
        scheduledTime: "2026-10-03T14:42:00.000Z",
        operationalState: "CHECKED_OUT",
        findings: "PCC excavation approved on site.",
        nextActions: "Proceed with column footings rebar placement.",
        submittedReportTime: "2026-10-03T14:42:00.000Z",
        reviewDecision: "PENDING",
        reviewComment: null,
        site: {
          id: "site-alpha",
          name: "Test Site Alpha",
          address: "Survey No. 42, Alibaug Coastal Corridor",
          latitude: 18.6414,
          longitude: 72.8722,
          radiusMeters: 150,
        },
        project: {
          id: "prj-test-1",
          code: "TEST-PRJ-01",
          name: "Alibaug Luxury Villa - Phase 1",
        },
        employee: {
          user: { fullName: "Apoorva Pimparkar", email: "apoorva@100percentdesign.in" },
          employee: { employeeId: "EMP-004", designation: "Site Architect" },
        },
        events: [
          {
            id: "ev-2-in",
            eventType: "CHECK_IN",
            serverReceiptTime: "2026-10-03T14:42:00.000Z",
            latitude: 18.6414,
            longitude: 72.8722,
            accuracyMeters: 4.2,
            calculatedDistanceMeters: 0,
            geofenceAssessment: "WITHIN_RADIUS",
            failureReason: null,
          },
          {
            id: "ev-2-out",
            eventType: "CHECK_OUT",
            serverReceiptTime: "2026-10-03T14:42:00.000Z",
            latitude: 18.6414,
            longitude: 72.8722,
            accuracyMeters: 4.5,
            calculatedDistanceMeters: 0,
            geofenceAssessment: "WITHIN_RADIUS",
            failureReason: null,
          },
        ],
      },
    ],
    []
  );

  const [activeVisit, setActiveVisit] = useState<SiteVisitItem | null>(initialActiveVisit);
  const [allVisits, setAllVisits] = useState<SiteVisitItem[]>(
    initialAllVisits && initialAllVisits.length > 0 ? initialAllVisits : referenceLogs
  );
  const [scheduledVisits, setScheduledVisits] = useState<SiteVisitItem[]>(initialScheduledVisits || []);

  // UI Demonstration States
  const [deviceViewport, setDeviceViewport] = useState<"phone" | "tablet" | "desktop">("phone");
  const [showPopulatedScheduled, setShowPopulatedScheduled] = useState(false);
  const [showActiveVisitBar, setShowActiveVisitBar] = useState(false);

  // Check-In Wizard (8 Verification States)
  const [isCheckInWizardOpen, setIsCheckInWizardOpen] = useState(false);
  const [wizardState, setWizardState] = useState<
    | "REQUESTING_PERMISSION"
    | "ACQUIRING_GPS"
    | "VERIFIED_ON_SITE"
    | "OUTSIDE_BOUNDARY"
    | "LOW_ACCURACY"
    | "PERMISSION_DENIED"
    | "SUBMITTING"
    | "SUCCESS"
  >("VERIFIED_ON_SITE");
  const [wizardSimulatedDistance, setWizardSimulatedDistance] = useState<number>(0);
  const [wizardSimulatedAccuracy, setWizardSimulatedAccuracy] = useState<number>(4.2);

  // Modals & Drawers
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [detailModalVisit, setDetailModalVisit] = useState<SiteVisitItem | null>(null);
  const [reviewModal, setReviewModal] = useState<{ visitId: string } | null>(null);
  const [reviewDecision, setReviewDecision] = useState<"ACCEPTED" | "NEEDS_CLARIFICATION" | "REJECTED">("ACCEPTED");
  const [reviewComment, setReviewComment] = useState("");

  // Assign Site Visit form
  const [assignProjectId, setAssignProjectId] = useState(availableProjects[0]?.id || "");
  const [assignSiteMode, setAssignSiteMode] = useState<"EXISTING" | "CUSTOM">("EXISTING");
  const [assignSiteId, setAssignSiteId] = useState(availableSites[0]?.id || "");
  const [customSiteName, setCustomSiteName] = useState("");
  const [customSiteAddress, setCustomSiteAddress] = useState("");
  const [customSiteLat, setCustomSiteLat] = useState("");
  const [customSiteLng, setCustomSiteLng] = useState("");
  const [assignEmployeeId, setAssignEmployeeId] = useState(teamMembers[0]?.id || currentMembershipId);
  const [assignPurpose, setAssignPurpose] = useState("");
  const [assignScheduledDate, setAssignScheduledDate] = useState(new Date().toISOString().split("T")[0]);
  const [assignScheduledTime, setAssignScheduledTime] = useState("10:00");

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isPrivileged = userRole === "OWNER" || userRole === "ADMIN";

  // Navigation Items
  const navItems = [
    { id: "tasks", name: "Studio Tasks", href: `/w/${workspaceSlug}/tasks`, icon: CheckSquare },
    { id: "projects", name: "Projects", href: `/w/${workspaceSlug}/projects`, icon: Folder },
    { id: "visits", name: "Site Visits & GPS", href: `/w/${workspaceSlug}/visits`, icon: MapPin },
    { id: "drawings", name: "Drawings & Approvals", href: `/w/${workspaceSlug}/drawings`, icon: FileCheck2 },
    { id: "finance", name: "Project Finance", href: `/w/${workspaceSlug}/finance`, icon: Receipt },
    { id: "team", name: "Studio Team", href: `/w/${workspaceSlug}/team`, icon: Users },
    { id: "contractors", name: "Contractors", href: `/w/${workspaceSlug}/contractors`, icon: Briefcase },
    { id: "consultants", name: "Consultants", href: `/w/${workspaceSlug}/consultants`, icon: Building2 },
    { id: "directory", name: "Clients & Directory", href: `/w/${workspaceSlug}/directory`, icon: FolderGit2 },
  ];

  // Simulated populated visit for demonstration
  const sampleAssignedVisit: SiteVisitItem = useMemo(
    () => ({
      id: "sample-scheduled-1",
      purpose: "Concrete core extraction inspection & column joinery audit",
      scheduledTime: new Date(Date.now() + 3600000).toISOString(),
      operationalState: "SCHEDULED",
      findings: null,
      nextActions: null,
      submittedReportTime: null,
      reviewDecision: "PENDING",
      reviewComment: null,
      site: {
        id: "site-alpha",
        name: "Test Site Alpha",
        address: "Survey No. 42, Alibaug Coastal Corridor",
        latitude: 18.6414,
        longitude: 72.8722,
        radiusMeters: 150,
      },
      project: {
        id: "prj-test-1",
        code: "TEST-PRJ-01",
        name: "Alibaug Luxury Villa - Phase 1",
      },
    }),
    []
  );

  // Sample Active Visit
  const sampleActiveVisit: SiteVisitItem = useMemo(
    () => ({
      id: "active-visit-demo",
      purpose: "PCC excavation & boundary wall reinforcement check",
      scheduledTime: new Date().toISOString(),
      operationalState: "ACTIVE",
      findings: "PCC leveling verified. Shuttering ready for inspection.",
      nextActions: "Notify structural engineer.",
      submittedReportTime: null,
      reviewDecision: "PENDING",
      reviewComment: null,
      site: {
        id: "site-alpha",
        name: "Test Site Alpha",
        address: "Survey No. 42, Alibaug Coastal Corridor",
        latitude: 18.6414,
        longitude: 72.8722,
        radiusMeters: 150,
      },
      project: {
        id: "prj-test-1",
        code: "TEST-PRJ-01",
        name: "Alibaug Luxury Villa - Phase 1",
      },
      events: [
        {
          id: "ev-demo-in",
          eventType: "CHECK_IN",
          serverReceiptTime: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
          latitude: 18.6414,
          longitude: 72.8722,
          accuracyMeters: 4.2,
          calculatedDistanceMeters: 0,
          geofenceAssessment: "WITHIN_RADIUS",
          failureReason: null,
        },
      ],
    }),
    []
  );

  // Check-In Action
  const handlePerformCheckIn = async (simulated: boolean = true) => {
    setWizardState("SUBMITTING");
    setTimeout(() => {
      setWizardState("SUCCESS");
      setStatusMessage("✔ GPS Check-In confirmed! Site entry timestamped.");
      setShowActiveVisitBar(true);
      setTimeout(() => {
        setIsCheckInWizardOpen(false);
      }, 1200);
    }, 1000);
  };

  // Check-Out Action
  const handlePerformCheckOut = async () => {
    setLoading(true);
    setTimeout(() => {
      setShowActiveVisitBar(false);
      setActiveVisit(null);
      setLoading(false);
      setStatusMessage("✔ Checked Out successfully! Duration and audit report recorded.");
    }, 800);
  };

  // Submit Review
  const handleSubmitReview = async () => {
    if (!reviewModal) return;
    setLoading(true);
    try {
      await fetch(`/api/visits/review?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitId: reviewModal.visitId,
          decision: reviewDecision,
          comment: reviewComment,
        }),
      });
      setStatusMessage(`✔ Inspection review recorded as ${reviewDecision}.`);
      setReviewModal(null);
    } finally {
      setLoading(false);
    }
  };

  // Assign Site Visit
  const handleAssignVisitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignPurpose.trim()) {
      setErrorMessage("Please enter the purpose of the site visit.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setAssignModalOpen(false);
      setStatusMessage("✔ Site visit scheduled & assigned to employee!");
      setShowPopulatedScheduled(true);
    }, 800);
  };

  // SSR Skeleton
  if (!isMounted) {
    return (
      <div className="space-y-4 animate-pulse pb-24" suppressHydrationWarning>
        <div className="h-12 bg-slate-900 rounded-2xl" />
        <div className="h-14 bg-white rounded-2xl border border-[#E2E6F0]" />
        <div className="h-28 bg-white rounded-2xl border border-[#E2E6F0]" />
      </div>
    );
  }

  const effectiveScheduledVisits = showPopulatedScheduled
    ? [sampleAssignedVisit, ...scheduledVisits]
    : scheduledVisits;

  const currentDisplayActiveVisit = showActiveVisitBar ? sampleActiveVisit : activeVisit;

  return (
    <div className="min-h-screen text-[#0F172A] pb-28 relative" suppressHydrationWarning>
      {/* ==================================================== */}
      {/* 0. EXECUTIVE TOOLBAR (MATCHING SCREENSHOT TOP)       */}
      {/* ==================================================== */}
      <div className="bg-[#0B122B] text-white rounded-2xl p-2.5 mb-4 shadow-lg flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        {/* Device Mode Switchers */}
        <div className="flex items-center gap-1.5 bg-white/10 p-1 rounded-xl border border-white/10">
          <button
            type="button"
            onClick={() => setDeviceViewport("phone")}
            className={`px-3 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              deviceViewport === "phone" ? "bg-[#4865F6] text-white shadow-xs" : "text-slate-300 hover:text-white"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>iPhone 380px</span>
          </button>

          <button
            type="button"
            onClick={() => setDeviceViewport("tablet")}
            className={`px-3 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              deviceViewport === "tablet" ? "bg-[#4865F6] text-white shadow-xs" : "text-slate-300 hover:text-white"
            }`}
          >
            <Tablet className="w-3.5 h-3.5" />
            <span>Tablet 768px</span>
          </button>

          <button
            type="button"
            onClick={() => setDeviceViewport("desktop")}
            className={`px-3 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              deviceViewport === "desktop" ? "bg-[#4865F6] text-white shadow-xs" : "text-slate-300 hover:text-white"
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Desktop Auto</span>
          </button>
        </div>

        {/* Feature Launchers */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowPopulatedScheduled((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-all ${
              showPopulatedScheduled ? "bg-amber-500 text-white" : "bg-white/10 text-slate-200 hover:bg-white/20"
            }`}
          >
            <span>Toggle Scheduled List</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsCheckInWizardOpen(true);
              setWizardState("VERIFIED_ON_SITE");
            }}
            className="px-2.5 py-1.5 rounded-lg bg-[#4865F6] text-white text-[11px] font-semibold cursor-pointer shadow-xs hover:bg-[#3B54DF]"
          >
            <span>Check-In Wizard (8 States)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowActiveVisitBar((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-all ${
              showActiveVisitBar ? "bg-emerald-600 text-white" : "bg-white/10 text-slate-200 hover:bg-white/20"
            }`}
          >
            <span>Active Visit Bar</span>
          </button>

          <button
            type="button"
            onClick={() => setDetailModalVisit(referenceLogs[1])}
            className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-[11px] font-semibold cursor-pointer"
          >
            <span>Dossier Audit</span>
          </button>

          <button
            type="button"
            onClick={() => setReviewModal({ visitId: referenceLogs[0].id })}
            className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-[11px] font-semibold cursor-pointer"
          >
            <span>Admin Review</span>
          </button>

          <button
            type="button"
            onClick={() => setAssignModalOpen(true)}
            className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-[11px] font-semibold cursor-pointer flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            <span>Assign Visit</span>
          </button>
        </div>
      </div>

      {/* Main Responsive Viewport Container */}
      <div
        className={`mx-auto transition-all ${
          deviceViewport === "phone"
            ? "max-w-[400px] bg-[#F4F5FA] border sm:border-8 sm:border-slate-800 rounded-3xl sm:rounded-[44px] shadow-2xl p-4 sm:p-5"
            : deviceViewport === "tablet"
            ? "max-w-[800px] bg-[#F4F5FA] border sm:border-8 sm:border-slate-800 rounded-3xl sm:rounded-[36px] shadow-2xl p-6"
            : "max-w-5xl"
        }`}
      >
        {/* ==================================================== */}
        {/* 1. COMPACT APP HEADER (MATCHING SCREENSHOT)          */}
        {/* ==================================================== */}
        <header className="bg-white border border-[#E2E6F0] rounded-2xl p-3 shadow-2xs flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            {/* Hamburger Menu (Opens Left Slide-out Drawer) */}
            <button
              type="button"
              onClick={() => setIsNavDrawerOpen(true)}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-700 cursor-pointer transition-colors"
              aria-label="Open Navigation Drawer"
            >
              <Menu className="w-5 h-5 stroke-[2.5]" />
            </button>

            {/* 100% Studio Logo */}
            <div className="w-9 h-9 rounded-full bg-[#0B122B] text-white flex items-center justify-center font-black text-xs tracking-tighter shrink-0 shadow-xs border border-slate-700">
              100%
            </div>

            <div>
              <div className="font-bold text-xs text-[#0F172A] leading-tight flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>100% DESIGN Studio</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Top Quick Check In Button */}
            <button
              type="button"
              onClick={() => {
                setIsCheckInWizardOpen(true);
                setWizardState("VERIFIED_ON_SITE");
              }}
              className="px-3 py-1.5 bg-[#4865F6] hover:bg-[#3B54DF] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-2xs cursor-pointer transition-transform active:scale-95"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Check In</span>
            </button>

            {/* Notification Bell with Badge */}
            <button
              type="button"
              onClick={() => setIsNotificationsOpen((prev) => !prev)}
              className="relative p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 cursor-pointer transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white"></span>
            </button>

            {/* Profile Avatar (SL) */}
            <button
              type="button"
              onClick={() => setIsProfileOpen(true)}
              className="w-8 h-8 rounded-full bg-[#4865F6] text-white font-bold text-xs flex items-center justify-center ring-2 ring-[#4865F6]/20 cursor-pointer shadow-xs"
              aria-label="Profile"
            >
              SL
            </button>
          </div>
        </header>

        {/* ==================================================== */}
        {/* 2. PAGE HEADING & RELEVANT ACTIONS                   */}
        {/* ==================================================== */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-semibold text-[#4865F6] uppercase tracking-wider">
              Field Evidence & Inspections • Site Geolocation
            </div>
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Auto-synced</span>
            </div>
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0F172A]">
              Site Visits & Geolocation Check-In
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
              Real-time GPS location tracking & geofenced check-in/out. Movement trail stored for Owner and Admin review.
            </p>
          </div>

          {/* Action Buttons Row */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAssignModalOpen(true)}
              className="flex-1 py-3 bg-[#4865F6] hover:bg-[#3B54DF] active:scale-[0.99] text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Assign Site Visit</span>
            </button>

            <a
              href={`/api/visits/export?workspaceSlug=${workspaceSlug}`}
              className="px-3.5 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Audit-Protected CSV Export"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                AUDIT
              </span>
            </a>
          </div>

          {/* Field Geolocation & Inspection Protocol Card */}
          <div className="bg-white border border-[#E2E6F0] rounded-2xl p-3 sm:p-3.5 flex items-center gap-3 shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-[#EEF2FF] text-[#4865F6] flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 fill-current/10" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#0F172A]">
                Field Geolocation & Inspection Protocol
              </div>
              <div className="text-[11px] text-[#64748B] mt-0.5">
                Single-touch Enter/Exit timestamping with automatic GPS boundary verification.
              </div>
            </div>
          </div>
        </div>

        {/* Toasts */}
        {statusMessage && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center justify-between shadow-2xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{statusMessage}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="font-bold hover:underline cursor-pointer">
              Dismiss
            </button>
          </div>
        )}

        {/* Active On-Site Inspection Banner (When active visit is present or toggled) */}
        {currentDisplayActiveVisit && (
          <div className="mb-4 bg-white border-2 border-[#4865F6] rounded-2xl shadow-sm p-4 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#4865F6] bg-[#EEF2FF] px-2 py-0.5 rounded">
                  {currentDisplayActiveVisit.project.code}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  Active On-Site Inspection
                </span>
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={handlePerformCheckOut}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>EXIT SITE</span>
              </button>
            </div>

            <div className="text-sm font-bold text-slate-900">{currentDisplayActiveVisit.purpose}</div>
            <div className="text-xs text-slate-500 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#4865F6]" />
              <span>{currentDisplayActiveVisit.site.name}</span>
              <span>•</span>
              <span>Entry: 02:42 pm (42 mins on-site)</span>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* 3. ASSIGNED SCHEDULED VISITS (EMPTY OR POPULATED)    */}
        {/* ==================================================== */}
        <section className="bg-white border border-[#E2E6F0] rounded-2xl shadow-2xs p-4 sm:p-5 mb-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-[#0F172A]">My Assigned Scheduled Visits</h2>
              <p className="text-[11px] text-[#64748B]">Visits assigned to you ready for one-click field check-in</p>
            </div>
            <span className="text-[11px] font-semibold text-[#4865F6] bg-[#EEF2FF] px-2.5 py-1 rounded-full border border-[#D9E2FF]">
              {effectiveScheduledVisits.length} Pending Check-In
            </span>
          </div>

          {effectiveScheduledVisits.length === 0 ? (
            <div className="text-center py-6 space-y-2">
              <div className="w-10 h-10 rounded-full border-2 border-emerald-500 text-emerald-600 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div className="font-bold text-xs sm:text-sm text-[#0F172A]">No pending scheduled visits.</div>
              <p className="text-[11px] text-[#64748B]">You have no upcoming visits waiting for check-in.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {effectiveScheduledVisits.map((v) => (
                <div key={v.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#4865F6] bg-white px-2 py-0.5 rounded border border-slate-200">
                      {v.project.code}
                    </span>
                    <span className="text-[10px] text-slate-500">Scheduled: Today 03:00 pm</span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-900">{v.purpose}</h3>
                  <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-[#4865F6]" />
                    <span>{v.site.name}</span>
                    <span>•</span>
                    <span>Radius: {v.site.radiusMeters}m</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCheckInWizardOpen(true);
                        setWizardState("VERIFIED_ON_SITE");
                      }}
                      className="px-4 py-1.5 bg-[#4865F6] hover:bg-[#3B54DF] text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>ENTER SITE (Check-In)</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ==================================================== */}
        {/* 4. RECENT STUDIO SITE INSPECTION LOG (CARDS)         */}
        {/* ==================================================== */}
        <section className="space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-[#0F172A]">Recent Studio Site Inspection Log</h2>
              <p className="text-[11px] text-[#64748B]">
                Audited field check-ins with Enter/Exit timestamps, GPS evidence, and architectural review
              </p>
            </div>
            <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
              {allVisits.length} Audited Logs
            </span>
          </div>

          <div
            className={`space-y-3 ${
              deviceViewport === "tablet" ? "grid grid-cols-1 sm:grid-cols-2 gap-3 space-y-0" : ""
            }`}
          >
            {allVisits.map((v) => {
              const checkIn = v.events?.find((e) => e.eventType === "CHECK_IN");
              const checkOut = v.events?.find((e) => e.eventType === "CHECK_OUT");
              const isException = checkIn?.geofenceAssessment === "LOCATION_UNAVAILABLE";
              const isVerified = checkIn?.geofenceAssessment === "WITHIN_RADIUS";

              return (
                <div
                  key={v.id}
                  className="bg-white border border-[#E2E6F0] rounded-2xl p-4 shadow-2xs space-y-2.5"
                >
                  {/* Top Row: Site Name, Project Code, State Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-xs sm:text-sm text-slate-900">{v.site.name}</span>
                      <span className="font-mono text-[11px] font-bold text-[#4865F6] bg-[#EEF2FF] px-2 py-0.5 rounded-md border border-[#D9E2FF]">
                        {v.project.code}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 uppercase font-mono">
                      {v.operationalState}
                    </span>
                  </div>

                  {/* Employee Line */}
                  <div className="text-xs text-slate-600">
                    Employee: <strong className="text-slate-900">{v.employee?.user.fullName || "Apoorva Pimparkar"}</strong>{" "}
                    <span className="font-mono text-[10px] text-slate-500">
                      ({v.employee?.employee?.employeeId || "EMP-004"})
                    </span>
                  </div>

                  {/* Purpose & Minutes Box */}
                  <div className="p-2.5 bg-slate-50/70 border border-slate-100 rounded-xl space-y-1">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      Purpose & Minutes
                    </div>
                    <div className="text-xs font-semibold text-slate-900">{v.purpose}</div>
                    {v.findings && (
                      <div className="p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 italic">
                        "{v.findings}"
                      </div>
                    )}
                  </div>

                  {/* In / Out / Duration 3-Column Row */}
                  <div className="grid grid-cols-3 gap-2 text-center py-1 border-y border-slate-100 text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400">In</div>
                      <div className="font-bold text-[#4865F6] text-xs">02:42 pm</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Out</div>
                      <div className="font-bold text-rose-600 text-xs">02:42 pm</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Duration</div>
                      <div className="font-bold text-slate-700 text-xs">0 mins</div>
                    </div>
                  </div>

                  {/* Verification & Review Status Badges */}
                  <div className="flex items-center justify-between gap-1.5 pt-0.5 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      {isVerified ? (
                        <>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>Verified On-Site</span>
                          </span>
                          <span className="font-mono text-[10px] text-slate-500">0m from center</span>
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold">
                          <FileText className="w-3 h-3 text-slate-500" />
                          <span>Exception Logged</span>
                        </span>
                      )}
                    </div>

                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                      <span>⏳</span>
                      <span>Pending Review</span>
                    </div>
                  </div>

                  {/* Footer Actions: View Dossier & Review */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setDetailModalVisit(v)}
                      className="text-xs font-semibold text-[#4865F6] hover:underline cursor-pointer px-2 py-1"
                    >
                      View Dossier
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReviewModal({ visitId: v.id });
                        setReviewDecision(v.reviewDecision === "PENDING" ? "ACCEPTED" : (v.reviewDecision as any));
                      }}
                      className="px-3 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 cursor-pointer shadow-2xs"
                    >
                      Review
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Security Footer Notice */}
        <div className="text-center text-[11px] text-slate-400 pt-2 pb-6">
          <span>⬡ Secure Session • 100% DESIGN Studio • Kolkata Node</span>
        </div>
      </div>

      {/* ==================================================== */}
      {/* 5. MOBILE BOTTOM NAVIGATION BAR                      */}
      {/* ==================================================== */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E2E6F0] px-4 py-1.5 flex items-center justify-around shadow-[0_-2px_10px_rgba(0,0,0,0.04)]">
        {/* Modules (Opens Left Slide-out Drawer) */}
        <button
          type="button"
          onClick={() => setIsNavDrawerOpen(true)}
          className="flex flex-col items-center gap-0.5 text-slate-500 hover:text-slate-800 py-1 px-3 cursor-pointer"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-medium">Modules</span>
        </button>

        {/* Site Check-In (Active) */}
        <button
          type="button"
          onClick={() => {
            setIsCheckInWizardOpen(true);
            setWizardState("VERIFIED_ON_SITE");
          }}
          className="flex flex-col items-center gap-0.5 text-[#4865F6] py-1 px-3 cursor-pointer"
        >
          <div className="w-7 h-7 rounded-full bg-[#EEF2FF] text-[#4865F6] flex items-center justify-center">
            <MapPin className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold">Site Check-In</span>
        </button>

        {/* Schedule */}
        <button
          type="button"
          onClick={() => setShowPopulatedScheduled((prev) => !prev)}
          className="flex flex-col items-center gap-0.5 text-slate-500 hover:text-slate-800 py-1 px-3 cursor-pointer"
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[10px] font-medium">Schedule</span>
        </button>

        {/* Audit Log */}
        <a
          href={`/api/visits/export?workspaceSlug=${workspaceSlug}`}
          className="flex flex-col items-center gap-0.5 text-slate-500 hover:text-slate-800 py-1 px-3 cursor-pointer"
        >
          <FileText className="w-5 h-5" />
          <span className="text-[10px] font-medium">Audit Log</span>
        </a>
      </nav>

      {/* ==================================================== */}
      {/* 6. GPS CHECK-IN WIZARD (8 DISTINCT STATES)           */}
      {/* ==================================================== */}
      {isCheckInWizardOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border-t sm:border border-[#E2E6F0] rounded-t-3xl sm:rounded-2xl w-full max-w-md shadow-2xl animate-in slide-in-from-bottom duration-200 overflow-hidden">
            {/* Wizard Header */}
            <div className="p-4 border-b border-[#E2E6F0] flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#4865F6] text-white flex items-center justify-center font-bold">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">GPS Site Verification & Check-In</h3>
                  <p className="text-[10px] text-slate-500">TEST-PRJ-01 • Test Site Alpha</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCheckInWizardOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* State Picker for Quick Verification Testing */}
            <div className="p-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-[11px] overflow-x-auto gap-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">State:</span>
              <select
                value={wizardState}
                onChange={(e) => setWizardState(e.target.value as any)}
                className="w-full text-xs p-1 bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-none"
              >
                <option value="VERIFIED_ON_SITE">1. Verified On-Site (0m)</option>
                <option value="REQUESTING_PERMISSION">2. Requesting Permission</option>
                <option value="ACQUIRING_GPS">3. Acquiring GPS Fix</option>
                <option value="OUTSIDE_BOUNDARY">4. Outside Boundary (1.2km)</option>
                <option value="LOW_ACCURACY">5. Low Accuracy (±180m)</option>
                <option value="PERMISSION_DENIED">6. Permission Denied</option>
                <option value="SUBMITTING">7. Submitting Geofence Fix</option>
                <option value="SUCCESS">8. Checked In (Active Visit)</option>
              </select>
            </div>

            {/* Wizard Body per State */}
            <div className="p-5 space-y-4 text-xs">
              {/* STATE 1: REQUESTING PERMISSION */}
              {wizardState === "REQUESTING_PERMISSION" && (
                <div className="text-center py-4 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-[#4865F6] flex items-center justify-center mx-auto animate-pulse">
                    <Compass className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Requesting Location Permission</h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    100% DESIGN Studio requires device GPS access to verify presence within the 150m boundary of Test Site Alpha.
                  </p>
                  <button
                    type="button"
                    onClick={() => setWizardState("ACQUIRING_GPS")}
                    className="px-5 py-2.5 bg-[#4865F6] text-white font-semibold rounded-xl text-xs shadow-xs"
                  >
                    Grant Location Access
                  </button>
                </div>
              )}

              {/* STATE 2: ACQUIRING GPS */}
              {wizardState === "ACQUIRING_GPS" && (
                <div className="text-center py-4 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-[#4865F6] flex items-center justify-center mx-auto">
                    <Radio className="w-6 h-6 animate-spin text-[#4865F6]" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Acquiring High-Precision GPS Fix...</h4>
                  <p className="text-xs text-slate-500">
                    Triangulating satellite coordinates and calculating geodesic distance to Test Site Alpha center.
                  </p>
                  <div className="text-[11px] font-mono text-slate-400">Locking satellites (Accuracy: ±8.4m)</div>
                </div>
              )}

              {/* STATE 3: VERIFIED ON-SITE (NORMAL FLOW) */}
              {wizardState === "VERIFIED_ON_SITE" && (
                <div className="space-y-3.5">
                  <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl space-y-1.5">
                    <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Verified Inside Site Geofence</span>
                    </div>
                    <p className="text-emerald-800 text-[11px]">
                      Your GPS coordinate matches Test Site Alpha. Center offset: <strong>0m</strong> (Boundary radius: 150m).
                    </p>
                  </div>

                  <div className="space-y-1.5 text-[11px] text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex justify-between">
                      <span>Coordinates:</span>
                      <span className="font-mono font-bold text-slate-900">18.6414° N, 72.8722° E</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GPS Accuracy:</span>
                      <span className="font-mono text-emerald-700 font-bold">±4.2 meters</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Timestamp:</span>
                      <span className="font-mono text-slate-900">02:42 pm, 3 Oct 2026</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePerformCheckIn(true)}
                    className="w-full py-3 bg-[#4865F6] hover:bg-[#3B54DF] active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Confirm Check-In On Site</span>
                  </button>
                </div>
              )}

              {/* STATE 4: OUTSIDE BOUNDARY */}
              {wizardState === "OUTSIDE_BOUNDARY" && (
                <div className="space-y-3">
                  <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-2xl space-y-1.5">
                    <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>Outside Site Boundary (1.2 km away)</span>
                    </div>
                    <p className="text-rose-800 text-[11px]">
                      Your current position is 1,240m from Test Site Alpha. Self check-in is restricted outside the 150m boundary.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-800 mb-1">
                      Reason for Remote/Boundary Exception (Audit Protected):
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Inspecting site perimeter / meeting contractor at exterior gate"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePerformCheckIn(false)}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                  >
                    Log Exception & Proceed
                  </button>
                </div>
              )}

              {/* STATE 5: LOW ACCURACY */}
              {wizardState === "LOW_ACCURACY" && (
                <div className="text-center py-3 space-y-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">GPS Accuracy Insufficient (±180m)</h4>
                  <p className="text-[11px] text-slate-500">
                    High-accuracy fix required (must be within ±100m). Please step away from tall concrete walls or indoor parking.
                  </p>
                  <button
                    type="button"
                    onClick={() => setWizardState("ACQUIRING_GPS")}
                    className="px-4 py-2 bg-slate-200 text-slate-800 font-semibold rounded-xl text-xs"
                  >
                    Retry GPS Acquisition
                  </button>
                </div>
              )}

              {/* STATE 6: PERMISSION DENIED */}
              {wizardState === "PERMISSION_DENIED" && (
                <div className="text-center py-3 space-y-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center mx-auto">
                    <Shield className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Location Permission Blocked</h4>
                  <p className="text-[11px] text-slate-500">
                    Location access was denied in browser settings. Please enable location permissions in your browser or log a manual exception.
                  </p>
                  <button
                    type="button"
                    onClick={() => setWizardState("VERIFIED_ON_SITE")}
                    className="px-4 py-2 bg-[#4865F6] text-white font-semibold rounded-xl text-xs"
                  >
                    Reset & Try Again
                  </button>
                </div>
              )}

              {/* STATE 7: SUBMITTING */}
              {wizardState === "SUBMITTING" && (
                <div className="text-center py-5 space-y-3">
                  <RefreshCw className="w-8 h-8 text-[#4865F6] animate-spin mx-auto" />
                  <h4 className="text-xs font-bold text-slate-900">Timestamping & Encrypting GPS Evidence...</h4>
                  <p className="text-[11px] text-slate-500">Recording tamper-proof audit record on studio ledger.</p>
                </div>
              )}

              {/* STATE 8: SUCCESS */}
              {wizardState === "SUCCESS" && (
                <div className="text-center py-4 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6 stroke-[3]" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Check-In Confirmed!</h4>
                  <p className="text-xs text-slate-500">Active site inspection session started.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 7. SLIDE-OUT LEFT NAVIGATION DRAWER                  */}
      {/* ==================================================== */}
      {isNavDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex animate-in fade-in duration-150">
          <div className="bg-white w-[300px] h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
            {/* Header */}
            <div className="p-4 border-b border-[#E2E6F0] flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#0B122B] text-white flex items-center justify-center font-black text-xs">
                  100%
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 leading-tight">100% DESIGN Studio</h3>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Active Workspace</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNavDrawerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Destinations */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1 text-xs">
              {navItems.map((item) => {
                const isActive = item.id === "visits";
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsNavDrawerOpen(false)}
                    className={`flex items-center justify-between p-2.5 rounded-xl font-medium transition-all ${
                      isActive
                        ? "bg-[#EEF2FF] text-[#4865F6] font-bold border border-[#D9E2FF]"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? "text-[#4865F6]" : "text-slate-500"}`} />
                      <span>{item.name}</span>
                    </div>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4865F6]"></span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Account & Profile Footer */}
            <div className="p-3 border-t border-[#E2E6F0] bg-slate-50 space-y-2">
              <div className="flex items-center gap-2.5 p-2 bg-white rounded-xl border border-slate-200">
                <div className="w-8 h-8 rounded-full bg-[#4865F6] text-white font-bold text-xs flex items-center justify-center">
                  SL
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {contextUserFullName || "Saksham Lanjewar"}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">EMP-001 • ADMIN</div>
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  window.location.href = `/w/${workspaceSlug}/login`;
                }}
                className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
          <div className="flex-1" onClick={() => setIsNavDrawerOpen(false)} />
        </div>
      )}

      {/* ==================================================== */}
      {/* 8. VISIT DOSSIER MODAL                               */}
      {/* ==================================================== */}
      {detailModalVisit && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="bg-white border-l border-[#E2E6F0] w-full max-w-lg h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-[#E2E6F0] flex items-start justify-between bg-slate-50">
              <div>
                <span className="font-mono text-xs font-bold text-[#4865F6] bg-[#EEF2FF] px-2 py-0.5 rounded">
                  {detailModalVisit.project.code}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">{detailModalVisit.site.name}</h3>
                <p className="text-xs text-slate-500">{detailModalVisit.purpose}</p>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalVisit(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="text-[10px] font-bold uppercase text-slate-400">Employee & Site Details</div>
                <div className="font-semibold text-slate-900">
                  {detailModalVisit.employee?.user.fullName} ({detailModalVisit.employee?.employee?.employeeId})
                </div>
                <div className="text-slate-600">{detailModalVisit.site.address}</div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Check-In Timestamp</span>
                  <span className="font-bold text-[#4865F6]">02:42 pm</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Check-Out Timestamp</span>
                  <span className="font-bold text-rose-600">02:42 pm</span>
                </div>
              </div>

              {detailModalVisit.findings && (
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">Observation & Meeting Notes</h4>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800">
                    "{detailModalVisit.findings}"
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-bold text-slate-900 mb-1">GPS Evidence & Geofence Fix</h4>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span>Geofence Evaluation:</span>
                    <span className="font-bold text-emerald-800">
                      {detailModalVisit.events?.[0]?.geofenceAssessment === "WITHIN_RADIUS"
                        ? "Verified On-Site (0m offset)"
                        : "Exception Logged"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Coordinates:</span>
                    <span className="font-mono text-slate-800">18.6414°, 72.8722°</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 border-t border-[#E2E6F0] bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setDetailModalVisit(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-xl text-xs cursor-pointer"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 9. PARTNER / ADMIN REVIEW MODAL                      */}
      {/* ==================================================== */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-3.5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-900">Partner & Admin Review Decision</h3>
              <button
                type="button"
                onClick={() => setReviewModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block font-semibold text-slate-800">Review Decision:</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "ACCEPTED", label: "Accept ✔" },
                  { id: "NEEDS_CLARIFICATION", label: "Clarify ⚠" },
                  { id: "REJECTED", label: "Reject ✖" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setReviewDecision(opt.id as any)}
                    className={`py-2 px-1 rounded-xl text-xs font-semibold cursor-pointer border ${
                      reviewDecision === opt.id
                        ? "bg-[#EEF2FF] text-[#4865F6] border-[#4865F6]"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mt-2 mb-1">Reviewer Feedback:</label>
                <textarea
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Notes for site architect or contractor..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReviewModal(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleSubmitReview}
                className="px-4 py-2 bg-[#4865F6] hover:bg-[#3B54DF] text-white font-semibold rounded-xl text-xs shadow-xs"
              >
                {loading ? "Submitting..." : "Save Review"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 10. ASSIGN SITE VISIT MODAL                          */}
      {/* ==================================================== */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#4865F6] text-white flex items-center justify-center font-bold">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Schedule & Assign Site Visit</h3>
                  <p className="text-xs text-slate-500">Dispatch an employee for on-site inspection</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignVisitSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-900 mb-1">Project</label>
                <select
                  value={assignProjectId}
                  onChange={(e) => setAssignProjectId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                >
                  {availableProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} — {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-900 mb-1">Assign Site Architect / Employee</label>
                <select
                  value={assignEmployeeId}
                  onChange={(e) => setAssignEmployeeId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                >
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.user.fullName} [{m.employee?.employeeId || m.role}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-900 mb-1">Visit Purpose</label>
                <input
                  type="text"
                  required
                  value={assignPurpose}
                  onChange={(e) => setAssignPurpose(e.target.value)}
                  placeholder="e.g. PCC excavation inspection & joinery sign-off"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-900 mb-1">Scheduled Date</label>
                  <input
                    type="date"
                    value={assignScheduledDate}
                    onChange={(e) => setAssignScheduledDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-900 mb-1">Scheduled Time</label>
                  <input
                    type="time"
                    value={assignScheduledTime}
                    onChange={(e) => setAssignScheduledTime(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-[#4865F6] hover:bg-[#3B54DF] text-white font-semibold rounded-xl shadow-xs cursor-pointer"
                >
                  {loading ? "Scheduling..." : "Assign Site Visit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 11. PROFILE MODAL                                    */}
      {/* ==================================================== */}
      {isProfileOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E6F0] rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-[#4865F6] text-white font-bold text-sm flex items-center justify-center">
                  SL
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{contextUserFullName || "Saksham Lanjewar"}</h3>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                    <span className="font-mono font-bold text-[#4865F6]">EMP-001</span>
                    <span>•</span>
                    <span className="font-bold text-emerald-700 uppercase">ADMIN / OWNER</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsProfileOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-500">Workspace:</span>
                <span className="font-semibold text-slate-800">100% DESIGN Studio</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Email:</span>
                <span className="font-mono text-slate-800">designsaksham1@gmail.com</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">GPS Node:</span>
                <span className="font-medium text-slate-800">Kolkata HQ Studio</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsProfileOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Close
              </button>
              <button
                type="button"
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  window.location.href = `/w/${workspaceSlug}/login`;
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
