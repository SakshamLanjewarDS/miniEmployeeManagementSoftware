"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Navigation,
  CheckCircle2,
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
  Search,
  Filter,
  SlidersHorizontal,
  Camera,
  Printer,
  Flag,
  CloudSun,
  Mic,
  MicOff,
  Phone,
  MessageCircle,
  Trash2,
  CheckSquare,
  Square,
  ShieldAlert,
  ClipboardCheck,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { SearchableDropdown, SearchableSelect } from "@/components/ui/SearchableDropdown";
import {
  getAllTypologies,
  ProjectProfileCircle,
  TypologyBadge,
  TypologyDot,
  isTypologyMatch,
} from "@/lib/typology";
import InspectionMapPreview from "./InspectionMapPreview";
import PhotoEvidenceGallery, { SitePhotoItem } from "./PhotoEvidenceGallery";
import SnagsTracker, { SnagItem } from "./SnagsTracker";
import PrintableInspectionReport from "./PrintableInspectionReport";
import SiteIssuesView from "./SiteIssuesView";
import { MobileFilterDrawer } from "@/components/ui/MobileFilterDrawer";

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
  inspectionType?: string | null;
  priority?: string | null;
  status?: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  visitor?: { name: string } | null;
  milestoneId?: string | null;
  milestone?: { id: string; title: string } | null;
  taskId?: string | null;
  task?: { id: string; title: string; priority: string } | null;
  checkInAddress?: string | null;
  checkOutAddress?: string | null;
  weather?: string | null;
  attendeesJson?: any;
  checklistItemsJson?: any;
  photosJson?: any;
  snagsJson?: any;
  contractorSignOff?: any;
  voiceMemoTranscript?: string | null;
  site: {
    id: string;
    name: string;
    address: string;
    latitude: number | null;
    longitude: number | null;
    radiusMeters: number;
    landmarkNotes?: string | null;
    googleMapsUrl?: string | null;
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

interface TeamMember {
  id: string;
  role: string;
  user: { fullName: string; email: string };
  employee: { employeeId: string; designation?: string | null } | null;
}

interface VisitsClientViewProps {
  workspaceSlug: string;
  currentMembershipId: string;
  userRole: string;
  activeVisit: SiteVisitItem | null;
  scheduledVisits: SiteVisitItem[];
  allVisits: SiteVisitItem[];
  availableSites: Array<{
    id: string;
    name: string;
    address?: string;
    latitude?: number | null;
    longitude?: number | null;
    radiusMeters?: number;
    landmarkNotes?: string | null;
    googleMapsUrl?: string | null;
    project: { code: string; name: string };
  }>;
  availableProjects?: Array<{ id: string; code: string; name: string; projectType?: string | null }>;
  teamMembers?: TeamMember[];
  availableTasks?: Array<{ id: string; projectId: string; title: string; priority: string; status: string }>;
  availableMilestones?: Array<{ id: string; projectId: string; title: string; targetDate: string }>;
  contractors?: Array<{ id: string; name: string; firmName?: string | null; trade?: string | null; phone?: string | null }>;
  consultants?: Array<{ id: string; name: string; firmName?: string | null; discipline?: string | null; phone?: string | null }>;
}

export const INSPECTION_CATEGORIES: Record<
  string,
  { label: string; icon: string; bg: string; text: string; border: string; description: string }
> = {
  STRUCTURAL: {
    label: "Structural Quality Audit",
    icon: "🏗️",
    bg: "bg-blue-50",
    text: "text-blue-800",
    border: "border-blue-200",
    description: "Rebar spacing, shuttering, post-tensioning, concrete cube test",
  },
  MEP: {
    label: "Concealed MEP & Waterproofing",
    icon: "💧",
    bg: "bg-cyan-50",
    text: "text-cyan-800",
    border: "border-cyan-200",
    description: "Plumbing pressure test, electrical conduit, slab sleeves",
  },
  FINISHES: {
    label: "Finishes & Interior Snagging",
    icon: "🎨",
    bg: "bg-purple-50",
    text: "text-purple-800",
    border: "border-purple-200",
    description: "Tiling plumb & level, false ceiling framing, paintwork",
  },
  ROUTINE: {
    label: "Routine Progress Verification",
    icon: "📋",
    bg: "bg-slate-100",
    text: "text-slate-800",
    border: "border-slate-300",
    description: "Weekly contractor progress milestone against schedule",
  },
  CLIENT_WALKTHROUGH: {
    label: "Client / Authority Walkthrough",
    icon: "🤝",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
    description: "Joint inspection with client or municipal officer",
  },
  URGENT_DEFECT: {
    label: "Urgent Rectification / Defect",
    icon: "🚨",
    bg: "bg-rose-50",
    text: "text-rose-800",
    border: "border-rose-200",
    description: "Critical safety hazard, structural crack, stop-work check",
  },
};

export const CANONICAL_CHECKLIST: string[] = [
  "Latest drawings available",
  "Inspection scope reviewed",
  "Tools/PPE prepared",
  "Access/contractor availability confirmed",
];

const DEFAULT_CHECKLISTS: Record<string, string[]> = {
  STRUCTURAL: [
    "Verify footing / column rebar spacing against Drawing R2",
    "Inspect shuttering line, level, and cover block placement",
    "Witness concrete cube sample collection & slump cone test",
    "Check post-tensioning duct alignment & anchorage zone",
  ],
  MEP: [
    "Conduct plumbing pressure test (maintain min 6 bar for 2h)",
    "Review electrical conduit layout & fan box positions in slab",
    "Inspect bathroom waterproofing membrane & ponding test (48h)",
    "Check pipe sleeve penetrations and fire sealant rings",
  ],
  FINISHES: [
    "Verify tile layout, plumb line, and slope towards floor trap",
    "Inspect gypsum false ceiling framing, spacing, and perimeter channels",
    "Check internal door frame alignment and gap tolerances",
    "Review primer and first coat paint uniformity across walls",
  ],
  ROUTINE: [
    "Verify contractor weekly milestone against approved master timeline",
    "Inspect on-site raw material storage (cement bags off ground, covered rebar)",
    "Review site safety compliance (hard hats, perimeter netting, boots)",
    "Conduct brief coordination meeting with contractor site engineer",
  ],
  CLIENT_WALKTHROUGH: [
    "Walk client through completed room layouts and spatial dimensions",
    "Record all finish preferences, revisions, and change notes in minutes",
    "Review mock-up wall sample finishes with client approval",
    "Document client observations for subsequent drawing revision",
  ],
  URGENT_DEFECT: [
    "Inspect reported defect / crack / honeycombing on site immediately",
    "Photograph non-conformance from multiple angles with metric scale",
    "Assess whether immediate structural propping or stop-work is required",
    "Issue written rectification protocol to contractor with target date",
  ],
};

// URL and coordinate parser for Google Maps links and plus codes
function parseGoogleMapsInput(input: string): {
  lat: number | null;
  lng: number | null;
  extractedName?: string;
} {
  if (!input) return { lat: null, lng: null };
  const str = input.trim();

  // 1. Raw Coordinates: "18.921, 72.834" or "18.921,72.834"
  const rawMatch = str.match(/^([-+]?[0-9]*\.?[0-9]+)\s*,\s*([-+]?[0-9]*\.?[0-9]+)$/);
  if (rawMatch) {
    return {
      lat: parseFloat(rawMatch[1]),
      lng: parseFloat(rawMatch[2]),
    };
  }

  // 2. Google Maps URL with @lat,lng
  const atMatch = str.match(/@([-+]?[0-9]*\.?[0-9]+),([-+]?[0-9]*\.?[0-9]+)/);
  if (atMatch) {
    const placeMatch = str.match(/\/place\/([^/@?]+)/);
    const placeName = placeMatch
      ? decodeURIComponent(placeMatch[1].replace(/\+/g, " "))
      : undefined;
    return {
      lat: parseFloat(atMatch[1]),
      lng: parseFloat(atMatch[2]),
      extractedName: placeName,
    };
  }

  // 3. Google Maps URL with ?q=lat,lng or ll=lat,lng
  const qMatch = str.match(/[?&](?:q|ll)=([-+]?[0-9]*\.?[0-9]+),([-+]?[0-9]*\.?[0-9]+)/);
  if (qMatch) {
    return {
      lat: parseFloat(qMatch[1]),
      lng: parseFloat(qMatch[2]),
    };
  }

  return { lat: null, lng: null };
}

// Client-side reverse geocoding via OpenStreetMap Nominatim
async function reverseGeocodeLocality(lat: number, lng: number): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { signal: controller.signal, headers: { Accept: "application/json" } }
    );
    clearTimeout(timeout);
    if (!res.ok) throw new Error("OSM error");
    const data = await res.json();
    const addr = data.address || {};
    const parts = [
      addr.road || addr.pedestrian || addr.suburb || addr.neighbourhood,
      addr.city || addr.town || addr.county || addr.district,
      addr.state,
    ].filter(Boolean);
    if (parts.length > 0) return parts.join(", ");
    if (data.display_name) return data.display_name.split(",").slice(0, 3).join(", ");
  } catch {
    // Fallback
  }
  return `Field Location (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`;
}

export default function VisitsClientView({
  workspaceSlug,
  currentMembershipId,
  userRole,
  activeVisit: initialActiveVisit,
  scheduledVisits,
  allVisits: initialAllVisits,
  availableSites,
  availableProjects = [],
  teamMembers = [],
  availableTasks = [],
  availableMilestones = [],
  contractors = [],
  consultants = [],
}: VisitsClientViewProps) {
  const router = useRouter();

  const [activeVisit, setActiveVisit] = useState<SiteVisitItem | null>(initialActiveVisit);
  const [allVisits, setAllVisits] = useState<SiteVisitItem[]>(initialAllVisits);
  const [mainViewTab, setMainViewTab] = useState<"VISITS" | "ISSUES">("VISITS");

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active visit form state: "what happened & what they did", meeting times, location
  const [findings, setFindings] = useState(initialActiveVisit?.findings || "");
  const [nextActions, setNextActions] = useState(initialActiveVisit?.nextActions || "");
  const [locationNotes, setLocationNotes] = useState(initialActiveVisit?.site?.address || "");
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Active visit field evidence states
  const [activeChecklist, setActiveChecklist] = useState<
    Array<{ item: string; checked: boolean; notes?: string }>
  >([]);
  const [activeSnags, setActiveSnags] = useState<SnagItem[]>([]);
  const [activePhotos, setActivePhotos] = useState<SitePhotoItem[]>([]);
  const [activeWeather, setActiveWeather] = useState<string>("Sunny 32°C");
  const [contractorRepName, setContractorRepName] = useState("");
  const [contractorRepPhone, setContractorRepPhone] = useState("");

  // Speech-to-text dictation state
  const [isDictating, setIsDictating] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Print Inspection Report state
  const [showPrintReport, setShowPrintReport] = useState<SiteVisitItem | null>(null);

  // Owner/Admin "Assign Site Visit" modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignTypology, setAssignTypology] = useState<string>("");
  const [assignOtherTypology, setAssignOtherTypology] = useState<string>("");
  const [assignProjectId, setAssignProjectId] = useState(availableProjects[0]?.id || "");
  const [assignSiteMode, setAssignSiteMode] = useState<"EXISTING" | "CUSTOM">("EXISTING");
  const [assignSiteId, setAssignSiteId] = useState(availableSites[0]?.id || "");
  const [customSiteName, setCustomSiteName] = useState("");
  const [customSiteAddress, setCustomSiteAddress] = useState("");
  const [customSiteLat, setCustomSiteLat] = useState("");
  const [customSiteLng, setCustomSiteLng] = useState("");
  const [customSiteRadius, setCustomSiteRadius] = useState<number>(150);
  const [customLandmarkNotes, setCustomLandmarkNotes] = useState("");
  const [googleMapsInputUrl, setGoogleMapsInputUrl] = useState("");
  const [isDetectingSpot, setIsDetectingSpot] = useState(false);

  const [assignEmployeeIds, setAssignEmployeeIds] = useState<string[]>([
    teamMembers[0]?.id || currentMembershipId,
  ]);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState("");
  const [assignPurpose, setAssignPurpose] = useState("");
  const [assignScheduledDate, setAssignScheduledDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [assignScheduledTime, setAssignScheduledTime] = useState("10:00");

  const [assignInspectionType, setAssignInspectionType] = useState<string>("ROUTINE");
  const [assignPriority, setAssignPriority] = useState<string>("MEDIUM");
  const [assignChecklist, setAssignChecklist] = useState<
    Array<{ item: string; checked: boolean }>
  >(CANONICAL_CHECKLIST.map((item) => ({ item, checked: false })));

  const [assignAttendees, setAssignAttendees] = useState<
    Array<{ name: string; role?: string; phone?: string }>
  >([]);
  const [newAttendeeName, setNewAttendeeName] = useState("");
  const [newAttendeeRole, setNewAttendeeRole] = useState("");
  const [newAttendeePhone, setNewAttendeePhone] = useState("");

  // Filters & Sorting for Section 3: Recent Studio Site Inspection Log
  const [visitSearch, setVisitSearch] = useState("");
  const [visitStateFilter, setVisitStateFilter] = useState("ALL");
  const [visitProjectFilter, setVisitProjectFilter] = useState("ALL");
  const [visitReviewFilter, setVisitReviewFilter] = useState("ALL");
  const [visitCategoryFilter, setVisitCategoryFilter] = useState("ALL");
  const [visitSortBy, setVisitSortBy] = useState<string>("DATE_DESC");
  const [howItWorksOpen, setHowItWorksOpen] = useState(true);

  const handleExportCsv = () => {
    if (allVisits.length === 0) {
      alert("No visit records to export.");
      return;
    }
    const headers = [
      "ID",
      "Project Code",
      "Project Name",
      "Site Name",
      "Visitor",
      "Status",
      "Inspection Type",
      "Purpose",
      "Scheduled Time",
      "Check-In Time",
      "Check-Out Time",
      "Check-In Address",
    ];
    const rows = allVisits.map((v) => [
      v.id,
      v.project?.code || "",
      `"${(v.project?.name || "").replace(/"/g, '""')}"`,
      `"${(v.site?.name || "").replace(/"/g, '""')}"`,
      `"${(v.visitor?.name || v.employee?.user?.fullName || "").replace(/"/g, '""')}"`,
      v.operationalState || v.status,
      v.inspectionType,
      `"${(v.purpose || "").replace(/"/g, '""')}"`,
      v.scheduledTime ? new Date(v.scheduledTime).toISOString() : "",
      v.checkInTime ? new Date(v.checkInTime).toISOString() : "",
      v.checkOutTime ? new Date(v.checkOutTime).toISOString() : "",
      `"${(v.checkInAddress || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `site_visits_audit_${workspaceSlug}_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const dynamicTypologies = useMemo(() => {
    return getAllTypologies(availableProjects);
  }, [availableProjects]);

  const effectiveAssignTypology = useMemo(() => {
    return assignTypology === "OTHER" ? assignOtherTypology.trim() : assignTypology.trim();
  }, [assignTypology, assignOtherTypology]);

  const filteredAssignProjects = useMemo(() => {
    if (!effectiveAssignTypology) return availableProjects;
    return availableProjects.filter((p) =>
      isTypologyMatch(p.projectType, effectiveAssignTypology)
    );
  }, [availableProjects, effectiveAssignTypology]);

  // Filter deliverables and milestones by selected project
  const filteredTasks = useMemo(() => {
    if (!assignProjectId) return [];
    return availableTasks.filter((t) => t.projectId === assignProjectId);
  }, [availableTasks, assignProjectId]);

  const filteredMilestones = useMemo(() => {
    if (!assignProjectId) return [];
    return availableMilestones.filter((m) => m.projectId === assignProjectId);
  }, [availableMilestones, assignProjectId]);


  // Filtered and sorted visits for Recent Studio Site Inspection Log
  const filteredAndSortedVisits = useMemo(() => {
    return allVisits
      .filter((v) => {
        if (visitStateFilter !== "ALL" && v.operationalState !== visitStateFilter) {
          return false;
        }
        if (visitProjectFilter !== "ALL" && v.project.id !== visitProjectFilter) {
          return false;
        }
        if (visitReviewFilter !== "ALL" && v.reviewDecision !== visitReviewFilter) {
          return false;
        }
        if (
          visitCategoryFilter !== "ALL" &&
          (v.inspectionType || "ROUTINE") !== visitCategoryFilter
        ) {
          return false;
        }
        if (visitSearch.trim()) {
          const q = visitSearch.toLowerCase();
          const matchEmployee = v.employee?.user?.fullName?.toLowerCase().includes(q);
          const matchEmpId = v.employee?.employee?.employeeId?.toLowerCase().includes(q);
          const matchProj =
            v.project.code.toLowerCase().includes(q) || v.project.name.toLowerCase().includes(q);
          const matchSite =
            v.site.name.toLowerCase().includes(q) ||
            (v.site.address && v.site.address.toLowerCase().includes(q)) ||
            (v.checkInAddress && v.checkInAddress.toLowerCase().includes(q));
          const matchPurpose = v.purpose.toLowerCase().includes(q);
          const matchFindings = v.findings?.toLowerCase().includes(q);
          if (
            !matchEmployee &&
            !matchEmpId &&
            !matchProj &&
            !matchSite &&
            !matchPurpose &&
            !matchFindings
          ) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        switch (visitSortBy) {
          case "DATE_DESC":
            return new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime();
          case "DATE_ASC":
            return new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime();
          case "ALPHA_EMPLOYEE_ASC":
            return (a.employee?.user?.fullName || "").localeCompare(
              b.employee?.user?.fullName || ""
            );
          case "ALPHA_EMPLOYEE_DESC":
            return (b.employee?.user?.fullName || "").localeCompare(
              a.employee?.user?.fullName || ""
            );
          case "ALPHA_PROJECT_ASC":
            return a.project.code.localeCompare(b.project.code);
          case "ALPHA_PROJECT_DESC":
            return b.project.code.localeCompare(a.project.code);
          case "ALPHA_PURPOSE_ASC":
            return a.purpose.localeCompare(b.purpose);
          case "ALPHA_PURPOSE_DESC":
            return b.purpose.localeCompare(a.purpose);
          default:
            return 0;
        }
      });
  }, [
    allVisits,
    visitStateFilter,
    visitProjectFilter,
    visitReviewFilter,
    visitCategoryFilter,
    visitSearch,
    visitSortBy,
  ]);

  const [isMobileVisitFilterOpen, setIsMobileVisitFilterOpen] = useState(false);

  const activeVisitFilterCount = useMemo(() => {
    let count = 0;
    if (visitSearch.trim().length > 0) count++;
    if (visitStateFilter !== "ALL") count++;
    if (visitProjectFilter !== "ALL") count++;
    if (visitReviewFilter !== "ALL") count++;
    if (visitCategoryFilter !== "ALL") count++;
    if (visitSortBy !== "DATE_DESC") count++;
    return count;
  }, [visitSearch, visitStateFilter, visitProjectFilter, visitReviewFilter, visitCategoryFilter, visitSortBy]);

  const isVisitFilterActive = activeVisitFilterCount > 0;

  const handleClearVisitFilters = () => {
    setVisitSearch("");
    setVisitStateFilter("ALL");
    setVisitProjectFilter("ALL");
    setVisitReviewFilter("ALL");
    setVisitCategoryFilter("ALL");
    setVisitSortBy("DATE_DESC");
  };

  // Detail View modal state
  const [detailModalVisit, setDetailModalVisit] = useState<SiteVisitItem | null>(null);

  // Exception modal state
  const [exceptionModal, setExceptionModal] = useState<{ visitId: string } | null>(null);
  const [exceptionReason, setExceptionReason] = useState("");

  // Review modal state
  const [reviewModal, setReviewModal] = useState<{ visitId: string } | null>(null);
  const [reviewDecision, setReviewDecision] = useState<
    "ACCEPTED" | "NEEDS_CLARIFICATION" | "REJECTED"
  >("ACCEPTED");
  const [reviewComment, setReviewComment] = useState("");

  const isPrivileged = userRole === "OWNER" || userRole === "ADMIN";

  // Mounting state
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sync active visit fields when prop updates
  useEffect(() => {
    setActiveVisit(initialActiveVisit);
    if (initialActiveVisit) {
      setFindings(initialActiveVisit.findings || "");
      setNextActions(initialActiveVisit.nextActions || "");
      setLocationNotes(initialActiveVisit.site?.address || "");
      if (Array.isArray(initialActiveVisit.checklistItemsJson)) {
        setActiveChecklist(initialActiveVisit.checklistItemsJson);
      } else if (initialActiveVisit.inspectionType) {
        const def =
          DEFAULT_CHECKLISTS[initialActiveVisit.inspectionType] || DEFAULT_CHECKLISTS.ROUTINE;
        setActiveChecklist(def.map((it) => ({ item: it, checked: false })));
      }
      if (Array.isArray(initialActiveVisit.snagsJson)) {
        setActiveSnags(initialActiveVisit.snagsJson);
      }
      if (Array.isArray(initialActiveVisit.photosJson)) {
        setActivePhotos(initialActiveVisit.photosJson);
      }
      if (initialActiveVisit.weather) {
        setActiveWeather(initialActiveVisit.weather);
      }
      if (initialActiveVisit.contractorSignOff) {
        setContractorRepName(initialActiveVisit.contractorSignOff.representativeName || "");
        setContractorRepPhone(initialActiveVisit.contractorSignOff.phone || "");
      }
    }
  }, [initialActiveVisit]);

  // Live GPS tracking state
  const [isLiveTracking, setIsLiveTracking] = useState(true);
  const [lastTrackPing, setLastTrackPing] = useState<{
    time: Date;
    latitude: number;
    longitude: number;
    accuracyMeters?: number | null;
    distanceMeters?: number | null;
    assessment?: string;
    note?: string;
  } | null>(null);
  const [isTrackingSending, setIsTrackingSending] = useState(false);
  const [showCheckpointInput, setShowCheckpointInput] = useState(false);
  const [checkpointNote, setCheckpointNote] = useState("");
  const [isLoggingCheckpoint, setIsLoggingCheckpoint] = useState(false);

  // Background Live GPS location tracker for active site visit
  useEffect(() => {
    if (!activeVisit || activeVisit.operationalState !== "ACTIVE" || !isLiveTracking) return;

    const transmitPing = (noteText?: string) => {
      if (!navigator.geolocation) return;

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            setIsTrackingSending(true);
            const res = await fetch(`/api/visits/track?workspaceSlug=${workspaceSlug}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                visitId: activeVisit.id,
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracyMeters: pos.coords.accuracy,
                clientCaptureTime: new Date().toISOString(),
                note: noteText || "Live interval GPS tracking",
              }),
            });

            if (res.ok) {
              const data = await res.json();
              setLastTrackPing({
                time: new Date(),
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracyMeters: pos.coords.accuracy,
                distanceMeters: data.distanceMeters,
                assessment: data.assessment,
                note: noteText || "Periodic GPS ping",
              });

              if (data.event) {
                setActiveVisit((prev) => {
                  if (!prev) return null;
                  const prevEvents = prev.events || [];
                  return {
                    ...prev,
                    events: [data.event, ...prevEvents.filter((ev) => ev.id !== data.event.id)],
                  };
                });
              }
            }
          } catch (err) {
            console.error("GPS live tracking transmission error:", err);
          } finally {
            setIsTrackingSending(false);
          }
        },
        (err) => {
          console.warn("GPS interval capture warning:", err.message);
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    };

    const initTimer = setTimeout(() => {
      transmitPing("Initial on-site tracking fix");
    }, 3000);

    const intervalTimer = setInterval(() => {
      transmitPing("Live interval GPS tracking");
    }, 60000);

    return () => {
      clearTimeout(initTimer);
      clearInterval(intervalTimer);
    };
  }, [activeVisit?.id, activeVisit?.operationalState, isLiveTracking, workspaceSlug]);

  // Speech-to-text dictation handler
  const handleToggleDictation = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      setErrorMessage("Speech recognition is not supported in this browser.");
      return;
    }

    if (isDictating) {
      recognitionRef.current?.stop();
      setIsDictating(false);
      return;
    }

    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-IN";

      recognition.onstart = () => {
        setIsDictating(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          setFindings((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsDictating(false);
      };

      recognition.onend = () => {
        setIsDictating(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Failed to start voice recognition:", err);
      setIsDictating(false);
    }
  };

  // "Detect My Spot" (1-Click GPS Fix in Assign Form)
  const handleDetectCurrentSpot = () => {
    if (!navigator.geolocation) {
      setErrorMessage("Geolocation is not supported by your browser.");
      return;
    }
    setIsDetectingSpot(true);
    setStatusMessage("Detecting current coordinates from GPS sensor...");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCustomSiteLat(lat.toFixed(6));
        setCustomSiteLng(lng.toFixed(6));

        // Auto reverse-geocode human address
        try {
          const humanLoc = await reverseGeocodeLocality(lat, lng);
          setCustomSiteAddress(humanLoc);
          if (!customSiteName) {
            setCustomSiteName(`Site (${humanLoc.split(",")[0].trim()})`);
          }
        } catch {}

        setIsDetectingSpot(false);
        setStatusMessage("✔ Current GPS location captured & address auto-filled!");
        setTimeout(() => setStatusMessage(null), 3000);
      },
      (err) => {
        setIsDetectingSpot(false);
        setErrorMessage(`Could not capture location: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Parse Google Maps link on paste or change
  const handleGoogleMapsUrlChange = async (val: string) => {
    setGoogleMapsInputUrl(val);
    const parsed = parseGoogleMapsInput(val);
    if (parsed.lat !== null && parsed.lng !== null) {
      setCustomSiteLat(parsed.lat.toFixed(6));
      setCustomSiteLng(parsed.lng.toFixed(6));
      if (parsed.extractedName && !customSiteName) {
        setCustomSiteName(parsed.extractedName);
      }
      reverseGeocodeLocality(parsed.lat, parsed.lng).then((addr) => {
        if (!customSiteAddress) setCustomSiteAddress(addr);
      });
      setStatusMessage("✔ Extracted coordinates from Google Maps link!");
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }

    // If link is a web URL, resolve via safe SSRF-protected server endpoint
    if (val.trim().startsWith("http") && (val.includes("google.com") || val.includes("goo.gl"))) {
      try {
        const res = await fetch(`/api/visits/resolve-location?workspaceSlug=${workspaceSlug}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: val.trim() }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.latitude && data.longitude) {
            setCustomSiteLat(data.latitude.toFixed(6));
            setCustomSiteLng(data.longitude.toFixed(6));
            if (data.name && !customSiteName) setCustomSiteName(data.name);
            setStatusMessage("✔ Resolved location from Google Maps URL!");
            setTimeout(() => setStatusMessage(null), 3000);
          }
        }
      } catch {}
    }
  };

  // Load canonical checklist (exactly 4 items)
  const handleLoadChecklistPreset = () => {
    setAssignChecklist(CANONICAL_CHECKLIST.map((item) => ({ item, checked: false })));
  };

  // Manual Checkpoint Logging
  const handleManualCheckpointLog = async () => {
    if (!activeVisit) return;
    if (!navigator.geolocation) {
      setErrorMessage("Geolocation is not supported by your browser.");
      return;
    }

    setIsLoggingCheckpoint(true);
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const noteToSend = checkpointNote.trim() || "Manual site checkpoint";
          const res = await fetch(`/api/visits/track?workspaceSlug=${workspaceSlug}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              visitId: activeVisit.id,
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracyMeters: pos.coords.accuracy,
              clientCaptureTime: new Date().toISOString(),
              note: noteToSend,
            }),
          });

          const data = await res.json();
          if (!res.ok) {
            setErrorMessage(data.error || "Failed to log checkpoint");
          } else {
            setStatusMessage(`📍 Location checkpoint logged: "${noteToSend}"`);
            setCheckpointNote("");
            setShowCheckpointInput(false);
            setLastTrackPing({
              time: new Date(),
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracyMeters: pos.coords.accuracy,
              distanceMeters: data.distanceMeters,
              assessment: data.assessment,
              note: noteToSend,
            });

            if (data.event) {
              setActiveVisit((prev) => {
                if (!prev) return null;
                const prevEvents = prev.events || [];
                return {
                  ...prev,
                  events: [data.event, ...prevEvents.filter((ev) => ev.id !== data.event.id)],
                };
              });
            }
            setTimeout(() => setStatusMessage(null), 4000);
          }
        } catch {
          setErrorMessage("Network error while recording location checkpoint.");
        } finally {
          setIsLoggingCheckpoint(false);
        }
      },
      (err) => {
        setIsLoggingCheckpoint(false);
        setErrorMessage(`Could not capture GPS fix: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // Calibration of site to current location
  const handleCalibrateSiteToCurrentLocation = async () => {
    setLoading(true);
    setStatusMessage("Calibrating site location to your current spot...");
    try {
      const res = await fetch("/api/visits/calibrate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to calibrate location");
      } else {
        setStatusMessage("✔ Site updated to your current spot! Distance is now 0m (Verified On-Site).");
        setTimeout(() => {
          window.location.reload();
        }, 800);
      }
    } catch {
      setErrorMessage("Network error during calibration.");
    } finally {
      setLoading(false);
    }
  };

  // 1. ONE-CLICK ENTER SITE (CHECK-IN)
  const performCheckIn = async (
    visitId: string,
    coords?: { latitude: number; longitude: number; accuracy: number },
    exception?: { isUnavailable: boolean; reason: string }
  ) => {
    setLoading(true);
    setErrorMessage(null);
    setStatusMessage("Recording ENTER timestamp and GPS coordinates...");

    try {
      const payload: any = {
        visitId,
        idempotencyKey: `enter-${visitId}-${Date.now()}`,
      };

      if (coords) {
        payload.latitude = coords.latitude;
        payload.longitude = coords.longitude;
        payload.accuracyMeters = coords.accuracy;
        payload.clientCaptureTime = new Date().toISOString();

        // Reverse geocode human locality
        try {
          const locality = await reverseGeocodeLocality(coords.latitude, coords.longitude);
          payload.checkInAddress = locality;
        } catch {}
      }

      if (exception) {
        payload.isLocationUnavailable = exception.isUnavailable;
        payload.failureReason = exception.reason;
      }

      const res = await fetch(`/api/visits/check-in?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Check-in failed");
        setStatusMessage(null);
      } else {
        setStatusMessage(
          `ENTER Recorded! Geofence verified: ${data.assessment} (${data.distanceMeters ?? "N/A"}m)`
        );
        setTimeout(() => {
          router.refresh();
        }, 600);
      }
    } catch {
      setErrorMessage("Network error during Enter Site check-in. Check connection and retry.");
      setStatusMessage(null);
    } finally {
      setLoading(false);
      setExceptionModal(null);
      setExceptionReason("");
    }
  };

  const handleOneClickEnterSite = (visitId: string) => {
    setLoading(true);
    setStatusMessage("Capturing Enter GPS coordinates from device...");

    if (!navigator.geolocation) {
      performCheckIn(visitId, undefined, {
        isUnavailable: true,
        reason: "Browser does not support geolocation API.",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        performCheckIn(visitId, {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        let reason = "GPS location unavailable at time of check-in.";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reason = "Location permission denied by user on device.";
            break;
          case error.POSITION_UNAVAILABLE:
            reason = "GPS signal unavailable on this device.";
            break;
          case error.TIMEOUT:
            reason = "GPS request timed out after 12 seconds.";
            break;
          default:
            reason = `GPS error: ${error.message}`;
            break;
        }
        performCheckIn(visitId, undefined, { isUnavailable: true, reason });
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  };

  const handleSimulateEnterSite = (
    visitId: string,
    siteLat?: number | null,
    siteLng?: number | null
  ) => {
    const lat = siteLat ?? 18.7758;
    const lng = siteLng ?? 72.8596;
    performCheckIn(visitId, {
      latitude: lat + 0.0001,
      longitude: lng + 0.0001,
      accuracy: 20.0,
    });
  };

  // 2. SAVE DRAFT OBSERVATIONS & FIELD EVIDENCE
  const handleSaveMeetingNotes = async () => {
    if (!activeVisit) return;
    setIsSavingNotes(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/visits/update?workspaceSlug=${workspaceSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitId: activeVisit.id,
          findings,
          nextActions,
          siteAddress: locationNotes,
          weather: activeWeather,
          checklistItemsJson: activeChecklist,
          snagsJson: activeSnags,
          photosJson: activePhotos,
          contractorSignOff: {
            representativeName: contractorRepName,
            phone: contractorRepPhone,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to save meeting notes");
      } else {
        setStatusMessage("Field evidence, snags, and observations saved successfully!");
        setTimeout(() => setStatusMessage(null), 3000);
      }
    } catch {
      setErrorMessage("Network error while saving notes");
    } finally {
      setIsSavingNotes(false);
    }
  };

  // 3. ONE-CLICK "EXIT SITE (CHECK-OUT)"
  const handleOneClickExitSite = async () => {
    if (!activeVisit) return;
    setLoading(true);
    setErrorMessage(null);
    setStatusMessage("Recording EXIT timestamp, departure location, and submitting report...");

    const executeExitRequest = async (coords?: {
      latitude: number;
      longitude: number;
      accuracy: number;
    }) => {
      try {
        const payload: any = {
          visitId: activeVisit.id,
          findings: findings || "Site inspection concluded.",
          nextActions: nextActions || "No immediate action required.",
          idempotencyKey: `exit-${activeVisit.id}-${Date.now()}`,
          weather: activeWeather,
          checklistItemsJson: activeChecklist,
          snagsJson: activeSnags,
          photosJson: activePhotos,
          contractorSignOff: {
            representativeName: contractorRepName || "Contractor Representative On-Site",
            phone: contractorRepPhone,
            signedAt: new Date().toISOString(),
          },
        };

        if (coords) {
          payload.latitude = coords.latitude;
          payload.longitude = coords.longitude;
          payload.accuracyMeters = coords.accuracy;

          try {
            const exitAddr = await reverseGeocodeLocality(coords.latitude, coords.longitude);
            payload.checkOutAddress = exitAddr;
          } catch {}
        }

        const res = await fetch(`/api/visits/check-out?workspaceSlug=${workspaceSlug}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          setErrorMessage(data.error || "Check-out failed");
          setStatusMessage(null);
        } else {
          setStatusMessage("EXIT Recorded! Comprehensive Inspection Dossier submitted for Partner review.");
          setActiveVisit(null);
          setTimeout(() => {
            router.refresh();
          }, 600);
        }
      } catch {
        setErrorMessage("Network error during exit check-out.");
        setStatusMessage(null);
      } finally {
        setLoading(false);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          executeExitRequest({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
        },
        () => {
          executeExitRequest();
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      executeExitRequest();
    }
  };

  // 4. OWNER/ADMIN: ASSIGN SITE VISIT
  const handleAssignVisitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignProjectId) {
      setErrorMessage("Please select a project.");
      return;
    }
    if (assignEmployeeIds.length === 0) {
      setErrorMessage("Please select at least one employee to assign.");
      return;
    }
    if (!assignPurpose.trim()) {
      setErrorMessage("Please specify the visit / meeting purpose.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setStatusMessage("Scheduling and assigning site visit...");

    try {
      const scheduledDateTime = new Date(`${assignScheduledDate}T${assignScheduledTime}:00`);

      const payload: any = {
        projectId: assignProjectId,
        employeeIds: assignEmployeeIds,
        employeeId: assignEmployeeIds[0],
        purpose: assignPurpose.trim(),
        scheduledTime: scheduledDateTime.toISOString(),
        inspectionType: assignInspectionType,
        priority: assignPriority,
        customSiteRadiusMeters: customSiteRadius,
        customSiteLandmarkNotes: customLandmarkNotes.trim() || undefined,
        customSiteGoogleMapsUrl: googleMapsInputUrl.trim() || undefined,
        attendeesJson: assignAttendees.length > 0 ? assignAttendees : undefined,
        checklistItemsJson: assignChecklist.length > 0 ? assignChecklist : undefined,
      };

      if (assignSiteMode === "EXISTING" && assignSiteId) {
        payload.siteId = assignSiteId;
      } else {
        payload.customSiteName = customSiteName || "Project Site";
        payload.customSiteAddress = customSiteAddress || "Site Location";
        if (customSiteLat) payload.customSiteLatitude = customSiteLat;
        if (customSiteLng) payload.customSiteLongitude = customSiteLng;
      }

      const res = await fetch(`/api/visits/create?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to schedule visit");
        setStatusMessage(null);
      } else {
        setStatusMessage("Site visit assigned successfully! The employee has been notified.");
        setAssignModalOpen(false);
        setAssignPurpose("");
        setCustomSiteName("");
        setCustomSiteAddress("");
        setTimeout(() => {
          router.refresh();
        }, 600);
      }
    } catch {
      setErrorMessage("Network error while assigning site visit.");
      setStatusMessage(null);
    } finally {
      setLoading(false);
    }
  };

  // Submit Partner Review
  const submitReview = async () => {
    if (!reviewModal) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/visits/review?workspaceSlug=${workspaceSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitId: reviewModal.visitId,
          decision: reviewDecision,
          comment: reviewComment,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Review submission failed");
      } else {
        setReviewModal(null);
        router.refresh();
      }
    } catch {
      setErrorMessage("Network error during review");
    } finally {
      setLoading(false);
    }
  };

  const getGeofenceBadge = (assessment: string) => {
    switch (assessment) {
      case "WITHIN_RADIUS":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-md">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Verified On-Site</span>
          </span>
        );
      case "OUTSIDE_RADIUS":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-50 border border-rose-300 px-2 py-0.5 rounded-md">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            <span>Outside Geofence</span>
          </span>
        );
      case "LOCATION_UNAVAILABLE":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-800 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded-md">
            <FileText className="w-3 h-3 text-slate-600" />
            <span>Exception Logged</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-md">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            <span>GPS Low Precision</span>
          </span>
        );
    }
  };

  const getReviewBadge = (decision: string) => {
    switch (decision) {
      case "ACCEPTED":
        return <span className="text-emerald-700 font-semibold text-xs">✔ Accepted</span>;
      case "NEEDS_CLARIFICATION":
        return <span className="text-amber-700 font-semibold text-xs">⚠ Needs Clarification</span>;
      case "REJECTED":
        return <span className="text-red-700 font-semibold text-xs">✖ Rejected</span>;
      default:
        return <span className="text-[#696E82] text-xs">⏳ Pending Review</span>;
    }
  };

  const getCategoryBadge = (categoryKey?: string | null) => {
    const key = categoryKey || "ROUTINE";
    const cat = INSPECTION_CATEGORIES[key] || INSPECTION_CATEGORIES.ROUTINE;
    return (
      <span
        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${cat.bg} ${cat.text} ${cat.border}`}
      >
        <span>{cat.icon}</span>
        <span className="truncate max-w-[130px]">{cat.label.split(" ")[0]}</span>
      </span>
    );
  };

  const getPriorityBadge = (priority?: string | null) => {
    const p = priority || "MEDIUM";
    switch (p) {
      case "CRITICAL":
        return (
          <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded border border-rose-300">
            CRITICAL
          </span>
        );
      case "HIGH":
        return (
          <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-300">
            HIGH
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-300">
            ROUTINE
          </span>
        );
    }
  };

  const getVisitDuration = (events?: Array<any>) => {
    const inEv = events?.find((e) => e.eventType === "CHECK_IN");
    const outEv = events?.find((e) => e.eventType === "CHECK_OUT");
    if (!inEv) return "N/A";
    const inTime = new Date(inEv.serverReceiptTime).getTime();
    const outTime = outEv ? new Date(outEv.serverReceiptTime).getTime() : Date.now();
    const diffMins = Math.round((outTime - inTime) / (1000 * 60));
    if (diffMins < 60) return `${diffMins} mins`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  const getGoogleMapsRouteUrl = (
    events?: Array<any>,
    siteLat?: number | null,
    siteLng?: number | null
  ) => {
    if (!events || events.length === 0) {
      if (siteLat && siteLng) return `https://www.google.com/maps?q=${siteLat},${siteLng}`;
      return "#";
    }

    const points = events
      .filter((e) => e.latitude !== null && e.longitude !== null)
      .sort(
        (a, b) =>
          new Date(a.serverReceiptTime).getTime() - new Date(b.serverReceiptTime).getTime()
      );

    if (points.length === 0) {
      if (siteLat && siteLng) return `https://www.google.com/maps?q=${siteLat},${siteLng}`;
      return "#";
    }

    if (points.length === 1) {
      return `https://www.google.com/maps?q=${points[0].latitude},${points[0].longitude}`;
    }

    const origin = `${points[0].latitude},${points[0].longitude}`;
    const destination = `${points[points.length - 1].latitude},${points[points.length - 1].longitude}`;

    const waypoints = points
      .slice(1, -1)
      .slice(0, 8)
      .map((p) => `${p.latitude},${p.longitude}`)
      .join("|");

    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${
      waypoints ? `&waypoints=${waypoints}` : ""
    }`;
  };

  if (!isMounted) {
    return (
      <div className="space-y-6 animate-pulse" suppressHydrationWarning>
        <div className="bg-white p-4 rounded-2xl border border-[#E2E6F0] h-20" />
        <div className="bg-white border border-[#E2E6F0] rounded-2xl p-4 h-14" />
        <div className="bg-white border border-[#E2E6F0] rounded-2xl p-6 space-y-4">
          <div className="h-16 bg-gray-50 rounded-xl" />
          <div className="h-16 bg-gray-50 rounded-xl" />
          <div className="h-16 bg-gray-50 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" suppressHydrationWarning>
      {/* Top Header & Breadcrumbs matching reference 218b9c47-bc2e-4d3f-95d4-f3be0501bfa4.png */}
      <div className="space-y-4">
        {/* Desktop Breadcrumb */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-[#696E82]">
          <span>Projects & Delivery</span>
          <span>/</span>
          <span className="font-medium text-[#1F1F1F]">Site visits & issues</span>
        </div>

        {/* Title & Actions Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="type-page-title text-[#1F1F1F]">
              Site visits & issues
            </h1>
            <p className="text-xs sm:text-sm text-[#696E82] mt-0.5">
              Plan site visits, capture field records and follow up on issues.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-stretch sm:self-auto">
            <button
              type="button"
              onClick={handleExportCsv}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-[#F8F9FD] text-[#1F1F1F] text-xs font-semibold rounded-xl border border-[#E2E6F0] shadow-2xs transition-all cursor-pointer min-h-[44px]"
            >
              <ShieldCheck className="w-4 h-4 text-[#5A81FA]" />
              <span>Export CSV (Audit Protected)</span>
            </button>

            <button
              type="button"
              onClick={() => setAssignModalOpen(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-[#5A81FA] hover:bg-[#426EE8] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>Assign a site visit</span>
            </button>
          </div>
        </div>

        {/* Combined Modules Switcher: Field Visits & GPS vs Site Issues & Snags */}
        <div className="flex items-center gap-2 border-b border-[#E2E6F0] pb-2 overflow-x-auto touch-scroll-x">
          <button
            type="button"
            onClick={() => setMainViewTab("VISITS")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              mainViewTab === "VISITS"
                ? "bg-[#5A81FA] text-white shadow-xs"
                : "bg-white text-[#696E82] hover:text-[#1F1F1F] border border-[#E2E6F0]"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Site visits</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                mainViewTab === "VISITS" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              {allVisits.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMainViewTab("ISSUES")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              mainViewTab === "ISSUES"
                ? "bg-[#5A81FA] text-white shadow-xs"
                : "bg-white text-[#696E82] hover:text-[#1F1F1F] border border-[#E2E6F0]"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>Issues & snags</span>
          </button>
        </div>
      </div>

      {mainViewTab === "ISSUES" ? (
        <SiteIssuesView workspaceSlug={workspaceSlug} hideHeader={true} />
      ) : (
        <>
          {/* 3 Metric Cards */}
          <div className="grid grid-cols-3 gap-3 sm:gap-5">
            <div className="bg-white border border-[#E2E6F0] rounded-2xl p-4 sm:p-5 flex items-center gap-3.5 shadow-2xs">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#F2F4FF] border border-[#CEDEFF] text-[#5A81FA] flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <div className="text-[11px] sm:text-xs text-[#696E82] font-medium">Assigned to me</div>
                <div className="type-kpi-value text-[#1F1F1F] tabular-nums mt-1">
                  {scheduledVisits.length}
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#E2E6F0] rounded-2xl p-4 sm:p-5 flex items-center gap-3.5 shadow-2xs">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#F2F4FF] border border-[#CEDEFF] text-[#5A81FA] flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <div className="text-[11px] sm:text-xs text-[#696E82] font-medium">Pending check-in</div>
                <div className="type-kpi-value text-[#1F1F1F] tabular-nums mt-1">
                  {scheduledVisits.filter((s) => s.operationalState === "SCHEDULED").length}
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#E2E6F0] rounded-2xl p-4 sm:p-5 flex items-center gap-3.5 shadow-2xs">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#F2F4FF] border border-[#CEDEFF] text-[#5A81FA] flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <div className="text-[11px] sm:text-xs text-[#696E82] font-medium">Recorded visits</div>
                <div className="type-kpi-value text-[#1F1F1F] tabular-nums mt-1">
                  {allVisits.filter((v) => v.operationalState === "CHECKED_OUT" || v.checkOutTime).length}
                </div>
              </div>
            </div>
          </div>
          {/* Alert Messages */}
      {statusMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-[11px] font-bold hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-900 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-[11px] font-bold hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main 2-Column Responsive Layout (Mobile prioritizes My assigned visits first) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Inspection Log & Active Workbench */}
        <div className="lg:col-span-8 space-y-6 order-2 lg:order-1">
          {/* ======================================================== */}
          {/* SECTION 1: ACTIVE VISIT (Currently On-Site) */}
          {/* ======================================================== */}
          {activeVisit && (
        <div className="bg-white border-2 border-[#5A81FA] rounded-2xl shadow-sm p-4 sm:p-6 relative overflow-hidden space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E2E6F0]">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-[#5A81FA] bg-[#F2F4FF] px-2.5 py-0.5 rounded border border-[#CEDEFF]">
                  {activeVisit.project.code}
                </span>
                {getCategoryBadge(activeVisit.inspectionType)}
                {getPriorityBadge(activeVisit.priority)}
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  Active On-Site Inspection
                </span>
              </div>
              <h2 className="type-section-title text-[#1F1F1F]">{activeVisit.purpose}</h2>
              <div className="text-xs text-[#696E82] flex items-center gap-1.5 flex-wrap">
                <MapPin className="w-3.5 h-3.5 text-[#5A81FA]" />
                <span className="font-medium text-[#1F1F1F]">{activeVisit.site.name}</span>
                <span>•</span>
                <span>{activeVisit.site.address}</span>
                {activeVisit.checkInAddress && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-700 font-semibold">
                      Locality: {activeVisit.checkInAddress}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* ONE-CLICK EXIT SITE BUTTON */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                disabled={loading}
                onClick={handleOneClickExitSite}
                className="px-5 sm:px-6 py-2.5 sm:py-3 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto hover:scale-[1.02] active:scale-95 disabled:opacity-50 min-h-[44px]"
              >
                <LogOut className="w-4 h-4" />
                <span>EXIT SITE (Check-Out)</span>
              </button>
            </div>
          </div>

          {/* Location Calibration Alert if far away */}
          {activeVisit.events?.[0]?.calculatedDistanceMeters !== null &&
            activeVisit.events?.[0]?.calculatedDistanceMeters !== undefined &&
            activeVisit.events[0].calculatedDistanceMeters > 500 && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-900 block text-xs">
                      Live GPS Offset: ~
                      {Math.round(activeVisit.events[0].calculatedDistanceMeters / 1000)} km from
                      site benchmark
                    </span>
                    <p className="text-amber-800 text-[11px] mt-0.5">
                      Your current fix is far from "{activeVisit.site.name}". Click below to calibrate the project site coordinates directly to your current spot.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCalibrateSiteToCurrentLocation}
                  disabled={loading}
                  className="px-3.5 py-2 bg-[#5A81FA] hover:bg-[#426EE8] text-white font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <LocateFixed className="w-3.5 h-3.5" />
                  <span>Calibrate Site to My Spot</span>
                </button>
              </div>
            )}

          {/* ENTER Event Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-[#F8F9FD] p-4 rounded-xl border border-[#E2E6F0] text-xs">
            <div>
              <span className="text-[10px] text-[#696E82] uppercase font-bold block">
                Enter Timestamp
              </span>
              <span className="font-semibold text-[#1F1F1F]">
                {activeVisit.events?.[0]?.serverReceiptTime
                  ? new Date(activeVisit.events[0].serverReceiptTime).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })
                  : "Recorded"}
              </span>
              <span className="text-[10px] text-[#696E82] block">
                {activeVisit.events?.[0]?.serverReceiptTime
                  ? new Date(activeVisit.events[0].serverReceiptTime).toLocaleDateString("en-IN")
                  : ""}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-[#696E82] uppercase font-bold block">
                Audited Locality
              </span>
              <span className="font-bold text-emerald-800 block text-xs truncate">
                {activeVisit.checkInAddress || "Site Location"}
              </span>
              <span className="font-mono text-[11px] text-[#696E82] block">
                {activeVisit.events?.[0]?.latitude
                  ? `${activeVisit.events[0].latitude.toFixed(4)}°, ${activeVisit.events[0].longitude?.toFixed(4)}°`
                  : "Location Exception"}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-[#696E82] uppercase font-bold block">
                Geofence Verification
              </span>
              <div className="mt-1">
                {getGeofenceBadge(activeVisit.events?.[0]?.geofenceAssessment || "UNCERTAIN")}
              </div>
              <span className="text-[10px] text-[#696E82] font-mono block mt-0.5">
                Radius: {activeVisit.site.radiusMeters}m
              </span>
            </div>

            <div>
              <span className="text-[10px] text-[#696E82] uppercase font-bold block">
                Weather Condition
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <CloudSun className="w-3.5 h-3.5 text-amber-600" />
                <input
                  type="text"
                  value={activeWeather}
                  onChange={(e) => setActiveWeather(e.target.value)}
                  placeholder="e.g. Sunny 32°C"
                  className="p-1 text-xs bg-white border border-[#E2E6F0] rounded-lg text-[#1F1F1F] w-full"
                />
              </div>
            </div>
          </div>

          {/* Interactive Pre-Visit QA/QC Checklist Verification on site */}
          {activeChecklist.length > 0 && (
            <div className="p-4 bg-[#FAFBFD] border border-[#CEDEFF] rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#1F1F1F] flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-[#5A81FA]" />
                  <span>On-Site QA/QC Verification Checklist</span>
                </h4>
                <span className="text-[11px] text-[#696E82] font-mono">
                  {activeChecklist.filter((c) => c.checked).length} of {activeChecklist.length} verified
                </span>
              </div>

              <div className="divide-y divide-[#E2E6F0] border border-[#E2E6F0] rounded-xl overflow-hidden bg-white">
                {activeChecklist.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      const updated = [...activeChecklist];
                      updated[idx].checked = !updated[idx].checked;
                      setActiveChecklist(updated);
                    }}
                    className="p-2.5 flex items-center justify-between gap-3 text-xs hover:bg-[#F8F9FD] cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => {}}
                        className="w-4 h-4 text-[#5A81FA] rounded cursor-pointer"
                      />
                      <span
                        className={`text-xs ${
                          item.checked
                            ? "font-semibold text-[#1F1F1F] line-through text-[#696E82]"
                            : "text-[#1F1F1F]"
                        }`}
                      >
                        {item.item}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        item.checked
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {item.checked ? "VERIFIED" : "PENDING"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Photo Evidence Gallery (Editable) */}
          <div className="p-4 bg-white border border-[#E2E6F0] rounded-xl">
            <PhotoEvidenceGallery
              photos={activePhotos}
              isEditable={true}
              onPhotosChange={setActivePhotos}
              currentCoords={
                lastTrackPing
                  ? { latitude: lastTrackPing.latitude, longitude: lastTrackPing.longitude }
                  : null
              }
            />
          </div>

          {/* Snags & Defects Tracker (Editable) */}
          <div className="p-4 bg-white border border-[#E2E6F0] rounded-xl">
            <SnagsTracker
              snags={activeSnags}
              isEditable={true}
              onSnagsChange={setActiveSnags}
              availableContractors={contractors}
            />
          </div>

          {/* Real-time Meeting & Site Updates Form */}
          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#1F1F1F] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#5A81FA]" />
                  <span>Technical Findings & Observation Minutes</span>
                </h4>
                <p className="text-[11px] text-[#696E82]">
                  Record discussions, contractor attendance, structural observations, and next steps before exiting
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Voice Dictation Button */}
                <button
                  type="button"
                  onClick={handleToggleDictation}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isDictating
                      ? "bg-rose-600 text-white animate-pulse"
                      : "bg-[#F2F4FF] hover:bg-[#E5EAFF] text-[#5A81FA] border border-[#CEDEFF]"
                  }`}
                  title="Speech-to-Text Voice Dictation"
                >
                  {isDictating ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  <span>{isDictating ? "Stop Dictation" : "Voice Dictate"}</span>
                </button>

                <button
                  type="button"
                  disabled={isSavingNotes}
                  onClick={handleSaveMeetingNotes}
                  className="px-3.5 py-1.5 bg-[#F2F4FF] hover:bg-[#CEDEFF] border border-[#CEDEFF] text-[#5A81FA] text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3 h-3" />
                  <span>{isSavingNotes ? "Saving..." : "Save Draft Notes"}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#1F1F1F] mb-1">
                  Site Observations & Technical Findings ("What Happened / What Was Done")
                </label>
                <textarea
                  rows={4}
                  value={findings}
                  onChange={(e) => setFindings(e.target.value)}
                  placeholder="e.g. Conducted site walk with contractor. Verified rebar spacing on Grid C-4. Shuttering checked and approved. Concrete cube sample collected."
                  className="w-full text-xs p-3 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:ring-2 focus:ring-[#5A81FA] focus:outline-none"
                />
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#1F1F1F] mb-1">
                    Follow-Up Actions Needed ("Next Actions")
                  </label>
                  <textarea
                    rows={2}
                    value={nextActions}
                    onChange={(e) => setNextActions(e.target.value)}
                    placeholder="e.g. Request MEP consultant clearance for pipe sleeves before pour."
                    className="w-full text-xs p-3 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:ring-2 focus:ring-[#5A81FA] focus:outline-none"
                  />
                </div>

                {/* Contractor On-Site Sign-Off */}
                <div className="p-3 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl space-y-2">
                  <span className="text-[10px] font-bold uppercase text-[#696E82] block">
                    Contractor Site Representative Sign-Off
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Representative Name"
                      value={contractorRepName}
                      onChange={(e) => setContractorRepName(e.target.value)}
                      className="p-1.5 bg-white border border-[#E2E6F0] rounded-lg text-xs text-[#1F1F1F]"
                    />
                    <input
                      type="text"
                      placeholder="Phone (+91...)"
                      value={contractorRepPhone}
                      onChange={(e) => setContractorRepPhone(e.target.value)}
                      className="p-1.5 bg-white border border-[#E2E6F0] rounded-lg text-xs text-[#1F1F1F]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

          {/* ======================================================== */}
          {/* SECTION 3: RECENT SITE INSPECTION LOG (Full Audit Feed) */}
          {/* ======================================================== */}
          <div className="bg-white border border-[#E2E6F0] rounded-2xl shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#1F1F1F]">
                  Inspection log
                </h3>
                <p className="text-xs text-[#696E82]">
                  Entry and exit times, location evidence, photos and reviews.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Synced</span>
              </span>
            </div>

        {/* Inspection Log Filter & Sort Bar */}
        <div className="bg-[#FAFBFD] p-3 rounded-xl border border-[#E2E6F0] space-y-2.5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
            {/* Search & Mobile Filter Trigger */}
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-[#696E82] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={visitSearch}
                  onChange={(e) => setVisitSearch(e.target.value)}
                  placeholder="Search visits by employee, project, site, locality, or purpose..."
                  className="w-full pl-8 pr-7 py-1.5 bg-white border border-[#E2E6F0] rounded-lg text-xs text-[#1F1F1F] placeholder-[#696E82] focus:outline-none focus:ring-1 focus:ring-[#5A81FA]"
                />
                {visitSearch && (
                  <button
                    type="button"
                    onClick={() => setVisitSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#696E82] hover:text-[#1F1F1F]"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Mobile Filter Button */}
              <button
                type="button"
                onClick={() => setIsMobileVisitFilterOpen(true)}
                className={`lg:hidden px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shrink-0 border cursor-pointer ${
                  activeVisitFilterCount > 0
                    ? "bg-blue-50 border-[#3562E8] text-[#3562E8] font-bold shadow-xs"
                    : "bg-white border-[#E2E6F0] text-slate-700 hover:bg-[#F8F9FD]"
                }`}
                title="Open all filters"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#3562E8]" />
                <span>Filters</span>
                {activeVisitFilterCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-[#3562E8] text-white text-[10px] font-mono font-bold flex items-center justify-center">
                    {activeVisitFilterCount}
                  </span>
                )}
              </button>
            </div>

            <div className="text-[11px] text-[#696E82] self-end md:self-auto font-medium">
              Showing {filteredAndSortedVisits.length} of {allVisits.length} site visits
            </div>
          </div>

          {/* Mobile View: 1-Tap Quick Filter Carousel */}
          <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1 pt-1 border-t border-slate-200/60">
            <button
              type="button"
              onClick={() => setVisitStateFilter("ALL")}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
                visitStateFilter === "ALL"
                  ? "bg-[#3562E8] text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              All ({allVisits.length})
            </button>
            <button
              type="button"
              onClick={() => setVisitStateFilter((prev) => (prev === "ACTIVE" ? "ALL" : "ACTIVE"))}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0 flex items-center gap-1 ${
                visitStateFilter === "ACTIVE"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Active</span>
            </button>
            <button
              type="button"
              onClick={() => setVisitStateFilter((prev) => (prev === "SCHEDULED" ? "ALL" : "SCHEDULED"))}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0 flex items-center gap-1 ${
                visitStateFilter === "SCHEDULED"
                  ? "bg-[#3562E8] text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Scheduled</span>
            </button>
            <button
              type="button"
              onClick={() => setVisitStateFilter((prev) => (prev === "CHECKED_OUT" ? "ALL" : "CHECKED_OUT"))}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0 flex items-center gap-1 ${
                visitStateFilter === "CHECKED_OUT"
                  ? "bg-slate-800 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Checked Out</span>
            </button>
          </div>

          {/* Desktop Filter selects row (hidden on mobile, visible on lg and up) */}
          <div className="hidden lg:flex flex-wrap items-center gap-2 pt-2 border-t border-[#E2E6F0]/60 text-xs">
            <div className="flex items-center gap-1 text-[#696E82] font-semibold text-xs">
              <Filter className="w-3.5 h-3.5 text-[#5878FF]" />
              <span>Filters:</span>
            </div>

            {/* State Filter */}
            <div className="min-w-[130px]">
              <SearchableDropdown
                size="sm"
                optionType="status"
                value={visitStateFilter}
                onChange={setVisitStateFilter}
                placeholder="All States"
                searchable={false}
                clearable={false}
                options={[
                  { value: "ALL", label: "All States" },
                  { value: "ACTIVE", label: "Active On-Site" },
                  { value: "CHECKED_OUT", label: "Checked Out" },
                  { value: "SCHEDULED", label: "Scheduled" },
                  { value: "CANCELLED", label: "Cancelled" },
                ]}
              />
            </div>

            {/* Category Filter */}
            <div className="min-w-[160px]">
              <SearchableDropdown
                size="sm"
                value={visitCategoryFilter}
                onChange={setVisitCategoryFilter}
                placeholder="All Categories"
                searchable={false}
                clearable={false}
                options={[
                  { value: "ALL", label: "All Categories" },
                  { value: "STRUCTURAL", label: "Structural Quality" },
                  { value: "MEP", label: "MEP & Waterproofing" },
                  { value: "FINISHES", label: "Finishes & Snagging" },
                  { value: "ROUTINE", label: "Routine Progress" },
                  { value: "CLIENT_WALKTHROUGH", label: "Client Walkthrough" },
                  { value: "URGENT_DEFECT", label: "Urgent Defect" },
                ]}
              />
            </div>

            {/* Project Filter */}
            <div className="min-w-[160px]">
              <SearchableDropdown
                size="sm"
                optionType="project"
                value={visitProjectFilter}
                onChange={setVisitProjectFilter}
                placeholder="All Projects"
                searchPlaceholder="Search projects..."
                clearable={false}
                options={[
                  { value: "ALL", label: "All Projects" },
                  ...availableProjects.map((p) => ({
                    value: p.id,
                    label: p.name,
                    projectCode: p.code,
                    subLabel: p.projectType || undefined,
                    icon: <ProjectProfileCircle typology={p.projectType} name={p.name} size="xs" />,
                  })),
                ]}
              />
            </div>

            {/* Review Decision Filter */}
            <div className="min-w-[150px]">
              <SearchableDropdown
                size="sm"
                value={visitReviewFilter}
                onChange={setVisitReviewFilter}
                placeholder="All Reviews"
                searchable={false}
                clearable={false}
                options={[
                  { value: "ALL", label: "All Reviews" },
                  { value: "PENDING", label: "Pending Review" },
                  { value: "ACCEPTED", label: "Accepted" },
                  { value: "NEEDS_CLARIFICATION", label: "Needs Clarification" },
                  { value: "REJECTED", label: "Rejected" },
                ]}
              />
            </div>

            {/* Sort Filter */}
            <div className="min-w-[170px]">
              <SearchableDropdown
                size="sm"
                value={visitSortBy}
                onChange={setVisitSortBy}
                placeholder="Sort By"
                searchable={false}
                clearable={false}
                options={[
                  { value: "DATE_DESC", label: "Date (Newest First)" },
                  { value: "DATE_ASC", label: "Date (Oldest First)" },
                  { value: "ALPHA_EMPLOYEE_ASC", label: "Employee (A → Z)" },
                  { value: "ALPHA_PROJECT_ASC", label: "Project (A → Z)" },
                ]}
              />
            </div>

            {/* Clear filters */}
            {isVisitFilterActive && (
              <button
                type="button"
                onClick={handleClearVisitFilters}
                className="text-[#696E82] hover:text-red-700 font-semibold text-xs ml-auto flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear filters</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Filter Drawer for Visits */}
        <MobileFilterDrawer
          isOpen={isMobileVisitFilterOpen}
          onClose={() => setIsMobileVisitFilterOpen(false)}
          title="Filter Site Inspections"
          activeCount={activeVisitFilterCount}
          onReset={handleClearVisitFilters}
          resultCount={filteredAndSortedVisits.length}
        >
          <div className="space-y-4">
            {/* Operational State */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                Operational State
              </label>
              <SearchableDropdown
                size="md"
                optionType="status"
                value={visitStateFilter}
                onChange={setVisitStateFilter}
                placeholder="All States"
                searchable={false}
                clearable={false}
                options={[
                  { value: "ALL", label: "All States" },
                  { value: "ACTIVE", label: "Active On-Site" },
                  { value: "CHECKED_OUT", label: "Checked Out" },
                  { value: "SCHEDULED", label: "Scheduled" },
                  { value: "CANCELLED", label: "Cancelled" },
                ]}
                className="w-full"
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                Inspection Category
              </label>
              <SearchableDropdown
                size="md"
                value={visitCategoryFilter}
                onChange={setVisitCategoryFilter}
                placeholder="All Categories"
                searchable={false}
                clearable={false}
                options={[
                  { value: "ALL", label: "All Categories" },
                  { value: "STRUCTURAL", label: "Structural Quality" },
                  { value: "MEP", label: "MEP & Waterproofing" },
                  { value: "FINISHES", label: "Finishes & Snagging" },
                  { value: "ROUTINE", label: "Routine Progress" },
                  { value: "CLIENT_WALKTHROUGH", label: "Client Walkthrough" },
                  { value: "URGENT_DEFECT", label: "Urgent Defect" },
                ]}
                className="w-full"
              />
            </div>

            {/* Project */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                Project
              </label>
              <SearchableDropdown
                size="md"
                optionType="project"
                value={visitProjectFilter}
                onChange={setVisitProjectFilter}
                placeholder="All Projects"
                searchPlaceholder="Search projects..."
                clearable={false}
                options={[
                  { value: "ALL", label: "All Projects" },
                  ...availableProjects.map((p) => ({
                    value: p.id,
                    label: p.name,
                    projectCode: p.code,
                    subLabel: p.projectType || undefined,
                    icon: <ProjectProfileCircle typology={p.projectType} name={p.name} size="xs" />,
                  })),
                ]}
                className="w-full"
              />
            </div>

            {/* Review Decision */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                Architectural Review
              </label>
              <SearchableDropdown
                size="md"
                value={visitReviewFilter}
                onChange={setVisitReviewFilter}
                placeholder="All Reviews"
                searchable={false}
                clearable={false}
                options={[
                  { value: "ALL", label: "All Reviews" },
                  { value: "PENDING", label: "Pending Review" },
                  { value: "ACCEPTED", label: "Accepted" },
                  { value: "NEEDS_CLARIFICATION", label: "Needs Clarification" },
                  { value: "REJECTED", label: "Rejected" },
                ]}
                className="w-full"
              />
            </div>

            {/* Sort Filter */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                Sort Order
              </label>
              <SearchableDropdown
                size="md"
                value={visitSortBy}
                onChange={setVisitSortBy}
                placeholder="Sort By"
                searchable={false}
                clearable={false}
                options={[
                  { value: "DATE_DESC", label: "Date (Newest First)" },
                  { value: "DATE_ASC", label: "Date (Oldest First)" },
                  { value: "ALPHA_EMPLOYEE_ASC", label: "Employee (A → Z)" },
                  { value: "ALPHA_PROJECT_ASC", label: "Project (A → Z)" },
                ]}
                className="w-full"
              />
            </div>
          </div>
        </MobileFilterDrawer>

        <div className="overflow-x-auto">
          {allVisits.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#F2F4FF] border border-[#CEDEFF] text-[#5A81FA] flex items-center justify-center mx-auto mb-3">
                <ClipboardCheck className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-[#1F1F1F]">No inspections recorded yet</h4>
              <p className="text-xs text-[#696E82] mt-1 max-w-sm mx-auto">
                Visit records will appear here after the first site check-in.
              </p>
              <button
                type="button"
                onClick={() => setAssignModalOpen(true)}
                className="mt-4 px-4 py-2 bg-white hover:bg-slate-50 border border-[#CEDEFF] text-[#5A81FA] text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Assign a site visit</span>
              </button>
            </div>
          ) : filteredAndSortedVisits.length === 0 ? (
            <div className="p-8 text-center text-[#696E82] space-y-1">
              <Calendar className="w-8 h-8 text-[#A8B1CE] mx-auto mb-1" />
              <p className="font-semibold text-[#1F1F1F] text-xs">
                No inspection logs match this filter criteria
              </p>
              <p className="text-[11px]">
                Try adjusting your search query, status, category, or review filters.
              </p>
              {isVisitFilterActive && (
                <button
                  type="button"
                  onClick={handleClearVisitFilters}
                  className="mt-2 text-xs font-semibold text-[#5A81FA] hover:underline cursor-pointer"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9FD] text-[#696E82] font-semibold border-b border-[#E2E6F0]">
                <tr>
                  <th className="py-2.5 px-3">Employee</th>
                  <th className="py-2.5 px-3">Project & Category</th>
                  <th className="py-2.5 px-3">Purpose & Findings</th>
                  <th className="py-2.5 px-3">Deliverable / Milestone</th>
                  <th className="py-2.5 px-3">Enter / Exit Times</th>
                  <th className="py-2.5 px-3">Location & Distance Pill</th>
                  <th className="py-2.5 px-3">Evidence Strip</th>
                  <th className="py-2.5 px-3">Review</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E6F0]">
                {filteredAndSortedVisits.map((v) => {
                  const checkIn = v.events?.find((e) => e.eventType === "CHECK_IN");
                  const checkOut = v.events?.find((e) => e.eventType === "CHECK_OUT");
                  const photosCount = Array.isArray(v.photosJson) ? v.photosJson.length : 0;
                  const snagsCount = Array.isArray(v.snagsJson) ? v.snagsJson.length : 0;

                  return (
                    <tr key={v.id} className="hover:bg-[#F8F9FD] transition-colors">
                      {/* Employee */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-[#1F1F1F]">
                          {v.employee?.user.fullName}
                        </div>
                        <div className="text-[10px] text-[#696E82] font-mono">
                          {v.employee?.employee?.employeeId ?? "STAFF"}
                        </div>
                      </td>

                      {/* Project & Category */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[11px] font-bold text-[#5A81FA] bg-[#F2F4FF] px-1.5 py-0.5 rounded">
                            {v.project.code}
                          </span>
                          {getPriorityBadge(v.priority)}
                        </div>
                        <div className="mt-1">{getCategoryBadge(v.inspectionType)}</div>
                      </td>

                      {/* Purpose & Findings snippet */}
                      <td className="py-3 px-3 max-w-[200px]">
                        <div className="font-semibold text-[#1F1F1F] truncate">{v.purpose}</div>
                        {v.findings && (
                          <div className="text-[11px] text-[#696E82] line-clamp-1 italic mt-0.5">
                            "{v.findings}"
                          </div>
                        )}
                      </td>

                      {/* Deliverable / Milestone Link */}
                      <td className="py-3 px-3">
                        {v.milestone ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-800 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                            <span>🏁 {v.milestone.title}</span>
                          </span>
                        ) : v.task ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                            <span>📦 {v.task.title}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#696E82] italic">General Visit</span>
                        )}
                      </td>

                      {/* Enter / Exit Times */}
                      <td className="py-3 px-3">
                        <div className="space-y-0.5 text-[11px]">
                          {checkIn ? (
                            <div className="text-[#1F1F1F]">
                              <span className="text-[#5A81FA] font-bold">In: </span>
                              {new Date(checkIn.serverReceiptTime).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          ) : (
                            <span className="text-[#696E82]">No check-in</span>
                          )}

                          {checkOut && (
                            <div className="text-[#696E82]">
                              <span className="text-rose-700 font-bold">Out: </span>
                              {new Date(checkOut.serverReceiptTime).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          )}
                          <span className="text-[10px] text-[#696E82] block font-mono">
                            Duration: {getVisitDuration(v.events)}
                          </span>
                        </div>
                      </td>

                      {/* Location & Distance Pill */}
                      <td className="py-3 px-3">
                        <div className="space-y-1">
                          <div className="font-semibold text-[#1F1F1F] text-[11px] truncate max-w-[160px]">
                            {v.site.name}
                          </div>
                          {v.checkInAddress && (
                            <div className="text-[10px] text-[#696E82] truncate max-w-[160px]">
                              📍 {v.checkInAddress}
                            </div>
                          )}
                          {checkIn && checkIn.calculatedDistanceMeters !== null && (
                            <div className="text-[10px] font-mono">
                              {checkIn.calculatedDistanceMeters <= v.site.radiusMeters ? (
                                <span className="text-emerald-700 font-semibold">
                                  ✔ {checkIn.calculatedDistanceMeters}m from center
                                </span>
                              ) : (
                                <span className="text-rose-700 font-bold">
                                  ⚠️ {checkIn.calculatedDistanceMeters}m outside
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Evidence Strip */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {photosCount > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-800 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                              <Camera className="w-3 h-3 text-[#5A81FA]" />
                              <span>{photosCount}</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#696E82] italic">No photos</span>
                          )}

                          {snagsCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                              <Flag className="w-3 h-3 text-rose-600" />
                              <span>{snagsCount}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Review Decision */}
                      <td className="py-3 px-3">
                        <div>{getReviewBadge(v.reviewDecision)}</div>
                        {v.reviewComment && (
                          <div className="text-[10px] text-[#696E82] italic mt-0.5 line-clamp-1">
                            "{v.reviewComment}"
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setDetailModalVisit(v)}
                            className="px-2 py-1 text-[11px] font-bold text-[#5A81FA] hover:bg-[#F2F4FF] rounded-md transition-colors cursor-pointer"
                          >
                            View Dossier
                          </button>

                          {isPrivileged && (
                            <button
                              type="button"
                              onClick={() => {
                                setReviewModal({ visitId: v.id });
                                setReviewDecision(
                                  v.reviewDecision === "PENDING"
                                    ? "ACCEPTED"
                                    : (v.reviewDecision as any)
                                );
                                setReviewComment(v.reviewComment || "");
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold bg-[#F2F4FF] hover:bg-[#EAE8E0] text-[#1F1F1F] border border-[#E2E6F0] rounded-md transition-colors cursor-pointer"
                            >
                              Review
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="pt-3 border-t border-[#E2E6F0] text-xs text-[#696E82]">
          {filteredAndSortedVisits.length} records
        </div>
      </div>

      {/* Bottom Inspection Records Info Card */}
      <div className="bg-[#F8F9FD] border border-[#E2E6F0] rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs">
        <div className="w-10 h-10 rounded-xl bg-[#F2F4FF] border border-[#CEDEFF] text-[#5A81FA] flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-[#1F1F1F]">Inspection records</h4>
          <p className="text-[11px] text-[#696E82]">
            Keep visit evidence and review history together for better project documentation and accountability.
          </p>
        </div>
      </div>
    </div>

    {/* Right Column: Assigned Visits & Workflow Guide (on mobile order-1 so displayed above Inspection log) */}
    <div className="lg:col-span-4 space-y-6 order-1 lg:order-2">
      {/* SECTION 2: MY ASSIGNED VISITS */}
      <div className="bg-white border border-[#E2E6F0] rounded-2xl shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#F2F4FF] border border-[#CEDEFF] text-[#5A81FA] flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="type-subsection-title text-[#1F1F1F]">My assigned visits</h3>
              <p className="text-[11px] text-[#696E82]">
                Visits assigned to you for field check-in.
              </p>
            </div>
          </div>
          {scheduledVisits.length > 0 && (
            <span className="text-xs font-mono font-bold text-[#5A81FA] bg-[#F2F4FF] px-2.5 py-1 rounded-md border border-[#CEDEFF]">
              {scheduledVisits.length}
            </span>
          )}
        </div>

        {scheduledVisits.length === 0 ? (
          <div className="py-8 px-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#F2F4FF] border border-[#CEDEFF] text-[#5A81FA] flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-bold text-[#1F1F1F]">No visits assigned to you</h4>
            <p className="text-xs text-[#696E82] mt-1">
              Your scheduled visits will appear here when assigned.
            </p>
            <div className="mt-5 pt-3 border-t border-[#E2E6F0] flex items-center justify-center gap-1.5 text-xs text-[#696E82]">
              <MapPin className="w-3.5 h-3.5 text-[#5A81FA]" />
              <span>Location is requested when you check in.</span>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[#E2E6F0]">
            {scheduledVisits.map((v) => (
              <div key={v.id} className="py-4 space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-[#5A81FA] bg-[#F2F4FF] px-2 py-0.5 rounded border border-[#CEDEFF]">
                      {v.project.code}
                    </span>
                    {getCategoryBadge(v.inspectionType)}
                    {getPriorityBadge(v.priority)}
                  </div>
                  <h4 className="text-sm font-bold text-[#1F1F1F]">{v.purpose}</h4>
                  <div className="text-xs text-[#696E82] flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#5A81FA] shrink-0" />
                    <span className="font-medium text-[#1F1F1F]">{v.site.name}</span>
                    <span>•</span>
                    <span className="text-[#696E82] truncate">{v.site.address}</span>
                  </div>
                  <div className="text-[11px] text-[#696E82] flex items-center gap-3">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-[#5A81FA]" />
                      <span>Scheduled: {new Date(v.scheduledTime).toLocaleString("en-IN")}</span>
                    </span>
                    <span>•</span>
                    <span>Radius: {v.site.radiusMeters}m</span>
                  </div>
                </div>

                {/* THE ONE-CLICK ENTER BUTTON */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={loading || activeVisit !== null}
                    onClick={() => handleOneClickEnterSite(v.id)}
                    className="flex-1 px-4 py-2 bg-[#5A81FA] hover:bg-[#426EE8] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-95 disabled:opacity-40 min-h-[40px]"
                    title="Click when you arrive at the site to automatically store Enter Date, Time & GPS Location"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>ENTER SITE (Check-In)</span>
                  </button>

                  <button
                    type="button"
                    disabled={loading || activeVisit !== null}
                    onClick={() => handleSimulateEnterSite(v.id, v.site.latitude, v.site.longitude)}
                    className="px-3 py-2 bg-[#F8F9FD] hover:bg-[#F2F4FF] border border-[#E2E6F0] text-[11px] text-[#696E82] font-semibold rounded-xl transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-40 min-h-[40px]"
                    title="Simulate within-radius GPS for desktop testing"
                  >
                    <Sparkles className="w-3 h-3 text-[#5A81FA]" />
                    <span>Simulate GPS</span>
                  </button>

                  <button
                    type="button"
                    disabled={loading || activeVisit !== null}
                    onClick={() => setExceptionModal({ visitId: v.id })}
                    className="px-2.5 py-2 text-rose-700 hover:bg-rose-50 text-[11px] font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-40"
                  >
                    <span>No GPS Signal?</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Visit Workflow / How site visits work card */}
      <div className="bg-white border border-[#E2E6F0] rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#F2F4FF] border border-[#CEDEFF] text-[#5A81FA] flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#1F1F1F]">
                <span className="hidden sm:inline">Visit workflow</span>
                <span className="sm:hidden">How site visits work</span>
              </h3>
              <p className="text-[11px] text-[#696E82]">
                From assignment to inspection record.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setHowItWorksOpen(!howItWorksOpen)}
            className="sm:hidden p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
          >
            {howItWorksOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {howItWorksOpen && (
          <div className="space-y-4 pt-1 border-t border-[#E2E6F0]/60">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#5A81FA] text-white font-bold text-xs flex items-center justify-center shrink-0">
                1
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-[#1F1F1F]">Assign a visit</div>
                <div className="text-[11px] text-[#696E82]">Choose project and visitor details.</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-slate-400 text-white font-bold text-xs flex items-center justify-center shrink-0">
                2
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-[#1F1F1F]">Check in on site</div>
                <div className="text-[11px] text-[#696E82]">Capture entry time and location evidence.</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-slate-400 text-white font-bold text-xs flex items-center justify-center shrink-0">
                3
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-[#1F1F1F]">Record & review</div>
                <div className="text-[11px] text-[#696E82]">Add photos, notes and findings.</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
  </>
  )}

      {/* ======================================================== */}
      {/* MODAL 1: OWNER & ADMIN ASSIGN SITE VISIT MODAL */}
      {/* ======================================================== */}
      {assignModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in-0 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#E2E6F0] shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto my-6">
            <div className="flex justify-between items-center pb-3 border-b border-[#E2E6F0]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#5A81FA] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1F1F1F]">
                    Assign Site Visit & Inspection Protocol
                  </h3>
                  <p className="text-xs text-[#696E82]">
                    Architectural typology classification, GPS perimeter radius, deliverables, and checklists
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="text-[#696E82] hover:text-[#1F1F1F] p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignVisitSubmit} className="space-y-4 text-xs">
              {/* 1. Select Project */}
              <SearchableSelect
                id="assign-project"
                label="Select Project"
                required
                placeholder="Select project..."
                searchPlaceholder="Search project code or name..."
                options={availableProjects.map((p) => ({
                  value: p.id,
                  label: `${p.code} — ${p.name}`,
                  subLabel: p.projectType || undefined,
                  badge: p.code,
                  icon: <ProjectProfileCircle typology={p.projectType} name={p.name} size="xs" />,
                }))}
                value={assignProjectId}
                onChange={setAssignProjectId}
                allowOther={false}
              />

              {/* 2. Inspection Typology & Scope * */}
              <div>
                <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                  Inspection Typology & Scope <span className="text-red-600">*</span>
                </label>
                <select
                  value={assignInspectionType}
                  onChange={(e) => setAssignInspectionType(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs text-[#1F1F1F] focus:ring-2 focus:ring-[#5A81FA] focus:outline-none"
                >
                  {Object.entries(INSPECTION_CATEGORIES).map(([key, cat]) => (
                    <option key={key} value={key}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Priority / Urgency Level */}
              <div>
                <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                  Priority / Urgency Level
                </label>
                <select
                  value={assignPriority}
                  onChange={(e) => setAssignPriority(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs text-[#1F1F1F] focus:ring-2 focus:ring-[#5A81FA] focus:outline-none"
                >
                  <option value="ROUTINE">ROUTINE (Standard Scheduled Audit)</option>
                  <option value="HIGH">HIGH (Hold Point / Shuttering Inspection)</option>
                  <option value="CRITICAL">CRITICAL (Defect / Stop-Work Advisory)</option>
                </select>
              </div>

              {/* 4. Assign To Studio Architect / Employee * — Searchable multi-select, no duplicates */}
              <div className="space-y-2 p-3 bg-[#FAFBFD] border border-[#E2E6F0] rounded-xl">
                <label className="text-xs font-bold text-[#1F1F1F] flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#5A81FA]" />
                    <span>Assign To Studio Architect / Employee <span className="text-red-600">*</span></span>
                  </span>
                  <span className="text-[10px] text-[#696E82] font-normal">
                    {assignEmployeeIds.length} assigned
                  </span>
                </label>

                {/* Selected employee chips */}
                <div className="flex flex-wrap gap-1.5">
                  {assignEmployeeIds.map((empId) => {
                    const member = teamMembers.find((m) => m.id === empId);
                    const name = member?.user.fullName || "Staff Member";
                    const code = member?.employee?.employeeId || "STAFF";
                    return (
                      <span
                        key={empId}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#CEDEFF] text-[#1F1F1F] rounded-lg text-xs font-medium shadow-2xs"
                      >
                        <span className="font-mono text-[10px] text-[#5A81FA] font-bold">{code}</span>
                        <span>{name}</span>
                        {assignEmployeeIds.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setAssignEmployeeIds(assignEmployeeIds.filter((id) => id !== empId))
                            }
                            className="text-[#696E82] hover:text-rose-600 p-0.5 rounded cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    );
                  })}
                </div>

                {/* Searchable multi-select dropdown */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search employee to add..."
                    value={employeeSearchQuery}
                    onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                    className="w-full p-2 bg-white border border-[#E2E6F0] rounded-xl text-xs text-[#1F1F1F] focus:outline-none focus:ring-1 focus:ring-[#5A81FA]"
                  />
                  {employeeSearchQuery.trim() && (
                    <div className="absolute top-full left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white border border-[#E2E6F0] rounded-xl shadow-lg z-20 divide-y divide-[#F1F3F9]">
                      {teamMembers
                        .filter(
                          (m) =>
                            (m.user.fullName.toLowerCase().includes(employeeSearchQuery.toLowerCase()) ||
                              m.employee?.employeeId
                                ?.toLowerCase()
                                .includes(employeeSearchQuery.toLowerCase())) &&
                            !assignEmployeeIds.includes(m.id)
                        )
                        .map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setAssignEmployeeIds([...assignEmployeeIds, m.id]);
                              setEmployeeSearchQuery("");
                            }}
                            className="w-full p-2 text-left hover:bg-[#F2F4FF] flex items-center justify-between text-xs cursor-pointer"
                          >
                            <span className="font-medium text-[#1F1F1F]">{m.user.fullName}</span>
                            <span className="text-[10px] text-[#696E82] font-mono">
                              {m.employee?.employeeId ?? "STAFF"} • {m.employee?.designation ?? m.role}
                            </span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 5. Site Location & Perimeter Configuration — Existing Site or + New / Custom Site Spot */}
              <div className="p-3.5 bg-[#FAFBFD] border border-[#E2E6F0] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#1F1F1F] flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#5A81FA]" />
                    <span>Site Location & Perimeter Configuration</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAssignSiteMode("EXISTING")}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg cursor-pointer transition-colors ${
                        assignSiteMode === "EXISTING"
                          ? "bg-[#5A81FA] text-white"
                          : "text-[#696E82] hover:bg-[#F2F4FF]"
                      }`}
                    >
                      Existing Site
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssignSiteMode("CUSTOM")}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg cursor-pointer transition-colors ${
                        assignSiteMode === "CUSTOM"
                          ? "bg-[#5A81FA] text-white"
                          : "text-[#696E82] hover:bg-[#F2F4FF]"
                      }`}
                    >
                      + New / Custom Site Spot
                    </button>
                  </div>
                </div>

                {assignSiteMode === "EXISTING" ? (
                  <SearchableSelect
                    id="assign-site"
                    label=""
                    placeholder="Select site location..."
                    searchPlaceholder="Search site by name or address..."
                    options={availableSites.map((s) => ({
                      value: s.id,
                      label: `${s.name} (${s.project?.code})`,
                      subLabel: s.address || "Main Site",
                    }))}
                    value={assignSiteId}
                    onChange={(val: any) => {
                      setAssignSiteId(val);
                      const found = availableSites.find((s) => s.id === val);
                      if (found?.radiusMeters) setCustomSiteRadius(found.radiusMeters);
                    }}
                    allowOther={false}
                  />
                ) : (
                  <div className="space-y-2.5">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Google Maps URL or Plus Code (e.g. maps.google.com/?q=18.921,72.834)"
                        value={googleMapsInputUrl}
                        onChange={(e) => handleGoogleMapsUrlChange(e.target.value)}
                        className="w-full p-2 bg-white border border-[#E2E6F0] rounded-xl text-xs text-[#1F1F1F] focus:ring-1 focus:ring-[#5A81FA] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleDetectCurrentSpot}
                        disabled={isDetectingSpot}
                        className="px-3 py-2 bg-white hover:bg-[#F2F4FF] border border-[#CEDEFF] text-[#5A81FA] rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <LocateFixed className="w-3.5 h-3.5" />
                        <span>{isDetectingSpot ? "Detecting..." : "Detect My Spot"}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        required={assignSiteMode === "CUSTOM"}
                        placeholder="Site / Spot Name *"
                        value={customSiteName}
                        onChange={(e) => setCustomSiteName(e.target.value)}
                        className="w-full p-2 bg-white border border-[#E2E6F0] rounded-xl text-xs text-[#1F1F1F]"
                      />
                      <input
                        type="text"
                        placeholder="Static Address / Landmark"
                        value={customSiteAddress}
                        onChange={(e) => setCustomSiteAddress(e.target.value)}
                        className="w-full p-2 bg-white border border-[#E2E6F0] rounded-xl text-xs text-[#1F1F1F]"
                      />
                    </div>

                    <input
                      type="text"
                      placeholder="Landmark & Access Instructions"
                      value={customLandmarkNotes}
                      onChange={(e) => setCustomLandmarkNotes(e.target.value)}
                      className="w-full p-2 bg-white border border-[#E2E6F0] rounded-xl text-xs text-[#1F1F1F]"
                    />

                    <div className="grid grid-cols-2 gap-2 font-mono">
                      <input
                        type="number"
                        step="any"
                        placeholder="Latitude (e.g. 18.9217)"
                        value={customSiteLat}
                        onChange={(e) => setCustomSiteLat(e.target.value)}
                        className="w-full p-2 bg-white border border-[#E2E6F0] rounded-xl text-xs text-[#1F1F1F]"
                      />
                      <input
                        type="number"
                        step="any"
                        placeholder="Longitude (e.g. 72.8342)"
                        value={customSiteLng}
                        onChange={(e) => setCustomSiteLng(e.target.value)}
                        className="w-full p-2 bg-white border border-[#E2E6F0] rounded-xl text-xs text-[#1F1F1F]"
                      />
                    </div>
                  </div>
                )}

                {/* Perimeter Radius Slider */}
                <div className="pt-2 border-t border-[#E2E6F0] space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#1F1F1F]">
                      Geofence Perimeter Boundary Radius:
                    </span>
                    <span className="font-bold font-mono text-[#5A81FA] bg-[#F2F4FF] px-2 py-0.5 rounded border border-[#CEDEFF]">
                      {customSiteRadius} meters
                    </span>
                  </div>

                  <input
                    type="range"
                    min={50}
                    max={1000}
                    step={25}
                    value={customSiteRadius}
                    onChange={(e) => setCustomSiteRadius(parseInt(e.target.value, 10))}
                    className="w-full accent-[#5A81FA] cursor-pointer"
                  />

                  <div className="flex items-center justify-between gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setCustomSiteRadius(50)}
                      className={`px-2 py-0.5 rounded cursor-pointer border ${
                        customSiteRadius === 50
                          ? "bg-[#5A81FA] text-white border-[#5A81FA]"
                          : "bg-white text-[#696E82] border-[#E2E6F0]"
                      }`}
                    >
                      50m (Bungalow)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomSiteRadius(150)}
                      className={`px-2 py-0.5 rounded cursor-pointer border ${
                        customSiteRadius === 150
                          ? "bg-[#5A81FA] text-white border-[#5A81FA]"
                          : "bg-white text-[#696E82] border-[#E2E6F0]"
                      }`}
                    >
                      150m (Tower)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomSiteRadius(350)}
                      className={`px-2 py-0.5 rounded cursor-pointer border ${
                        customSiteRadius === 350
                          ? "bg-[#5A81FA] text-white border-[#5A81FA]"
                          : "bg-white text-[#696E82] border-[#E2E6F0]"
                      }`}
                    >
                      350m (Complex)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomSiteRadius(1000)}
                      className={`px-2 py-0.5 rounded cursor-pointer border ${
                        customSiteRadius === 1000
                          ? "bg-[#5A81FA] text-white border-[#5A81FA]"
                          : "bg-white text-[#696E82] border-[#E2E6F0]"
                      }`}
                    >
                      1000m (Campus)
                    </button>
                  </div>
                </div>
              </div>

              {/* 6. Site Attendees & Commissioned Contractors */}
              <div className="p-3.5 bg-[#FAFBFD] border border-[#E2E6F0] rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#1F1F1F] flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#5A81FA]" />
                    <span>Site Attendees & Commissioned Contractors</span>
                  </label>
                </div>

                {contractors.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-[#696E82]">Quick Tag:</span>
                    {contractors.slice(0, 4).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          if (!assignAttendees.some((a) => a.name === c.name)) {
                            setAssignAttendees([
                              ...assignAttendees,
                              {
                                name: c.name,
                                role: `${c.trade || "Contractor"} (${c.firmName || ""})`,
                                phone: c.phone || "",
                              },
                            ]);
                          }
                        }}
                        className="text-[10px] px-2 py-0.5 bg-white border border-[#E2E6F0] rounded-md hover:bg-[#F2F4FF] cursor-pointer"
                      >
                        + {c.name}
                      </button>
                    ))}
                  </div>
                )}

                {assignAttendees.length > 0 && (
                  <div className="space-y-1">
                    {assignAttendees.map((att, idx) => (
                      <div
                        key={idx}
                        className="p-1.5 bg-white border border-[#E2E6F0] rounded-lg flex items-center justify-between text-[11px]"
                      >
                        <div>
                          <strong>{att.name}</strong> • <span className="text-[#696E82]">{att.role}</span>
                          {att.phone && (
                            <span className="ml-2 font-mono text-[#5A81FA]">{att.phone}</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setAssignAttendees(assignAttendees.filter((_, i) => i !== idx))}
                          className="text-rose-500 hover:text-rose-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="External Rep Name"
                    value={newAttendeeName}
                    onChange={(e) => setNewAttendeeName(e.target.value)}
                    className="p-2 bg-white border border-[#E2E6F0] rounded-xl text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Role / Organization"
                    value={newAttendeeRole}
                    onChange={(e) => setNewAttendeeRole(e.target.value)}
                    className="p-2 bg-white border border-[#E2E6F0] rounded-xl text-xs"
                  />
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Phone (+91...)"
                      value={newAttendeePhone}
                      onChange={(e) => setNewAttendeePhone(e.target.value)}
                      className="p-2 bg-white border border-[#E2E6F0] rounded-xl text-xs w-full"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newAttendeeName.trim()) {
                          setAssignAttendees([
                            ...assignAttendees,
                            {
                              name: newAttendeeName.trim(),
                              role: newAttendeeRole.trim() || "Consultant",
                              phone: newAttendeePhone.trim(),
                            },
                          ]);
                          setNewAttendeeName("");
                          setNewAttendeeRole("");
                          setNewAttendeePhone("");
                        }
                      }}
                      className="px-2.5 py-1 bg-[#5A81FA] text-white rounded-xl text-xs font-bold"
                    >
                      Tag
                    </button>
                  </div>
                </div>
              </div>

              {/* 7. Pre-Visit QA/QC Inspection Checklist — exactly four items */}
              <div className="p-3.5 bg-[#FAFBFD] border border-[#E2E6F0] rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#1F1F1F] flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-[#5A81FA]" />
                    <span>Pre-Visit QA/QC Inspection Checklist (4 items)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleLoadChecklistPreset}
                    className="text-[10px] text-[#5A81FA] hover:underline font-semibold cursor-pointer"
                  >
                    Reset to Default 4
                  </button>
                </div>

                <div className="space-y-1.5">
                  {assignChecklist.map((chk, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setAssignChecklist(
                          assignChecklist.map((c, i) => (i === idx ? { ...c, checked: !c.checked } : c))
                        );
                      }}
                      className="p-2 bg-white border border-[#E2E6F0] rounded-lg flex items-center gap-2 cursor-pointer hover:bg-[#F2F4FF]"
                    >
                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] font-bold ${
                          chk.checked
                            ? "bg-[#5A81FA] text-white border-[#5A81FA]"
                            : "border-[#CEDEFF] bg-white text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                      <span className="text-xs text-[#1F1F1F]">{chk.item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 8. Meeting Purpose / Inspection Agenda * */}
              <div>
                <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                  Meeting Purpose / Inspection Agenda <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Slab casting inspection & structural consultant walkthrough"
                  value={assignPurpose}
                  onChange={(e) => setAssignPurpose(e.target.value)}
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] text-xs focus:ring-2 focus:ring-[#5A81FA]"
                />
              </div>

              {/* 9. Date * & 10. Time * */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                    Date <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={assignScheduledDate}
                    onChange={(e) => setAssignScheduledDate(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                    Time <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={assignScheduledTime}
                    onChange={(e) => setAssignScheduledTime(e.target.value)}
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] text-xs"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#E2E6F0] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="px-4 py-2 bg-[#F2F4FF] hover:bg-[#E5EAFF] text-[#696E82] hover:text-[#1F1F1F] font-semibold rounded-xl text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-[#5A81FA] hover:bg-[#426EE8] text-white font-semibold rounded-xl text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>{loading ? "Assigning..." : "Confirm & Assign Visit"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: COMPLETE VISIT DOSSIER MODAL */}
      {/* ======================================================== */}
      {detailModalVisit && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in-0 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#E2E6F0] shadow-2xl max-w-3xl w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto my-6">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-[#5A81FA] bg-[#F2F4FF] px-2.5 py-0.5 rounded border border-[#CEDEFF]">
                  {detailModalVisit.project.code}
                </span>
                {getCategoryBadge(detailModalVisit.inspectionType)}
                {getPriorityBadge(detailModalVisit.priority)}
                <h3 className="text-sm font-bold text-[#1F1F1F]">{detailModalVisit.purpose}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPrintReport(detailModalVisit)}
                  className="px-3 py-1.5 bg-[#5A81FA] hover:bg-[#426EE8] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Report</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDetailModalVisit(null)}
                  className="p-1 text-[#696E82] hover:text-[#1F1F1F] rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Visit Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F8F9FD] p-3.5 rounded-xl border border-[#E2E6F0] text-xs">
              <div>
                <span className="text-[10px] text-[#696E82] uppercase font-bold block">
                  Assigned Staff
                </span>
                <span className="font-semibold text-[#1F1F1F]">
                  {detailModalVisit.employee?.user.fullName}
                </span>
                <span className="text-[10px] text-[#696E82] block font-mono">
                  {detailModalVisit.employee?.employee?.employeeId ?? "OWNER"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#696E82] uppercase font-bold block">
                  Site Location
                </span>
                <span className="font-semibold text-[#1F1F1F]">{detailModalVisit.site.name}</span>
                <span className="text-[10px] text-[#696E82] block truncate">
                  {detailModalVisit.site.address}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#696E82] uppercase font-bold block">
                  Duration On-Site
                </span>
                <span className="font-bold text-[#1F1F1F]">
                  {getVisitDuration(detailModalVisit.events)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#696E82] uppercase font-bold block">
                  Review Status
                </span>
                <div className="mt-0.5">{getReviewBadge(detailModalVisit.reviewDecision)}</div>
              </div>
            </div>

            {/* In-App Map Preview & Spatial Perimeter Plot */}
            <InspectionMapPreview
              site={detailModalVisit.site}
              checkInEvent={detailModalVisit.events?.find((e) => e.eventType === "CHECK_IN")}
              checkOutEvent={detailModalVisit.events?.find((e) => e.eventType === "CHECK_OUT")}
              waypoints={detailModalVisit.events?.filter(
                (e) =>
                  e.eventType === "EXCEPTION" &&
                  (e.latitude !== null || e.failureReason?.includes("LOCATION_TRACK"))
              )}
              checkInAddress={detailModalVisit.checkInAddress}
              checkOutAddress={detailModalVisit.checkOutAddress}
            />

            {/* Pre-Visit Verification Checklist Results */}
            {Array.isArray(detailModalVisit.checklistItemsJson) &&
              detailModalVisit.checklistItemsJson.length > 0 && (
                <div className="space-y-2 text-xs">
                  <h4 className="font-bold text-[#1F1F1F] uppercase tracking-wider flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-[#5A81FA]" />
                    <span>Pre-Visit Inspection Checklist Verification</span>
                  </h4>
                  <div className="divide-y divide-[#E2E6F0] border border-[#E2E6F0] rounded-xl overflow-hidden bg-white">
                    {detailModalVisit.checklistItemsJson.map((chk: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-2.5 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-4 h-4 rounded flex items-center justify-center font-bold text-[10px] ${
                              chk.checked ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {chk.checked ? "✓" : "○"}
                          </span>
                          <span className={chk.checked ? "font-semibold text-[#1F1F1F]" : "text-[#696E82]"}>
                            {chk.item}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            chk.checked
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {chk.checked ? "VERIFIED" : "PENDING"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Photographic Evidence Gallery */}
            <div className="p-4 bg-[#FAFBFD] border border-[#E2E6F0] rounded-xl">
              <PhotoEvidenceGallery
                photos={Array.isArray(detailModalVisit.photosJson) ? detailModalVisit.photosJson : []}
                isEditable={false}
              />
            </div>

            {/* Snags & Defect Flagging Register */}
            <div className="p-4 bg-[#FAFBFD] border border-[#E2E6F0] rounded-xl">
              <SnagsTracker
                snags={Array.isArray(detailModalVisit.snagsJson) ? detailModalVisit.snagsJson : []}
                isEditable={false}
              />
            </div>

            {/* Findings & Minutes */}
            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-[#1F1F1F] uppercase tracking-wider">
                Meeting Minutes & Field Observations ("What Happened / What They Did")
              </h4>
              <div className="p-3 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] leading-relaxed whitespace-pre-wrap">
                {detailModalVisit.findings || "No findings entered for this visit."}
              </div>
            </div>

            {/* Next Actions */}
            {detailModalVisit.nextActions && (
              <div className="space-y-1 text-xs">
                <h4 className="font-bold text-[#1F1F1F] uppercase tracking-wider">
                  Follow-Up Actions Needed
                </h4>
                <div className="p-3 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#696E82]">
                  {detailModalVisit.nextActions}
                </div>
              </div>
            )}

            {/* Contractor Sign-off details */}
            {detailModalVisit.contractorSignOff && (
              <div className="p-3 bg-white border border-[#E2E6F0] rounded-xl text-xs space-y-1">
                <span className="font-bold text-[#1F1F1F] block">
                  Contractor Site Representative Acknowledgment:
                </span>
                <p className="text-[#696E82]">
                  Name: <strong>{detailModalVisit.contractorSignOff.representativeName}</strong> • Phone:{" "}
                  {detailModalVisit.contractorSignOff.phone || "Recorded on-site"}
                </p>
              </div>
            )}

            {/* Review Comment */}
            {detailModalVisit.reviewComment && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs space-y-1">
                <span className="font-bold text-purple-900 block">
                  Architectural Partner Review Note:
                </span>
                <p className="text-purple-800 italic">"{detailModalVisit.reviewComment}"</p>
              </div>
            )}

            <div className="pt-4 border-t border-[#E2E6F0] flex justify-between items-center">
              <button
                type="button"
                onClick={() => setShowPrintReport(detailModalVisit)}
                className="px-4 py-2 bg-[#5A81FA] hover:bg-[#426EE8] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Export Printable Inspection PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setDetailModalVisit(null)}
                className="px-4 py-2 bg-[#F2F4FF] hover:bg-[#E5EAFF] text-[#696E82] hover:text-[#1F1F1F] font-semibold text-xs rounded-xl cursor-pointer transition-colors"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: EXCEPTION LOCATION FALLBACK */}
      {/* ======================================================== */}
      {exceptionModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in-0">
          <div className="bg-white rounded-2xl border border-[#E2E6F0] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-[#E2E6F0]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1F1F1F]">Location Exception</h3>
                  <p className="text-xs text-[#696E82]">Record manual location verification</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExceptionModal(null)}
                className="text-[#696E82] hover:text-[#1F1F1F] p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#696E82]">
              If you are in an underground basement or your device cannot get a GPS fix, specify the reason. This will be recorded in the immutable audit trail for Partner review.
            </p>

            <div>
              <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                Exception Reason <span className="text-red-600">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={exceptionReason}
                onChange={(e) => setExceptionReason(e.target.value)}
                placeholder="e.g. Inspecting basement B2 parking raft reinforcement — zero satellite/cellular GPS fix."
                className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] text-xs focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-[#E2E6F0]">
              <button
                type="button"
                onClick={() => setExceptionModal(null)}
                className="px-4 py-2 bg-[#F2F4FF] hover:bg-[#E5EAFF] text-[#696E82] hover:text-[#1F1F1F] font-semibold rounded-xl text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!exceptionReason.trim() || loading}
                onClick={() =>
                  performCheckIn(exceptionModal.visitId, undefined, {
                    isUnavailable: true,
                    reason: exceptionReason.trim(),
                  })
                }
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
              >
                Submit Exception Check-In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: PARTNER REVIEW DECISION */}
      {/* ======================================================== */}
      {reviewModal && (() => {
        const targetVisit = allVisits.find((item) => item.id === reviewModal.visitId);
        const checkIn = targetVisit?.events?.find((e) => e.eventType === "CHECK_IN");
        const waypoints =
          targetVisit?.events?.filter(
            (e) =>
              e.eventType === "EXCEPTION" &&
              (e.latitude !== null || e.failureReason?.includes("LOCATION_TRACK"))
          ) || [];

        return (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in-0">
            <div className="bg-white rounded-2xl border border-[#E2E6F0] shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center pb-3 border-b border-[#E2E6F0]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#5A81FA] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#1F1F1F]">
                      Architectural Review Decision
                    </h3>
                    <p className="text-xs text-[#696E82]">
                      Review site timestamps, GPS trail, and observations
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReviewModal(null)}
                  className="text-[#696E82] hover:text-[#1F1F1F] p-1 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Location Trail & GPS Evidence Summary for Owner/Admin */}
              {targetVisit && (
                <div className="p-3.5 bg-[#F8F9FD] border border-[#CEDEFF] rounded-xl text-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#1F1F1F]">
                        {targetVisit.employee?.user.fullName}
                      </span>
                      <span className="text-[10px] text-[#696E82]">
                        {targetVisit.project.code} • {targetVisit.site.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-[#696E82] block">Duration On-Site</span>
                      <span className="font-mono font-bold text-[#1F1F1F]">
                        {getVisitDuration(targetVisit.events)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#E2E6F0] text-[11px]">
                    <div>
                      <span className="text-[10px] text-[#696E82] uppercase font-bold block">
                        Check-In Geofence
                      </span>
                      <div className="mt-0.5">
                        {checkIn ? (
                          getGeofenceBadge(checkIn.geofenceAssessment)
                        ) : (
                          <span className="text-[#696E82]">No fix</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#696E82] uppercase font-bold block">
                        Logged Movement Trail
                      </span>
                      <div className="mt-0.5 flex items-center gap-1 font-semibold text-[#1F1F1F]">
                        <Footprints className="w-3.5 h-3.5 text-[#5A81FA]" />
                        <span>
                          {waypoints.length} GPS checkpoint{waypoints.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <SearchableSelect
                  id="review-decision"
                  label="Review Decision"
                  required
                  placeholder="Select decision..."
                  searchPlaceholder="Search decision..."
                  options={[
                    { value: "ACCEPTED", label: "ACCEPTED", subLabel: "Inspection Verified" },
                    {
                      value: "NEEDS_CLARIFICATION",
                      label: "NEEDS CLARIFICATION",
                      subLabel: "Additional Photos Needed",
                    },
                    {
                      value: "REJECTED",
                      label: "REJECTED",
                      subLabel: "Outside Perimeter / Inaccurate",
                    },
                  ]}
                  value={reviewDecision}
                  onChange={(val: any) => setReviewDecision(val as any)}
                  allowOther={false}
                />

                <div>
                  <label className="text-xs font-semibold text-[#1F1F1F] block mb-1">
                    Architect Comment (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="e.g. Rebar verified against drawing R1; billable inspection certified."
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] text-xs focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[#E2E6F0]">
                <button
                  type="button"
                  onClick={() => setReviewModal(null)}
                  className="px-4 py-2 bg-[#F2F4FF] hover:bg-[#E5EAFF] text-[#696E82] hover:text-[#1F1F1F] font-semibold rounded-xl text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  onClick={submitReview}
                  className="px-5 py-2 bg-[#5A81FA] hover:bg-[#426EE8] text-white font-semibold rounded-xl text-xs shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {loading ? "Submitting..." : "Submit Decision"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ======================================================== */}
      {/* MODAL 5: PRINTABLE OFFICIAL INSPECTION REPORT OVERLAY */}
      {/* ======================================================== */}
      {showPrintReport && (
        <PrintableInspectionReport
          visit={showPrintReport}
          onClose={() => setShowPrintReport(null)}
        />
      )}
    </div>
  );
}
