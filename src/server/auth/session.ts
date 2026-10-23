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

interface CachedSessionEntry {
  context: TenantContext;
  cachedAt: number;
}

// In-memory cache for ultra-fast route transitions (skips 2 remote DB roundtrips on every navigation)
const sessionContextCache = new Map<string, CachedSessionEntry>();
const SESSION_CACHE_TTL_MS = 60 * 1000; // 60 seconds

export function clearMembershipCache(membershipId: string) {
  for (const [key, entry] of sessionContextCache.entries()) {
    if (entry.context.membershipId === membershipId) {
      sessionContextCache.delete(key);
    }
  }
}

export function clearSessionCache(token?: string) {
  if (token) {
    for (const key of sessionContextCache.keys()) {
      if (key.startsWith(token + ":")) {
        sessionContextCache.delete(key);
      }
    }
  } else {
    sessionContextCache.clear();
  }
}

/**
 * Revoke a specific session
 */
export async function revokeSession(token: string): Promise<void> {
  clearSessionCache(token);
  await prisma.session.updateMany({
    where: { token, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export const SESSION_IDLE_TIMEOUT_MS = 4 * 60 * 60 * 1000; // 4 hours idle timeout

/**
 * Revoke all sessions for a user (e.g., upon password reset or account disablement)
 */
export async function revokeAllUserSessions(userId: string): Promise<void> {
  clearSessionCache();
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Revoke all sessions for a specific tenant (e.g. upon tenant-wide security rotation)
 */
export async function revokeAllTenantSessions(tenantId: string): Promise<void> {
  clearSessionCache();
  await prisma.session.updateMany({
    where: { activeTenantId: tenantId, revokedAt: null },
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

  const normalizedSlug = workspaceSlug.toLowerCase().trim();
  const cacheKey = `${token}:${normalizedSlug}`;
  const now = Date.now();
  const cached = sessionContextCache.get(cacheKey);
  if (cached && now - cached.cachedAt < SESSION_CACHE_TTL_MS) {
    // Fast database check to guarantee revoked permissions and deactivations take effect immediately,
    // including across independent server processes without distributed caching infrastructure.
    const authRecord = await prisma.session.findUnique({
      where: { token },
      select: {
        revokedAt: true,
        expiresAt: true,
        user: {
          select: {
            accountState: true,
            memberships: {
              where: { tenantId: cached.context.tenantId },
              select: {
                role: true,
                hasFinanceAccess: true,
                hasHrAccess: true,
                isActive: true,
                tenant: { select: { lifecycleState: true } },
              },
            },
          },
        },
      },
    });

    if (!authRecord || authRecord.revokedAt || authRecord.expiresAt < new Date()) {
      sessionContextCache.delete(cacheKey);
      throw new UnauthorizedException("Session has expired or was revoked");
    }

    if (authRecord.user.accountState !== UserAccountState.ACTIVE) {
      sessionContextCache.delete(cacheKey);
      throw new UnauthorizedException("User account is disabled");
    }

    const membership = authRecord.user.memberships[0];
    if (!membership || !membership.isActive) {
      sessionContextCache.delete(cacheKey);
      throw new UnauthorizedException(`User is not an active member of workspace '${workspaceSlug}'`);
    }

    if (membership.tenant.lifecycleState !== TenantLifecycleState.ACTIVE) {
      sessionContextCache.delete(cacheKey);
      throw new UnauthorizedException(`Workspace '${workspaceSlug}' is suspended or pending deletion`);
    }

    // Immediately reflect current role, finance access, and HR access committed in database
    const updatedContext: TenantContext = {
      ...cached.context,
      role: membership.role,
      hasFinanceAccess: membership.hasFinanceAccess,
      hasHrAccess: (membership as any).hasHrAccess ?? false,
    };
    cached.context = updatedContext;
    return updatedContext;
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
    where: { slug: normalizedSlug },
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

  const tenantSettings = (tenant.settings as Record<string, any>) || {};
  const userAvatars = (tenantSettings.userAvatars as Record<string, string>) || {};

  const result: TenantContext = {
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
    hasHrAccess: (membership as any).hasHrAccess ?? false,
    avatarUrl: userAvatars[membership.id] ?? null,
    timezone: tenant.timezone,
    currency: tenant.currency,
  };

  sessionContextCache.set(cacheKey, {
    context: result,
    cachedAt: now,
  });

  return result;
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

/**
 * Resolves current TenantContext directly from session cookies.
 * When workspaceSlug is omitted, resolves from activeTenantId or the user's primary active membership.
 */
export async function getTenantContextFromSession(
  workspaceSlug?: string
): Promise<TenantContext | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    if (workspaceSlug) {
      return await resolveSessionAndTenant(token, workspaceSlug);
    }

    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          include: {
            memberships: {
              where: { isActive: true },
              include: {
                tenant: true,
                employee: true,
              },
            },
          },
        },
      },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      return null;
    }

    if (session.user.accountState !== UserAccountState.ACTIVE) {
      return null;
    }

    const activeMemberships = session.user.memberships.filter(
      (m) => m.tenant.lifecycleState === TenantLifecycleState.ACTIVE
    );

    if (activeMemberships.length === 0) {
      return null;
    }

    const membership =
      (session.activeTenantId &&
        activeMemberships.find((m) => m.tenantId === session.activeTenantId)) ||
      activeMemberships[0];

    const tenant = membership.tenant;

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
  } catch (error) {
    console.error("getTenantContextFromSession error:", error);
    return null;
  }
}
