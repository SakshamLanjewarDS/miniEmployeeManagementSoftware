import { prisma } from "../../db/prisma";
import { TenantContext, assertAdminOrOwner, isAdminOrOwner } from "../../tenancy/context";
import { ProfileChangeRequestStatus } from "@prisma/client";

/**
 * ============================================================================
 * STEP 6: PROFILE EXPERIENCES SERVICE
 * Reusable identity foundation with permission-aware profile tiers:
 * 1. My Profile: self-service fields and personal settings.
 * 2. Directory Profile: professional colleague-facing profile.
 * 3. Management Record: official HR & employment record (Owner/Admin only).
 * ============================================================================
 */

export async function getProfileOverview(ctx: TenantContext, targetMembershipId?: string) {
  const membershipId = targetMembershipId || ctx.membershipId;
  const isSelf = membershipId === ctx.membershipId;
  const canManage = isAdminOrOwner(ctx);

  // Fetch tenant membership and related user & employee
  const membership = await prisma.tenantMembership.findFirst({
    where: { id: membershipId, tenantId: ctx.tenantId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          createdAt: true,
        },
      },
      employee: true,
      projectMembers: {
        include: {
          project: {
            select: {
              id: true,
              code: true,
              name: true,
              projectType: true,
              status: true,
              currentPhase: true,
            },
          },
        },
      },
    },
  });

  if (!membership) {
    throw new Error("Colleague profile not found in this studio workspace.");
  }

  // Fetch assigned deliverables for this member
  const assignedTasks = await prisma.task.findMany({
    where: {
      tenantId: ctx.tenantId,
      assigneeId: membership.id,
      status: { notIn: ["CANCELLED"] },
    },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      dueDate: true,
      project: { select: { id: true, code: true, name: true } },
    },
    take: 10,
    orderBy: { dueDate: "asc" },
  });

  // Fetch pending or recent profile change requests
  let changeRequests: any[] = [];
  if (canManage || isSelf) {
    changeRequests = await prisma.profileChangeRequest.findMany({
      where: {
        tenantId: ctx.tenantId,
        ...(canManage && !isSelf
          ? { requesterId: membership.id }
          : isSelf
          ? { requesterId: ctx.membershipId }
          : {}),
      },
      include: {
        requester: {
          include: {
            user: { select: { fullName: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  }

  // Fetch tenant settings for user avatars
  const tenant = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { settings: true },
  });
  const currentSettings = (tenant?.settings as Record<string, any>) || {};
  const userAvatars = (currentSettings.userAvatars as Record<string, string>) || {};
  const avatarUrl = userAvatars[membership.id] || null;

  // 1. My Profile Tier (Self-Service)
  const myProfile = {
    userId: membership.user.id,
    membershipId: membership.id,
    fullName: membership.user.fullName,
    email: membership.user.email,
    role: membership.role,
    phone: membership.employee?.phone || null,
    avatarUrl,
    joinedAt: membership.joinedAt,
    isSelf,
  };

  // 2. Directory Profile Tier (Colleague-facing, NO private docs or emergency secrets)
  const directoryProfile = {
    membershipId: membership.id,
    fullName: membership.user.fullName,
    email: membership.user.email,
    role: membership.role,
    avatarUrl,
    designation: membership.employee?.designation || (membership.role === "OWNER" ? "Studio Boss / Partner" : "Studio Staff"),
    department: membership.employee?.department || "Architecture",
    phone: membership.employee?.phone || null,
    employeeId: membership.employee?.employeeId || null,
    activeProjects: membership.projectMembers.map((pm) => ({
      projectId: pm.project.id,
      code: pm.project.code,
      name: pm.project.name,
      typology: pm.project.projectType,
      projectRole: pm.projectRole,
      status: pm.project.status,
    })),
    assignedTasksCount: assignedTasks.length,
  };

  // 3. Management Record Tier (Authorized Owner/Admin only)
  let managementRecord: any = null;
  if (canManage) {
    managementRecord = {
      membershipId: membership.id,
      officialEmployeeId: membership.employee?.employeeId || "OWNER-RECORD",
      officialDesignation: membership.employee?.designation || "Executive Leadership",
      officialDepartment: membership.employee?.department || "Studio Management",
      avatarUrl,
      hireDate: membership.employee?.joinDate || membership.joinedAt,
      reportingManagerId: membership.employee?.reportingManagerId || null,
      isActive: membership.isActive,
      changeRequestsQueue: changeRequests,
    };
  }

  return {
    isSelf,
    canManage,
    myProfile: isSelf ? myProfile : null,
    directoryProfile,
    managementRecord: canManage ? managementRecord : null,
    assignedTasks,
    changeRequests,
  };
}

/**
 * Updates self-service fields on My Profile.
 */
export async function updateSelfProfile(
  ctx: TenantContext,
  data: {
    fullName?: string;
    phone?: string;
  }
) {
  return await prisma.$transaction(async (tx) => {
    if (data.fullName && data.fullName.trim()) {
      await tx.user.update({
        where: { id: ctx.userId },
        data: { fullName: data.fullName.trim() },
      });
    }

    if (data.phone !== undefined) {
      const emp = await tx.employee.findUnique({
        where: { membershipId: ctx.membershipId },
      });
      if (emp) {
        await tx.employee.update({
          where: { id: emp.id },
          data: { phone: data.phone?.trim() || null },
        });
      }
    }

    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.membershipId,
        action: "PROFILE_UPDATED",
        entityType: "TenantMembership",
        entityId: ctx.membershipId,
        safeChangeSummary: `${ctx.userFullName} updated self-service profile information.`,
      },
    }).catch(() => {});

    return { success: true };
  });
}

/**
 * Updates or removes a profile photo uploaded from device.
 */
export async function updateProfileAvatar(
  ctx: TenantContext,
  data: {
    avatarUrl: string;
    targetMembershipId?: string;
  }
) {
  const targetId = data.targetMembershipId || ctx.membershipId;
  const isSelf = targetId === ctx.membershipId;
  const canManage = isAdminOrOwner(ctx);

  if (!isSelf && !canManage) {
    throw new ForbiddenException("You do not have permission to update this profile picture.");
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { settings: true },
  });

  const currentSettings = (tenant?.settings as Record<string, any>) || {};
  const userAvatars = { ...(currentSettings.userAvatars || {}) };

  if (data.avatarUrl && data.avatarUrl.trim()) {
    userAvatars[targetId] = data.avatarUrl.trim();
  } else {
    delete userAvatars[targetId];
  }

  await prisma.tenant.update({
    where: { id: ctx.tenantId },
    data: {
      settings: {
        ...currentSettings,
        userAvatars,
      },
    },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: ctx.tenantId,
      actorId: ctx.membershipId,
      action: "PROFILE_UPDATED",
      entityType: "TenantMembership",
      entityId: targetId,
      safeChangeSummary: `${ctx.userFullName} updated profile photo.`,
    },
  }).catch(() => {});

  return { success: true, avatarUrl: data.avatarUrl ? data.avatarUrl.trim() : null };
}

/**
 * Submits an official employment record change request for Owner/Admin approval.
 */
export async function submitOfficialRecordChangeRequest(
  ctx: TenantContext,
  data: {
    fieldKey: "designation" | "department" | "employeeId" | "phone";
    newValue: string;
    reason?: string;
  }
) {
  const ALLOWED_FIELDS = ["designation", "department", "employeeId", "phone"];
  if (!ALLOWED_FIELDS.includes(data.fieldKey)) {
    throw new Error(
      `Unauthorized field "${data.fieldKey}". Only official employment fields (${ALLOWED_FIELDS.join(
        ", "
      )}) can be changed via this request.`
    );
  }

  if (!data.newValue?.trim()) {
    throw new Error("New requested value is required.");
  }

  const employee = await prisma.employee.findUnique({
    where: { membershipId: ctx.membershipId },
  });

  if (!employee) {
    throw new Error("Employee profile record not found for this workspace.");
  }

  const oldValue = String((employee as any)[data.fieldKey] || "");

  const request = await prisma.profileChangeRequest.create({
    data: {
      tenantId: ctx.tenantId,
      employeeId: employee.id,
      requesterId: ctx.membershipId,
      fieldKey: data.fieldKey,
      oldValue,
      newValue: data.newValue.trim(),
      reason: data.reason?.trim() || null,
      status: ProfileChangeRequestStatus.PENDING,
    },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: ctx.tenantId,
      actorId: ctx.membershipId,
      action: "PROFILE_CHANGE_REQUESTED",
      entityType: "ProfileChangeRequest",
      entityId: request.id,
      safeChangeSummary: `${ctx.userFullName} requested official record change for "${data.fieldKey}": "${oldValue}" → "${data.newValue.trim()}"`,
    },
  }).catch(() => {});

  return request;
}

/**
 * Decides a profile change request (Owner/Admin only).
 */
export async function decideProfileRecordChangeRequest(
  ctx: TenantContext,
  requestId: string,
  data: {
    decision: "APPROVE" | "REJECT";
    decisionNote?: string;
  }
) {
  assertAdminOrOwner(ctx, "Only Studio Owners or Administrators can approve profile changes.");

  const request = await prisma.profileChangeRequest.findFirst({
    where: { id: requestId, tenantId: ctx.tenantId },
    include: { employee: true, requester: { include: { user: true } } },
  });

  if (!request) throw new Error("Profile change request not found.");

  // Four-Eyes Rule: Requester cannot approve their own profile change request
  if (data.decision === "APPROVE" && request.requesterId === ctx.membershipId) {
    throw new Error(
      "Four-eyes principle: Requester cannot approve their own official employment record change request. Another Administrator or Owner must review it."
    );
  }

  if (request.status !== ProfileChangeRequestStatus.PENDING) {
    throw new Error(`This change request has already been ${request.status.toLowerCase()}.`);
  }

  const isApproved = data.decision === "APPROVE";

  if (!isApproved && !data.decisionNote?.trim()) {
    throw new Error("A specific decision note or reason is required to reject an official record change request.");
  }

  const now = new Date();

  return await prisma.$transaction(async (tx) => {
    if (isApproved) {
      // Stale detection: Ensure the current official record has not drifted since request submission
      const currentEmployee = await tx.employee.findUnique({
        where: { id: request.employeeId },
      });
      if (!currentEmployee) {
        throw new Error("Target employee employment record no longer exists.");
      }

      const currentActualValue = String((currentEmployee as any)[request.fieldKey] || "");
      const expectedOldValue = request.oldValue || "";

      if (currentActualValue !== expectedOldValue) {
        throw new Error(
          `Stale request conflict: Current official ${request.fieldKey} ("${currentActualValue}") has changed since this request was submitted (baseline was "${expectedOldValue}"). Please reject and submit a refreshed request.`
        );
      }

      // Apply change to Employee record atomically
      await tx.employee.update({
        where: { id: request.employeeId },
        data: {
          [request.fieldKey]: request.newValue,
        },
      });
    }

    const updated = await tx.profileChangeRequest.update({
      where: { id: request.id },
      data: {
        status: isApproved ? ProfileChangeRequestStatus.APPROVED : ProfileChangeRequestStatus.REJECTED,
        decidedById: ctx.membershipId,
        decidedAt: now,
        decisionNote: data.decisionNote?.trim() || (isApproved ? "Approved by leadership" : "Rejected by leadership"),
      },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.membershipId,
        action: isApproved ? "PROFILE_CHANGE_APPROVED" : "PROFILE_CHANGE_REJECTED",
        entityType: "ProfileChangeRequest",
        entityId: request.id,
        safeChangeSummary: `${isApproved ? "Approved" : "Rejected"} official profile change for ${
          request.requester.user.fullName
        }: "${request.fieldKey}" → "${request.newValue}"`,
      },
    }).catch(() => {});

    return updated;
  });
}
