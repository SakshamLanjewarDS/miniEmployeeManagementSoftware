import { z } from "zod";
import { TenantContext, isAdminOrOwner, ForbiddenException } from "../../tenancy/context";
import * as employeeRepo from "./repository";
import { deactivateMember } from "../../auth/service";

export const CreateEmployeeSchema = z.object({
  employeeId: z.string().trim().min(2, "Employee ID must be at least 2 characters").max(32),
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(100),
  email: z.string().trim().email("Invalid email address"),
  phone: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  designation: z.string().optional().nullable(),
  role: z.enum(["OWNER", "ADMIN", "PROJECT_MANAGER", "EMPLOYEE"]),
  hasFinanceAccess: z.boolean().optional(),
  temporaryPassword: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || val.trim().length === 0 || val.trim().length >= 8, {
      message: "Password must be at least 8 characters long",
    })
    .transform((val) => (!val || val.trim().length === 0 ? "StudioPassword2026!" : val.trim())),
  projectIds: z.array(z.string()).optional(),
  customMessage: z.string().optional().nullable(),
  notifyEmployee: z.boolean().optional(),
});

export const UpdateEmployeeSchema = z.object({
  membershipId: z.string().min(1, "Membership ID is required"),
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(100).optional(),
  email: z.string().trim().email("Invalid email address").optional(),
  phone: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  designation: z.string().optional().nullable(),
  role: z.enum(["OWNER", "ADMIN", "PROJECT_MANAGER", "EMPLOYEE"]).optional(),
  hasFinanceAccess: z.boolean().optional(),
  projectIds: z.array(z.string()).optional(),
});

export const ResetPasswordSchema = z.object({
  membershipId: z.string().min(1, "Membership ID is required"),
  temporaryPassword: z.string().min(8, "Password must be at least 8 characters long"),
  customMessage: z.string().optional().nullable(),
  notifyEmployee: z.boolean().optional(),
});

export type CreateEmployeeInput = z.infer<typeof CreateEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof UpdateEmployeeSchema>;

export async function listEmployeesService(ctx: TenantContext) {
  const employees = await employeeRepo.findEmployeesByTenant(ctx);

  if (isAdminOrOwner(ctx)) {
    return employees;
  }

  // Sanitize for non-admin employees (e.g., hide finance access details or sensitive fields)
  return employees.map((emp) => ({
    id: emp.id,
    membershipId: emp.membershipId,
    employeeId: emp.employeeId,
    fullName: emp.fullName,
    email: emp.email,
    department: emp.department,
    designation: emp.designation,
    role: emp.role,
    isActive: emp.isActive,
    joinDate: emp.joinDate,
    projects: emp.projects,
  }));
}

export async function listEmployeesFilteredService(
  ctx: TenantContext,
  params: employeeRepo.EmployeeFilterParams
) {
  const result = await employeeRepo.findEmployeesFiltered(ctx, params);

  if (isAdminOrOwner(ctx)) {
    return result;
  }

  return {
    ...result,
    employees: result.employees.map((emp) => ({
      id: emp.id,
      membershipId: emp.membershipId,
      employeeId: emp.employeeId,
      fullName: emp.fullName,
      email: emp.email,
      department: emp.department,
      designation: emp.designation,
      role: emp.role,
      isActive: emp.isActive,
      joinDate: emp.joinDate,
      hasFinanceAccess: false,
      projects: emp.projects,
    })),
  };
}

export async function createEmployeeService(ctx: TenantContext, input: unknown) {
  if (!isAdminOrOwner(ctx)) {
    throw new ForbiddenException("Only Studio Administrators or Owners can add new employees.");
  }

  const validated = CreateEmployeeSchema.parse(input);

  if (validated.role === "OWNER" && !isAdminOrOwner(ctx)) {
    throw new ForbiddenException("Only an existing Owner/Partner or Administrator can grant Owner privileges.");
  }

  return await employeeRepo.createTenantEmployee(ctx, {
    ...validated,
    role: validated.role,
  });
}

export async function updateEmployeeService(ctx: TenantContext, input: unknown) {
  if (!isAdminOrOwner(ctx)) {
    throw new ForbiddenException("Only Studio Administrators or Owners can edit employee accounts.");
  }

  const validated = UpdateEmployeeSchema.parse(input);

  return await employeeRepo.updateTenantEmployee(ctx, validated.membershipId, validated);
}

export async function deactivateEmployeeService(
  ctx: TenantContext,
  targetMembershipId: string
) {
  if (!isAdminOrOwner(ctx)) {
    throw new ForbiddenException("Only Studio Administrators or Owners can deactivate accounts.");
  }

  const result = await deactivateMember(ctx.tenantId, targetMembershipId, ctx.userId);
  if (!result.success) {
    throw new Error(result.error || "Failed to deactivate member");
  }

  return result;
}

export async function reactivateEmployeeService(
  ctx: TenantContext,
  targetMembershipId: string
) {
  if (!isAdminOrOwner(ctx)) {
    throw new ForbiddenException("Only Studio Administrators or Owners can reactivate accounts.");
  }

  const result = await employeeRepo.reactivateMember(ctx, targetMembershipId);
  if (!result.success) {
    throw new Error(result.error || "Failed to reactivate member");
  }

  return result;
}

export async function removeEmployeeService(
  ctx: TenantContext,
  targetMembershipId: string
) {
  if (!isAdminOrOwner(ctx)) {
    throw new ForbiddenException("Only Studio Administrators or Owners can remove employee accounts.");
  }

  const result = await employeeRepo.removeMember(ctx, targetMembershipId);
  if (!result.success) {
    throw new Error(result.error || "Failed to remove member");
  }

  return result;
}

export async function resetPasswordService(ctx: TenantContext, input: unknown) {
  if (!isAdminOrOwner(ctx)) {
    throw new ForbiddenException("Only Studio Administrators or Owners can reset employee passwords.");
  }

  const validated = ResetPasswordSchema.parse(input);
  const result = await employeeRepo.resetEmployeePassword(
    ctx,
    validated.membershipId,
    validated.temporaryPassword,
    validated.customMessage,
    validated.notifyEmployee
  );

  if (!result.success) {
    throw new Error(result.error || "Failed to reset password");
  }

  return result;
}
