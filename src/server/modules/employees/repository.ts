import { prisma } from "../../db/prisma";
import { TenantContext, isAdminOrOwner, ForbiddenException } from "../../tenancy/context";
import { TenantRole, UserAccountState } from "@prisma/client";
import { revokeAllUserSessions } from "../../auth/session";
import bcrypt from "bcryptjs";
import {
  sendCredentialNotification,
  CredentialNotificationResult,
} from "../notifications/credential-mailer";

export interface ProjectAssignmentItem {
  id: string;
  code: string;
  name: string;
  projectRole: string;
}

export interface EmployeeListItem {
  id: string;
  membershipId: string;
  employeeId: string;
  fullName: string;
  email: string;
  phone: string | null;
  department: string | null;
  designation: string | null;
  role: TenantRole;
  isActive: boolean;
  joinDate: Date | null;
  hasFinanceAccess: boolean;
  projects?: ProjectAssignmentItem[];
  notification?: CredentialNotificationResult;
}

export interface EmployeeFilterParams {
  search?: string;
  role?: TenantRole | "ALL";
  status?: "ACTIVE" | "INACTIVE" | "ALL";
  page?: number;
  limit?: number;
}

export interface CreateEmployeeData {
  employeeId: string;
  fullName: string;
  email: string;
  phone?: string | null;
  department?: string | null;
  designation?: string | null;
  role: TenantRole;
  temporaryPassword?: string;
  joinDate?: Date;
  reportingManagerId?: string;
  hasFinanceAccess?: boolean;
  projectIds?: string[];
  customMessage?: string | null;
  notifyEmployee?: boolean;
}

export interface UpdateEmployeeData {
  fullName?: string;
  email?: string;
  phone?: string | null;
  department?: string | null;
  designation?: string | null;
  role?: TenantRole;
  hasFinanceAccess?: boolean;
  joinDate?: Date;
  projectIds?: string[];
}

export async function findEmployeesByTenant(ctx: TenantContext): Promise<EmployeeListItem[]> {
  const memberships = await prisma.tenantMembership.findMany({
    where: {
      tenantId: ctx.tenantId,
    },
    include: {
      user: true,
      employee: true,
      projectMembers: {
        include: {
          project: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      joinedAt: "asc",
    },
  });

  return memberships.map((m) => ({
    id: m.employee?.id ?? m.id,
    membershipId: m.id,
    employeeId: m.employee?.employeeId ?? "N/A",
    fullName: m.user.fullName,
    email: m.user.email,
    phone: m.employee?.phone ?? null,
    department: m.employee?.department ?? null,
    designation: m.employee?.designation ?? null,
    role: m.role,
    isActive: m.isActive,
    joinDate: m.employee?.joinDate ?? m.joinedAt,
    hasFinanceAccess: m.hasFinanceAccess,
    projects: m.projectMembers.map((pm) => ({
      id: pm.project.id,
      code: pm.project.code,
      name: pm.project.name,
      projectRole: pm.projectRole,
    })),
  }));
}

export async function findEmployeesFiltered(
  ctx: TenantContext,
  params: EmployeeFilterParams = {}
): Promise<{ employees: EmployeeListItem[]; totalCount: number; page: number; limit: number }> {
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 20));
  const skip = (page - 1) * limit;

  const whereClause: any = {
    tenantId: ctx.tenantId,
  };

  if (params.status === "ACTIVE") {
    whereClause.isActive = true;
  } else if (params.status === "INACTIVE") {
    whereClause.isActive = false;
  }

  if (params.role && params.role !== "ALL") {
    whereClause.role = params.role;
  }

  if (params.search && params.search.trim()) {
    const q = params.search.trim().toLowerCase();
    whereClause.OR = [
      { user: { fullName: { contains: q } } },
      { user: { email: { contains: q } } },
      { employee: { employeeId: { contains: q } } },
      { employee: { department: { contains: q } } },
      { employee: { designation: { contains: q } } },
    ];
  }

  const [totalCount, memberships] = await Promise.all([
    prisma.tenantMembership.count({ where: whereClause }),
    prisma.tenantMembership.findMany({
      where: whereClause,
      include: {
        user: true,
        employee: true,
        projectMembers: {
          include: {
            project: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { joinedAt: "asc" },
      skip,
      take: limit,
    }),
  ]);

  const employees: EmployeeListItem[] = memberships.map((m) => ({
    id: m.employee?.id ?? m.id,
    membershipId: m.id,
    employeeId: m.employee?.employeeId ?? "N/A",
    fullName: m.user.fullName,
    email: m.user.email,
    phone: m.employee?.phone ?? null,
    department: m.employee?.department ?? null,
    designation: m.employee?.designation ?? null,
    role: m.role,
    isActive: m.isActive,
    joinDate: m.employee?.joinDate ?? m.joinedAt,
    hasFinanceAccess: m.hasFinanceAccess,
    projects: m.projectMembers.map((pm) => ({
      id: pm.project.id,
      code: pm.project.code,
      name: pm.project.name,
      projectRole: pm.projectRole,
    })),
  }));

  return {
    employees,
    totalCount,
    page,
    limit,
  };
}

export async function findEmployeeByMembershipId(
  ctx: TenantContext,
  membershipId: string
): Promise<EmployeeListItem | null> {
  const m = await prisma.tenantMembership.findFirst({
    where: {
      id: membershipId,
      tenantId: ctx.tenantId, // STRICT TENANT ISOLATION
    },
    include: {
      user: true,
      employee: true,
      projectMembers: {
        include: {
          project: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!m) return null;

  return {
    id: m.employee?.id ?? m.id,
    membershipId: m.id,
    employeeId: m.employee?.employeeId ?? "N/A",
    fullName: m.user.fullName,
    email: m.user.email,
    phone: m.employee?.phone ?? null,
    department: m.employee?.department ?? null,
    designation: m.employee?.designation ?? null,
    role: m.role,
    isActive: m.isActive,
    joinDate: m.employee?.joinDate ?? m.joinedAt,
    hasFinanceAccess: m.hasFinanceAccess,
    projects: m.projectMembers.map((pm) => ({
      id: pm.project.id,
      code: pm.project.code,
      name: pm.project.name,
      projectRole: pm.projectRole,
    })),
  };
}

export async function getNextAvailableEmployeeId(tenantId: string): Promise<string> {
  const employees = await prisma.employee.findMany({
    where: { tenantId },
    select: { employeeId: true },
  });

  let maxNum = 0;
  for (const emp of employees) {
    const match = emp.employeeId.match(/EMP-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  const nextNum = maxNum + 1;
  return `EMP-${String(nextNum).padStart(3, "0")}`;
}

export async function createTenantEmployee(
  ctx: TenantContext,
  data: CreateEmployeeData
): Promise<EmployeeListItem> {
  const cleanId = data.employeeId.trim().toUpperCase();
  const existingEmployee = await prisma.employee.findUnique({
    where: {
      tenantId_employeeId: {
        tenantId: ctx.tenantId,
        employeeId: cleanId,
      },
    },
  });

  if (existingEmployee) {
    const nextId = await getNextAvailableEmployeeId(ctx.tenantId);
    throw new Error(
      `Employee ID '${cleanId}' is already registered in this studio workspace. Next available ID: ${nextId}`
    );
  }

  const defaultPassword = data.temporaryPassword || "StudioPassword2026!";
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  // Use interactive transaction
  const result: EmployeeListItem = await prisma.$transaction(async (tx) => {
    // 1. Find or create global user by email
    let user = await tx.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });

    if (!user) {
      user = await tx.user.create({
        data: {
          email: data.email.toLowerCase().trim(),
          passwordHash,
          fullName: data.fullName.trim(),
          accountState: UserAccountState.ACTIVE,
        },
      });
    }

    // 2. Check if membership already exists in this tenant
    const existingMembership = await tx.tenantMembership.findUnique({
      where: {
        tenantId_userId: {
          tenantId: ctx.tenantId,
          userId: user.id,
        },
      },
    });

    if (existingMembership) {
      throw new Error(`User with email '${data.email}' is already a member of this workspace.`);
    }

    // 3. Create TenantMembership
    const membership = await tx.tenantMembership.create({
      data: {
        tenantId: ctx.tenantId,
        userId: user.id,
        role: data.role,
        hasFinanceAccess: data.hasFinanceAccess ?? false,
        isActive: true,
      },
    });

    // 4. Create Employee record
    const employee = await tx.employee.create({
      data: {
        tenantId: ctx.tenantId,
        membershipId: membership.id,
        employeeId: data.employeeId.trim().toUpperCase(),
        phone: data.phone,
        department: data.department,
        designation: data.designation,
        joinDate: data.joinDate || new Date(),
        reportingManagerId: data.reportingManagerId,
      },
    });

    // 5. Assign to initial projects if provided
    if (data.projectIds && data.projectIds.length > 0) {
      for (const projId of data.projectIds) {
        // Validate project belongs to this tenant
        const project = await tx.project.findFirst({
          where: { id: projId, tenantId: ctx.tenantId },
        });
        if (project) {
          await tx.projectMember.create({
            data: {
              tenantId: ctx.tenantId,
              projectId: project.id,
              membershipId: membership.id,
              projectRole: data.designation || "Project Team Member",
            },
          });
        }
      }
    }

    // 6. Audit log
    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        action: "EMPLOYEE_CREATED",
        entityType: "Employee",
        entityId: employee.id,
        safeChangeSummary: `Created employee ${data.fullName} (${data.employeeId}) with role ${data.role}`,
      },
    });

    return {
      id: employee.id,
      membershipId: membership.id,
      employeeId: employee.employeeId,
      fullName: user.fullName,
      email: user.email,
      phone: employee.phone,
      department: employee.department,
      designation: employee.designation,
      role: membership.role,
      isActive: membership.isActive,
      joinDate: employee.joinDate,
      hasFinanceAccess: membership.hasFinanceAccess,
    };
  });

  // If notification requested (default true), queue credential outbox email and in-app alert
  if (data.notifyEmployee !== false) {
    try {
      const notifResult = await sendCredentialNotification({
        tenantId: ctx.tenantId,
        tenantSlug: ctx.tenantSlug,
        recipientEmail: result.email,
        recipientPhone: result.phone,
        recipientName: result.fullName,
        recipientMembershipId: result.membershipId,
        employeeId: result.employeeId,
        password: defaultPassword,
        customMessage: data.customMessage || undefined,
        actionType: "WELCOME",
      });
      result.notification = notifResult;
    } catch (notifErr) {
      console.warn("Could not dispatch welcome credential notification:", notifErr);
    }
  }

  return result;
}

export async function updateTenantEmployee(
  ctx: TenantContext,
  membershipId: string,
  data: UpdateEmployeeData
): Promise<EmployeeListItem> {
  const target = await prisma.tenantMembership.findFirst({
    where: { id: membershipId, tenantId: ctx.tenantId },
    include: { user: true, employee: true },
  });

  if (!target) {
    throw new Error("Employee membership not found in this studio workspace.");
  }

  // Last Active Owner Protection: Cannot demote the last remaining active owner
  if (target.role === "OWNER" && data.role && data.role !== "OWNER") {
    const activeOwnerCount = await prisma.tenantMembership.count({
      where: { tenantId: ctx.tenantId, role: "OWNER", isActive: true },
    });
    if (activeOwnerCount <= 1) {
      throw new Error("Cannot demote the last remaining active Owner of the studio.");
    }
  }

  // Non-owners / non-admins cannot promote any user to OWNER
  if (data.role === "OWNER" && !isAdminOrOwner(ctx)) {
    throw new ForbiddenException("Only an existing Owner/Partner or Administrator can grant Owner privileges.");
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Update user details if full name or email changed
    if (data.fullName || data.email) {
      const userUpdates: any = {};
      if (data.fullName) userUpdates.fullName = data.fullName.trim();
      if (data.email) {
        const trimmedEmail = data.email.toLowerCase().trim();
        if (trimmedEmail !== target.user.email) {
          // Check collision
          const emailExists = await tx.user.findUnique({ where: { email: trimmedEmail } });
          if (emailExists && emailExists.id !== target.userId) {
            throw new Error(`Email '${data.email}' is already in use by another user.`);
          }
          userUpdates.email = trimmedEmail;
        }
      }
      if (Object.keys(userUpdates).length > 0) {
        await tx.user.update({
          where: { id: target.userId },
          data: userUpdates,
        });
      }
    }

    // 2. Update membership role & finance access
    const membershipUpdates: any = {};
    if (data.role !== undefined) membershipUpdates.role = data.role;
    if (data.hasFinanceAccess !== undefined) membershipUpdates.hasFinanceAccess = data.hasFinanceAccess;

    const updatedMembership = await tx.tenantMembership.update({
      where: { id: membershipId },
      data: membershipUpdates,
      include: { user: true },
    });

    // 3. Update employee profile
    const employeeUpdates: any = {};
    if (data.phone !== undefined) employeeUpdates.phone = data.phone;
    if (data.department !== undefined) employeeUpdates.department = data.department;
    if (data.designation !== undefined) employeeUpdates.designation = data.designation;
    if (data.joinDate !== undefined) employeeUpdates.joinDate = data.joinDate;

    let updatedEmployee = target.employee;
    if (target.employee && Object.keys(employeeUpdates).length > 0) {
      updatedEmployee = await tx.employee.update({
        where: { id: target.employee.id },
        data: employeeUpdates,
      });
    }

    // 4. Update project assignments if projectIds provided
    if (data.projectIds !== undefined) {
      // Remove current project assignments
      await tx.projectMember.deleteMany({
        where: { tenantId: ctx.tenantId, membershipId: target.id },
      });

      // Insert new assignments
      for (const projId of data.projectIds) {
        const project = await tx.project.findFirst({
          where: { id: projId, tenantId: ctx.tenantId },
        });
        if (project) {
          await tx.projectMember.create({
            data: {
              tenantId: ctx.tenantId,
              projectId: project.id,
              membershipId: target.id,
              projectRole: data.designation || updatedEmployee?.designation || "Project Team Member",
            },
          });
        }
      }
    }

    // 5. Audit log
    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        action: "EMPLOYEE_UPDATED",
        entityType: "Employee",
        entityId: target.employee?.id || target.id,
        safeChangeSummary: `Updated employee ${updatedMembership.user.fullName} details/role to ${updatedMembership.role}`,
      },
    });

    return {
      id: updatedEmployee?.id ?? target.id,
      membershipId: updatedMembership.id,
      employeeId: updatedEmployee?.employeeId ?? "N/A",
      fullName: updatedMembership.user.fullName,
      email: updatedMembership.user.email,
      phone: updatedEmployee?.phone ?? null,
      department: updatedEmployee?.department ?? null,
      designation: updatedEmployee?.designation ?? null,
      role: updatedMembership.role,
      isActive: updatedMembership.isActive,
      joinDate: updatedEmployee?.joinDate ?? updatedMembership.joinedAt,
      hasFinanceAccess: updatedMembership.hasFinanceAccess,
    };
  });
}

export async function reactivateMember(
  ctx: TenantContext,
  membershipId: string
): Promise<{ success: boolean; error?: string }> {
  const target = await prisma.tenantMembership.findFirst({
    where: { id: membershipId, tenantId: ctx.tenantId },
    include: { user: true },
  });

  if (!target) {
    return { success: false, error: "Member not found in this workspace" };
  }

  if (target.isActive) {
    return { success: true };
  }

  // Reactivate membership (does NOT restore revoked sessions)
  await prisma.tenantMembership.update({
    where: { id: membershipId },
    data: { isActive: true },
  });

  // Audit log
  await prisma.auditEvent.create({
    data: {
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      action: "MEMBER_REACTIVATED",
      entityType: "TenantMembership",
      entityId: membershipId,
      safeChangeSummary: `Reactivated member ${target.user.fullName} (${target.user.email}). Prior revoked sessions remain inactive.`,
    },
  });

  return { success: true };
}

export async function removeMember(
  ctx: TenantContext,
  membershipId: string
): Promise<{ success: boolean; error?: string }> {
  const target = await prisma.tenantMembership.findFirst({
    where: { id: membershipId, tenantId: ctx.tenantId },
    include: { user: true, employee: true },
  });

  if (!target) {
    return { success: false, error: "Member not found in this workspace" };
  }

  // Cannot remove own account
  if (target.userId === ctx.userId) {
    return { success: false, error: "You cannot remove your own account" };
  }

  // Protect last active owner
  if (target.role === "OWNER") {
    const activeOwnerCount = await prisma.tenantMembership.count({
      where: { tenantId: ctx.tenantId, role: "OWNER", isActive: true },
    });
    if (activeOwnerCount <= 1) {
      return { success: false, error: "Cannot remove the last remaining active owner of the studio" };
    }
  }

  // Check historical references to preserve attribution
  const [taskCount, visitCount, approvalCount] = await Promise.all([
    prisma.task.count({
      where: {
        tenantId: ctx.tenantId,
        OR: [{ assigneeId: membershipId }, { creatorId: membershipId }],
      },
    }),
    prisma.siteVisit.count({
      where: {
        tenantId: ctx.tenantId,
        OR: [{ employeeId: membershipId }, { reviewerId: membershipId }],
      },
    }),
    prisma.approvalRequest.count({
      where: {
        tenantId: ctx.tenantId,
        OR: [{ requesterId: membershipId }, { reviewerId: membershipId }],
      },
    }),
  ]);

  if (taskCount > 0 || visitCount > 0 || approvalCount > 0) {
    return {
      success: false,
      error: `Cannot permanently delete member ${target.user.fullName} because historical records exist (${taskCount} tasks, ${visitCount} site visits, ${approvalCount} approvals). Please deactivate the member instead to preserve historical audit attribution.`,
    };
  }

  // Unreferenced member: allow clean removal
  await prisma.$transaction(async (tx) => {
    // Revoke all active sessions
    await revokeAllUserSessions(target.userId);

    // Delete project assignments
    await tx.projectMember.deleteMany({
      where: { membershipId: target.id },
    });

    // Delete employee profile if exists
    if (target.employee) {
      await tx.employee.delete({
        where: { id: target.employee.id },
      });
    }

    // Delete membership
    await tx.tenantMembership.delete({
      where: { id: target.id },
    });

    // Audit log
    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        action: "MEMBER_REMOVED",
        entityType: "TenantMembership",
        entityId: membershipId,
        safeChangeSummary: `Permanently removed unreferenced member ${target.user.fullName} (${target.user.email})`,
      },
    });
  });

  return { success: true };
}

export async function resetEmployeePassword(
  ctx: TenantContext,
  membershipId: string,
  temporaryPassword: string,
  customMessage?: string | null,
  notifyEmployee?: boolean
): Promise<{ success: boolean; error?: string; notification?: CredentialNotificationResult }> {
  const target = await prisma.tenantMembership.findFirst({
    where: { id: membershipId, tenantId: ctx.tenantId },
    include: { user: true, employee: true },
  });

  if (!target) {
    return { success: false, error: "Member not found in this workspace" };
  }

  if (temporaryPassword.length < 8) {
    return { success: false, error: "Password must be at least 8 characters long." };
  }

  const passwordHash = await bcrypt.hash(temporaryPassword, 10);

  // Update password and revoke all active sessions immediately
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: target.userId },
      data: { passwordHash },
    });

    await revokeAllUserSessions(target.userId);

    // Audit log without plaintext password
    await tx.auditEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorId: ctx.userId,
        action: "PASSWORD_RESET_INITIATED",
        entityType: "User",
        entityId: target.userId,
        safeChangeSummary: `Initiated password reset for ${target.user.fullName} (${target.user.email}) and revoked all active sessions`,
      },
    });
  });

  let notification: CredentialNotificationResult | undefined;
  if (notifyEmployee !== false) {
    try {
      notification = await sendCredentialNotification({
        tenantId: ctx.tenantId,
        tenantSlug: ctx.tenantSlug,
        recipientEmail: target.user.email,
        recipientPhone: target.employee?.phone,
        recipientName: target.user.fullName,
        recipientMembershipId: target.id,
        employeeId: target.employee?.employeeId || "STUDIO-USER",
        password: temporaryPassword,
        customMessage: customMessage || undefined,
        actionType: "PASSWORD_RESET",
      });
    } catch (notifErr) {
      console.warn("Could not dispatch password update notification:", notifErr);
    }
  }

  return { success: true, notification };
}
