"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Pause,
  Play,
  ArrowUpDown,
  Search,
  Filter,
  SlidersHorizontal,
} from "lucide-react";
import { SearchableSelect, STUDIO_TYPOLOGIES, isTypologyMatch } from "@/components/ui/SearchableSelect";

interface SiteVisitItem {
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
  availableSites: Array<{ id: string; name: string; address?: string; project: { code: string; name: string } }>;
  availableProjects?: Array<{ id: string; code: string; name: string; projectType?: string | null }>;
  teamMembers?: TeamMember[];
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
}: VisitsClientViewProps) {
  const router = useRouter();

  const [activeVisit, setActiveVisit] = useState<SiteVisitItem | null>(initialActiveVisit);
  const [allVisits, setAllVisits] = useState<SiteVisitItem[]>(initialAllVisits);

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active visit form state: "what happened & what they did", meeting times, location
  const [findings, setFindings] = useState(initialActiveVisit?.findings || "");
  const [nextActions, setNextActions] = useState(initialActiveVisit?.nextActions || "");
  const [locationNotes, setLocationNotes] = useState(initialActiveVisit?.site?.address || "");
  const [meetingTime, setMeetingTime] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);

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
  const [assignEmployeeId, setAssignEmployeeId] = useState(teamMembers[0]?.id || currentMembershipId);
  const [assignPurpose, setAssignPurpose] = useState("");
  const [assignScheduledDate, setAssignScheduledDate] = useState(new Date().toISOString().split("T")[0]);
  const [assignScheduledTime, setAssignScheduledTime] = useState("10:00");

  // Filters & Sorting for Section 3: Recent Studio Site Inspection Log
  const [visitSearch, setVisitSearch] = useState("");
  const [visitStateFilter, setVisitStateFilter] = useState("ALL");
  const [visitProjectFilter, setVisitProjectFilter] = useState("ALL");
  const [visitReviewFilter, setVisitReviewFilter] = useState("ALL");
  const [visitSortBy, setVisitSortBy] = useState<string>("DATE_DESC");

  // Filter available projects for assignment according to architectural typology
  const effectiveAssignTypology = useMemo(() => {
    return assignTypology === "OTHER" ? assignOtherTypology.trim() : assignTypology.trim();
  }, [assignTypology, assignOtherTypology]);

  const filteredAssignProjects = useMemo(() => {
    if (!effectiveAssignTypology) return availableProjects;
    return availableProjects.filter((p) => isTypologyMatch(p.projectType, effectiveAssignTypology));
  }, [availableProjects, effectiveAssignTypology]);

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
        if (visitSearch.trim()) {
          const q = visitSearch.toLowerCase();
          const matchEmployee = v.employee?.user?.fullName?.toLowerCase().includes(q);
          const matchEmpId = v.employee?.employee?.employeeId?.toLowerCase().includes(q);
          const matchProj = v.project.code.toLowerCase().includes(q) || v.project.name.toLowerCase().includes(q);
          const matchSite = v.site.name.toLowerCase().includes(q) || (v.site.address && v.site.address.toLowerCase().includes(q));
          const matchPurpose = v.purpose.toLowerCase().includes(q);
          const matchFindings = v.findings?.toLowerCase().includes(q);
          if (!matchEmployee && !matchEmpId && !matchProj && !matchSite && !matchPurpose && !matchFindings) {
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
            return (a.employee?.user?.fullName || "").localeCompare(b.employee?.user?.fullName || "");
          case "ALPHA_EMPLOYEE_DESC":
            return (b.employee?.user?.fullName || "").localeCompare(a.employee?.user?.fullName || "");
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
  }, [allVisits, visitStateFilter, visitProjectFilter, visitReviewFilter, visitSearch, visitSortBy]);

  const isVisitFilterActive =
    visitSearch.trim().length > 0 ||
    visitStateFilter !== "ALL" ||
    visitProjectFilter !== "ALL" ||
    visitReviewFilter !== "ALL" ||
    visitSortBy !== "DATE_DESC";

  const handleClearVisitFilters = () => {
    setVisitSearch("");
    setVisitStateFilter("ALL");
    setVisitProjectFilter("ALL");
    setVisitReviewFilter("ALL");
    setVisitSortBy("DATE_DESC");
  };

  // Detail View modal state
  const [detailModalVisit, setDetailModalVisit] = useState<SiteVisitItem | null>(null);

  // Exception modal state
  const [exceptionModal, setExceptionModal] = useState<{ visitId: string } | null>(null);
  const [exceptionReason, setExceptionReason] = useState("");

  // Review modal state
  const [reviewModal, setReviewModal] = useState<{ visitId: string } | null>(null);
  const [reviewDecision, setReviewDecision] = useState<"ACCEPTED" | "NEEDS_CLARIFICATION" | "REJECTED">("ACCEPTED");
  const [reviewComment, setReviewComment] = useState("");

  const isPrivileged = userRole === "OWNER" || userRole === "ADMIN" || userRole === "PROJECT_MANAGER";

  // Mounting state to prevent browser extension hydration attribute mismatches
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);



  // Update local state if prop changes
  useEffect(() => {
    setActiveVisit(initialActiveVisit);
    if (initialActiveVisit) {
      setFindings(initialActiveVisit.findings || "");
      setNextActions(initialActiveVisit.nextActions || "");
      setLocationNotes(initialActiveVisit.site?.address || "");
    }
  }, [initialActiveVisit]);

  // Live GPS tracking state for active site visit
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

    // Send first ping shortly after visit is active
    const initTimer = setTimeout(() => {
      transmitPing("Initial on-site tracking fix");
    }, 3000);

    // Continue sending every 60 seconds
    const intervalTimer = setInterval(() => {
      transmitPing("Live interval GPS tracking");
    }, 60000);

    return () => {
      clearTimeout(initTimer);
      clearInterval(intervalTimer);
    };
  }, [activeVisit?.id, activeVisit?.operationalState, isLiveTracking, workspaceSlug]);

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

  // One-click calibration of project site to current GPS location (Trimurti Nagar, Nagpur)
  const handleCalibrateSiteToCurrentLocation = async () => {
    setLoading(true);
    setStatusMessage("Calibrating site location to your current spot in Trimurti Nagar, Nagpur...");
    try {
      const res = await fetch("/api/visits/calibrate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to calibrate location");
      } else {
        setStatusMessage("✔ Site updated to Trimurti Nagar, Nagpur! Distance is now 0m (Verified On-Site).");
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

  // ==========================================
  // 1. ONE-CLICK "ENTER SITE (CHECK-IN)"
  // ==========================================
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
        setStatusMessage(`ENTER Recorded! Geofence verified: ${data.assessment} (${data.distanceMeters ?? "N/A"}m)`);
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
      // Browser doesn't support GPS — check in without location
      performCheckIn(visitId, undefined, {
        isUnavailable: true,
        reason: "Browser does not support geolocation API.",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // GPS success — check in with full coordinates
        performCheckIn(visitId, {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        // GPS failed — still allow check-in with location exception note
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
        // Proceed with check-in anyway — service will log LOCATION_UNAVAILABLE
        performCheckIn(visitId, undefined, { isUnavailable: true, reason });
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  };

  const handleSimulateEnterSite = (visitId: string, siteLat?: number | null, siteLng?: number | null) => {
    const lat = siteLat ?? 18.7758;
    const lng = siteLng ?? 72.8596;
    performCheckIn(visitId, {
      latitude: lat + 0.0001,
      longitude: lng + 0.0001,
      accuracy: 20.0,
    });
  };

  // ==========================================
  // 2. SAVE MEETING OBSERVATIONS & SITE NOTES
  // ==========================================
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
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to save meeting notes");
      } else {
        setStatusMessage("Meeting notes and site observations saved successfully!");
        setTimeout(() => setStatusMessage(null), 3000);
      }
    } catch {
      setErrorMessage("Network error while saving notes");
    } finally {
      setIsSavingNotes(false);
    }
  };

  // ==========================================
  // 3. ONE-CLICK "EXIT SITE (CHECK-OUT)"
  // ==========================================
  const handleOneClickExitSite = async () => {
    if (!activeVisit) return;
    setLoading(true);
    setErrorMessage(null);
    setStatusMessage("Recording EXIT timestamp and exit location...");

    const executeExitRequest = async (coords?: { latitude: number; longitude: number; accuracy: number }) => {
      try {
        const payload: any = {
          visitId: activeVisit.id,
          findings: findings || "Site inspection concluded.",
          nextActions: nextActions || "No immediate action required.",
          idempotencyKey: `exit-${activeVisit.id}-${Date.now()}`,
        };

        if (coords) {
          payload.latitude = coords.latitude;
          payload.longitude = coords.longitude;
          payload.accuracyMeters = coords.accuracy;
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
          setStatusMessage("EXIT Recorded! Meeting notes submitted for Partner review.");
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

    // Try to get exit GPS snapshot, but fallback quickly if unavailable
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

  // ==========================================
  // 4. OWNER/ADMIN: ASSIGN SITE VISIT
  // ==========================================
  const handleAssignVisitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignProjectId) {
      setErrorMessage("Please select a project.");
      return;
    }
    if (!assignEmployeeId) {
      setErrorMessage("Please select an employee to assign.");
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
        employeeId: assignEmployeeId,
        purpose: assignPurpose.trim(),
        scheduledTime: scheduledDateTime.toISOString(),
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

  // Calculate duration between check-in and check-out
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
  };

  // Generate Google Maps multi-point trail URL
  const getGoogleMapsRouteUrl = (events?: Array<any>, siteLat?: number | null, siteLng?: number | null) => {
    if (!events || events.length === 0) {
      if (siteLat && siteLng) return `https://www.google.com/maps?q=${siteLat},${siteLng}`;
      return "#";
    }

    const points = events
      .filter((e) => e.latitude !== null && e.longitude !== null)
      .sort((a, b) => new Date(a.serverReceiptTime).getTime() - new Date(b.serverReceiptTime).getTime());

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
      {/* Top Banner Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#E2E6F0] shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#5A81FA] text-white flex items-center justify-center font-bold">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#1F1F1F]">Field Geolocation & Inspection Protocol</h2>
            <p className="text-xs text-[#696E82]">
              Single-touch Enter/Exit timestamping with automatic GPS boundary verification
            </p>
          </div>
        </div>

        {/* OWNER & ADMIN ASSIGN BUTTON */}
        {isPrivileged && (
          <button
            type="button"
            onClick={() => setAssignModalOpen(true)}
            className="px-4 py-2 bg-[#5A81FA] hover:bg-[#426EE8] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Assign Site Visit</span>
          </button>
        )}
      </div>

      {/* Alert Messages */}
      {statusMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-[11px] font-bold hover:underline cursor-pointer">
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
          <button onClick={() => setErrorMessage(null)} className="text-[11px] font-bold hover:underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 1: ACTIVE VISIT (Currently On-Site with One-Click EXIT) */}
      {/* ======================================================== */}
      {activeVisit && (
        <div className="bg-white border-2 border-[#5A81FA] rounded-2xl shadow-sm p-6 relative overflow-hidden space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E2E6F0]">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#5A81FA] bg-[#F2F4FF] px-2.5 py-0.5 rounded border border-[#CEDEFF]">
                  {activeVisit.project.code}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  Active On-Site Inspection
                </span>
              </div>
              <h2 className="text-xl font-bold text-[#1F1F1F]">{activeVisit.purpose}</h2>
              <div className="text-xs text-[#696E82] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#5A81FA]" />
                <span>{activeVisit.site.name}</span>
                <span>•</span>
                <span>{activeVisit.site.address}</span>
              </div>
            </div>

            {/* ONE-CLICK EXIT SITE BUTTON */}
            <button
              type="button"
              disabled={loading}
              onClick={handleOneClickExitSite}
              className="px-6 py-3 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              <span>EXIT SITE (Check-Out)</span>
            </button>
          </div>

          {/* Geolocation Calibration Alert if Site is in another city */}
          {activeVisit.events?.[0]?.calculatedDistanceMeters !== null &&
            activeVisit.events?.[0]?.calculatedDistanceMeters !== undefined &&
            activeVisit.events[0].calculatedDistanceMeters > 500 && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-900 block text-xs">
                      Live GPS Fix: Trimurti Nagar, Nagpur ({activeVisit.events[0].latitude?.toFixed(4)}°, {activeVisit.events[0].longitude?.toFixed(4)}°)
                    </span>
                    <p className="text-amber-800 text-[11px] mt-0.5">
                      This visit is attached to site <strong>"{activeVisit.site.name}"</strong> in Alibaug (~{Math.round(activeVisit.events[0].calculatedDistanceMeters / 1000)} km away).
                      Click below to calibrate the project site location to your current spot in Trimurti Nagar, Nagpur.
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
                  <span>Set Site to Trimurti Nagar, Nagpur</span>
                </button>
              </div>
            )}

          {/* ENTER Event Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-[#F8F9FD] p-4 rounded-xl border border-[#E2E6F0] text-xs">
            <div>
              <span className="text-[10px] text-[#696E82] uppercase font-bold block">Enter Timestamp</span>
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
              <span className="text-[10px] text-[#696E82] uppercase font-bold block">Live Device Location</span>
              <span className="font-bold text-emerald-800 block text-xs truncate">
                {activeVisit.events?.[0]?.latitude && Math.abs(activeVisit.events[0].latitude - 21.11) < 0.5
                  ? "Trimurti Nagar, Nagpur"
                  : "Field Location"}
              </span>
              <span className="font-mono text-[11px] text-[#696E82] block">
                {activeVisit.events?.[0]?.latitude
                  ? `${activeVisit.events[0].latitude.toFixed(4)}°, ${activeVisit.events[0].longitude?.toFixed(4)}°`
                  : "Location Exception"}
              </span>
              {activeVisit.events?.[0]?.latitude && (
                <a
                  href={`https://www.google.com/maps?q=${activeVisit.events[0].latitude},${activeVisit.events[0].longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-[#5A81FA] hover:underline flex items-center gap-0.5 mt-0.5 font-medium"
                >
                  <span>Open in Google Maps</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>

            <div>
              <span className="text-[10px] text-[#696E82] uppercase font-bold block">Geofence Status</span>
              <div className="mt-1">
                {getGeofenceBadge(activeVisit.events?.[0]?.geofenceAssessment || "UNCERTAIN")}
              </div>
            </div>

            <div>
              <span className="text-[10px] text-[#696E82] uppercase font-bold block">Distance From Site</span>
              <span className="font-mono font-bold text-[#1F1F1F] text-sm block mt-0.5">
                {activeVisit.events?.[0]?.calculatedDistanceMeters !== null &&
                activeVisit.events?.[0]?.calculatedDistanceMeters !== undefined
                  ? `${activeVisit.events[0].calculatedDistanceMeters}m`
                  : "N/A"}
              </span>
              <span className="text-[10px] text-[#696E82]">Radius: {activeVisit.site.radiusMeters}m</span>
            </div>
          </div>

          {/* LIVE GPS LOCATION TRACKING & INSPECTION TRAIL BAR */}
          <div className="bg-gradient-to-r from-[#F8F9FD] to-[#F2F4FF] border border-[#CEDEFF] rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="relative flex items-center justify-center">
                  <span className={`w-3 h-3 rounded-full ${isLiveTracking ? "bg-emerald-500 animate-ping" : "bg-slate-400"}`} />
                  <span className={`w-2 h-2 rounded-full absolute ${isLiveTracking ? "bg-emerald-600" : "bg-slate-500"}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#1F1F1F] flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-[#5A81FA]" />
                      <span>Live Employee GPS Tracking</span>
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isLiveTracking ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"
                    }`}>
                      {isLiveTracking ? "SYNCING ACTIVE" : "PAUSED"}
                    </span>
                    {isTrackingSending && (
                      <span className="text-[10px] text-[#5A81FA] animate-pulse font-medium">Transmitting...</span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#696E82] mt-0.5">
                    Location breadcrumbs automatically captured and secured in cloud audit trail for Owner & Admin review.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setIsLiveTracking(!isLiveTracking)}
                  className="px-2.5 py-1.5 bg-white hover:bg-[#F2F4FF] text-[#1F1F1F] border border-[#E2E6F0] rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  {isLiveTracking ? (
                    <>
                      <Pause className="w-3 h-3 text-[#696E82]" />
                      <span>Pause Auto-GPS</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 text-emerald-600" />
                      <span>Resume Auto-GPS</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowCheckpointInput(!showCheckpointInput)}
                  className="px-3 py-1.5 bg-[#5A81FA] hover:bg-[#426EE8] text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <LocateFixed className="w-3.5 h-3.5" />
                  <span>Log Checkpoint</span>
                </button>
              </div>
            </div>

            {/* Checkpoint Input drawer */}
            {showCheckpointInput && (
              <div className="p-3 bg-white border border-[#CEDEFF] rounded-xl space-y-2 animate-in fade-in-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1F1F1F] flex items-center gap-1.5">
                    <Footprints className="w-3.5 h-3.5 text-[#5A81FA]" />
                    <span>Record Location Checkpoint / Work Item</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCheckpointInput(false)}
                    className="text-[#696E82] hover:text-[#1F1F1F] p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={checkpointNote}
                    onChange={(e) => setCheckpointNote(e.target.value)}
                    placeholder="e.g. Inspecting 2nd Floor Slab rebar spacing with contractor..."
                    className="flex-1 text-xs px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleManualCheckpointLog();
                      }
                    }}
                  />
                  <button
                    type="button"
                    disabled={isLoggingCheckpoint}
                    onClick={handleManualCheckpointLog}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <LocateFixed className="w-3.5 h-3.5" />
                    <span>{isLoggingCheckpoint ? "Capturing..." : "Save GPS Waypoint"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Checkpoints Status summary & Mini Trail */}
            {(() => {
              const waypoints = activeVisit.events?.filter(
                (e) => e.eventType === "EXCEPTION" && (e.latitude !== null || e.failureReason?.includes("LOCATION_TRACK"))
              ) || [];

              return (
                <div className="pt-2 border-t border-[#E2E6F0] flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="text-[#696E82] flex items-center gap-1">
                      <History className="w-3.5 h-3.5 text-[#5A81FA]" />
                      <strong className="text-[#1F1F1F]">{waypoints.length}</strong> location checkpoints logged
                    </span>
                    {lastTrackPing && (
                      <span className="text-[#696E82] font-mono text-[11px]">
                        Last fix: {lastTrackPing.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        {lastTrackPing.distanceMeters !== null && lastTrackPing.distanceMeters !== undefined && (
                          <span className="text-[#1F1F1F] font-semibold"> ({lastTrackPing.distanceMeters}m from center)</span>
                        )}
                      </span>
                    )}
                  </div>

                  <a
                    href={getGoogleMapsRouteUrl(activeVisit.events, activeVisit.site.latitude, activeVisit.site.longitude)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-[#5A81FA] hover:underline flex items-center gap-1"
                  >
                    <Route className="w-3.5 h-3.5" />
                    <span>View Trail Route on Google Maps</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              );
            })()}
          </div>

          {/* Real-time Meeting & Site Updates Form */}
          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#1F1F1F] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#5A81FA]" />
                  <span>Meeting Updates: What Happened & What They Did</span>
                </h4>
                <p className="text-[11px] text-[#696E82]">
                  Record discussions, contractor attendance, structural observations, and next steps before exiting
                </p>
              </div>

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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#1F1F1F] mb-1">
                  Site Observations & Meeting Minutes ("What Happened / What Was Done")
                </label>
                <textarea
                  rows={4}
                  value={findings}
                  onChange={(e) => setFindings(e.target.value)}
                  placeholder="e.g. Conducted site walk with contractor Sharma. Verified rebar spacing on Grid C-4. Shuttering checked and approved. Concrete batch mix testing scheduled."
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

                <div>
                  <label className="block text-[11px] font-semibold text-[#1F1F1F] mb-1">
                    Specific Site Landmark / Floor Location
                  </label>
                  <input
                    type="text"
                    value={locationNotes}
                    onChange={(e) => setLocationNotes(e.target.value)}
                    placeholder="e.g. Tower 2, Level 4 Terrace Slab"
                    className="w-full text-xs px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:ring-2 focus:ring-[#5A81FA] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 2: SCHEDULED VISITS (With ONE-CLICK "ENTER SITE") */}
      {/* ======================================================== */}
      <div className="bg-white border border-[#E2E6F0] rounded-2xl shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
          <div>
            <h3 className="text-sm font-bold text-[#1F1F1F]">My Assigned Scheduled Visits</h3>
            <p className="text-xs text-[#696E82]">Visits assigned to you ready for one-click field check-in</p>
          </div>
          <span className="text-xs font-mono font-bold text-[#5A81FA] bg-[#F2F4FF] px-2.5 py-1 rounded-md border border-[#CEDEFF]">
            {scheduledVisits.length} Pending Check-In
          </span>
        </div>

        {scheduledVisits.length === 0 ? (
          <div className="text-center py-8 text-xs text-[#696E82] space-y-1">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <p className="font-semibold text-[#1F1F1F]">No pending scheduled visits.</p>
            <p>You have no upcoming visits waiting for check-in.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E2E6F0]">
            {scheduledVisits.map((v) => (
              <div key={v.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5 max-w-xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-[#5A81FA] bg-[#F2F4FF] px-2 py-0.5 rounded border border-[#CEDEFF]">
                      {v.project.code}
                    </span>
                    <h4 className="text-sm font-bold text-[#1F1F1F]">{v.purpose}</h4>
                  </div>
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
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={loading || activeVisit !== null}
                    onClick={() => handleOneClickEnterSite(v.id)}
                    className="px-5 py-2.5 bg-[#5A81FA] hover:bg-[#426EE8] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-95 disabled:opacity-40"
                    title="Click when you arrive at the site to automatically store Enter Date, Time & GPS Location"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>ENTER SITE (Check-In)</span>
                  </button>

                  {/* Dev / Desktop testing convenience button */}
                  <button
                    type="button"
                    disabled={loading || activeVisit !== null}
                    onClick={() => handleSimulateEnterSite(v.id, v.site.latitude, v.site.longitude)}
                    className="px-3 py-2 bg-[#F8F9FD] hover:bg-[#F2F4FF] border border-[#E2E6F0] text-[11px] text-[#696E82] font-semibold rounded-xl transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-40"
                    title="Simulate within-radius GPS for desktop testing"
                  >
                    <Sparkles className="w-3 h-3 text-[#5A81FA]" />
                    <span>Simulate GPS</span>
                  </button>

                  {/* Fallback exception button */}
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

      {/* ======================================================== */}
      {/* SECTION 3: RECENT SITE INSPECTION LOG (Full Audit Feed) */}
      {/* ======================================================== */}
      <div className="bg-white border border-[#E2E6F0] rounded-2xl shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
          <div>
            <h3 className="text-sm font-bold text-[#1F1F1F]">Recent Studio Site Inspection Log</h3>
            <p className="text-xs text-[#696E82]">
              Audited field check-ins with Enter/Exit timestamps, GPS evidence, and architectural review
            </p>
          </div>
          <span className="text-[11px] font-mono text-[#696E82] flex items-center gap-1">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Auto-synced</span>
          </span>
        </div>

        {/* Inspection Log Filter & Sort Bar */}
        <div className="bg-[#FAFBFD] p-3 rounded-xl border border-[#E2E6F0] space-y-2.5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-[#696E82] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={visitSearch}
                onChange={(e) => setVisitSearch(e.target.value)}
                placeholder="Search visits by employee, project, site, or purpose..."
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

            {/* Quick stats / summary */}
            <div className="text-[11px] text-[#696E82] self-end md:self-auto font-medium">
              Showing {filteredAndSortedVisits.length} of {allVisits.length} site visits
            </div>
          </div>

          {/* Filter selects row */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E2E6F0]/60 text-xs">
            <div className="flex items-center gap-1 text-[#696E82] font-semibold text-xs">
              <Filter className="w-3.5 h-3.5" />
              <span>Filters:</span>
            </div>

            {/* State Filter */}
            <select
              value={visitStateFilter}
              onChange={(e) => setVisitStateFilter(e.target.value)}
              className="p-1.5 bg-white border border-[#E2E6F0] rounded-lg text-xs font-medium text-[#1F1F1F] focus:outline-none focus:ring-1 focus:ring-[#5A81FA]"
            >
              <option value="ALL">All States</option>
              <option value="ACTIVE">Active On-Site</option>
              <option value="CHECKED_OUT">Checked Out</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            {/* Project Filter */}
            <select
              value={visitProjectFilter}
              onChange={(e) => setVisitProjectFilter(e.target.value)}
              className="p-1.5 bg-white border border-[#E2E6F0] rounded-lg text-xs font-medium text-[#1F1F1F] focus:outline-none focus:ring-1 focus:ring-[#5A81FA] max-w-[180px]"
            >
              <option value="ALL">All Projects</option>
              {availableProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>

            {/* Review Decision Filter */}
            <select
              value={visitReviewFilter}
              onChange={(e) => setVisitReviewFilter(e.target.value)}
              className="p-1.5 bg-white border border-[#E2E6F0] rounded-lg text-xs font-medium text-[#1F1F1F] focus:outline-none focus:ring-1 focus:ring-[#5A81FA]"
            >
              <option value="ALL">All Reviews</option>
              <option value="PENDING">Pending Review</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="NEEDS_CLARIFICATION">Needs Clarification</option>
              <option value="REJECTED">Rejected</option>
            </select>

            {/* Sort Filter: Date Day & Alphabetical Order */}
            <div className="flex items-center gap-1.5 bg-white border border-[#E2E6F0] rounded-lg px-2 py-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#5A81FA] shrink-0" />
              <select
                value={visitSortBy}
                onChange={(e) => setVisitSortBy(e.target.value)}
                className="bg-transparent text-xs font-medium text-[#1F1F1F] focus:outline-none cursor-pointer"
                title="Sort site visits by date day or alphabetical order"
              >
                <option value="DATE_DESC">Sort: Date (Newest First)</option>
                <option value="DATE_ASC">Sort: Date (Oldest First)</option>
                <option value="ALPHA_EMPLOYEE_ASC">Sort: Alphabetical Employee (A → Z)</option>
                <option value="ALPHA_EMPLOYEE_DESC">Sort: Alphabetical Employee (Z → A)</option>
                <option value="ALPHA_PROJECT_ASC">Sort: Alphabetical Project (A → Z)</option>
                <option value="ALPHA_PURPOSE_ASC">Sort: Alphabetical Purpose (A → Z)</option>
              </select>
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

        <div className="overflow-x-auto">
          {filteredAndSortedVisits.length === 0 ? (
            <div className="p-8 text-center text-[#696E82] space-y-1">
              <Calendar className="w-8 h-8 text-[#A8B1CE] mx-auto mb-1" />
              <p className="font-semibold text-[#1F1F1F] text-xs">No inspection logs match this filter criteria</p>
              <p className="text-[11px]">Try adjusting your search query, status, project, or review filters.</p>
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
                  <th className="py-2.5 px-3">Project & Site</th>
                  <th className="py-2.5 px-3">Purpose & Minutes</th>
                  <th className="py-2.5 px-3">State</th>
                  <th className="py-2.5 px-3">Enter / Exit Times</th>
                  <th className="py-2.5 px-3">GPS Tracking & Geofence</th>
                  <th className="py-2.5 px-3">Review</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E6F0]">
                {filteredAndSortedVisits.map((v) => {
                const checkIn = v.events?.find((e) => e.eventType === "CHECK_IN");
                const checkOut = v.events?.find((e) => e.eventType === "CHECK_OUT");
                const mapLink =
                  checkIn?.latitude && checkIn?.longitude
                    ? `https://www.google.com/maps?q=${checkIn.latitude},${checkIn.longitude}`
                    : null;

                return (
                  <tr key={v.id} className="hover:bg-[#F8F9FD] transition-colors">
                    {/* Employee */}
                    <td className="py-3 px-3">
                      <div className="font-semibold text-[#1F1F1F]">{v.employee?.user.fullName}</div>
                      <div className="text-[10px] text-[#696E82] font-mono">
                        {v.employee?.employee?.employeeId ?? "STAFF"}
                      </div>
                    </td>

                    {/* Project & Site */}
                    <td className="py-3 px-3">
                      <span className="font-mono text-[11px] font-bold text-[#5A81FA] bg-[#F2F4FF] px-1.5 py-0.5 rounded">
                        {v.project.code}
                      </span>
                      <div className="font-medium text-[#1F1F1F] mt-0.5">{v.site.name}</div>
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

                    {/* Operational State */}
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          v.operationalState === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-800 animate-pulse"
                            : v.operationalState === "CHECKED_OUT"
                            ? "bg-blue-50 text-blue-800"
                            : "bg-[#F2F4FF] text-[#696E82]"
                        }`}
                      >
                        {v.operationalState}
                      </span>
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

                    {/* GPS Tracking & Geofence */}
                    <td className="py-3 px-3">
                      {checkIn ? (
                        <div className="space-y-1">
                          {getGeofenceBadge(checkIn.geofenceAssessment)}
                          {checkIn.calculatedDistanceMeters !== null && (
                            <div className="text-[10px] font-mono text-[#696E82]">
                              {checkIn.calculatedDistanceMeters}m from center
                            </div>
                          )}
                          {(() => {
                            const waypoints =
                              v.events?.filter(
                                (e) =>
                                  e.eventType === "EXCEPTION" &&
                                  (e.latitude !== null || e.failureReason?.includes("LOCATION_TRACK"))
                              ) || [];
                            if (waypoints.length === 0) return null;
                            return (
                              <div className="flex items-center gap-1 text-[10px] font-semibold text-[#5A81FA]">
                                <Footprints className="w-3 h-3 text-[#5A81FA]" />
                                <span>{waypoints.length} GPS checkpoint{waypoints.length > 1 ? "s" : ""}</span>
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <span className="text-[#696E82] text-[10px]">Pending</span>
                      )}
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
                                v.reviewDecision === "PENDING" ? "ACCEPTED" : (v.reviewDecision as any)
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
    </div>

      {/* ======================================================== */}
      {/* MODAL 1: OWNER & ADMIN ASSIGN SITE VISIT MODAL */}
      {/* ======================================================== */}
      {assignModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in-0">
          <div className="bg-white rounded-2xl border border-[#E2E6F0] shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-[#E2E6F0]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#5A81FA] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1F1F1F]">Schedule & Assign Site Visit</h3>
                  <p className="text-xs text-[#696E82]">
                    Assign studio architect/employee with location and meeting agenda
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="text-[#696E82] hover:text-[#1F1F1F] p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAssignVisitSubmit} className="space-y-4 text-xs">
              {/* 1. Architectural Typology (Filter projects) */}
              <div className="bg-[#FAFBFD] p-3 rounded-xl border border-[#E2E6F0] space-y-1">
                <SearchableSelect
                  id="assign-typology"
                  label="Architectural Typology"
                  required={false}
                  placeholder="Select typology (e.g. Healthcare & Hospital, Commercial)..."
                  searchPlaceholder="Search typology (e.g. Hospital, Commercial, Villa)..."
                  options={[
                    { value: "", label: "All Typologies (Show all projects)" },
                    ...STUDIO_TYPOLOGIES.map((typ) => ({
                      value: typ,
                      label: typ,
                    })),
                  ]}
                  value={assignTypology}
                  onChange={(val) => {
                    setAssignTypology(val);
                    const eff = val === "OTHER" ? assignOtherTypology.trim() : val.trim();
                    if (eff) {
                      const match = availableProjects.filter((p) => isTypologyMatch(p.projectType, eff));
                      if (match.length > 0) {
                        if (!match.some((p) => p.id === assignProjectId)) {
                          setAssignProjectId(match[0].id);
                        }
                      } else {
                        setAssignProjectId("");
                      }
                    }
                  }}
                  allowOther={true}
                  otherOptionLabel="+ Other Architectural Typology..."
                  otherValue={assignOtherTypology}
                  onOtherValueChange={(val) => {
                    setAssignOtherTypology(val);
                    const eff = val.trim();
                    if (eff) {
                      const match = availableProjects.filter((p) => isTypologyMatch(p.projectType, eff));
                      if (match.length > 0) {
                        if (!match.some((p) => p.id === assignProjectId)) {
                          setAssignProjectId(match[0].id);
                        }
                      }
                    }
                  }}
                  otherInputPlaceholder="Specify custom typology (e.g. Airport, Cultural Pavilion, Data Center)..."
                  helperText={
                    effectiveAssignTypology
                      ? `Showing only ${effectiveAssignTypology} projects below (${filteredAssignProjects.length} found).`
                      : "Filters available projects according to architectural typology."
                  }
                />
              </div>

              {/* 2. Project Selection */}
              <SearchableSelect
                id="assign-project"
                label="Select Project"
                required
                placeholder={
                  filteredAssignProjects.length > 0
                    ? "Select project..."
                    : effectiveAssignTypology
                    ? `No ${effectiveAssignTypology} projects found`
                    : "Select project..."
                }
                searchPlaceholder="Search project by code, name, or typology..."
                options={filteredAssignProjects.map((p) => ({
                  value: p.id,
                  label: `${p.code} — ${p.name}`,
                  subLabel: p.projectType || undefined,
                  badge: p.code,
                }))}
                value={assignProjectId}
                onChange={(val) => {
                  setAssignProjectId(val);
                  if (val) {
                    const found = availableProjects.find((p) => p.id === val);
                    if (found?.projectType && !assignTypology) {
                      setAssignTypology(found.projectType);
                    }
                  }
                }}
                allowOther={false}
              />

              {/* Assign to Employee */}
              <SearchableSelect
                id="assign-employee"
                label="Assign To Studio Employee / Architect"
                required
                placeholder="Select employee..."
                searchPlaceholder="Search employee by name..."
                options={teamMembers.map((m) => ({
                  value: m.id,
                  label: m.user.fullName,
                  subLabel: `${m.employee?.employeeId ?? "STAFF"} • ${m.employee?.designation ?? m.role}`,
                }))}
                value={assignEmployeeId}
                onChange={setAssignEmployeeId}
                allowOther={false}
              />

              {/* Site Location Mode */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-[#1F1F1F]">
                    Site Location <span className="text-red-600">*</span>
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
                      + New Site Location
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
                    onChange={setAssignSiteId}
                    allowOther={false}
                  />
                ) : (
                  <div className="space-y-2.5 p-3.5 bg-[#FAFBFD] border border-[#E2E6F0] rounded-xl">
                    <div>
                      <input
                        type="text"
                        required
                        placeholder="Site Name (e.g. Horizon Towers - Block B)"
                        value={customSiteName}
                        onChange={(e) => setCustomSiteName(e.target.value)}
                        className="w-full p-2.5 bg-white border border-[#E2E6F0] rounded-xl text-[#1F1F1F] text-xs focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Address / Plot Details"
                        value={customSiteAddress}
                        onChange={(e) => setCustomSiteAddress(e.target.value)}
                        className="w-full p-2.5 bg-white border border-[#E2E6F0] rounded-xl text-[#1F1F1F] text-xs focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        step="any"
                        placeholder="Latitude (optional)"
                        value={customSiteLat}
                        onChange={(e) => setCustomSiteLat(e.target.value)}
                        className="w-full p-2 bg-white border border-[#E2E6F0] rounded-xl text-[#1F1F1F] text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                      />
                      <input
                        type="number"
                        step="any"
                        placeholder="Longitude (optional)"
                        value={customSiteLng}
                        onChange={(e) => setCustomSiteLng(e.target.value)}
                        className="w-full p-2 bg-white border border-[#E2E6F0] rounded-xl text-[#1F1F1F] text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Purpose / Agenda */}
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
                  className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] text-xs focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
                />
              </div>

              {/* Scheduled Date & Time */}
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
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] text-xs focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
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
                    className="w-full p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#1F1F1F] text-xs focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
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
      {/* MODAL 2: COMPLETE VISIT DOSSIER & ENTER/EXIT BREAKDOWN */}
      {/* ======================================================== */}
      {detailModalVisit && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in-0">
          <div className="bg-white rounded-2xl border border-[#E2E6F0] shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#5A81FA] bg-[#F2F4FF] px-2.5 py-0.5 rounded border border-[#CEDEFF]">
                  {detailModalVisit.project.code}
                </span>
                <h3 className="text-sm font-bold text-[#1F1F1F]">{detailModalVisit.purpose}</h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalVisit(null)}
                className="p-1 text-[#696E82] hover:text-[#1F1F1F] rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Visit Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F8F9FD] p-3.5 rounded-xl border border-[#E2E6F0] text-xs">
              <div>
                <span className="text-[10px] text-[#696E82] uppercase font-bold block">Assigned Staff</span>
                <span className="font-semibold text-[#1F1F1F]">{detailModalVisit.employee?.user.fullName}</span>
                <span className="text-[10px] text-[#696E82] block font-mono">
                  {detailModalVisit.employee?.employee?.employeeId ?? "OWNER"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#696E82] uppercase font-bold block">Site Location</span>
                <span className="font-semibold text-[#1F1F1F]">{detailModalVisit.site.name}</span>
                <span className="text-[10px] text-[#696E82] block truncate">{detailModalVisit.site.address}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#696E82] uppercase font-bold block">Duration On-Site</span>
                <span className="font-bold text-[#1F1F1F]">{getVisitDuration(detailModalVisit.events)}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#696E82] uppercase font-bold block">Review Status</span>
                <div className="mt-0.5">{getReviewBadge(detailModalVisit.reviewDecision)}</div>
              </div>
            </div>

            {/* Timestamps & GPS Timeline: ENTER, INTERMEDIATE WAYPOINTS, and EXIT */}
            <div className="p-4 bg-[#F2F4FF]/60 border border-[#CEDEFF] rounded-xl space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Route className="w-4 h-4 text-[#5A81FA]" />
                  <h4 className="text-xs font-bold text-[#5A81FA] uppercase tracking-wider">
                    Audited GPS Geolocation & Movement Trail
                  </h4>
                </div>

                <a
                  href={getGoogleMapsRouteUrl(detailModalVisit.events, detailModalVisit.site.latitude, detailModalVisit.site.longitude)}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-white hover:bg-[#F2F4FF] border border-[#CEDEFF] text-[#5A81FA] text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-2xs"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Open Route on Google Maps</span>
                </a>
              </div>

              {/* Enter & Exit Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* ENTER EVENT */}
                <div className="p-3 bg-white border border-[#E2E6F0] rounded-xl space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#5A81FA] uppercase flex items-center gap-1">
                      <LogIn className="w-3 h-3" />
                      <span>ENTER EVENT</span>
                    </span>
                    {getGeofenceBadge(detailModalVisit.events?.find((e) => e.eventType === "CHECK_IN")?.geofenceAssessment || "UNCERTAIN")}
                  </div>
                  {detailModalVisit.events?.find((e) => e.eventType === "CHECK_IN") ? (
                    (() => {
                      const ev = detailModalVisit.events!.find((e) => e.eventType === "CHECK_IN")!;
                      return (
                        <>
                          <div className="font-semibold text-[#1F1F1F]">
                            {new Date(ev.serverReceiptTime).toLocaleString("en-IN")}
                          </div>
                          <div className="text-[11px] text-[#696E82] font-mono">
                            GPS: {ev.latitude ? `${ev.latitude.toFixed(5)}°, ${ev.longitude?.toFixed(5)}°` : "No GPS signal"}
                          </div>
                          {ev.calculatedDistanceMeters !== null && (
                            <div className="text-[10px] text-[#696E82]">
                              Distance: {ev.calculatedDistanceMeters}m from site center
                            </div>
                          )}
                        </>
                      );
                    })()
                  ) : (
                    <div className="text-[#696E82] text-[11px]">No check-in recorded</div>
                  )}
                </div>

                {/* EXIT EVENT */}
                <div className="p-3 bg-white border border-[#E2E6F0] rounded-xl space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-rose-700 uppercase flex items-center gap-1">
                      <LogOut className="w-3 h-3" />
                      <span>EXIT EVENT</span>
                    </span>
                    <span className="text-[10px] font-mono text-[#696E82]">Departure Verified</span>
                  </div>
                  {detailModalVisit.events?.find((e) => e.eventType === "CHECK_OUT") ? (
                    (() => {
                      const ev = detailModalVisit.events!.find((e) => e.eventType === "CHECK_OUT")!;
                      return (
                        <>
                          <div className="font-semibold text-[#1F1F1F]">
                            {new Date(ev.serverReceiptTime).toLocaleString("en-IN")}
                          </div>
                          <div className="text-[11px] text-[#696E82] font-mono">
                            GPS: {ev.latitude ? `${ev.latitude.toFixed(5)}°, ${ev.longitude?.toFixed(5)}°` : "Snapshot logged"}
                          </div>
                          {ev.calculatedDistanceMeters !== null && (
                            <div className="text-[10px] text-[#696E82]">
                              Distance: {ev.calculatedDistanceMeters}m from site center
                            </div>
                          )}
                        </>
                      );
                    })()
                  ) : (
                    <div className="text-[#696E82] text-[11px]">Still on site or departure pending</div>
                  )}
                </div>
              </div>

              {/* INTERMEDIATE LOCATION CHECKPOINTS & WAYPOINTS TRAIL */}
              {(() => {
                const waypoints =
                  detailModalVisit.events?.filter(
                    (e) =>
                      e.eventType === "EXCEPTION" &&
                      (e.latitude !== null || e.failureReason?.includes("LOCATION_TRACK"))
                  ) || [];

                if (waypoints.length === 0) {
                  return (
                    <div className="p-3 bg-white/80 border border-[#E2E6F0] rounded-xl text-xs text-[#696E82] flex items-center gap-2">
                      <Footprints className="w-4 h-4 text-[#696E82] shrink-0" />
                      <span>Single check-in/out snapshots recorded. No intermediate inspection waypoints logged.</span>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#1F1F1F] flex items-center gap-1.5">
                        <Footprints className="w-3.5 h-3.5 text-[#5A81FA]" />
                        <span>Logged Movement Trail ({waypoints.length} Checkpoints)</span>
                      </span>
                      <span className="text-[11px] text-[#696E82]">Stored for Partner Review</span>
                    </div>

                    <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                      {waypoints.map((wp, idx) => {
                        const noteText =
                          wp.failureReason?.replace(/^LOCATION_TRACK:\s*/, "") || "On-site GPS tracking waypoint";

                        return (
                          <div
                            key={wp.id || idx}
                            className="p-2.5 bg-white border border-[#E2E6F0] rounded-xl flex items-center justify-between gap-3 text-xs shadow-2xs"
                          >
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] font-bold bg-[#F2F4FF] text-[#5A81FA] px-1.5 py-0.5 rounded">
                                  #{idx + 1}
                                </span>
                                <span className="font-semibold text-[#1F1F1F] truncate">{noteText}</span>
                              </div>
                              <div className="text-[11px] text-[#696E82] flex items-center gap-2 font-mono">
                                <span>
                                  {new Date(wp.serverReceiptTime).toLocaleTimeString("en-IN", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                  })}
                                </span>
                                {wp.latitude && wp.longitude && (
                                  <>
                                    <span>•</span>
                                    <span>
                                      {wp.latitude.toFixed(5)}°, {wp.longitude.toFixed(5)}°
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="text-right shrink-0 space-y-0.5">
                              {getGeofenceBadge(wp.geofenceAssessment)}
                              {wp.calculatedDistanceMeters !== null && wp.calculatedDistanceMeters !== undefined && (
                                <div className="text-[10px] font-mono text-[#696E82]">
                                  {wp.calculatedDistanceMeters}m from center
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Findings: What happened & What was done */}
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
                <h4 className="font-bold text-[#1F1F1F] uppercase tracking-wider">Follow-Up Actions Needed</h4>
                <div className="p-3 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-[#696E82]">
                  {detailModalVisit.nextActions}
                </div>
              </div>
            )}

            {/* Review Comment */}
            {detailModalVisit.reviewComment && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs space-y-1">
                <span className="font-bold text-purple-900 block">Architectural Partner Review Note:</span>
                <p className="text-purple-800 italic">"{detailModalVisit.reviewComment}"</p>
              </div>
            )}

            <div className="pt-4 border-t border-[#E2E6F0] flex justify-end">
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
              If you are in an underground basement or your device cannot get a GPS fix, specify the reason. This will be
              recorded in the immutable audit trail for Partner review.
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
                    <h3 className="text-base font-bold text-[#1F1F1F]">Architectural Review Decision</h3>
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
                      <span className="font-bold text-[#1F1F1F] block">{targetVisit.employee?.user.fullName}</span>
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
                      <span className="text-[10px] text-[#696E82] uppercase font-bold block">Check-In Geofence</span>
                      <div className="mt-0.5">
                        {checkIn ? getGeofenceBadge(checkIn.geofenceAssessment) : <span className="text-[#696E82]">No fix</span>}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#696E82] uppercase font-bold block">Logged Movement Trail</span>
                      <div className="mt-0.5 flex items-center gap-1 font-semibold text-[#1F1F1F]">
                        <Footprints className="w-3.5 h-3.5 text-[#5A81FA]" />
                        <span>{waypoints.length} GPS checkpoint{waypoints.length !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                  </div>

                  {targetVisit.events && targetVisit.events.length > 0 && (
                    <div className="pt-1 border-t border-[#E2E6F0] flex justify-end">
                      <a
                        href={getGoogleMapsRouteUrl(targetVisit.events, targetVisit.site.latitude, targetVisit.site.longitude)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-semibold text-[#5A81FA] hover:underline flex items-center gap-1"
                      >
                        <Route className="w-3.5 h-3.5" />
                        <span>Inspect Full Trail on Google Maps</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  )}
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
                    { value: "NEEDS_CLARIFICATION", label: "NEEDS CLARIFICATION", subLabel: "Additional Photos Needed" },
                    { value: "REJECTED", label: "REJECTED", subLabel: "Outside Perimeter / Inaccurate" },
                  ]}
                  value={reviewDecision}
                  onChange={(val) => setReviewDecision(val as any)}
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
                  type="button"
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
  </div>
);
}
