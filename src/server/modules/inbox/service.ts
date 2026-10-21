import { prisma } from "../../db/prisma";
import { TenantContext, assertAdminOrOwner, isAdminOrOwner } from "../../tenancy/context";
import {
  reviewTaskSubmission,
  decideDeadlineExtension,
} from "../tasks/workflow";
import { decideProjectScopeChange } from "../projects/lifecycle";
import { decideProfileRecordChangeRequest } from "../profile/service";
import { reviewRevision } from "../drawings/repository";
import { reviewSiteVisit } from "../visits/service";
import { approveLeaveRequest, rejectLeaveRequest } from "../leave/service";
import { reviewLeaveCancellation } from "../leave/cancellation";
import { formatDateOnly } from "../leave/policy";
import {
  TaskWorkflowStatus,
  ChangeRequestStatus,
  ProfileChangeRequestStatus,
  DocumentApprovalState,
  SiteVisitReviewDecision,
  SiteVisitOperationalState,
} from "@prisma/client";
import { broadcastStudioEvent } from "../../realtime/eventBus";
import { clearDashboardCache } from "../dashboard/service";

export type InboxItemType =
  | "DELIVERABLE_SUBMISSION"
  | "DEADLINE_EXTENSION"
  | "SCOPE_CHANGE"
  | "PROFILE_CHANGE"
  | "DRAWING_REVISION"
  | "SITE_VISIT"
  | "TASK_BLOCKER"
  | "LEAVE_APPLICATION"
  | "LEAVE_CANCELLATION";

export type InboxUrgency = "CRITICAL" | "URGENT" | "NORMAL";

export interface DecisionInboxItem {
  id: string;
  rawId: string;
  type: InboxItemType;
  typeLabel: string;
  title: string;
  subtitle: string;
  projectId?: string;
  projectCode?: string;
  projectName?: string;
  requesterId: string;
  requesterName: string;
  requesterRole?: string;
  requesterAvatarUrl?: string;
  submittedAt: string;
  ageHours: number;
  ageDays: number;
  urgency: InboxUrgency;
  canApprove: boolean;
  cannotApproveReason?: string;
  status: string;
  summary: string;
  details: Record<string, any>;
}

export interface DecisionInboxOverview {
  items: DecisionInboxItem[];
  counts: {
    total: number;
    myDecisions: number;
    allAuthorized: number;
    blockers: number;
    deliverableSubmissions: number;
    deadlineExtensions: number;
    scopeChanges: number;
    profileChanges: number;
    drawingRevisions: number;
    siteVisits: number;
    leaveApplications: number;
    leaveCancellations: number;
  };
}

// In-memory Decision Inbox cache (skips 9 database queries per route navigation / sidebar count)
interface CachedInboxEntry {
  data: DecisionInboxOverview;
  cachedAt: number;
}
const inboxOverviewCache = new Map<string, CachedInboxEntry>();
const INBOX_CACHE_TTL_MS = 15 * 1000; // 15 seconds

export function clearInboxCache(tenantId?: string) {
  if (tenantId) {
    for (const key of inboxOverviewCache.keys()) {
      if (key.startsWith(tenantId + ":")) {
        inboxOverviewCache.delete(key);
      }
    }
  } else {
    inboxOverviewCache.clear();
  }
}

/**
 * Aggregates all pending decision items across the studio workspace.
 * Strictly guarded by Studio Leadership (Owner / Admin) authorization.
 */
export async function getOwnerDecisionInbox(
  ctx: TenantContext,
  params?: {
    tab?: "my-decisions" | "all-authorized" | "blockers";
    type?: string;
    urgency?: string;
    searchQuery?: string;
  }
): Promise<DecisionInboxOverview> {
  assertAdminOrOwner(ctx, "Only Studio Owners or Administrators can access the Decision Inbox.");

  const tab = params?.tab || "all-authorized";
  const typeFilter = params?.type || "ALL";
  const urgencyFilter = params?.urgency || "ALL";
  const searchQuery = params?.searchQuery?.trim() || "";

  const cacheKey = `${ctx.tenantId}:${ctx.membershipId}:${tab}:${typeFilter}:${urgencyFilter}:${searchQuery}`;
  const nowMs = Date.now();
  const cached = inboxOverviewCache.get(cacheKey);
  if (cached && nowMs - cached.cachedAt < INBOX_CACHE_TTL_MS) {
    return cached.data;
  }

  const now = new Date();

  // 1. Fetch Pending Deliverable Submissions
  const submissions = await prisma.taskSubmission.findMany({
    where: {
      tenantId: ctx.tenantId,
      status: "PENDING",
    },
    include: {
      task: {
        include: {
          project: { select: { id: true, code: true, name: true } },
        },
      },
      submitter: {
        include: {
          user: { select: { fullName: true, email: true } },
          employee: { select: { designation: true } },
        },
      },
      reviewer: {
        include: {
          user: { select: { fullName: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // 2. Fetch Pending Task Deadline Extensions
  const extensions = await prisma.taskExtensionRequest.findMany({
    where: {
      tenantId: ctx.tenantId,
      status: "PENDING",
    },
    include: {
      task: {
        include: {
          project: { select: { id: true, code: true, name: true } },
        },
      },
      checklistItem: { select: { id: true, title: true, dueDate: true } },
      requester: {
        include: {
          user: { select: { fullName: true, email: true } },
          employee: { select: { designation: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // 3. Fetch Pending Project Scope Change Requests
  const scopeChanges = await prisma.projectChangeRequest.findMany({
    where: {
      tenantId: ctx.tenantId,
      status: ChangeRequestStatus.PENDING,
    },
    include: {
      project: { select: { id: true, code: true, name: true } },
      requester: {
        include: {
          user: { select: { fullName: true, email: true } },
          employee: { select: { designation: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // 4. Fetch Pending Official Profile Change Requests
  const profileChanges = await prisma.profileChangeRequest.findMany({
    where: {
      tenantId: ctx.tenantId,
      status: ProfileChangeRequestStatus.PENDING,
    },
    include: {
      employee: {
        include: {
          membership: {
            include: {
              user: { select: { fullName: true, email: true } },
            },
          },
        },
      },
      requester: {
        include: {
          user: { select: { fullName: true, email: true } },
          employee: { select: { designation: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // 5. Fetch Submitted Drawing Revisions waiting for review
  const drawingRevisions = await prisma.documentVersion.findMany({
    where: {
      tenantId: ctx.tenantId,
      approvalState: DocumentApprovalState.IN_REVIEW,
    },
    include: {
      document: {
        include: {
          project: { select: { id: true, code: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const uploaderIds = Array.from(new Set(drawingRevisions.map((dr) => dr.uploaderId)));
  const uploaderMembers = uploaderIds.length > 0
    ? await prisma.tenantMembership.findMany({
        where: { id: { in: uploaderIds } },
        include: {
          user: { select: { fullName: true } },
          employee: { select: { designation: true } },
        },
      })
    : [];
  const uploaderMap = new Map(uploaderMembers.map((m) => [m.id, m]));

  // 6. Fetch Checked-Out Site Visits awaiting architectural review
  const siteVisits = await prisma.siteVisit.findMany({
    where: {
      tenantId: ctx.tenantId,
      operationalState: SiteVisitOperationalState.CHECKED_OUT,
      reviewDecision: SiteVisitReviewDecision.PENDING,
    },
    include: {
      project: { select: { id: true, code: true, name: true } },
      site: { select: { id: true, name: true, address: true } },
      employee: {
        include: {
          user: { select: { fullName: true, email: true } },
          employee: { select: { designation: true } },
        },
      },
    },
    orderBy: { submittedReportTime: "desc" },
  });

  // 7. Fetch Active Blocked Tasks
  const blockedTasks = await prisma.task.findMany({
    where: {
      tenantId: ctx.tenantId,
      OR: [
        { status: TaskWorkflowStatus.BLOCKED },
        { blockerReason: { not: null } },
      ],
      status: { notIn: [TaskWorkflowStatus.COMPLETED, TaskWorkflowStatus.CANCELLED] },
    },
    include: {
      project: { select: { id: true, code: true, name: true } },
      assignee: {
        include: {
          user: { select: { fullName: true, email: true } },
          employee: { select: { designation: true } },
        },
      },
      creator: {
        include: {
          user: { select: { fullName: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // 8. Fetch Pending Leave Applications
  const pendingLeaves = await prisma.studioLeaveRequest.findMany({
    where: {
      tenantId: ctx.tenantId,
      deletedAt: null,
      status: "PENDING",
    },
    include: {
      employee: {
        include: {
          membership: {
            include: {
              user: { select: { fullName: true, email: true } },
            },
          },
        },
      },
    },
    orderBy: { submittedAt: "desc" },
  });

  // 9. Fetch Pending Leave Cancellation Requests
  const pendingCancellations = await prisma.studioLeaveCancellationRequest.findMany({
    where: {
      tenantId: ctx.tenantId,
      status: "PENDING",
    },
    include: {
      employee: {
        include: {
          membership: {
            include: {
              user: { select: { fullName: true, email: true } },
            },
          },
        },
      },
      leaveRequest: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Transform each domain type into unified DecisionInboxItem
  const allItems: DecisionInboxItem[] = [];

  // 1. Deliverable Submissions
  for (const s of submissions) {
    const ageMs = now.getTime() - new Date(s.createdAt).getTime();
    const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
    const ageDays = Math.floor(ageHours / 24);
    const isSelf = s.submitterId === ctx.membershipId;
    const isDesignatedReviewer = s.reviewerId === ctx.membershipId;

    let urgency: InboxUrgency = "NORMAL";
    if (ageHours >= 48 || s.task.priority === "URGENT") urgency = "CRITICAL";
    else if (ageHours >= 24 || s.task.priority === "HIGH") urgency = "URGENT";

    allItems.push({
      id: `submission-${s.id}`,
      rawId: s.id,
      type: "DELIVERABLE_SUBMISSION",
      typeLabel: "Deliverable Submission",
      title: s.task.title,
      subtitle: `${s.task.project.code} — Version ${s.version}`,
      projectId: s.task.project.id,
      projectCode: s.task.project.code,
      projectName: s.task.project.name,
      requesterId: s.submitterId,
      requesterName: s.submitter.user.fullName,
      requesterRole: s.submitter.employee?.designation || "Architectural Drafter",
      requesterAvatarUrl: undefined,
      submittedAt: s.createdAt.toISOString(),
      ageHours,
      ageDays,
      urgency,
      canApprove: !isSelf,
      cannotApproveReason: isSelf
        ? "Four-eyes principle: Deliverable submitters cannot self-approve their own submissions."
        : undefined,
      status: s.status,
      summary: s.summary,
      details: {
        taskId: s.taskId,
        version: s.version,
        summary: s.summary,
        criteriaSnapshot: s.criteriaSnapshot,
        evidenceFiles: s.evidenceFiles,
        evidenceLinks: s.evidenceLinks,
        isDesignatedReviewer,
      },
    });
  }

  // 2. Deadline Extensions
  for (const ext of extensions) {
    const ageMs = now.getTime() - new Date(ext.createdAt).getTime();
    const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
    const ageDays = Math.floor(ageHours / 24);
    const isSelf = ext.requesterId === ctx.membershipId;

    let urgency: InboxUrgency = "NORMAL";
    if (ageHours >= 48) urgency = "CRITICAL";
    else if (ageHours >= 24) urgency = "URGENT";

    allItems.push({
      id: `extension-${ext.id}`,
      rawId: ext.id,
      type: "DEADLINE_EXTENSION",
      typeLabel: "Deadline Extension",
      title: `${ext.task.title} — ${ext.checklistItem.title}`,
      subtitle: `${ext.task.project.code} — Requested until ${new Date(ext.proposedDueDate).toLocaleDateString()}`,
      projectId: ext.task.project.id,
      projectCode: ext.task.project.code,
      projectName: ext.task.project.name,
      requesterId: ext.requesterId,
      requesterName: ext.requester.user.fullName,
      requesterRole: ext.requester.employee?.designation || "Project Member",
      requesterAvatarUrl: undefined,
      submittedAt: ext.createdAt.toISOString(),
      ageHours,
      ageDays,
      urgency,
      canApprove: !isSelf,
      cannotApproveReason: isSelf
        ? "Four-eyes principle: You cannot approve your own deadline extension request."
        : undefined,
      status: ext.status,
      summary: ext.reason,
      details: {
        taskId: ext.taskId,
        checklistItemId: ext.checklistItemId,
        currentDueDate: ext.currentDueDate ? ext.currentDueDate.toISOString() : null,
        proposedDueDate: ext.proposedDueDate.toISOString(),
        reason: ext.reason,
      },
    });
  }

  // 3. Project Scope Changes
  for (const sc of scopeChanges) {
    const ageMs = now.getTime() - new Date(sc.createdAt).getTime();
    const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
    const ageDays = Math.floor(ageHours / 24);
    const isSelf = sc.requesterId === ctx.membershipId;

    let urgency: InboxUrgency = "NORMAL";
    if (ageHours >= 48 || sc.scheduleImpactDays > 14) urgency = "CRITICAL";
    else if (ageHours >= 24 || sc.scheduleImpactDays > 0) urgency = "URGENT";

    allItems.push({
      id: `scope-${sc.id}`,
      rawId: sc.id,
      type: "SCOPE_CHANGE",
      typeLabel: "Scope Change Request",
      title: sc.title,
      subtitle: `${sc.project.code} — Impact: +${sc.scheduleImpactDays} days, ₹${sc.feeImpactAmount || 0}`,
      projectId: sc.project.id,
      projectCode: sc.project.code,
      projectName: sc.project.name,
      requesterId: sc.requesterId,
      requesterName: sc.requester.user.fullName,
      requesterRole: sc.requester.employee?.designation || "Project Architect",
      requesterAvatarUrl: undefined,
      submittedAt: sc.createdAt.toISOString(),
      ageHours,
      ageDays,
      urgency,
      canApprove: !isSelf,
      cannotApproveReason: isSelf
        ? "Four-eyes principle: Requester cannot approve their own Scope Change Request."
        : undefined,
      status: sc.status,
      summary: sc.reason,
      details: {
        projectId: sc.projectId,
        title: sc.title,
        reason: sc.reason,
        affectedScope: sc.affectedScope,
        scheduleImpactDays: sc.scheduleImpactDays,
        feeImpactAmount: sc.feeImpactAmount ? String(sc.feeImpactAmount) : "0.00",
      },
    });
  }

  // 4. Official Profile Changes
  for (const pc of profileChanges) {
    const ageMs = now.getTime() - new Date(pc.createdAt).getTime();
    const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
    const ageDays = Math.floor(ageHours / 24);
    const isSelf = pc.requesterId === ctx.membershipId;

    let urgency: InboxUrgency = "NORMAL";
    if (ageHours >= 72) urgency = "CRITICAL";
    else if (ageHours >= 36) urgency = "URGENT";

    allItems.push({
      id: `profile-${pc.id}`,
      rawId: pc.id,
      type: "PROFILE_CHANGE",
      typeLabel: "Record Change Request",
      title: `Official Profile Update: ${pc.employee.membership?.user?.fullName || "Colleague"}`,
      subtitle: `Field "${pc.fieldKey}" → "${pc.newValue}"`,
      requesterId: pc.requesterId,
      requesterName: pc.requester.user.fullName,
      requesterRole: pc.requester.employee?.designation || "Studio Colleague",
      requesterAvatarUrl: undefined,
      submittedAt: pc.createdAt.toISOString(),
      ageHours,
      ageDays,
      urgency,
      canApprove: !isSelf,
      cannotApproveReason: isSelf
        ? "Four-eyes principle: Requester cannot approve their own official employment record change request."
        : undefined,
      status: pc.status,
      summary: pc.reason || `Requested to update ${pc.fieldKey}`,
      details: {
        employeeId: pc.employeeId,
        fieldKey: pc.fieldKey,
        oldValue: pc.oldValue,
        newValue: pc.newValue,
        reason: pc.reason,
      },
    });
  }

  // 5. Drawing Revisions
  for (const dr of drawingRevisions) {
    const ageMs = now.getTime() - new Date(dr.createdAt).getTime();
    const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
    const ageDays = Math.floor(ageHours / 24);
    const isSelf = dr.uploaderId === ctx.membershipId;

    let urgency: InboxUrgency = "NORMAL";
    if (ageHours >= 48) urgency = "CRITICAL";
    else if (ageHours >= 24) urgency = "URGENT";

    const uploader = uploaderMap.get(dr.uploaderId);
    const requesterName = uploader?.user.fullName || "Architectural Drafter";
    const requesterRole = uploader?.employee?.designation || "Architectural Drafter";

    allItems.push({
      id: `drawing-${dr.id}`,
      rawId: dr.id,
      type: "DRAWING_REVISION",
      typeLabel: "Drawing Revision Review",
      title: `${dr.document.title} (${dr.revision})`,
      subtitle: `${dr.document.project.code} — ${dr.document.discipline || "Architectural"}`,
      projectId: dr.document.project.id,
      projectCode: dr.document.project.code,
      projectName: dr.document.project.name,
      requesterId: dr.uploaderId,
      requesterName,
      requesterRole,
      requesterAvatarUrl: undefined,
      submittedAt: dr.createdAt.toISOString(),
      ageHours,
      ageDays,
      urgency,
      canApprove: !isSelf,
      cannotApproveReason: isSelf
        ? "Four-eyes principle: Drafter cannot approve their own drawing revision."
        : undefined,
      status: dr.approvalState,
      summary: (dr as any).changesDescription || `Drawing revision ${dr.revision} submitted for ${dr.issuePurpose || "review"}.`,
      details: {
        documentId: dr.documentId,
        revision: dr.revision,
        fileId: dr.fileId,
        issuePurpose: dr.issuePurpose,
        drawingNumber: dr.document.drawingNumber,
      },
    });
  }

  // 6. Site Visit Reviews
  for (const sv of siteVisits) {
    const submittedTime = sv.submittedReportTime || sv.updatedAt;
    const ageMs = now.getTime() - new Date(submittedTime).getTime();
    const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
    const ageDays = Math.floor(ageHours / 24);
    const isSelf = sv.employeeId === ctx.membershipId;

    let urgency: InboxUrgency = "NORMAL";
    if (ageHours >= 48) urgency = "CRITICAL";
    else if (ageHours >= 24) urgency = "URGENT";

    allItems.push({
      id: `visit-${sv.id}`,
      rawId: sv.id,
      type: "SITE_VISIT",
      typeLabel: "Site Inspection Review",
      title: `Site Report: ${sv.site.name}`,
      subtitle: `${sv.project.code} — ${sv.purpose}`,
      projectId: sv.project.id,
      projectCode: sv.project.code,
      projectName: sv.project.name,
      requesterId: sv.employeeId,
      requesterName: sv.employee.user.fullName,
      requesterRole: sv.employee.employee?.designation || "Site Architect",
      requesterAvatarUrl: undefined,
      submittedAt: submittedTime.toISOString(),
      ageHours,
      ageDays,
      urgency,
      canApprove: !isSelf,
      cannotApproveReason: isSelf
        ? "Four-eyes principle: Inspector cannot review their own site inspection report."
        : undefined,
      status: sv.reviewDecision,
      summary: sv.findings || sv.nextActions || "Completed site inspection awaiting formal review.",
      details: {
        siteId: sv.siteId,
        siteName: sv.site.name,
        inspectionType: sv.inspectionType,
        findings: sv.findings,
        nextActions: sv.nextActions,
        weather: sv.weather,
        photosJson: sv.photosJson,
        snagsJson: sv.snagsJson,
      },
    });
  }

  // 7. Active Task Blockers
  for (const bt of blockedTasks) {
    const ageMs = now.getTime() - new Date(bt.updatedAt).getTime();
    const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
    const ageDays = Math.floor(ageHours / 24);

    allItems.push({
      id: `blocker-${bt.id}`,
      rawId: bt.id,
      type: "TASK_BLOCKER",
      typeLabel: "Critical Blocker",
      title: `Blocked: ${bt.title}`,
      subtitle: `${bt.project.code} — Assignee: ${bt.assignee?.user.fullName || "Unassigned"}`,
      projectId: bt.project.id,
      projectCode: bt.project.code,
      projectName: bt.project.name,
      requesterId: bt.assigneeId || bt.creatorId,
      requesterName: bt.assignee?.user.fullName || bt.creator.user.fullName,
      requesterRole: bt.assignee?.employee?.designation || "Deliverable Owner",
      requesterAvatarUrl: undefined,
      submittedAt: bt.updatedAt.toISOString(),
      ageHours,
      ageDays,
      urgency: "CRITICAL",
      canApprove: true,
      status: bt.status,
      summary: bt.blockerReason || "Work is currently blocked awaiting leadership unblocking.",
      details: {
        taskId: bt.id,
        blockerReason: bt.blockerReason,
        priority: bt.priority,
        dueDate: bt.dueDate ? bt.dueDate.toISOString() : null,
      },
    });
  }

  // 8. Pending Leave Applications
  for (const l of pendingLeaves) {
    const ageMs = now.getTime() - new Date(l.submittedAt).getTime();
    const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
    const ageDays = Math.floor(ageHours / 24);
    const isSelf = l.employee.membershipId === ctx.membershipId;

    let urgency: InboxUrgency = "NORMAL";
    if (l.isShortNotice || ageHours >= 48) urgency = "CRITICAL";
    else if (ageHours >= 24) urgency = "URGENT";

    allItems.push({
      id: `leave-${l.id}`,
      rawId: l.id,
      type: "LEAVE_APPLICATION",
      typeLabel: "Leave Application",
      title: `${l.leaveType} Leave (${Number(l.days)} Day${Number(l.days) === 1 ? "" : "s"})`,
      subtitle: `${formatDateOnly(l.startDate)} — ${formatDateOnly(l.endDate)} • ${l.employee.membership.user.fullName}`,
      requesterId: l.employee.membershipId,
      requesterName: l.employee.membership.user.fullName,
      requesterRole: l.employee.designation || "Studio Staff",
      submittedAt: l.submittedAt.toISOString(),
      ageHours,
      ageDays,
      urgency,
      canApprove: !isSelf,
      cannotApproveReason: isSelf
        ? "Four-eyes principle: You cannot approve your own leave application."
        : undefined,
      status: l.status,
      summary: l.reason || "Staff leave application submitted for leadership review.",
      details: {
        startDate: formatDateOnly(l.startDate),
        endDate: formatDateOnly(l.endDate),
        leaveType: l.leaveType,
        days: Number(l.days),
        isHalfDay: l.isHalfDay,
        isHourly: l.isHourly,
        totalMinutes: l.totalMinutes,
        sessionType: l.sessionType,
        isShortNotice: l.isShortNotice,
        isExemptShortNotice: l.isExemptShortNotice,
        exemptionReason: l.exemptionReason,
        version: l.version,
      },
    });
  }

  // 9. Pending Leave Cancellations
  for (const c of pendingCancellations) {
    const ageMs = now.getTime() - new Date(c.createdAt).getTime();
    const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
    const ageDays = Math.floor(ageHours / 24);
    const isSelf = c.employee.membershipId === ctx.membershipId;

    allItems.push({
      id: `cancellation-${c.id}`,
      rawId: c.id,
      type: "LEAVE_CANCELLATION",
      typeLabel: "Leave Cancellation",
      title: `Cancel Approved ${c.leaveRequest.leaveType} Leave (${Number(c.leaveRequest.days)} Days)`,
      subtitle: `${formatDateOnly(c.leaveRequest.startDate)} — ${formatDateOnly(c.leaveRequest.endDate)} • ${c.employee.membership.user.fullName}`,
      requesterId: c.employee.membershipId,
      requesterName: c.employee.membership.user.fullName,
      requesterRole: c.employee.designation || "Studio Staff",
      submittedAt: c.createdAt.toISOString(),
      ageHours,
      ageDays,
      urgency: ageHours >= 48 ? "URGENT" : "NORMAL",
      canApprove: !isSelf,
      cannotApproveReason: isSelf
        ? "Four-eyes principle: You cannot review your own leave cancellation."
        : undefined,
      status: c.status,
      summary: c.reason || "Request to cancel previously approved leave.",
      details: {
        leaveRequestId: c.leaveRequestId,
        cancellationReason: c.reason,
        startDate: formatDateOnly(c.leaveRequest.startDate),
        endDate: formatDateOnly(c.leaveRequest.endDate),
        days: Number(c.leaveRequest.days),
      },
    });
  }

  // Sort descending by urgency then age
  allItems.sort((a, b) => {
    const urgencyScore = { CRITICAL: 3, URGENT: 2, NORMAL: 1 };
    const scoreDiff = urgencyScore[b.urgency] - urgencyScore[a.urgency];
    if (scoreDiff !== 0) return scoreDiff;
    return b.ageHours - a.ageHours;
  });

  // Calculate master counts
  const myDecisionsCount = allItems.filter(
    (item) => item.type !== "TASK_BLOCKER" && item.canApprove
  ).length;
  const blockersCount = allItems.filter((item) => item.type === "TASK_BLOCKER").length;
  const allAuthorizedCount = allItems.filter((item) => item.type !== "TASK_BLOCKER").length;

  const counts = {
    total: allItems.length,
    myDecisions: myDecisionsCount,
    allAuthorized: allAuthorizedCount,
    blockers: blockersCount,
    deliverableSubmissions: allItems.filter((i) => i.type === "DELIVERABLE_SUBMISSION").length,
    deadlineExtensions: allItems.filter((i) => i.type === "DEADLINE_EXTENSION").length,
    scopeChanges: allItems.filter((i) => i.type === "SCOPE_CHANGE").length,
    profileChanges: allItems.filter((i) => i.type === "PROFILE_CHANGE").length,
    drawingRevisions: allItems.filter((i) => i.type === "DRAWING_REVISION").length,
    siteVisits: allItems.filter((i) => i.type === "SITE_VISIT").length,
    leaveApplications: allItems.filter((i) => i.type === "LEAVE_APPLICATION").length,
    leaveCancellations: allItems.filter((i) => i.type === "LEAVE_CANCELLATION").length,
  };

  // Filter items based on active tab and optional search query
  let filteredItems = allItems;
  if (tab === "my-decisions") {
    filteredItems = allItems.filter(
      (item) => item.type !== "TASK_BLOCKER" && item.canApprove
    );
  } else if (tab === "blockers") {
    filteredItems = allItems.filter((item) => item.type === "TASK_BLOCKER");
  } else {
    // "all-authorized" includes all decision requests (excluding pure blockers)
    filteredItems = allItems.filter((item) => item.type !== "TASK_BLOCKER");
  }

  if (params?.type && params.type !== "ALL") {
    filteredItems = filteredItems.filter((item) => item.type === params.type);
  }

  if (params?.urgency && params.urgency !== "ALL") {
    filteredItems = filteredItems.filter((item) => item.urgency === params.urgency);
  }

  if (params?.searchQuery?.trim()) {
    const q = params.searchQuery.toLowerCase().trim();
    filteredItems = filteredItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.requesterName.toLowerCase().includes(q) ||
        (item.projectCode && item.projectCode.toLowerCase().includes(q)) ||
        (item.projectName && item.projectName.toLowerCase().includes(q))
    );
  }

  const result: DecisionInboxOverview = {
    items: filteredItems,
    counts,
  };

  inboxOverviewCache.set(cacheKey, {
    data: result,
    cachedAt: nowMs,
  });

  return result;
}

/**
 * Execute an executive decision directly from the Owner Decision Inbox.
 */
export async function executeInboxDecision(
  ctx: TenantContext,
  params: {
    type: InboxItemType;
    id: string;
    action: "APPROVE" | "REJECT" | "REQUEST_CHANGES" | "RESOLVE_BLOCKER";
    feedback?: string;
  }
) {
  assertAdminOrOwner(ctx, "Only Studio Owners or Administrators can make decisions.");

  // Invalidate cached counts and items immediately
  clearInboxCache(ctx.tenantId);
  clearDashboardCache(ctx.tenantId);

  const { type, id, action, feedback } = params;

  let executionResult: any;

  switch (type) {
    case "DELIVERABLE_SUBMISSION": {
      const decision = action === "APPROVE" ? "APPROVE" : "REQUEST_CHANGES";
      executionResult = await reviewTaskSubmission(ctx, id, {
        decision,
        feedback: feedback?.trim() || (action === "APPROVE" ? "Approved by leadership." : "Changes requested."),
      });
      break;
    }

    case "DEADLINE_EXTENSION": {
      const decision = action === "APPROVE" ? "APPROVE" : "REJECT";
      executionResult = await decideDeadlineExtension(ctx, id, {
        decision,
        decisionReason: feedback?.trim() || (action === "APPROVE" ? "Extension granted." : "Extension denied."),
      });
      break;
    }

    case "SCOPE_CHANGE": {
      const decision = action === "APPROVE" ? "APPROVE" : "REJECT";
      executionResult = await decideProjectScopeChange(ctx, id, {
        decision,
        decisionNotes: feedback?.trim() || (action === "APPROVE" ? "Scope change approved." : "Scope change rejected."),
        autoApply: true,
      });
      break;
    }

    case "PROFILE_CHANGE": {
      const decision = action === "APPROVE" ? "APPROVE" : "REJECT";
      executionResult = await decideProfileRecordChangeRequest(ctx, id, {
        decision,
        decisionNote: feedback?.trim() || (action === "APPROVE" ? "Profile change verified." : "Profile change rejected."),
      });
      break;
    }

    case "DRAWING_REVISION": {
      const decision = action === "APPROVE" ? "APPROVED" : "CHANGES_REQUESTED";
      executionResult = await reviewRevision(ctx, id, decision, feedback?.trim() || (action === "APPROVE" ? "Drawing revision approved." : "Corrections needed."));
      break;
    }

    case "SITE_VISIT": {
      const decision =
        action === "APPROVE"
          ? SiteVisitReviewDecision.ACCEPTED
          : SiteVisitReviewDecision.NEEDS_CLARIFICATION;
      executionResult = await reviewSiteVisit(
        ctx,
        id,
        decision,
        feedback?.trim() || (action === "APPROVE" ? "Inspection verified." : "Additional information requested.")
      );
      break;
    }

    case "TASK_BLOCKER": {
      // Unblock the task and clear blockerReason
      const task = await prisma.task.findFirst({
        where: { id, tenantId: ctx.tenantId },
        include: { project: true },
      });
      if (!task) throw new Error("Task not found.");

      const updated = await prisma.$transaction(async (tx) => {
        const u = await tx.task.update({
          where: { id: task.id },
          data: {
            status: TaskWorkflowStatus.IN_PROGRESS,
            blockerReason: null,
          },
        });

        await tx.taskComment.create({
          data: {
            tenantId: ctx.tenantId,
            taskId: task.id,
            authorId: ctx.membershipId,
            content: `[BLOCKER RESOLVED] ${feedback?.trim() || "Leadership unblocked this task to resume progress."}`,
          },
        });

        await tx.auditEvent.create({
          data: {
            tenantId: ctx.tenantId,
            actorId: ctx.membershipId,
            projectId: task.projectId,
            action: "TASK_BLOCKER_RESOLVED",
            entityType: "Task",
            entityId: task.id,
            safeChangeSummary: `Resolved blocker on "${task.title}": ${feedback?.trim() || "Unblocked by leadership"}`,
          },
        }).catch(() => {});

        return u;
      });

      executionResult = { success: true, task: updated };
      break;
    }

    case "LEAVE_APPLICATION": {
      if (action === "APPROVE") {
        executionResult = await approveLeaveRequest(ctx, id, feedback?.trim());
      } else {
        executionResult = await rejectLeaveRequest(
          ctx,
          id,
          feedback?.trim() || "Rejected by studio leadership"
        );
      }
      break;
    }

    case "LEAVE_CANCELLATION": {
      const decision = action === "APPROVE" ? "APPROVE" : "REJECT";
      executionResult = await reviewLeaveCancellation(ctx, {
        cancellationRequestId: id,
        decision,
        rejectionReason:
          feedback?.trim() || (action === "REJECT" ? "Cancellation rejected by studio leadership" : undefined),
      });
      break;
    }

    default:
      throw new Error(`Unsupported decision inbox item type: ${type}`);
  }

  // Invalidate in-memory cache so next query reads fresh decisions
  clearInboxCache(ctx.tenantId);

  // Realtime Broadcast across active tabs and clients
  broadcastStudioEvent(ctx.tenantId, {
    type: "DECISION_UPDATED",
    actorId: ctx.membershipId,
    payload: { type, id, action },
  });

  return executionResult;
}
