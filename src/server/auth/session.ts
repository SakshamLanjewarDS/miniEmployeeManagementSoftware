import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "../db/prisma";
import { TenantContext, UnauthorizedException } from "../tenancy/context";
import { TenantLifecycleState, UserAccountState } from "@prisma/client";

export const SESSION_COOKIE_NAME = "studio_session_token";
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Generate a cryptographically secure random session token
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Create a new database-backed session for a user
 */
export async function createSession(
  userId: string,
  activeTenantId?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.session.create({
    data: {
      userId,
      token,
      activeTenantId,
      ipAddress,
      userAgent,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

/**
 * Set the session cookie on the outgoing response
 */
export async function setSessionCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/**
 * Clear the session cookie
 */
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Revoke a specific session
 */
export async function revokeSession(token: string): Promise<void> {
  await prisma.session.updateMany({
    where: { token, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Revoke all sessions for a user (e.g., upon password reset or account disablement)
 */
export async function revokeAllUserSessions(userId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Verify session token and resolve TenantContext for a given workspaceSlug.
 * Fails closed if session is invalid, expired, revoked, or tenant membership is inactive.
 */
export async function resolveSessionAndTenant(
  token: string | undefined,
  workspaceSlug: string
): Promise<TenantContext> {
  if (!token) {
    throw new UnauthorizedException("No session token provided");
  }

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: true,
    },
  });

  if (!session) {
    throw new UnauthorizedException("Session does not exist");
  }

  if (session.revokedAt || session.expiresAt < new Date()) {
    throw new UnauthorizedException("Session has expired or was revoked");
  }

  if (session.user.accountState !== UserAccountState.ACTIVE) {
    throw new UnauthorizedException("User account is disabled");
  }

  // Resolve target tenant by slug
  const tenant = await prisma.tenant.findUnique({
    where: { slug: workspaceSlug },
    include: {
      memberships: {
        where: { userId: session.userId, isActive: true },
        include: {
          employee: true,
        },
      },
    },
  });

  if (!tenant) {
    throw new UnauthorizedException(`Workspace '${workspaceSlug}' not found`);
  }

  if (tenant.lifecycleState !== TenantLifecycleState.ACTIVE) {
    throw new UnauthorizedException(`Workspace '${workspaceSlug}' is suspended or pending deletion`);
  }

  const membership = tenant.memberships[0];
  if (!membership) {
    throw new UnauthorizedException(`User is not an active member of workspace '${workspaceSlug}'`);
  }

  return {
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    tenantName: tenant.name,
    userId: session.user.id,
    userEmail: session.user.email,
    userFullName: session.user.fullName,
    membershipId: membership.id,
    employeeId: membership.employee?.employeeId ?? null,
    designation: membership.employee?.designation ?? null,
    department: membership.employee?.department ?? null,
    phone: membership.employee?.phone ?? null,
    role: membership.role,
    hasFinanceAccess: membership.hasFinanceAccess,
    timezone: tenant.timezone,
    currency: tenant.currency,
  };
}

import { cache } from "react";

/**
 * Helper to get current session from Request cookies.
 * Wrapped with React.cache() to deduplicate DB queries across layout and page within the same request.
 */
export const getCurrentTenantContext = cache(async (workspaceSlug: string): Promise<TenantContext | null> => {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return await resolveSessionAndTenant(token, workspaceSlug);
  } catch {
    return null;
  }
});
