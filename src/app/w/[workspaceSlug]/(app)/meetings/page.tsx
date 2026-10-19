"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  Clock,
  Calendar as CalendarIcon,
  CheckCircle2,
  Plus,
  Layers,
  Users,
  Check,
  X,
  FileText,
  AlertCircle,
  Building,
  Briefcase,
  Wrench,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  ExternalLink,
  History,
  LayoutList,
  Sparkles,
  Download,
  Copy,
  Trash2,
  Pencil,
  ArrowUpRight,
  CheckSquare,
  BarChart3,
  TrendingUp,
  Percent,
  Compass,
  Share2,
} from "lucide-react";

interface EmployeeOption {
  id: string; // membershipId
  user: { fullName: string; email: string };
  employee?: { designation?: string | null; department?: string | null; employeeId?: string | null } | null;
}

interface ContractorOption {
  id: string;
  name: string;
  firmName?: string | null;
  trade: string;
  contact?: string | null;
}

interface ClientOption {
  id: string;
  name: string;
  company?: string | null;
  email?: string | null;
  contact?: string | null;
}

interface ConsultantOption {
  id: string;
  name: string;
  firmName?: string | null;
  discipline: string;
  email?: string | null;
}

interface ProjectOption {
  id: string;
  code: string;
  name: string;
}

interface MeetingActionItem {
  id: string;
  description: string;
  dueDate?: string | null;
  status: string;
  assignee?: { user?: { fullName: string } } | null;
}

interface StudioMeeting {
  id: string;
  title: string;
  meetingDate: string;
  startTime: string;
  endTime: string;
  meetingType: string;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "RESCHEDULED" | string;
  agenda?: string | null;
  notes?: string | null;
  decisions?: string | null;
  projectId?: string | null;
  project?: { id: string; name: string; code: string } | null;
  creator?: { user?: { fullName: string } } | null;
  attendeesJson?: {
    allEmployees?: boolean;
    employeeIds?: string[];
    contractorIds?: string[];
    clientIds?: string[];
    consultantIds?: string[];
    meetingLink?: string;
    siteLocation?: string;
  } | null;
  actionItems?: MeetingActionItem[];
}

function StudioMeetingsContent() {
  const params = useParams();
  const workspaceSlug = (params?.workspaceSlug as string) || "100percentdesign";

  const [meetings, setMeetings] = useState<StudioMeeting[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [contractors, setContractors] = useState<ContractorOption[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [consultants, setConsultants] = useState<ConsultantOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View state: 'overview' | 'calendar' | 'list' | 'history'
  const [activeTab, setActiveTab] = useState<"overview" | "calendar" | "list" | "history">("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjectType, setSelectedProjectType] = useState<string>("ALL");
  const [selectedMeetingType, setSelectedMeetingType] = useState<string>("ALL");

  // RIGHT SIDEBAR / SLIDE-OVER INSPECTION DRAWER STATE
  const [selectedMeeting, setSelectedMeeting] = useState<StudioMeeting | null>(null);
  const [selectedDateForDrawer, setSelectedDateForDrawer] = useState<string | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Quick Action Item add state inside drawer/card
  const [drawerActionText, setDrawerActionText] = useState("");
  const [drawerActionAssignee, setDrawerActionAssignee] = useState("");
  const [drawerActionDueDate, setDrawerActionDueDate] = useState("");

  // In-drawer MoM quick edit
  const [isEditingMoM, setIsEditingMoM] = useState(false);
  const [draftNotes, setDraftNotes] = useState("");
  const [draftDecisions, setDraftDecisions] = useState("");

  // Conversion & notification state
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Schedule modal state
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);
  const [attendeeTab, setAttendeeTab] = useState<"employees" | "contractors" | "clients" | "consultants">("employees");
  const [attendeeSearch, setAttendeeSearch] = useState("");

  // Modal Form State
  const [form, setForm] = useState({
    title: "",
    meetingDate: new Date().toISOString().split("T")[0],
    startTime: "11:00",
    endTime: "12:30",
    meetingType: "Design Review",
    projectId: "",
    agenda: "",
    notes: "",
    decisions: "",
    allEmployees: true,
    selectedEmployeeIds: [] as string[],
    selectedContractorIds: [] as string[],
    selectedClientIds: [] as string[],
    selectedConsultantIds: [] as string[],
  });
  const [actionLoading, setActionLoading] = useState(false);

  // Calendar Navigation State
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());

  const fetchMeetingsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/meetings?workspaceSlug=${workspaceSlug}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load studio meetings");
      setMeetings(data.meetings || []);

      if (data.participants) {
        setEmployees(data.participants.employees || []);
        setContractors(data.participants.contractors || []);
        setClients(data.participants.clients || []);
        setConsultants(data.participants.consultants || []);
        setProjects(data.participants.projects || []);
      }

      // If a meeting is currently inspected in the drawer, sync its data
      if (selectedMeeting) {
        const updated = (data.meetings || []).find((m: StudioMeeting) => m.id === selectedMeeting.id);
        if (updated) setSelectedMeeting(updated);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const searchParams = useSearchParams();

  useEffect(() => {
    fetchMeetingsData();
  }, [workspaceSlug]);

  useEffect(() => {
    if (searchParams?.get("action") === "new") {
      openCreateModal();
    }
  }, [searchParams]);

  // Handle ESC key to dismiss drawer and modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isScheduleOpen) {
          setIsScheduleOpen(false);
        } else if (selectedMeeting || selectedDateForDrawer) {
          setSelectedMeeting(null);
          setSelectedDateForDrawer(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isScheduleOpen, selectedMeeting, selectedDateForDrawer]);

  // Open modal in fresh create mode
  const openCreateModal = (defaultDate?: string) => {
    setEditingMeetingId(null);
    setForm({
      title: "",
      meetingDate: defaultDate || new Date().toISOString().split("T")[0],
      startTime: "11:00",
      endTime: "12:30",
      meetingType: "Design Review",
      projectId: "",
      agenda: "",
      notes: "",
      decisions: "",
      allEmployees: true,
      selectedEmployeeIds: [],
      selectedContractorIds: [],
      selectedClientIds: [],
      selectedConsultantIds: [],
    });
    setAttendeeTab("employees");
    setAttendeeSearch("");
    setIsScheduleOpen(true);
  };

  // Open modal in edit / MoM mode
  const openEditModal = (m: StudioMeeting) => {
    setEditingMeetingId(m.id);
    const att = m.attendeesJson || {};
    setForm({
      title: m.title,
      meetingDate: new Date(m.meetingDate).toISOString().split("T")[0],
      startTime: m.startTime || "11:00",
      endTime: m.endTime || "12:30",
      meetingType: m.meetingType || "Design Review",
      projectId: m.projectId || "",
      agenda: m.agenda || "",
      notes: m.notes || "",
      decisions: m.decisions || "",
      allEmployees: att.allEmployees !== undefined ? Boolean(att.allEmployees) : true,
      selectedEmployeeIds: att.employeeIds || [],
      selectedContractorIds: att.contractorIds || [],
      selectedClientIds: att.clientIds || [],
      selectedConsultantIds: att.consultantIds || [],
    });
    setAttendeeTab("employees");
    setAttendeeSearch("");
    setIsScheduleOpen(true);
  };

  // Inspect meeting in right drawer
  const inspectMeeting = (m: StudioMeeting) => {
    setSelectedMeeting(m);
    setSelectedDateForDrawer(null);
    setDraftNotes(m.notes || "");
    setDraftDecisions(m.decisions || "");
    setIsEditingMoM(false);
  };

  // Inspect date in right drawer
  const inspectDate = (dateStr: string) => {
    setSelectedDateForDrawer(dateStr);
    setSelectedMeeting(null);
  };

  const handleConvertActionItem = async (meetingId: string, actionItemId: string) => {
    setConvertingId(actionItemId);
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/action-items/${actionItemId}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceSlug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Conversion failed");

      if (data.alreadyConverted) {
        setActionSuccess("Action item was already converted to an executive deliverable.");
      } else {
        setActionSuccess(`Converted to Executive Deliverable: "${data.task.title}"`);
      }
      fetchMeetingsData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setConvertingId(null);
    }
  };

  const handleAddDrawerActionItem = async (meetingId: string) => {
    if (!drawerActionText.trim()) return;
    try {
      const res = await fetch(`/api/meetings/${meetingId}/action-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceSlug,
          description: drawerActionText.trim(),
          assigneeId: drawerActionAssignee || undefined,
          dueDate: drawerActionDueDate || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to add action item");
      }
      setDrawerActionText("");
      setDrawerActionAssignee("");
      setDrawerActionDueDate("");
      fetchMeetingsData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveMoMQuick = async (meetingId: string) => {
    try {
      const res = await fetch("/api/meetings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceSlug,
          meetingId,
          notes: draftNotes,
          decisions: draftDecisions,
        }),
      });
      if (!res.ok) throw new Error("Failed to update MoM");
      setIsEditingMoM(false);
      setActionSuccess("Minutes of Meeting & Decisions updated.");
      fetchMeetingsData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateStatus = async (meetingId: string, status: string) => {
    try {
      const res = await fetch("/api/meetings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceSlug,
          meetingId,
          status,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to update status");
      }
      fetchMeetingsData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!confirm("Are you sure you want to cancel and remove this studio meeting?")) return;
    try {
      const res = await fetch(`/api/meetings?workspaceSlug=${workspaceSlug}&meetingId=${meetingId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete meeting");
      setSelectedMeeting(null);
      setSelectedDateForDrawer(null);
      setActionSuccess("Meeting removed successfully.");
      fetchMeetingsData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        workspaceSlug,
        id: editingMeetingId || undefined,
        meetingId: editingMeetingId || undefined,
        title: form.title,
        meetingDate: form.meetingDate,
        startTime: form.startTime,
        endTime: form.endTime,
        meetingType: form.meetingType,
        projectId: form.projectId || undefined,
        agenda: form.agenda,
        notes: form.notes,
        decisions: form.decisions,
        attendees: {
          allEmployees: form.allEmployees,
          employeeIds: form.allEmployees ? [] : form.selectedEmployeeIds,
          contractorIds: form.selectedContractorIds,
          clientIds: form.selectedClientIds,
          consultantIds: form.selectedConsultantIds,
        },
      };

      const res = await fetch("/api/meetings", {
        method: editingMeetingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save studio meeting");

      setIsScheduleOpen(false);
      setActionSuccess(editingMeetingId ? "Meeting updated successfully." : "Meeting scheduled successfully.");
      fetchMeetingsData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Helper: Client-Side iCal / .ics file generator & download
  const downloadIcs = (m: StudioMeeting) => {
    try {
      const dateStr = new Date(m.meetingDate).toISOString().split("T")[0].replace(/-/g, "");
      const startHours = (m.startTime || "11:00").replace(":", "") + "00";
      const endHours = (m.endTime || "12:30").replace(":", "") + "00";
      const dtStart = `${dateStr}T${startHours}`;
      const dtEnd = `${dateStr}T${endHours}`;

      const ics = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//100 PERCENT DESIGN//Studio OS//EN",
        "BEGIN:VEVENT",
        `SUMMARY:100% DESIGN: ${m.title}`,
        `DESCRIPTION:${(m.agenda || "Studio Meeting").replace(/\n/g, "\\n")}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `STATUS:${m.status === "COMPLETED" ? "CONFIRMED" : "TENTATIVE"}`,
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n");

      const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${m.title.replace(/[^a-zA-Z0-9]/g, "_")}.ics`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert("Unable to generate calendar invite.");
    }
  };

  // Helper: Copy WhatsApp / Email invitation
  const copyMeetingInvitation = (m: StudioMeeting) => {
    const text = `*100% DESIGN Studio — Meeting Invitation*
📌 *${m.title}*
📅 Date: ${new Date(m.meetingDate).toLocaleDateString()}
⏰ Time: ${m.startTime} — ${m.endTime}
🎯 Type: ${m.meetingType}
${m.project ? `🏢 Project: ${m.project.code} — ${m.project.name}` : ""}
${m.agenda ? `\n📝 *Agenda:* \n${m.agenda}` : ""}
${m.decisions ? `\n✅ *Key Decisions:* \n${m.decisions}` : ""}`;

    navigator.clipboard.writeText(text);
    setActionSuccess("Invitation copied to clipboard for WhatsApp/Email.");
  };

  // Helper: Copy MoM summary
  const copyMoMSummary = (m: StudioMeeting) => {
    const text = `*MINUTES OF MEETING (MoM) — 100% DESIGN STUDIO*
=========================================
Meeting: ${m.title}
Date: ${new Date(m.meetingDate).toLocaleDateString()} (${m.startTime} - ${m.endTime})
Type: ${m.meetingType}
${m.project ? `Project: ${m.project.code} — ${m.project.name}` : ""}

AGENDA:
${m.agenda || "N/A"}

MINUTES OF MEETING / DISCUSSION:
${m.notes || "No notes recorded"}

KEY DECISIONS AGREED:
${m.decisions || "No formal decisions logged"}

ACTION ITEMS (${m.actionItems?.length || 0}):
${m.actionItems?.map((a, i) => `${i + 1}. [${a.status}] ${a.description} ${a.assignee ? `(Assignee: ${a.assignee.user?.fullName})` : ""}`).join("\n") || "None"}
=========================================`;

    navigator.clipboard.writeText(text);
    setActionSuccess("Minutes of Meeting copied to clipboard.");
  };

  const toggleSelection = (list: string[], id: string) => {
    return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
  };

  // -------------------------------------------------------------
  // ADVANCED ANALYTICS CALCULATIONS (STUDIO INTELLIGENCE)
  // -------------------------------------------------------------
  const analytics = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const thisMonthMeetings = meetings.filter((m) => {
      const d = new Date(m.meetingDate);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const completed = thisMonthMeetings.filter((m) => m.status === "COMPLETED").length;
    const totalMonth = thisMonthMeetings.length;
    const completionRate = totalMonth > 0 ? Math.round((completed / totalMonth) * 100) : 0;

    // Action items conversion velocity
    let totalActionItems = 0;
    let convertedActionItems = 0;
    for (const m of meetings) {
      if (m.actionItems) {
        totalActionItems += m.actionItems.length;
        convertedActionItems += m.actionItems.filter((a) => a.status === "CONVERTED_TO_TASK").length;
      }
    }
    const conversionRate = totalActionItems > 0 ? Math.round((convertedActionItems / totalActionItems) * 100) : 0;

    // Stakeholder reach
    const multiStakeholder = meetings.filter((m) => {
      const att = m.attendeesJson || {};
      return (
        (att.contractorIds && att.contractorIds.length > 0) ||
        (att.clientIds && att.clientIds.length > 0) ||
        (att.consultantIds && att.consultantIds.length > 0)
      );
    }).length;

    // Next scheduled session in next 48h
    const todayStr = now.toISOString().split("T")[0];
    const upcomingNext = meetings
      .filter((m) => {
        const dStr = new Date(m.meetingDate).toISOString().split("T")[0];
        return dStr >= todayStr && m.status !== "COMPLETED" && m.status !== "CANCELLED";
      })
      .sort((a, b) => new Date(a.meetingDate).getTime() - new Date(b.meetingDate).getTime())[0];

    return {
      totalMonth,
      completed,
      completionRate,
      totalActionItems,
      convertedActionItems,
      conversionRate,
      multiStakeholder,
      upcomingNext,
    };
  }, [meetings]);

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const upcomingMeetings = useMemo(() => {
    return meetings
      .filter((m) => {
        const mDate = new Date(m.meetingDate).toISOString().split("T")[0];
        if (mDate < todayStr || m.status === "COMPLETED" || m.status === "CANCELLED") return false;
        if (selectedProjectType !== "ALL" && m.projectId !== selectedProjectType) return false;
        if (selectedMeetingType !== "ALL" && m.meetingType !== selectedMeetingType) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = m.title.toLowerCase().includes(q);
          const matchAgenda = (m.agenda || "").toLowerCase().includes(q);
          const matchNotes = (m.notes || "").toLowerCase().includes(q);
          const matchProject = (m.project?.name || "").toLowerCase().includes(q) || (m.project?.code || "").toLowerCase().includes(q);
          if (!matchTitle && !matchAgenda && !matchNotes && !matchProject) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(a.meetingDate).getTime() - new Date(b.meetingDate).getTime());
  }, [meetings, todayStr, selectedProjectType, selectedMeetingType, searchQuery]);

  const needsStatusUpdateMeetings = useMemo(() => {
    return meetings
      .filter((m) => {
        const mDate = new Date(m.meetingDate).toISOString().split("T")[0];
        if (mDate >= todayStr || (m.status !== "SCHEDULED" && m.status !== "IN_PROGRESS")) return false;
        if (selectedProjectType !== "ALL" && m.projectId !== selectedProjectType) return false;
        if (selectedMeetingType !== "ALL" && m.meetingType !== selectedMeetingType) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = m.title.toLowerCase().includes(q);
          const matchAgenda = (m.agenda || "").toLowerCase().includes(q);
          const matchNotes = (m.notes || "").toLowerCase().includes(q);
          const matchProject = (m.project?.name || "").toLowerCase().includes(q) || (m.project?.code || "").toLowerCase().includes(q);
          if (!matchTitle && !matchAgenda && !matchNotes && !matchProject) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.meetingDate).getTime() - new Date(a.meetingDate).getTime());
  }, [meetings, todayStr, selectedProjectType, selectedMeetingType, searchQuery]);

  const activeMeetingForOverview = selectedMeeting || needsStatusUpdateMeetings[0] || upcomingMeetings[0] || meetings[0] || null;

  // Filtered Meetings for List and History
  const filteredMeetings = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];

    return meetings.filter((m) => {
      const mDate = new Date(m.meetingDate).toISOString().split("T")[0];

      // Tab filtering
      if (activeTab === "list") {
        if (m.status === "COMPLETED" && mDate < today) return false;
      } else if (activeTab === "history") {
        if (m.status !== "COMPLETED" && mDate >= today) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = m.title.toLowerCase().includes(q);
        const matchAgenda = (m.agenda || "").toLowerCase().includes(q);
        const matchNotes = (m.notes || "").toLowerCase().includes(q);
        const matchProject = (m.project?.name || "").toLowerCase().includes(q) || (m.project?.code || "").toLowerCase().includes(q);
        if (!matchTitle && !matchAgenda && !matchNotes && !matchProject) return false;
      }

      // Project filter
      if (selectedProjectType !== "ALL" && m.projectId !== selectedProjectType) {
        return false;
      }

      // Meeting Type filter
      if (selectedMeetingType !== "ALL" && m.meetingType !== selectedMeetingType) {
        return false;
      }

      return true;
    });
  }, [meetings, activeTab, searchQuery, selectedProjectType, selectedMeetingType]);

  // Calendar calculations
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: Array<{ dateStr: string; dayNumber: number; isCurrentMonth: boolean }> = [];

    // Previous month padding
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const dateStr = new Date(year, month - 1, d).toISOString().split("T")[0];
      days.push({ dateStr, dayNumber: d, isCurrentMonth: false });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = new Date(Date.UTC(year, month, d)).toISOString().split("T")[0];
      days.push({ dateStr, dayNumber: d, isCurrentMonth: true });
    }

    // Trailing padding to make 35 or 42 cells
    const remaining = 35 - days.length >= 0 ? 35 - days.length : 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const dateStr = new Date(year, month + 1, d).toISOString().split("T")[0];
      days.push({ dateStr, dayNumber: d, isCurrentMonth: false });
    }

    return days;
  }, [calendarMonth]);

  // Map meetings by date for instant calendar lookups
  const meetingsByDate = useMemo(() => {
    const map = new Map<string, StudioMeeting[]>();
    for (const m of meetings) {
      const dateKey = new Date(m.meetingDate).toISOString().split("T")[0];
      const list = map.get(dateKey) || [];
      list.push(m);
      map.set(dateKey, list);
    }
    return map;
  }, [meetings]);

  // Meetings on currently selected date for drawer
  const meetingsOnSelectedDate = useMemo(() => {
    if (!selectedDateForDrawer) return [];
    return meetingsByDate.get(selectedDateForDrawer) || [];
  }, [selectedDateForDrawer, meetingsByDate]);

  // Total selected attendee count in modal
  const totalSelectedCount = useMemo(() => {
    const empCount = form.allEmployees ? employees.length : form.selectedEmployeeIds.length;
    return empCount + form.selectedContractorIds.length + form.selectedClientIds.length + form.selectedConsultantIds.length;
  }, [form, employees]);

  // Helper for meeting type color dots
  const getTypeDotColor = (type: string) => {
    switch (type) {
      case "Design Review":
        return "bg-blue-500";
      case "Client Presentation":
        return "bg-purple-500";
      case "Site Coordination":
        return "bg-amber-500";
      case "Partner Strategy":
        return "bg-emerald-500";
      default:
        return "bg-slate-400";
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER (Reference: e94f5989) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#696E82] mb-1">
            <span>Work management</span>
            <span>/</span>
            <span className="font-semibold text-[#0B122B]">Studio meetings</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0B122B] tracking-tight">Studio meetings</h1>
          <p className="text-xs sm:text-sm text-[#696E82] mt-0.5">
            Plan discussions. Capture decisions. Track follow-through.
          </p>
        </div>

        <button
          onClick={() => openCreateModal()}
          className="flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-[#3562E8] hover:bg-[#284ebd] text-white shadow-xs transition-all cursor-pointer self-start sm:self-auto w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Schedule meeting</span>
        </button>
      </div>

      {/* 2. 4 KPI METRIC CARDS (Reference: e94f5989) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Meetings this month */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2E6F0] shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#0B122B]">Meetings this month</span>
            <CalendarIcon className="w-4 h-4 text-[#3562E8]" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#0B122B] font-sans tracking-tight mt-1">
            {analytics.totalMonth}
          </div>
          <p className="text-xs text-[#696E82] mt-0.5">{analytics.completed} completed</p>
        </div>

        {/* Card 2: Actions converted to tasks */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2E6F0] shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700">Actions converted to tasks</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#0B122B] font-sans tracking-tight mt-1">
            {analytics.convertedActionItems}/{analytics.totalActionItems}
          </div>
          <p className="text-xs text-[#696E82] mt-0.5">{analytics.conversionRate}% linked to tracked tasks</p>
        </div>

        {/* Card 3: External sessions */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2E6F0] shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-700">External sessions</span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#0B122B] font-sans tracking-tight mt-1">
            {analytics.multiStakeholder}
          </div>
          <p className="text-xs text-[#696E82] mt-0.5">This month</p>
        </div>

        {/* Card 4: Next meeting */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2E6F0] shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600">Next meeting</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          {analytics.upcomingNext ? (
            <div className="truncate mt-1">
              <span className="text-sm font-bold text-[#0B122B] truncate block">
                {analytics.upcomingNext.title}
              </span>
              <span className="text-xs text-[#696E82]">
                {new Date(analytics.upcomingNext.meetingDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {analytics.upcomingNext.startTime}
              </span>
            </div>
          ) : (
            <div className="text-sm font-semibold text-[#696E82] pt-1">None scheduled</div>
          )}
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center justify-between animate-in fade-in">
          <span className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </span>
          <button onClick={() => setActionSuccess(null)} className="cursor-pointer text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 3. TABS & SEARCH / FILTER TOOLBAR (Reference: e94f5989) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* 4 Tabs: Overview | Calendar | Upcoming | History & minutes */}
        <div className="flex items-center gap-1 p-1 bg-white border border-[#E2E6F0] rounded-2xl shadow-2xs overflow-x-auto touch-scroll-x">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "overview"
                ? "bg-[#3562E8] text-white shadow-2xs"
                : "text-[#696E82] hover:text-[#0B122B]"
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("calendar")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "calendar"
                ? "bg-[#3562E8] text-white shadow-2xs"
                : "text-[#696E82] hover:text-[#0B122B]"
            }`}
          >
            Calendar
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("list")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "list"
                ? "bg-[#3562E8] text-white shadow-2xs"
                : "text-[#696E82] hover:text-[#0B122B]"
            }`}
          >
            Upcoming
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "history"
                ? "bg-[#3562E8] text-white shadow-2xs"
                : "text-[#696E82] hover:text-[#0B122B]"
            }`}
          >
            History & minutes
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-[#696E82] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search meetings or minutes..."
            className="w-full pl-9 pr-8 py-2 bg-white border border-[#E2E6F0] rounded-xl text-[#0B122B] text-xs focus:outline-none focus:border-[#3562E8] shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#696E82] hover:text-[#0B122B] p-0.5 cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-white p-3 rounded-2xl border border-[#E2E6F0] shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedProjectType}
            onChange={(e) => setSelectedProjectType(e.target.value)}
            aria-label="Filter meetings by project"
            className="px-3 py-1.5 bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl text-[#0B122B] font-medium text-xs focus:outline-none focus:border-[#3562E8] cursor-pointer"
          >
            <option value="ALL">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} — {p.name}
              </option>
            ))}
          </select>

          <select
            value={selectedMeetingType}
            onChange={(e) => setSelectedMeetingType(e.target.value)}
            aria-label="Filter by meeting type"
            className="px-3 py-1.5 bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl text-[#0B122B] font-medium text-xs focus:outline-none focus:border-[#3562E8] cursor-pointer"
          >
            <option value="ALL">All meeting types</option>
            <option value="Design Review">Design Review</option>
            <option value="Client Presentation">Client Presentation</option>
            <option value="Site Coordination">Site Coordination</option>
            <option value="Partner Strategy">Partner Strategy</option>
            <option value="Budget & Financials">Budget & Financials</option>
          </select>

          {(selectedProjectType !== "ALL" || selectedMeetingType !== "ALL" || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedProjectType("ALL");
                setSelectedMeetingType("ALL");
                setSearchQuery("");
              }}
              className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:underline px-1 cursor-pointer"
              title="Reset all meeting filters"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-[#F8F9FE] border border-[#CEDEFF] text-[#3562E8] font-bold text-xs">
            Today · {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </div>
        </div>
      </div>

      {/* 4. OVERVIEW WORKBENCH (Reference: e94f5989) */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: UPCOMING & NEEDS STATUS UPDATE (Cols 1-7) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Upcoming meetings section */}
            <div className="bg-white rounded-3xl border border-[#E2E6F0] p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-[#0B122B] text-base">
                  <CalendarIcon className="w-5 h-5 text-[#3562E8]" />
                  <span>Upcoming meetings</span>
                </div>
              </div>

              {upcomingMeetings.length === 0 ? (
                <div className="py-8 px-4 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-[#F8F9FE] text-[#3562E8] flex items-center justify-center mb-3">
                    <CalendarIcon className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-[#0B122B]">No upcoming meetings</h4>
                  <p className="text-xs text-[#696E82] mt-0.5">Schedule your next studio discussion.</p>
                  <button
                    type="button"
                    onClick={() => openCreateModal()}
                    className="mt-4 px-4 py-2 rounded-xl border border-[#3562E8] text-[#3562E8] text-xs font-bold hover:bg-[#F8F9FE] flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Schedule meeting</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingMeetings.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => inspectMeeting(m)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        selectedMeeting?.id === m.id
                          ? "border-[#3562E8] bg-blue-50/20 shadow-xs"
                          : "border-[#E2E6F0] bg-white hover:border-[#CEDEFF]"
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[#0B122B] truncate">{m.title}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F8F9FE] text-[#3562E8] border border-[#CEDEFF]">
                            {m.meetingType}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#696E82] flex items-center gap-3">
                          <span>{new Date(m.meetingDate).toLocaleDateString()}</span>
                          <span>{m.startTime} – {m.endTime}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#696E82] shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Needs status update section */}
            <div className="bg-[#FFFBF5] rounded-3xl border border-amber-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold">
                    !
                  </div>
                  <h3 className="font-bold text-[#0B122B] text-base">
                    Needs status update
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                    {needsStatusUpdateMeetings.length}
                  </span>
                </div>
              </div>
              <p className="text-xs text-[#696E82]">
                Past meetings still marked as scheduled.
              </p>

              {needsStatusUpdateMeetings.length === 0 ? (
                <div className="py-4 text-xs text-[#696E82]">
                  All past meetings have recorded minutes and final status.
                </div>
              ) : (
                <div className="space-y-3">
                  {needsStatusUpdateMeetings.map((m) => {
                    const mDate = new Date(m.meetingDate);
                    const monthStr = mDate.toLocaleString("en-US", { month: "short" }).toUpperCase();
                    const dayNum = mDate.getDate();
                    const weekdayStr = mDate.toLocaleString("en-US", { weekday: "short" }).toUpperCase();

                    return (
                      <div
                        key={m.id}
                        className="p-4 bg-white rounded-2xl border border-amber-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-start gap-3.5">
                          {/* OCT 12 MON Date Box */}
                          <div className="w-14 h-14 rounded-2xl bg-[#F8F9FE] border border-[#CEDEFF] flex flex-col items-center justify-center shrink-0 text-center font-mono">
                            <span className="text-[10px] font-bold text-[#3562E8] leading-none">{monthStr}</span>
                            <span className="text-lg font-extrabold text-[#0B122B] leading-tight">{dayNum}</span>
                            <span className="text-[9px] font-semibold text-[#696E82] leading-none">{weekdayStr}</span>
                          </div>

                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-bold text-xs sm:text-sm text-[#0B122B]">{m.title}</h4>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                {m.meetingType}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                Needs update
                              </span>
                            </div>

                            <div className="text-xs text-[#696E82] flex flex-wrap items-center gap-3">
                              <span>{mDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · {m.startTime} – {m.endTime} IST</span>
                              <span>•</span>
                              <span>Recorded status: <strong className="text-[#0B122B]">{m.status}</strong></span>
                            </div>

                            {m.agenda && (
                              <p className="text-xs text-[#696E82] line-clamp-1 mt-0.5">
                                {m.agenda}
                              </p>
                            )}

                            <div className="text-[11px] text-[#696E82] flex items-center gap-3 pt-1">
                              <span>{m.attendeesJson?.employeeIds?.length ? `${m.attendeesJson.employeeIds.length} participants` : "No participants listed"}</span>
                              <span>•</span>
                              <span>{m.actionItems?.length || 0} action items</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => inspectMeeting(m)}
                          className="px-3.5 py-1.5 rounded-xl border border-[#3562E8] text-[#3562E8] hover:bg-[#F8F9FE] text-xs font-bold shrink-0 self-start sm:self-auto cursor-pointer"
                        >
                          Review meeting →
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: MEETING OVERVIEW PANEL (Cols 8-12) */}
          <div className="lg:col-span-5">
            {activeMeetingForOverview ? (
              <div className="bg-white rounded-3xl border border-[#E2E6F0] p-5 sm:p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E2E6F0]">
                  <div className="flex items-center gap-2 font-bold text-[#0B122B] text-base">
                    <FileText className="w-5 h-5 text-[#3562E8]" />
                    <span>Meeting overview</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => inspectMeeting(activeMeetingForOverview)}
                    className="text-[#696E82] hover:text-[#0B122B] p-1 cursor-pointer"
                    title="Open details"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>

                {/* Meeting Identity */}
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-[#0B122B]">
                    {activeMeetingForOverview.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      {activeMeetingForOverview.meetingType}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {activeMeetingForOverview.status}
                    </span>
                  </div>
                </div>

                {/* Warning Banner if past scheduled */}
                {new Date(activeMeetingForOverview.meetingDate).toISOString().split("T")[0] < todayStr && activeMeetingForOverview.status === "SCHEDULED" && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2 text-xs text-amber-800 font-semibold">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>This meeting date has passed. Confirm its status.</span>
                  </div>
                )}

                {/* Grid details */}
                <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-[#696E82] block text-[11px]">Date</span>
                    <span className="font-semibold text-[#0B122B]">
                      {new Date(activeMeetingForOverview.meetingDate).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#696E82] block text-[11px]">Time</span>
                    <span className="font-semibold text-[#0B122B] font-mono">
                      {activeMeetingForOverview.startTime} – {activeMeetingForOverview.endTime} IST
                    </span>
                  </div>
                  <div>
                    <span className="text-[#696E82] block text-[11px]">Organizer</span>
                    <span className="font-semibold text-[#0B122B]">
                      {activeMeetingForOverview.creator?.user?.fullName || "Studio Leadership"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#696E82] block text-[11px]">Participants</span>
                    <span className="font-semibold text-[#0B122B]">
                      {activeMeetingForOverview.attendeesJson?.employeeIds?.length ? `${activeMeetingForOverview.attendeesJson.employeeIds.length} members` : "No participants listed"}
                    </span>
                  </div>
                </div>

                {/* Agenda */}
                <div className="space-y-1.5 pt-2 border-t border-[#E2E6F0]">
                  <span className="text-xs font-bold text-[#0B122B] block">Agenda</span>
                  <p className="text-xs text-[#696E82] bg-[#F8F9FE] p-3 rounded-2xl border border-[#E2E6F0]">
                    {activeMeetingForOverview.agenda || "No specific agenda items recorded."}
                  </p>
                </div>

                {/* Action Items */}
                <div className="space-y-1.5 pt-2 border-t border-[#E2E6F0]">
                  <span className="text-xs font-bold text-[#0B122B] block">
                    Action items ({activeMeetingForOverview.actionItems?.length || 0})
                  </span>
                  {activeMeetingForOverview.actionItems && activeMeetingForOverview.actionItems.length > 0 ? (
                    <div className="space-y-1.5">
                      {activeMeetingForOverview.actionItems.map((a) => (
                        <div key={a.id} className="p-2.5 rounded-xl border border-[#E2E6F0] bg-[#F8F9FE] text-xs flex items-center justify-between">
                          <span className="font-medium text-[#0B122B] truncate">{a.description}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-[#3562E8]">
                            {a.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#696E82] bg-[#F8F9FE] p-3 rounded-2xl border border-[#E2E6F0]">
                      No action items recorded.
                    </p>
                  )}
                </div>

                {/* Footer Action Buttons */}
                <div className="flex items-center gap-2 pt-3 border-t border-[#E2E6F0]">
                  <button
                    type="button"
                    onClick={() => openEditModal(activeMeetingForOverview)}
                    className="flex-1 py-2.5 rounded-xl bg-[#3562E8] hover:bg-[#284ebd] text-white text-xs font-bold transition-colors cursor-pointer text-center"
                  >
                    Update status
                  </button>
                  <button
                    type="button"
                    onClick={() => inspectMeeting(activeMeetingForOverview)}
                    className="px-4 py-2.5 rounded-xl border border-[#E2E6F0] bg-white hover:bg-[#F8F9FE] text-[#0B122B] text-xs font-bold transition-colors cursor-pointer"
                  >
                    Open details
                  </button>
                </div>
                <div className="text-[10px] text-[#696E82] text-center">Times shown in IST</div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-[#E2E6F0] p-8 text-center text-xs text-[#696E82]">
                Select a meeting to view its overview and minutes.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. CALENDAR VIEW WITH INTERACTIVE DAY SELECTION */}
      {activeTab === "calendar" && (
        <div className="bg-white rounded-3xl border border-[#E2E6F0] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold text-slate-900">
                {calendarMonth.toLocaleString("default", { month: "long", year: "numeric" })}
              </h2>
              <span className="text-xs text-slate-500 font-medium">
                {meetings.length} scheduled session(s) • Click date to inspect / schedule
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))
                }
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCalendarMonth(new Date())}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() =>
                  setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))
                }
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Header */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-slate-400 text-[11px] uppercase tracking-wider py-1">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((day, idx) => {
              const dayMeetings = meetingsByDate.get(day.dateStr) || [];
              const isToday = day.dateStr === new Date().toISOString().split("T")[0];
              const isSelectedDate = selectedDateForDrawer === day.dateStr;

              return (
                <div
                  key={idx}
                  onClick={() => inspectDate(day.dateStr)}
                  className={`min-h-[110px] p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                    day.isCurrentMonth
                      ? isSelectedDate
                        ? "bg-blue-50 border-[#3562E8] shadow-md ring-2 ring-[#3562E8]"
                        : isToday
                        ? "bg-blue-50/40 border-[#3562E8]/40 shadow-xs ring-1 ring-[#3562E8]/30"
                        : "bg-[#F8F9FD] border-slate-200/80 hover:bg-white hover:border-[#3562E8]/40 hover:shadow-xs"
                      : "bg-slate-50/50 border-slate-100 opacity-40 hover:opacity-80"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                        isToday ? "bg-[#3562E8] text-white" : "text-slate-700"
                      }`}
                    >
                      {day.dayNumber}
                    </span>
                    {dayMeetings.length > 0 && (
                      <span className="text-[10px] font-bold text-[#3562E8] bg-white px-1.5 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                        {dayMeetings.length}
                      </span>
                    )}
                  </div>

                  {/* Day Meeting Badges */}
                  <div className="space-y-1 mt-1 overflow-hidden">
                    {dayMeetings.slice(0, 2).map((m) => (
                      <div
                        key={m.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          inspectMeeting(m);
                        }}
                        className="truncate text-[10px] font-semibold px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 hover:border-[#3562E8] hover:text-[#3562E8] shadow-2xs flex items-center gap-1.5 cursor-pointer"
                        title={`${m.startTime} — ${m.title}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getTypeDotColor(m.meetingType)}`} />
                        <span className="truncate">{m.title}</span>
                      </div>
                    ))}
                    {dayMeetings.length > 2 && (
                      <span className="text-[10px] text-slate-500 font-semibold block text-center">
                        +{dayMeetings.length - 2} more
                      </span>
                    )}
                  </div>

                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end pt-1">
                    <span className="text-[10px] text-[#3562E8] font-bold">Inspect →</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. LIST & HISTORY VIEWS */}
      {(activeTab === "list" || activeTab === "history") && (
        <div className="space-y-4">
          {loading ? (
            <div className="p-12 text-center text-xs text-[#696E82] bg-white rounded-3xl border border-[#E2E6F0]">
              Loading studio meetings...
            </div>
          ) : filteredMeetings.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#696E82] bg-white rounded-3xl border border-[#E2E6F0] space-y-2">
              <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-700">No studio meetings found.</p>
              <p className="text-slate-400">
                {activeTab === "history"
                  ? "Completed meetings will appear in your historical timeline."
                  : "Click 'Schedule Meeting' to plan design reviews and stakeholder coordination sessions."}
              </p>
            </div>
          ) : (
            filteredMeetings.map((m) => {
              const attendees = m.attendeesJson || {};
              const isCompleted = m.status === "COMPLETED";

              return (
                <div
                  key={m.id}
                  onClick={() => inspectMeeting(m)}
                  className="bg-white rounded-3xl border border-[#E2E6F0] p-5 sm:p-6 shadow-2xs space-y-4 text-xs hover:border-[#3562E8]/40 hover:shadow-xs transition-all cursor-pointer"
                >
                  {/* Top Bar: Title, Project, Meeting Type, Date & Time */}
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 border-b border-[#E2E6F0] pb-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">{m.title}</h3>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#CEDEFF] text-[#2C308D]">
                          {m.meetingType}
                        </span>
                        {m.project && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {m.project.code} — {m.project.name}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#696E82] font-mono">
                        <span className="flex items-center gap-1.5">
                          <CalendarIcon className="w-3.5 h-3.5 text-[#3562E8]" />
                          <span>{new Date(m.meetingDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#3562E8]" />
                          <span>{m.startTime} — {m.endTime}</span>
                        </span>
                        {m.creator && (
                          <span className="flex items-center gap-1.5 text-slate-500 font-sans">
                            <span>Organized by: <strong>{m.creator.user?.fullName}</strong></span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status & Edit Controls */}
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={m.status}
                        onChange={(e) => handleUpdateStatus(m.id, e.target.value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer focus:outline-none ${
                          m.status === "COMPLETED"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : m.status === "IN_PROGRESS"
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : "bg-blue-50 text-blue-800 border-blue-200"
                        }`}
                      >
                        <option value="SCHEDULED">SCHEDULED</option>
                        <option value="IN_PROGRESS">IN PROGRESS</option>
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => inspectMeeting(m)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                      >
                        Inspect Drawer →
                      </button>
                    </div>
                  </div>

                  {/* Stakeholder Attendees Display */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] mr-1">
                      Participants:
                    </span>

                    {attendees.allEmployees ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 font-semibold">
                        <Users className="w-3 h-3 text-[#3562E8]" />
                        <span>All Studio Staff ({employees.length})</span>
                      </span>
                    ) : attendees.employeeIds && attendees.employeeIds.length > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 font-semibold">
                        <Users className="w-3 h-3 text-[#3562E8]" />
                        <span>{attendees.employeeIds.length} Team Member(s)</span>
                      </span>
                    ) : null}

                    {attendees.contractorIds && attendees.contractorIds.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-semibold">
                        <Wrench className="w-3 h-3 text-amber-600" />
                        <span>{attendees.contractorIds.length} Contractor(s)</span>
                      </span>
                    )}

                    {attendees.clientIds && attendees.clientIds.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-800 font-semibold">
                        <Building className="w-3 h-3 text-purple-600" />
                        <span>{attendees.clientIds.length} Client(s)</span>
                      </span>
                    )}

                    {attendees.consultantIds && attendees.consultantIds.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 font-semibold">
                        <Briefcase className="w-3 h-3 text-teal-600" />
                        <span>{attendees.consultantIds.length} Consultant(s)</span>
                      </span>
                    )}
                  </div>

                  {/* Agenda */}
                  {m.agenda && (
                    <div className="space-y-1">
                      <span className="font-semibold text-slate-500 text-[11px] uppercase tracking-wider block">
                        Agenda & Discussion Topics:
                      </span>
                      <div className="p-3 bg-[#F8F9FD] rounded-2xl border border-[#E2E6F0] text-slate-800 whitespace-pre-wrap leading-relaxed">
                        {m.agenda}
                      </div>
                    </div>
                  )}

                  {/* MoM Notes & Key Decisions */}
                  {(m.notes || m.decisions) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      {m.notes && (
                        <div className="space-y-1">
                          <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                            <span>Minutes of Meeting (MoM)</span>
                          </span>
                          <div className="p-3 bg-blue-50/40 rounded-2xl border border-blue-100 text-slate-800 whitespace-pre-wrap">
                            {m.notes}
                          </div>
                        </div>
                      )}

                      {m.decisions && (
                        <div className="space-y-1">
                          <span className="font-bold text-emerald-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Key Decisions Agreed</span>
                          </span>
                          <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-200 text-emerald-900 whitespace-pre-wrap font-medium">
                            {m.decisions}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Items Counter Bar */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                      <CheckSquare className="w-3.5 h-3.5 text-[#3562E8]" />
                      <span>{m.actionItems?.length || 0} Action Items & Deliverables</span>
                    </span>
                    <span className="text-[#3562E8] font-semibold hover:underline">
                      Click to inspect full details →
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 6. INTERACTIVE RIGHT SIDEBAR / SLIDE-OVER INSPECTION DRAWER */}
      {(selectedMeeting || selectedDateForDrawer) && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-[#0B122B]/40 backdrop-blur-xs flex justify-end">
          <div
            ref={drawerRef}
            className="w-full max-w-xl bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300"
          >
            {/* DRAWER SCENARIO A: SINGLE MEETING INSPECTION & MoM */}
            {selectedMeeting ? (
              <>
                {/* Drawer Header */}
                <div className="p-5 border-b border-slate-200/80 bg-slate-50/50 flex items-start justify-between gap-3 shrink-0">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#CEDEFF] text-[#2C308D]">
                        {selectedMeeting.meetingType}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          selectedMeeting.status === "COMPLETED"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : selectedMeeting.status === "IN_PROGRESS"
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : "bg-blue-50 text-blue-800 border-blue-200"
                        }`}
                      >
                        {selectedMeeting.status}
                      </span>
                    </div>

                    <h2 className="text-lg font-bold text-slate-900 leading-snug">
                      {selectedMeeting.title}
                    </h2>

                    {selectedMeeting.project && (
                      <p className="text-xs text-slate-600 font-mono">
                        Project: <strong>{selectedMeeting.project.code}</strong> — {selectedMeeting.project.name}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedMeeting(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl cursor-pointer shrink-0"
                    aria-label="Close Drawer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Drawer Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
                  {/* Meeting Time & Creator Strip */}
                  <div className="p-3 bg-[#F8F9FD] rounded-2xl border border-slate-200 flex items-center justify-between text-slate-700">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-[#3562E8]" />
                      <span className="font-semibold">
                        {new Date(selectedMeeting.meetingDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-slate-600">
                      <Clock className="w-4 h-4 text-[#3562E8]" />
                      <span>{selectedMeeting.startTime} — {selectedMeeting.endTime}</span>
                    </div>
                  </div>

                  {/* Stakeholders Breakdown */}
                  <div className="space-y-2">
                    <span className="font-bold text-slate-800 text-xs block">
                      Stakeholders & Attendees
                    </span>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      {/* Studio Staff */}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-medium">Studio Staff:</span>
                        {selectedMeeting.attendeesJson?.allEmployees ? (
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold text-[11px]">
                            All Studio Employees ({employees.length})
                          </span>
                        ) : selectedMeeting.attendeesJson?.employeeIds && selectedMeeting.attendeesJson.employeeIds.length > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold text-[11px]">
                            {selectedMeeting.attendeesJson.employeeIds.length} Selected
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">None selected</span>
                        )}
                      </div>

                      {/* Contractors */}
                      {selectedMeeting.attendeesJson?.contractorIds && selectedMeeting.attendeesJson.contractorIds.length > 0 && (
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                          <span className="text-slate-600 font-medium">Contractors:</span>
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold text-[11px]">
                            {selectedMeeting.attendeesJson.contractorIds.length} Contractor(s)
                          </span>
                        </div>
                      )}

                      {/* Clients */}
                      {selectedMeeting.attendeesJson?.clientIds && selectedMeeting.attendeesJson.clientIds.length > 0 && (
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                          <span className="text-slate-600 font-medium">Clients:</span>
                          <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-semibold text-[11px]">
                            {selectedMeeting.attendeesJson.clientIds.length} Client(s)
                          </span>
                        </div>
                      )}

                      {/* Consultants */}
                      {selectedMeeting.attendeesJson?.consultantIds && selectedMeeting.attendeesJson.consultantIds.length > 0 && (
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                          <span className="text-slate-600 font-medium">Consultants:</span>
                          <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-semibold text-[11px]">
                            {selectedMeeting.attendeesJson.consultantIds.length} Consultant(s)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Agenda */}
                  {selectedMeeting.agenda && (
                    <div className="space-y-1.5">
                      <span className="font-bold text-slate-800 text-xs block">
                        Agenda & Discussion Topics
                      </span>
                      <div className="p-3 bg-[#F8F9FD] rounded-2xl border border-slate-200 text-slate-800 whitespace-pre-wrap leading-relaxed">
                        {selectedMeeting.agenda}
                      </div>
                    </div>
                  )}

                  {/* Minutes of Meeting (MoM) & Decisions Box */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        <span>Minutes of Meeting (MoM) & Decisions</span>
                      </span>

                      {!isEditingMoM && (
                        <button
                          type="button"
                          onClick={() => setIsEditingMoM(true)}
                          className="text-[11px] font-semibold text-[#3562E8] hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Quick Edit MoM</span>
                        </button>
                      )}
                    </div>

                    {isEditingMoM ? (
                      <div className="p-3 bg-blue-50/50 rounded-2xl border border-blue-200 space-y-2">
                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">MoM Discussion Notes</label>
                          <textarea
                            rows={3}
                            value={draftNotes}
                            onChange={(e) => setDraftNotes(e.target.value)}
                            placeholder="Record key remarks, structural changes, client comments..."
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-900"
                          />
                        </div>

                        <div>
                          <label className="font-semibold text-emerald-800 block mb-1">Key Decisions Agreed</label>
                          <textarea
                            rows={2}
                            value={draftDecisions}
                            onChange={(e) => setDraftDecisions(e.target.value)}
                            placeholder="Agreed approvals, milestone deadlines..."
                            className="w-full px-2.5 py-1.5 bg-white border border-emerald-200 rounded-xl text-slate-900"
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setIsEditingMoM(false)}
                            className="px-3 py-1 rounded-lg text-slate-600 hover:bg-slate-200 cursor-pointer text-xs"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveMoMQuick(selectedMeeting.id)}
                            className="px-3 py-1 bg-[#3562E8] hover:bg-[#264FCB] text-white rounded-lg font-semibold cursor-pointer text-xs"
                          >
                            Save MoM
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedMeeting.notes ? (
                          <div className="p-3 bg-blue-50/30 rounded-2xl border border-blue-100 text-slate-800 whitespace-pre-wrap">
                            {selectedMeeting.notes}
                          </div>
                        ) : (
                          <p className="text-slate-400 italic">No notes recorded yet. Click 'Quick Edit MoM' to log discussion points.</p>
                        )}

                        {selectedMeeting.decisions && (
                          <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-200 text-emerald-900 font-medium whitespace-pre-wrap">
                            <span className="font-bold block text-[11px] uppercase tracking-wider text-emerald-800 mb-1">
                              Decisions Agreed:
                            </span>
                            {selectedMeeting.decisions}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Items List */}
                  <div className="space-y-2.5 pt-2 border-t border-slate-100">
                    <span className="font-bold text-slate-800 text-xs flex items-center justify-between">
                      <span>Action Items & Deliverables ({selectedMeeting.actionItems?.length || 0})</span>
                    </span>

                    {/* Inline Quick Add */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                      <input
                        type="text"
                        value={drawerActionText}
                        onChange={(e) => setDrawerActionText(e.target.value)}
                        placeholder="Add new action item from meeting..."
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs"
                      />
                      <div className="flex items-center gap-2">
                        <select
                          value={drawerActionAssignee}
                          onChange={(e) => setDrawerActionAssignee(e.target.value)}
                          className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 flex-1"
                        >
                          <option value="">Assignee (Optional)</option>
                          {employees.map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.user.fullName}
                            </option>
                          ))}
                        </select>

                        <input
                          type="date"
                          value={drawerActionDueDate}
                          onChange={(e) => setDrawerActionDueDate(e.target.value)}
                          className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700"
                        />

                        <button
                          type="button"
                          onClick={() => handleAddDrawerActionItem(selectedMeeting.id)}
                          className="px-3 py-1.5 bg-[#3562E8] hover:bg-[#264FCB] text-white rounded-xl text-xs font-semibold cursor-pointer"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    {/* Items List */}
                    <div className="space-y-1.5">
                      {selectedMeeting.actionItems?.map((item) => (
                        <div
                          key={item.id}
                          className="p-2.5 bg-[#F8F9FD] rounded-xl border border-slate-200 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate">{item.description}</p>
                            <p className="text-[10px] text-slate-500">
                              {item.assignee ? `Assignee: ${item.assignee.user?.fullName}` : "Unassigned"}
                              {item.dueDate ? ` • Due: ${new Date(item.dueDate).toLocaleDateString()}` : ""}
                            </p>
                          </div>

                          {item.status === "CONVERTED_TO_TASK" ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                              Task Converted
                            </span>
                          ) : (
                            <button
                              disabled={convertingId === item.id}
                              onClick={() => handleConvertActionItem(selectedMeeting.id, item.id)}
                              className="px-2 py-1 bg-[#3562E8] hover:bg-[#264FCB] text-white rounded-lg font-semibold text-[10px] shrink-0 cursor-pointer"
                            >
                              {convertingId === item.id ? "Converting..." : "Convert"}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Drawer Footer Actions */}
                <div className="p-4 border-t border-slate-200/80 bg-slate-50 flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-1.5">
                    {/* Calendar .ics Download */}
                    <button
                      type="button"
                      onClick={() => downloadIcs(selectedMeeting)}
                      className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 cursor-pointer"
                      title="Download .ics Calendar Invite"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    {/* Copy WhatsApp / Email Invitation */}
                    <button
                      type="button"
                      onClick={() => copyMeetingInvitation(selectedMeeting)}
                      className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 cursor-pointer"
                      title="Copy WhatsApp/Email Invitation"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>

                    {/* Copy MoM */}
                    <button
                      type="button"
                      onClick={() => copyMoMSummary(selectedMeeting)}
                      className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 cursor-pointer"
                      title="Copy MoM Summary"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    {/* Delete meeting */}
                    <button
                      type="button"
                      onClick={() => handleDeleteMeeting(selectedMeeting.id)}
                      className="p-2 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 cursor-pointer"
                      title="Cancel / Delete Meeting"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(selectedMeeting)}
                      className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 font-semibold text-slate-800 cursor-pointer"
                    >
                      Full Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(selectedMeeting.id, selectedMeeting.status === "COMPLETED" ? "SCHEDULED" : "COMPLETED")}
                      className={`px-4 py-2 rounded-xl font-semibold text-white cursor-pointer ${
                        selectedMeeting.status === "COMPLETED" ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"
                      }`}
                    >
                      {selectedMeeting.status === "COMPLETED" ? "Reopen Session" : "Mark as Completed"}
                    </button>
                  </div>
                </div>
              </>
            ) : selectedDateForDrawer ? (
              /* DRAWER SCENARIO B: DAY INSPECTION & SCHEDULE PROMPT */
              <>
                <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Day Schedule Inspection
                    </span>
                    <h2 className="text-base font-bold text-slate-900">
                      {new Date(selectedDateForDrawer).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedDateForDrawer(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">
                      {meetingsOnSelectedDate.length} Session(s) Scheduled
                    </span>

                    <button
                      type="button"
                      onClick={() => openCreateModal(selectedDateForDrawer)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3562E8] hover:bg-[#264FCB] text-white rounded-xl font-semibold cursor-pointer shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Schedule on this Date</span>
                    </button>
                  </div>

                  {meetingsOnSelectedDate.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-semibold text-slate-700">No meetings scheduled for this day</p>
                      <p className="text-slate-400">Click the button above to book a design review or client presentation.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {meetingsOnSelectedDate.map((m) => (
                        <div
                          key={m.id}
                          onClick={() => inspectMeeting(m)}
                          className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:border-[#3562E8] hover:shadow-xs cursor-pointer transition-all space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-sm">{m.title}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#CEDEFF] text-[#2C308D]">
                              {m.meetingType}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-slate-500 font-mono text-[11px]">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-[#3562E8]" />
                              <span>{m.startTime} — {m.endTime}</span>
                            </span>
                            {m.project && <span>• {m.project.code}</span>}
                          </div>

                          {m.agenda && <p className="text-slate-600 line-clamp-2">{m.agenda}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end shrink-0">
                  <button
                    type="button"
                    onClick={() => openCreateModal(selectedDateForDrawer)}
                    className="w-full py-2.5 bg-[#3562E8] hover:bg-[#264FCB] text-white font-semibold rounded-xl text-center cursor-pointer shadow-sm"
                  >
                    + Schedule New Session
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* 7. SCHEDULE / EDIT STUDIO MEETING MODAL */}
      {isScheduleOpen && (
        <div className="fixed inset-0 z-50 bg-[#0B122B]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <form
            onSubmit={handleScheduleSubmit}
            role="dialog"
            aria-modal="true"
            aria-labelledby="schedule-modal-title"
            className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 border border-[#E2E6F0] shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3.5">
              <div>
                <h3 id="schedule-modal-title" className="text-base font-bold text-slate-900">
                  {editingMeetingId ? "Edit Studio Meeting & MoM" : "Schedule Studio Meeting"}
                </h3>
                <p className="text-xs text-slate-500">
                  {editingMeetingId
                    ? "Update agenda, record Minutes of Meeting (MoM), decisions, and attendee list"
                    : "Plan design reviews, site coordination, and select team & stakeholder participants"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsScheduleOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Meeting Title & Project */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-900 block mb-1">Meeting Title *</label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Architectural Phase 2 Review"
                    className="w-full px-3 py-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#3562E8]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-900 block mb-1">Associated Project</label>
                  <select
                    value={form.projectId}
                    onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-slate-900 cursor-pointer"
                  >
                    <option value="">General Studio Meeting (No Project)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} — {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date, Times & Meeting Type */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="font-semibold text-slate-900 block mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={form.meetingDate}
                    onChange={(e) => setForm({ ...form, meetingDate: e.target.value })}
                    className="w-full px-2.5 py-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-900 block mb-1">Start Time</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="w-full px-2.5 py-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-900 block mb-1">End Time</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="w-full px-2.5 py-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-900 block mb-1">Type</label>
                  <select
                    value={form.meetingType}
                    onChange={(e) => setForm({ ...form, meetingType: e.target.value })}
                    className="w-full px-2.5 py-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-slate-900 cursor-pointer"
                  >
                    <option value="Design Review">Design Review</option>
                    <option value="Client Presentation">Client Presentation</option>
                    <option value="Site Coordination">Site Coordination</option>
                    <option value="Partner Strategy">Partner Strategy</option>
                    <option value="Budget & Financials">Budget & Financials</option>
                  </select>
                </div>
              </div>

              {/* STAKEHOLDER ATTENDEE MATRIX */}
              <div className="border border-[#E2E6F0] rounded-2xl p-3.5 bg-slate-50/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 text-xs block">
                      Meeting Stakeholders & Attendees (Optional)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Total Invited: <strong>{totalSelectedCount} attendee(s)</strong>
                    </span>
                  </div>

                  {/* Category Tabs */}
                  <div className="inline-flex p-0.5 bg-white border border-slate-200 rounded-xl text-[11px]">
                    <button
                      type="button"
                      onClick={() => setAttendeeTab("employees")}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                        attendeeTab === "employees" ? "bg-[#3562E8] text-white" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Employees ({form.allEmployees ? "All" : form.selectedEmployeeIds.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAttendeeTab("contractors")}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                        attendeeTab === "contractors" ? "bg-[#3562E8] text-white" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Contractors ({form.selectedContractorIds.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAttendeeTab("clients")}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                        attendeeTab === "clients" ? "bg-[#3562E8] text-white" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Clients ({form.selectedClientIds.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAttendeeTab("consultants")}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                        attendeeTab === "consultants" ? "bg-[#3562E8] text-white" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Consultants ({form.selectedConsultantIds.length})
                    </button>
                  </div>
                </div>

                {/* 1. EMPLOYEE SELECTION TAB */}
                {attendeeTab === "employees" && (
                  <div className="space-y-2.5 bg-white p-3 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.allEmployees}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              allEmployees: e.target.checked,
                              selectedEmployeeIds: e.target.checked ? [] : form.selectedEmployeeIds,
                            })
                          }
                          className="w-4 h-4 text-[#3562E8] rounded cursor-pointer"
                        />
                        <span className="font-semibold text-slate-800 text-xs">
                          Invite All Studio Employees (Default: Checked)
                        </span>
                      </label>

                      <span className="text-[11px] text-slate-400 font-mono">
                        {employees.length} active staff members
                      </span>
                    </div>

                    {!form.allEmployees && (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={attendeeSearch}
                          onChange={(e) => setAttendeeSearch(e.target.value)}
                          placeholder="Search employee by name, department, or designation..."
                          className="w-full px-2.5 py-1.5 bg-[#F8F9FD] border border-slate-200 rounded-lg text-xs"
                        />
                        <div className="max-h-36 overflow-y-auto space-y-1">
                          {employees
                            .filter(
                              (emp) =>
                                !attendeeSearch ||
                                emp.user.fullName.toLowerCase().includes(attendeeSearch.toLowerCase()) ||
                                (emp.employee?.designation || "").toLowerCase().includes(attendeeSearch.toLowerCase()) ||
                                (emp.employee?.department || "").toLowerCase().includes(attendeeSearch.toLowerCase())
                            )
                            .map((emp) => {
                              const isChecked = form.selectedEmployeeIds.includes(emp.id);
                              return (
                                <label
                                  key={emp.id}
                                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                                    isChecked ? "bg-blue-50 text-blue-900 font-semibold" : "hover:bg-slate-50 text-slate-700"
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() =>
                                        setForm({
                                          ...form,
                                          selectedEmployeeIds: toggleSelection(form.selectedEmployeeIds, emp.id),
                                        })
                                      }
                                      className="w-3.5 h-3.5 text-[#3562E8] rounded cursor-pointer"
                                    />
                                    <span>{emp.user.fullName}</span>
                                  </div>
                                  <span className="text-[10px] text-slate-400">
                                    {emp.employee?.designation || emp.employee?.department || "Studio"}
                                  </span>
                                </label>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. CONTRACTOR SELECTION TAB */}
                {attendeeTab === "contractors" && (
                  <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>Select Contractors to invite to site/coordination meeting:</span>
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            selectedContractorIds:
                              form.selectedContractorIds.length === contractors.length
                                ? []
                                : contractors.map((c) => c.id),
                          })
                        }
                        className="text-[11px] text-[#3562E8] hover:underline cursor-pointer"
                      >
                        {form.selectedContractorIds.length === contractors.length ? "Deselect All" : "Select All"}
                      </button>
                    </div>

                    <div className="max-h-36 overflow-y-auto space-y-1">
                      {contractors.length === 0 ? (
                        <p className="text-slate-400 italic text-center py-3">No active contractors registered in Directory.</p>
                      ) : (
                        contractors.map((c) => {
                          const isChecked = form.selectedContractorIds.includes(c.id);
                          return (
                            <label
                              key={c.id}
                              className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                                isChecked ? "bg-amber-50 text-amber-900 font-semibold" : "hover:bg-slate-50 text-slate-700"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() =>
                                    setForm({
                                      ...form,
                                      selectedContractorIds: toggleSelection(form.selectedContractorIds, c.id),
                                    })
                                  }
                                  className="w-3.5 h-3.5 text-amber-600 rounded cursor-pointer"
                                />
                                <span>{c.name} {c.firmName ? `(${c.firmName})` : ""}</span>
                              </div>
                              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 font-bold text-slate-600">
                                {c.trade}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* 3. CLIENT SELECTION TAB */}
                {attendeeTab === "clients" && (
                  <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>Select Clients for design presentations & approvals:</span>
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            selectedClientIds:
                              form.selectedClientIds.length === clients.length ? [] : clients.map((c) => c.id),
                          })
                        }
                        className="text-[11px] text-[#3562E8] hover:underline cursor-pointer"
                      >
                        {form.selectedClientIds.length === clients.length ? "Deselect All" : "Select All"}
                      </button>
                    </div>

                    <div className="max-h-36 overflow-y-auto space-y-1">
                      {clients.length === 0 ? (
                        <p className="text-slate-400 italic text-center py-3">No active clients found in Directory.</p>
                      ) : (
                        clients.map((cl) => {
                          const isChecked = form.selectedClientIds.includes(cl.id);
                          return (
                            <label
                              key={cl.id}
                              className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                                isChecked ? "bg-purple-50 text-purple-900 font-semibold" : "hover:bg-slate-50 text-slate-700"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() =>
                                    setForm({
                                      ...form,
                                      selectedClientIds: toggleSelection(form.selectedClientIds, cl.id),
                                    })
                                  }
                                  className="w-3.5 h-3.5 text-purple-600 rounded cursor-pointer"
                                />
                                <span>{cl.name} {cl.company ? `(${cl.company})` : ""}</span>
                              </div>
                              <span className="text-[10px] text-slate-400">{cl.email || cl.contact || "Client"}</span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* 4. CONSULTANT SELECTION TAB */}
                {attendeeTab === "consultants" && (
                  <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>Select Specialized Engineering Consultants:</span>
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            selectedConsultantIds:
                              form.selectedConsultantIds.length === consultants.length
                                ? []
                                : consultants.map((c) => c.id),
                          })
                        }
                        className="text-[11px] text-[#3562E8] hover:underline cursor-pointer"
                      >
                        {form.selectedConsultantIds.length === consultants.length ? "Deselect All" : "Select All"}
                      </button>
                    </div>

                    <div className="max-h-36 overflow-y-auto space-y-1">
                      {consultants.length === 0 ? (
                        <p className="text-slate-400 italic text-center py-3">No consultants registered in Directory.</p>
                      ) : (
                        consultants.map((con) => {
                          const isChecked = form.selectedConsultantIds.includes(con.id);
                          return (
                            <label
                              key={con.id}
                              className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                                isChecked ? "bg-teal-50 text-teal-900 font-semibold" : "hover:bg-slate-50 text-slate-700"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() =>
                                    setForm({
                                      ...form,
                                      selectedConsultantIds: toggleSelection(form.selectedConsultantIds, con.id),
                                    })
                                  }
                                  className="w-3.5 h-3.5 text-teal-600 rounded cursor-pointer"
                                />
                                <span>{con.name} {con.firmName ? `(${con.firmName})` : ""}</span>
                              </div>
                              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 font-bold text-slate-600">
                                {con.discipline}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Agenda */}
              <div>
                <label className="font-semibold text-slate-900 block mb-1">Agenda & Topics</label>
                <textarea
                  rows={2}
                  value={form.agenda}
                  onChange={(e) => setForm({ ...form, agenda: e.target.value })}
                  placeholder="Key agenda topics to cover..."
                  className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#3562E8]"
                />
              </div>

              {/* MoM Notes & Key Decisions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="font-semibold text-slate-900 block mb-1">Minutes of Meeting (MoM)</label>
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Discussion points, comments, and observations..."
                    className="w-full px-3 py-2 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-slate-900 focus:outline-none focus:border-[#3562E8]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-emerald-800 block mb-1">Key Decisions Agreed</label>
                  <textarea
                    rows={3}
                    value={form.decisions}
                    onChange={(e) => setForm({ ...form, decisions: e.target.value })}
                    placeholder="Agreed approvals, structural modifications, or client sign-offs..."
                    className="w-full px-3 py-2 bg-emerald-50/40 border border-emerald-200 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#E2E6F0]">
              <button
                type="button"
                onClick={() => setIsScheduleOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2 text-xs font-semibold text-white bg-[#3562E8] hover:bg-[#264FCB] rounded-xl disabled:opacity-50 cursor-pointer shadow-sm press-feedback"
              >
                {actionLoading ? "Saving..." : editingMeetingId ? "Update Meeting & MoM" : "Schedule Meeting"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default function StudioMeetingsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs text-[#696E82] bg-white rounded-3xl border border-[#E2E6F0]">
          Loading studio meetings...
        </div>
      }
    >
      <StudioMeetingsContent />
    </Suspense>
  );
}
