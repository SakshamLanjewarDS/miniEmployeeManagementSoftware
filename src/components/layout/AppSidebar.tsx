"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { TenantContext } from "@/server/tenancy/context";
import {
  LayoutDashboard,
  Inbox,
  CheckSquare,
  Layers,
  TrendingUp,
  Shield,
  Clock,
  FolderKanban,
  FileCheck2,
  MapPin,
  FileText,
  Users,
  Calendar,
  Receipt,
  CreditCard,
  Building,
  Briefcase,
  Wrench,
  Activity,
  User,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  X,
  AlertCircle,
  MoreVertical,
} from "lucide-react";

interface AppSidebarProps {
  context: TenantContext;
}

interface NavDestination {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  isPermitted: boolean;
}

interface NavGroupConfig {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavDestination[];
}

export function AppSidebar({ context }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Desktop Collapsed Rail State (persisted in localStorage)
  const [isCollapsed, setIsCollapsed] = useState(false);
  // Mobile Drawer State
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  // Multi-Toggle Navigation Groups State (Toggled groups remain open independently)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  // Account Popover State
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  // Compact Rail Flyout Group State
  const [compactFlyoutGroup, setCompactFlyoutGroup] = useState<string | null>(null);
  const [compactFlyoutTop, setCompactFlyoutTop] = useState<number>(0);

  // Dynamic Badges
  const [decisionCount, setDecisionCount] = useState<number | null>(null);
  const [healthAttention, setHealthAttention] = useState<boolean>(false);

  // Element Refs for Accessibility and Focus Management
  const lastPathRef = useRef<string>("");
  const compactFlyoutRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const groupButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const isOwnerOrAdmin = context.role === "OWNER" || context.role === "ADMIN";
  const hasFinance = isOwnerOrAdmin || context.hasFinanceAccess;

  // Hydration-safe desktop collapse preference restoration
  useEffect(() => {
    try {
      const stored = localStorage.getItem("studio_sidebar_collapsed");
      if (stored === "true") setIsCollapsed(true);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Listen to mobile open events from AppTopbar hamburger
  useEffect(() => {
    const handleOpenMobile = () => setIsMobileOpen(true);
    window.addEventListener("open-mobile-sidebar", handleOpenMobile);
    return () => window.removeEventListener("open-mobile-sidebar", handleOpenMobile);
  }, []);

  // Close mobile drawer and dismiss menus on navigation
  useEffect(() => {
    setIsMobileOpen(false);
    setUserMenuOpen(false);
    setCompactFlyoutGroup(null);
  }, [pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileOpen]);

  // Handle Escape key globally for drawer and popovers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isMobileOpen) {
          setIsMobileOpen(false);
        } else if (compactFlyoutGroup) {
          const groupId = compactFlyoutGroup;
          setCompactFlyoutGroup(null);
          groupButtonRefs.current[groupId]?.focus();
        } else if (userMenuOpen) {
          setUserMenuOpen(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileOpen, compactFlyoutGroup, userMenuOpen]);

  // Handle outside clicks to dismiss compact flyout and user menu
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        compactFlyoutGroup &&
        compactFlyoutRef.current &&
        !compactFlyoutRef.current.contains(target)
      ) {
        // Check if clicked trigger button
        const clickedTrigger = Object.values(groupButtonRefs.current).some(
          (btn) => btn && btn.contains(target)
        );
        if (!clickedTrigger) {
          setCompactFlyoutGroup(null);
        }
      }

      if (
        userMenuOpen &&
        userMenuRef.current &&
        !userMenuRef.current.contains(target)
      ) {
        setUserMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [compactFlyoutGroup, userMenuOpen]);

  // Load live actionable Decision Inbox count for leadership
  useEffect(() => {
    if (!isOwnerOrAdmin) return;
    let isMounted = true;

    const fetchDecisionCount = async () => {
      try {
        const res = await fetch(`/api/inbox?workspaceSlug=${encodeURIComponent(context.tenantSlug)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted) return;
        const count = data?.counts?.myDecisions ?? data?.counts?.total ?? null;
        if (typeof count === "number" && count > 0) {
          setDecisionCount(count);
        } else {
          setDecisionCount(null);
        }
      } catch {
        if (isMounted) setDecisionCount(null);
      }
    };

    fetchDecisionCount();
    return () => {
      isMounted = false;
    };
  }, [context.tenantSlug, isOwnerOrAdmin]);

  // Load Integration Health attention indicator
  useEffect(() => {
    if (!isOwnerOrAdmin) return;
    let isMounted = true;

    const fetchHealth = async () => {
      try {
        const res = await fetch("/api/integrations/health", {
          headers: { "x-workspace-slug": context.tenantSlug },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted) return;
        const needsAttention =
          data?.overallHealth !== "HEALTHY" ||
          (typeof data?.failingConnectorsCount === "number" && data.failingConnectorsCount > 0);
        setHealthAttention(Boolean(needsAttention));
      } catch {
        if (isMounted) setHealthAttention(false);
      }
    };

    fetchHealth();
    return () => {
      isMounted = false;
    };
  }, [context.tenantSlug, isOwnerOrAdmin]);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("studio_sidebar_collapsed", String(next));
      } catch {
        // Ignore localStorage errors
      }
      return next;
    });
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push(`/w/${context.tenantSlug}/login`);
    } catch {
      window.location.href = `/w/${context.tenantSlug}/login`;
    }
  };

  // -------------------------------------------------------------
  // NAVIGATION CONFIGURATION (Role-Safe & Exactly Ordered)
  // -------------------------------------------------------------

  // 1. DIRECT NAVIGATION LINKS (Exactly 3)
  const directLinks: NavDestination[] = useMemo(() => {
    return [
      {
        id: "dashboard",
        label: "Dashboard",
        href: `/w/${context.tenantSlug}/dashboard`,
        icon: LayoutDashboard,
        isPermitted: true,
      },
      ...(isOwnerOrAdmin
        ? [
            {
              id: "inbox",
              label: "Decision Inbox",
              href: `/w/${context.tenantSlug}/inbox`,
              icon: Inbox,
              badge: decisionCount && decisionCount > 0 ? (decisionCount > 99 ? "99+" : decisionCount) : undefined,
              isPermitted: true,
            },
          ]
        : []),
      {
        id: "my-work",
        label: "My Work Today",
        href: `/w/${context.tenantSlug}/my-work`,
        icon: CheckSquare,
        isPermitted: true,
      },
    ];
  }, [context.tenantSlug, isOwnerOrAdmin, decisionCount]);

  // 2. FIVE COLLAPSIBLE NAVIGATION GROUPS
  const allGroups: NavGroupConfig[] = useMemo(() => {
    return [
      // GROUP 1 — Work Management
      {
        id: "work-management",
        title: "Work Management",
        icon: Layers,
        items: [
          {
            id: "tasks",
            label: isOwnerOrAdmin ? "Studio Tasks" : "My Tasks",
            href: `/w/${context.tenantSlug}/tasks`,
            icon: Layers,
            isPermitted: true,
          },
          {
            id: "completed-tasks",
            label: isOwnerOrAdmin ? "Completed Tasks" : "My Completed Tasks",
            href: `/w/${context.tenantSlug}/tasks/completed`,
            icon: CheckSquare,
            isPermitted: true,
          },
          {
            id: "capacity",
            label: "Workload & Capacity",
            href: `/w/${context.tenantSlug}/capacity`,
            icon: TrendingUp,
            isPermitted: isOwnerOrAdmin,
          },
          {
            id: "executive-tasks",
            label: "Executive Tasks",
            href: `/w/${context.tenantSlug}/executive-tasks`,
            icon: Shield,
            isPermitted: isOwnerOrAdmin,
          },
          {
            id: "meetings",
            label: "Studio Meetings",
            href: `/w/${context.tenantSlug}/meetings`,
            icon: Clock,
            isPermitted: true,
          },
        ],
      },
      // GROUP 2 — Projects & Delivery
      {
        id: "projects-delivery",
        title: "Projects & Delivery",
        icon: FolderKanban,
        items: [
          {
            id: "projects",
            label: "Projects",
            href: `/w/${context.tenantSlug}/projects`,
            icon: FolderKanban,
            isPermitted: true,
          },
          {
            id: "drawings",
            label: "Drawings & Approvals",
            href: `/w/${context.tenantSlug}/drawings`,
            icon: FileCheck2,
            isPermitted: true,
          },
          {
            id: "visits",
            label: "Site Visits & Issues",
            href: `/w/${context.tenantSlug}/visits`,
            icon: MapPin,
            isPermitted: true,
          },
          {
            id: "templates",
            label: "Project Templates",
            href: `/w/${context.tenantSlug}/templates`,
            icon: FileText,
            isPermitted: isOwnerOrAdmin,
          },
        ],
      },
      // GROUP 3 — People & HR
      {
        id: "people-hr",
        title: "People & HR",
        icon: Users,
        items: [
          {
            id: "team",
            label: "Studio Team",
            href: `/w/${context.tenantSlug}/team`,
            icon: Users,
            isPermitted: true,
          },
          {
            id: "hiring",
            label: "Hiring & Records",
            href: `/w/${context.tenantSlug}/hiring`,
            icon: FileCheck2,
            isPermitted: context.role === "ADMIN" || context.role === "OWNER",
          },
          {
            id: "leave",
            label: isOwnerOrAdmin ? "Staff Leaves" : "My Leave",
            href: isOwnerOrAdmin
              ? `/w/${context.tenantSlug}/leave`
              : `/w/${context.tenantSlug}/leave/my-leave`,
            icon: Calendar,
            isPermitted: true,
          },
          {
            id: "attendance",
            label: "Attendance",
            href: `/w/${context.tenantSlug}/attendance`,
            icon: Clock,
            isPermitted: isOwnerOrAdmin,
          },
          {
            id: "employee-performance",
            label: "Employee Performance",
            href: `/w/${context.tenantSlug}/employee-performance`,
            icon: TrendingUp,
            isPermitted: isOwnerOrAdmin,
          },
        ],
      },
      // GROUP 4 — Finance & Payroll
      {
        id: "finance-payroll",
        title: "Finance & Payroll",
        icon: CreditCard,
        items: [
          {
            id: "finance",
            label: "Project Finance",
            href: `/w/${context.tenantSlug}/finance`,
            icon: Receipt,
            isPermitted: hasFinance,
          },
          {
            id: "payroll",
            label: "Salary Calculation",
            href: `/w/${context.tenantSlug}/payroll`,
            icon: CreditCard,
            isPermitted: isOwnerOrAdmin,
          },
        ],
      },
      // GROUP 5 — Contacts & Partners
      {
        id: "contacts-partners",
        title: "Contacts & Partners",
        icon: Building,
        items: [
          {
            id: "directory",
            label: "Clients & Directory",
            href: `/w/${context.tenantSlug}/directory`,
            icon: Building,
            isPermitted: true,
          },
          {
            id: "vendors",
            label: isOwnerOrAdmin ? "Vendors" : "Vendor Directory",
            href: isOwnerOrAdmin
              ? `/w/${context.tenantSlug}/vendors`
              : `/w/${context.tenantSlug}/vendors/directory`,
            icon: Briefcase,
            isPermitted: true,
          },
          {
            id: "contractors",
            label: "Contractors",
            href: `/w/${context.tenantSlug}/contractors`,
            icon: Wrench,
            isPermitted: true,
          },
          {
            id: "consultants",
            label: "Consultants",
            href: `/w/${context.tenantSlug}/consultants`,
            icon: Briefcase,
            isPermitted: true,
          },
        ],
      },
    ];
  }, [context.tenantSlug, isOwnerOrAdmin, hasFinance]);

  // Filter groups to only include authorized items, and hide completely empty groups
  const authorizedGroups = useMemo(() => {
    return allGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.isPermitted),
      }))
      .filter((group) => group.items.length > 0);
  }, [allGroups]);

  // -------------------------------------------------------------
  // PRECISE ROUTE MATCHING HELPER
  // -------------------------------------------------------------
  const isRouteActive = (item: NavDestination) => {
    const isDashboard = item.id === "dashboard";
    if (isDashboard) {
      return (
        pathname === item.href ||
        pathname.startsWith(item.href + "/") ||
        pathname === `/w/${context.tenantSlug}` ||
        pathname === `/w/${context.tenantSlug}/`
      );
    }

    // Enterprise Payroll also matches /payroll/calculate and any nested payroll subroutes
    if (item.id === "payroll") {
      return pathname === item.href || pathname.startsWith(item.href + "/");
    }

    // Precise segment-aware matching (e.g. /projects matches /projects and /projects/abc, but not /projects-other)
    return pathname === item.href || pathname.startsWith(item.href + "/");
  };

  const isIntegrationsActive =
    pathname === `/w/${context.tenantSlug}/integrations` ||
    pathname.startsWith(`/w/${context.tenantSlug}/integrations/`);

  // -------------------------------------------------------------
  // MULTI-TOGGLE RESOLUTION: Route Change vs. Manual Toggles
  // -------------------------------------------------------------
  useEffect(() => {
    if (pathname === lastPathRef.current) return;
    lastPathRef.current = pathname;

    // Detect if the current route belongs to an authorized group child
    let matchingGroupId: string | null = null;
    for (const group of authorizedGroups) {
      if (group.items.some((item) => isRouteActive(item))) {
        matchingGroupId = group.id;
        break;
      }
    }

    // Ensure the active group is expanded, while keeping all other open groups open
    if (matchingGroupId) {
      setOpenGroups((prev) => ({
        ...prev,
        [matchingGroupId!]: true,
      }));
    }

    setCompactFlyoutGroup(null);
    setUserMenuOpen(false);
  }, [pathname, authorizedGroups]);

  // Group Header Manual Toggle: independently toggles each group without closing other groups
  const handleToggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const userInitials = context.userFullName
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .substring(0, 2)
    .toUpperCase() || "US";

  const timezoneCity = context.timezone.split("/")[1]?.replace(/_/g, " ") || "Kolkata";

  // Active flyout group definition for compact mode
  const activeCompactGroup = useMemo(() => {
    return authorizedGroups.find((g) => g.id === compactFlyoutGroup) || null;
  }, [authorizedGroups, compactFlyoutGroup]);

  // =============================================================
  // COMPACT DESKTOP RAIL (Image E Collapsed Treatment)
  // =============================================================
  if (isCollapsed) {
    return (
      <aside
        suppressHydrationWarning
        className="w-[78px] shrink-0 h-screen sticky top-0 z-30 p-2.5 hidden lg:flex flex-col"
        aria-label="Studio Navigation (Rail)"
      >
        <div className="h-full bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between py-3.5 px-2">
          {/* Top: Brand Logo & Expand Trigger */}
          <div className="flex flex-col items-center gap-3 shrink-0">
            <button
              type="button"
              suppressHydrationWarning
              onClick={toggleCollapse}
              title="Expand Sidebar"
              aria-label="Expand Sidebar"
              className="p-2 text-slate-500 hover:text-[#3562E8] hover:bg-slate-100 rounded-2xl transition-all cursor-pointer"
            >
              <PanelLeftOpen className="w-5 h-5" />
            </button>

            <div className="w-10 h-10 rounded-2xl overflow-hidden bg-[#0B122B] p-0.5 border border-amber-400/20 shadow-xs shrink-0 flex items-center justify-center">
              <Image
                src="/icons/icon-192.png"
                alt="100% DESIGN Studio"
                width={36}
                height={36}
                className="w-full h-full object-cover rounded-xl"
              />
            </div>

            <div className="w-6 h-px bg-slate-200/80 my-0.5" />
          </div>

          {/* Middle: Icon Rail with Direct Links and Group Triggers */}
          <div className="flex-1 overflow-y-auto no-scrollbar py-2 space-y-2 flex flex-col items-center">
            {/* 3 Direct Navigation Links */}
            {directLinks.map((item) => {
              const isActive = isRouteActive(item);
              const Icon = item.icon;

              return (
                <div key={item.id} className="relative group flex justify-center">
                  <Link
                    href={item.href}
                    aria-label={item.label}
                    aria-current={isActive ? "page" : undefined}
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                      isActive
                        ? "bg-[#3562E8] text-white shadow-md shadow-[#3562E8]/25 font-bold"
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/80"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </Link>

                  {/* Decision Inbox badge indicator in compact rail */}
                  {item.badge && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
                  )}

                  {/* Accessible tooltip */}
                  <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-xl whitespace-nowrap shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                    {item.label}
                  </div>
                </div>
              );
            })}

            {/* Divider */}
            <div className="w-6 h-px bg-slate-200/80 my-1 self-center" />

            {/* 5 Collapsible Group Flyout Triggers */}
            {authorizedGroups.map((group) => {
              const isGroupActive = group.items.some((item) => isRouteActive(item));
              const isFlyoutOpen = compactFlyoutGroup === group.id;
              const GroupIcon = group.icon;

              return (
                <div key={group.id} className="relative group flex justify-center">
                  <button
                    type="button"
                    suppressHydrationWarning
                    ref={(el) => {
                      groupButtonRefs.current[group.id] = el;
                    }}
                    aria-label={`${group.title} navigation`}
                    aria-haspopup="true"
                    aria-expanded={isFlyoutOpen}
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const flyoutHeight = Math.min(group.items.length * 44 + 50, 360);
                      const maxTop = window.innerHeight - flyoutHeight - 20;
                      setCompactFlyoutTop(Math.max(16, Math.min(rect.top, maxTop)));
                      setCompactFlyoutGroup((prev) => (prev === group.id ? null : group.id));
                    }}
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                      isGroupActive
                        ? "bg-blue-50 text-[#3562E8] ring-2 ring-[#3562E8]/40 font-bold"
                        : isFlyoutOpen
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/80"
                    }`}
                  >
                    <GroupIcon className="w-5 h-5" />
                  </button>

                  {/* Tooltip when flyout is closed */}
                  {!isFlyoutOpen && (
                    <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-xl whitespace-nowrap shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                      {group.title}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom Area: Settings & Integrations and Account Control */}
          <div className="flex flex-col items-center gap-2 pt-2 border-t border-slate-200/80 shrink-0">
            {/* Settings & Integrations (Direct Icon) */}
            {isOwnerOrAdmin && (
              <div className="relative group flex justify-center">
                <Link
                  href={`/w/${context.tenantSlug}/integrations`}
                  aria-label="Settings & Integrations"
                  aria-current={isIntegrationsActive ? "page" : undefined}
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all relative ${
                    isIntegrationsActive
                      ? "bg-[#3562E8] text-white shadow-md shadow-[#3562E8]/25 font-bold"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/80"
                  }`}
                >
                  <Activity className="w-5 h-5" />
                  {healthAttention && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white animate-pulse" />
                  )}
                </Link>

                <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-xl whitespace-nowrap shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                  Settings & Integrations {healthAttention && "• Attention Required"}
                </div>
              </div>
            )}

            {/* Authenticated User Avatar Popover Trigger */}
            <div className="relative flex justify-center" ref={userMenuRef}>
              <button
                type="button"
                suppressHydrationWarning
                onClick={() => setUserMenuOpen((prev) => !prev)}
                title={`${context.userFullName} (${context.role})`}
                aria-label="User Account Menu"
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
                className="w-10 h-10 rounded-2xl bg-[#CEDEFF] text-[#2C308D] font-bold text-xs flex items-center justify-center hover:ring-2 hover:ring-[#3562E8] transition-all cursor-pointer shadow-2xs"
              >
                {userInitials}
              </button>

              {/* Flyout Account Popover */}
              {userMenuOpen && (
                <div
                  className="fixed left-[86px] bottom-4 z-50 w-64 bg-white rounded-2xl border border-slate-200 shadow-2xl p-3 animate-in fade-in zoom-in-95 duration-150"
                  role="menu"
                  aria-label="User Account Options"
                >
                  <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
                    <div className="w-9 h-9 rounded-xl bg-[#CEDEFF] text-[#2C308D] font-bold text-xs flex items-center justify-center shrink-0">
                      {userInitials}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {context.userFullName}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {context.designation || context.role}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        <span>{context.employeeId || "OWNER"}</span>
                        <span className="mx-1">•</span>
                        <span className="font-semibold text-[#3562E8]">{context.role}</span>
                      </div>
                    </div>
                  </div>

                  <div className="py-1.5 space-y-0.5">
                    <Link
                      href={`/w/${context.tenantSlug}/profile`}
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 transition-colors"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      <span>Profile & Records</span>
                    </Link>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 mb-2">
                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3 text-emerald-500" />
                      <span>Encrypted Session</span>
                    </span>
                    <span className="font-mono">{timezoneCity}</span>
                  </div>

                  <button
                    type="button"
                    suppressHydrationWarning
                    onClick={handleLogout}
                    role="menuitem"
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick Sign Out button in compact rail */}
            <button
              type="button"
              suppressHydrationWarning
              onClick={handleLogout}
              title="Sign Out"
              aria-label="Sign Out"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewport-Anchored Group Flyout Popover */}
        {activeCompactGroup && (
          <div
            ref={compactFlyoutRef}
            style={{ top: `${compactFlyoutTop}px` }}
            className="fixed left-[86px] z-50 w-56 bg-white rounded-2xl border border-slate-200/90 shadow-2xl p-2.5 animate-in fade-in zoom-in-95 duration-150"
            role="menu"
            aria-label={`${activeCompactGroup.title} menu`}
          >
            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1 flex items-center justify-between">
              <span>{activeCompactGroup.title}</span>
              <button
                type="button"
                suppressHydrationWarning
                onClick={() => {
                  const groupId = compactFlyoutGroup;
                  setCompactFlyoutGroup(null);
                  if (groupId) groupButtonRefs.current[groupId]?.focus();
                }}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
                title="Close menu"
                aria-label="Close menu"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <ul className="space-y-1">
              {activeCompactGroup.items.map((item) => {
                const isActive = isRouteActive(item);
                const ItemIcon = item.icon;
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      role="menuitem"
                      aria-current={isActive ? "page" : undefined}
                      onClick={() => setCompactFlyoutGroup(null)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group ${
                        isActive
                          ? "bg-[#3562E8] text-white font-semibold shadow-xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <ItemIcon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? "text-white" : "text-slate-400 group-hover:text-slate-700"
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </aside>
    );
  }

  // =============================================================
  // EXPANDED DESKTOP SIDEBAR & MOBILE DRAWER (Standard Layout)
  // =============================================================
  const sidebarContent = (
    <div className="h-full bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between overflow-hidden" suppressHydrationWarning>
      {/* 1. BRAND HEADER (Fixed Top) */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0" suppressHydrationWarning>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl overflow-hidden bg-[#0B122B] p-0.5 border border-amber-400/20 shadow-xs shrink-0 flex items-center justify-center">
            <Image
              src="/icons/icon-192.png"
              alt="100% DESIGN Studio"
              width={40}
              height={40}
              className="w-full h-full object-cover rounded-xl"
            />
          </div>
          <div className="min-w-0">
            <h2 className="type-card-title text-[#0B122B] truncate">
              {context.tenantName}
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="type-helper text-slate-500 font-mono truncate">
                {context.tenantSlug}
              </span>
            </div>
          </div>
        </div>

        {/* Collapse toggle (Desktop) or Close toggle (Mobile) */}
        <button
          type="button"
          suppressHydrationWarning
          onClick={() => {
            if (isMobileOpen) setIsMobileOpen(false);
            else toggleCollapse();
          }}
          title={isMobileOpen ? "Close navigation drawer" : "Collapse navigation to rail"}
          aria-label={isMobileOpen ? "Close navigation drawer" : "Collapse navigation to rail"}
          className="p-2 text-slate-400 hover:text-[#3562E8] hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
        >
          {isMobileOpen ? <X className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
        </button>
      </div>

      {/* 2. SCROLLABLE NAVIGATION BODY (Flexible Middle Area) */}
      <nav
        className="flex-1 overflow-y-auto px-3.5 py-4 space-y-4 no-scrollbar"
        aria-label="Studio Main Navigation"
      >
        {/* THREE DIRECT NAVIGATION LINKS */}
        <div className="space-y-1">
          {directLinks.map((item) => {
            const isActive = isRouteActive(item);
            const Icon = item.icon;

            return (
              <Link
                key={item.id}
                href={item.href}
                prefetch={false}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl type-nav-label transition-all duration-150 group press-feedback ${
                  isActive
                    ? "bg-[#3562E8] text-white font-semibold shadow-sm shadow-[#3562E8]/20"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 hover:translate-x-0.5 font-medium"
                }`}
                onClick={() => {
                  if (isMobileOpen) setIsMobileOpen(false);
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-transform duration-150 group-hover:scale-110 ${
                      isActive ? "text-white" : "text-slate-400 group-hover:text-slate-700"
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`type-badge font-medium px-2 py-0.5 rounded-full ${
                      isActive ? "bg-white/20 text-white" : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* EXISTING-STYLE DIVIDER */}
        <div className="h-px bg-slate-200/80 my-2" />

        {/* FIVE COLLAPSIBLE NAVIGATION GROUPS (Independent Multi-Toggle Support) */}
        <div className="space-y-2">
          {authorizedGroups.map((group) => {
            const isExpanded = Boolean(openGroups[group.id]);
            const isGroupActive = group.items.some((item) => isRouteActive(item));
            const GroupIcon = group.icon;

            return (
              <div key={group.id} className="space-y-1">
                {/* Group Accordion Header Button */}
                <button
                  type="button"
                  suppressHydrationWarning
                  id={`group-header-${group.id}`}
                  aria-expanded={isExpanded}
                  aria-controls={`group-panel-${group.id}`}
                  onClick={() => handleToggleGroup(group.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all cursor-pointer ${
                    isGroupActive
                      ? "text-[#3562E8] bg-blue-50/70 font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/60 font-medium"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <GroupIcon
                      className={`w-4 h-4 shrink-0 ${
                        isGroupActive ? "text-[#3562E8]" : "text-slate-400"
                      }`}
                    />
                    <span className="truncate">{group.title}</span>
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                      isExpanded ? "rotate-180 text-slate-700" : "text-slate-400"
                    }`}
                  />
                </button>

                {/* Collapsible Children Container with Hardware-Accelerated Smooth Transition */}
                <div
                  className={`smooth-accordion-grid ${isExpanded ? "open" : ""}`}
                  aria-hidden={!isExpanded}
                >
                  <div className="smooth-accordion-inner">
                    <ul
                      id={`group-panel-${group.id}`}
                      role="region"
                      aria-labelledby={`group-header-${group.id}`}
                      className="ml-3 pl-2.5 border-l-2 border-slate-200/80 space-y-1 py-1"
                    >
                      {group.items.map((item) => {
                        const isActive = isRouteActive(item);
                        const ItemIcon = item.icon;

                        return (
                          <li key={item.id}>
                            <Link
                              href={item.href}
                              prefetch={false}
                              tabIndex={isExpanded ? 0 : -1}
                              aria-current={isActive ? "page" : undefined}
                              className={`flex items-center justify-between px-3 py-2 rounded-xl type-nav-label transition-all duration-150 group press-feedback ${
                                isActive
                                  ? "bg-[#3562E8] text-white font-semibold shadow-xs"
                                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 hover:translate-x-0.5 font-medium"
                              }`}
                              onClick={() => {
                                if (isMobileOpen) setIsMobileOpen(false);
                              }}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <ItemIcon
                                  className={`w-3.5 h-3.5 shrink-0 transition-transform duration-150 group-hover:scale-110 ${
                                    isActive
                                      ? "text-white"
                                      : "text-slate-400 group-hover:text-slate-700"
                                  }`}
                                />
                                <span className="truncate">{item.label}</span>
                              </div>

                              {item.badge && (
                                <span
                                  className={`type-badge font-medium px-1.5 py-0.5 rounded-full ${
                                    isActive
                                      ? "bg-white/20 text-white"
                                      : "bg-slate-100 text-slate-700"
                                  }`}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </nav>

      {/* 3. SETTINGS & ACCOUNT FOOTER (Fixed Bottom) */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-2 shrink-0 relative">
        {/* Settings & Integrations */}
        {isOwnerOrAdmin && (
          <Link
            href={`/w/${context.tenantSlug}/integrations`}
            aria-current={isIntegrationsActive ? "page" : undefined}
            onClick={() => {
              if (isMobileOpen) setIsMobileOpen(false);
            }}
            className={`flex items-center justify-between px-3 py-2 rounded-xl type-nav-label transition-all group ${
              isIntegrationsActive
                ? "bg-[#3562E8] text-white font-semibold shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Activity
                className={`w-4 h-4 shrink-0 ${
                  isIntegrationsActive ? "text-white" : "text-slate-400 group-hover:text-slate-700"
                }`}
              />
              <span className="truncate">Settings & Integrations</span>
            </div>

            {healthAttention && (
              <span
                title="Action required on integration health"
                className="flex items-center gap-1 type-badge font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>Attention</span>
              </span>
            )}
          </Link>
        )}

        {/* Authenticated User Account Control */}
        <div className="relative" ref={userMenuRef}>
          <div className="flex items-center justify-between gap-2 p-1.5 rounded-2xl hover:bg-white/80 transition-colors">
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => setUserMenuOpen((prev) => !prev)}
              aria-expanded={userMenuOpen}
              aria-haspopup="menu"
              className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer flex-1"
            >
              <div className="w-9 h-9 rounded-2xl bg-[#CEDEFF] text-[#2C308D] font-semibold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                {userInitials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-slate-900 truncate">
                  {context.userFullName}
                </div>
                <div className="type-helper text-slate-500 truncate">
                  {context.designation || context.role}
                </div>
                <div className="type-helper text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                  <span>{context.employeeId || "OWNER"}</span>
                  <span>•</span>
                  <span className="font-medium text-[#3562E8]">{context.role}</span>
                </div>
              </div>
              <MoreVertical className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
            </button>

            <button
              type="button"
              suppressHydrationWarning
              onClick={handleLogout}
              title="Sign out of workspace"
              aria-label="Sign out of workspace"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Account Popover Menu */}
          {userMenuOpen && (
            <div
              className="absolute bottom-full mb-2 left-0 right-0 z-50 bg-white rounded-2xl border border-slate-200 shadow-xl p-3 animate-in fade-in zoom-in-95 duration-150"
              role="menu"
              aria-label="Account Options"
            >
              <div className="pb-2.5 border-b border-slate-100">
                <div className="text-xs font-bold text-slate-900">{context.userFullName}</div>
                <div className="text-[11px] text-slate-500">{context.userEmail || context.tenantSlug}</div>
              </div>

              <div className="py-1.5 space-y-0.5">
                <Link
                  href={`/w/${context.tenantSlug}/profile`}
                  role="menuitem"
                  onClick={() => {
                    setUserMenuOpen(false);
                    if (isMobileOpen) setIsMobileOpen(false);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 transition-colors"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  <span>Profile & Records</span>
                </Link>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 mb-2">
                <span className="flex items-center gap-1">
                  <Shield className="w-3 h-3 text-emerald-500" />
                  <span>Encrypted Session</span>
                </span>
                <span className="font-mono">{timezoneCity}</span>
              </div>

              <button
                type="button"
                suppressHydrationWarning
                onClick={handleLogout}
                role="menuitem"
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-rose-500" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Inset Floating Sidebar */}
      <aside
        suppressHydrationWarning
        className="w-[276px] shrink-0 h-screen sticky top-0 z-30 p-2.5 hidden lg:block"
        aria-label="Studio Navigation"
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div
          suppressHydrationWarning
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Studio Main Navigation Drawer"
        >
          {/* Backdrop Blur */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200"
            onClick={() => setIsMobileOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Slide Panel */}
          <div className="fixed inset-y-0 left-0 w-[300px] max-w-[85vw] p-2.5 sm:p-3 flex flex-col z-50 pt-safe pb-safe animate-in slide-in-from-left duration-250">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
