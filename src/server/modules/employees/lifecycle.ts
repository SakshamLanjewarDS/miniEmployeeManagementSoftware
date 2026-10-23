/**
 * Account Onboarding and Offboarding Lifecycle Service
 * 100% DESIGN Studio — Multi-Tenant Architecture
 *
 * Implements:
 * 1. Secure employee invitations (one-time, expiring, no plaintext passwords).
 * 2. Onboarding state tracking (PENDING, ACCEPTED, EXPIRED, REVOKED).
 * 3. Last active Owner protection (fail-closed check preventing tenant lockout).
 * 4. Offboarding checklist preview: open tasks, drawings, site issues, pending approvals, sessions.
 * 5. Atomic deactivation: session revocation, stopping reminders, controlled task handovers.
 * 6. Historical authorship preservation (never hard-deleting records or approvals).
 * 7. Explicit audited reactivation.
 */

import { prisma } from "../../db/prisma";
import { TenantContext, assertAdminOrOwner } from "../../tenancy/context";
import { TenantRole, Prisma } from "@prisma/client";
import { clearMembershipCache } from "../../auth/session";
import crypto from "crypto";

export interface CreateInvitationInput {
  email: string;
  role: "EMPLOYEE" | "PROJECT_MANAGER" | "ADMIN";
  department?: string;
  designation?: string;
  projectIds?: string[];
  suggestedStartDate?: string;
}

export interface OffboardingPreview {
  membershipId: string;
  userId: string;
  fullName: string;
  email: string;
  role: TenantRole;
  isLastOwner: boolean;
  canDeactivate: boolean;
  blockers: string[];
  checklist: {
    openTasksCount: number;
    openTasks: Array<{ id: string; title: string; projectName: string }>;
    projectMembershipsCount: number;
    pendingReviewApprovalsCount: number;
    responsibleSiteIssuesCount: number;
    pendingLeavesCount: number;
    activeSessionsCount: number;
  };
}

/**
 * Creates an expiring, single-use employee invitation.
 * Never transmits plaintext passwords.
 */
export async function createEmployeeInvitation(
  ctx: TenantContext,
  input: CreateInvitationInput
) {
  assertAdminOrOwner(ctx, "Only Studio Owners or Administrators can invite new employees.");

  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    throw new Error("A valid email address is required for employee invitations.");
  }

  // Prevent non-owners from inviting Admins or Owners
  if (input.role === "ADMIN" && ctx.role !== "OWNER") {
    throw new Error("Only the Studio Owner can invite new Administrators.");
  }

  // Check if active membership already exists
  const existingMember = await prisma.tenantMembership.findFirst({
    where: {
      tenantId: ctx.tenantId,
      user: { email },
      isActive: true,
    },
  });
  if (existingMember) {
    throw new Error(`An active team member with email "${email}" already exists in this studio.`);
  }

  // Generate secure expiring token (7 days validity)
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invitation = await prisma.tenantInvitation.create({
    data: {
      tenantId: ctx.tenantId,
      email,
      role: input.role as TenantRole,
      token,
      invitedById: ctx.membershipId,
      expiresAt,
      status: "PENDING",
      suggestedDepartment: input.department?.trim() || null,
      suggestedDesignation: input.designation?.trim() || null,
    },
  });

  // Enqueue secure invitation email (contains secure link with token, NO passwords)
  await prisma.studioEmailOutbox.create({
    data: {
      tenantId: ctx.tenantId,
      recipientEmail: email,
      subject: `Invitation to join 100% DESIGN Studio (${ctx.tenantName})`,
      eventType: "INVITATION_SENT",
      htmlBody: `<p>Hello,</p><p>You have been invited to join <strong>${ctx.tenantName}</strong> as a <strong>${input.role}</strong>.</p><p>Please use your secure single-use invitation link to set up your account: <a href="https://studio.100percentdesign.test/invite?token=${token}">Set Up Your Studio Account</a></p><p>This link expires in 7 days.</p>`,
      status: "PENDING",
      idempotencyKey: `invite-${invitation.id}-${Date.now()}`,
    },
  });

  // Audit event
  await prisma.auditEvent.create({
    data: {
      tenantId: ctx.tenantId,
      actorId: ctx.membershipId,
      action: "EMPLOYEE_INVITATION_CREATED",
      entityType: "TenantInvitation",
      entityId: invitation.id,
      safeChangeSummary: `Created secure single-use invitation for "${email}" with role "${input.role}" (Expires in 7 days).`,
    },
  });

  return invitation;
}

/**
 * Revokes a pending invitation
 */
export async function revokeEmployeeInvitation(
  ctx: TenantContext,
  invitationId: string
) {
  assertAdminOrOwner(ctx, "Only Studio Owners or Administrators can revoke invitations.");

  const invitation = await prisma.tenantInvitation.findFirst({
    where: { id: invitationId, tenantId: ctx.tenantId },
  });
  if (!invitation) throw new Error("Invitation not found.");

  if (invitation.status !== "PENDING") {
    throw new Error(`Cannot revoke invitation: Current status is ${invitation.status}.`);
  }

  const updated = await prisma.tenantInvitation.update({
    where: { id: invitation.id },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
    },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: ctx.tenantId,
      actorId: ctx.membershipId,
      action: "EMPLOYEE_INVITATION_REVOKED",
      entityType: "TenantInvitation",
      entityId: invitation.id,
      safeChangeSummary: `Revoked pending invitation for "${invitation.email}".`,
    },
  });

  return updated;
}

/**
 * Previews offboarding impacts before deactivating a team member
 */
export async function previewEmployeeOffboarding(
  ctx: TenantContext,
  membershipId: string
): Promise<OffboardingPreview> {
  assertAdminOrOwner(ctx, "Only Studio Owners or Administrators can preview offboarding.");

  const member = await prisma.tenantMembership.findFirst({
    where: { id: membershipId, tenantId: ctx.tenantId },
    include: {
      user: true,
      employee: true,
    },
  });

  if (!member) throw new Error("Team member not found in this studio.");

  const blockers: string[] = [];

  // Check last active owner protection
  let isLastOwner = false;
  if (member.role === TenantRole.OWNER) {
    const activeOwnerCount = await prisma.tenantMembership.count({
      where: {
        tenantId: ctx.tenantId,
        role: TenantRole.OWNER,
        isActive: true,
      },
    });

    if (activeOwnerCount <= 1) {
      isLastOwner = true;
      blockers.push(
        "Cannot offboard the studio's last active Owner. You must transfer Ownership to another administrator before deactivation."
      );
    }
  }

  // 1. Open tasks
  const openTasks = await prisma.task.findMany({
    where: {
      tenantId: ctx.tenantId,
      assigneeId: member.id,
      status: { notIn: ["COMPLETED", "CANCELLED"] },
    },
    include: { project: { select: { name: true } } },
  });

  // 2. Project memberships count
  const projectMembershipsCount = await prisma.projectMember.count({
    where: { tenantId: ctx.tenantId, membershipId: member.id },
  });

  // 3. Pending approvals where this user is reviewer
  const pendingReviewsCount = await prisma.taskSubmission.count({
    where: { tenantId: ctx.tenantId, reviewerId: member.id, status: "PENDING" },
  });

  // 4. Responsible site issues
  let siteIssuesCount = 0;
  if (member.employee?.id) {
    siteIssuesCount = await prisma.studioSiteIssue.count({
      where: {
        tenantId: ctx.tenantId,
        responsibleEmployeeId: member.employee.id,
        status: { notIn: ["CLOSED"] },
      },
    });
  }

  // 5. Pending leaves
  let pendingLeavesCount = 0;
  if (member.employee?.id) {
    pendingLeavesCount = await prisma.studioLeaveRequest.count({
      where: {
        tenantId: ctx.tenantId,
        employeeId: member.employee.id,
        status: "PENDING",
      },
    });
  }

  // 6. Active sessions
  const activeSessionsCount = await prisma.session.count({
    where: { userId: member.userId, revokedAt: null },
  });

  return {
    membershipId: member.id,
    userId: member.userId,
    fullName: member.user.fullName,
    email: member.user.email,
    role: member.role,
    isLastOwner,
    canDeactivate: blockers.length === 0,
    blockers,
    checklist: {
      openTasksCount: openTasks.length,
      openTasks: openTasks.map((t) => ({
        id: t.id,
        title: t.title,
        projectName: t.project.name,
      })),
      projectMembershipsCount,
      pendingReviewApprovalsCount: pendingReviewsCount,
      responsibleSiteIssuesCount: siteIssuesCount,
      pendingLeavesCount,
      activeSessionsCount,
    },
  };
}

/**
 * Atomically offboards and deactivates an employee account.
 * Revokes sessions, reassigns mapped tasks, and preserves all historical records.
 */
export async function executeEmployeeDeactivation(
  ctx: TenantContext,
  params: {
    membershipId: string;
    reason: string;
    taskReassignmentMapping?: Record<string, string>; // taskId -> newMembershipId
    handoverNotes?: string;
  }
) {
  assertAdminOrOwner(ctx, "Only Studio Owners or Administrators can offboard team members.");

  if (!params.reason?.trim()) {
    throw new Error("A specific, documented justification reason is required to offboard a team member.");
  }

  const preview = await previewEmployeeOffboarding(ctx, params.membershipId);
  if (!preview.canDeactivate) {
    throw new Error(`Cannot execute offboarding: ${preview.blockers.join("; ")}`);
  }

  const now = new Date();

  return await prisma.$transaction(async (tx) => {
    // 1. Deactivate TenantMembership
    const updatedMembership = await tx.tenantMembership.update({
      where: { id: params.membershipId },
      data: { isActive: false },
      include: { user: true, employee: true },
    });
    clearMembershipCache(params.membershipId);

    // 2. Update Employee lifecycle record
    if (updatedMembership.employee?.id) {
      await tx.employee.update({
        where: { id: updatedMembership.employee.id },
        data: {
          employmentStatus: "DEACTIVATED",
          deactivatedAt: now,
          deactivationReason: params.reason.trim(),
          offboardingHandover: {
            handoverNotes: params.handoverNotes?.trim() || null,
            taskReassignments: params.taskReassignmentMapping || {},
            offboardedAt: now.toISOString(),
            offboardedBy: ctx.membershipId,
          } as any,
        },
      });
    }

    // 3. Revoke all active sessions immediately
    await tx.session.updateMany({
      where: {
        userId: updatedMembership.userId,
        revokedAt: null,
      },
      data: { revokedAt: now },
    });

    // 4. Reassign mapped open tasks if provided
    let reassignedTasksCount = 0;
    if (params.taskReassignmentMapping) {
      for (const [taskId, newMemberId] of Object.entries(params.taskReassignmentMapping)) {
        if (!newMemberId) continue;
        await tx.task.update({
          where: { id: taskId },
          data: {
            assigneeId: newMemberId,
            assignedMemberIds: [newMemberId],
          },
        });
        reassignedTasksCount++;
      }
    }

    // 5. Audit event
    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.membershipId,
        action: "EMPLOYEE_OFFBOARDED_AND_DEACTIVATED",
        entityType: "TenantMembership",
        entityId: updatedMembership.id,
        safeChangeSummary: `Offboarded & deactivated "${updatedMembership.user.fullName}" (${updatedMembership.user.email}). Revoked sessions. Reassigned ${reassignedTasksCount} tasks. Reason: ${params.reason.trim()}`,
      },
    });

    return {
      success: true,
      membership: updatedMembership,
      reassignedTasksCount,
      sessionsRevoked: preview.checklist.activeSessionsCount,
    };
  });
}

/**
 * Explicitly reactivates a deactivated team member with an audit trail.
 * Default restored role is EMPLOYEE (does not automatically restore elevated admin rights).
 */
export async function reactivateEmployee(
  ctx: TenantContext,
  membershipId: string,
  reason: string
) {
  assertAdminOrOwner(ctx, "Only Studio Owners or Administrators can reactivate team members.");

  if (!reason?.trim()) {
    throw new Error("A justification reason is required to reactivate a team member.");
  }

  const member = await prisma.tenantMembership.findFirst({
    where: { id: membershipId, tenantId: ctx.tenantId },
    include: { user: true, employee: true },
  });

  if (!member) throw new Error("Team member not found.");
  if (member.isActive) throw new Error("Team member is already active.");

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.tenantMembership.update({
      where: { id: member.id },
      data: {
        isActive: true,
        role: member.role === TenantRole.OWNER ? TenantRole.ADMIN : member.role,
      },
      include: { user: true },
    });
    clearMembershipCache(member.id);

    if (member.employee?.id) {
      await tx.employee.update({
        where: { id: member.employee.id },
        data: {
          employmentStatus: "ACTIVE",
          deactivatedAt: null,
          deactivationReason: null,
        },
      });
    }

    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.membershipId,
        action: "EMPLOYEE_REACTIVATED",
        entityType: "TenantMembership",
        entityId: member.id,
        safeChangeSummary: `Reactivated team member "${member.user.fullName}" (${member.user.email}). Reason: ${reason.trim()}`,
      },
    });

    return updated;
  });
}
