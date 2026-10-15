"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { TenantContext } from "@/server/tenancy/context";
import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  MapPin,
  FileCheck2,
  Receipt,
  Users,
  Building,
  LogOut,
  Shield,
  Layers,
  Wrench,
  Briefcase,
  User,
  Inbox,
  Calendar,
  CreditCard,
  Clock,
  TrendingUp,
  AlertTriangle,
  FileText,
  Activity,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  ChevronRight,
  X,
  Sparkles,
  Calculator,
} from "lucide-react";
import { PwaInstallButton } from "@/components/pwa/PwaInstallButton";

interface AppSidebarProps {
  context: TenantContext;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  badgeColor?: string;
  children?: Array<{
    name: string;
    href: string;
    badge?: string | number;
  }>;
}

interface NavGroup {
  groupName: string;
  items: NavItem[];
}

export function AppSidebar({ context }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Desktop Collapsed State (persisted in localStorage)
  const [isCollapsed, setIsCollapsed] = useState(false);
  // Mobile Drawer State
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  // Expanded Navigation Accordion Groups
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

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

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Handle escape key to close mobile drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileOpen) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileOpen]);

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

  const toggleGroup = (groupKey: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push(`/w/${context.tenantSlug}/login`);
    } catch {
      window.location.href = `/w/${context.tenantSlug}/login`;
    }
  };

  const isOwnerOrAdmin = context.role === "OWNER" || context.role === "ADMIN";
  const hasFinance = isOwnerOrAdmin || context.hasFinanceAccess;

  // Build Authorized Navigation Groups matching Image E's clean grouped architecture
  const navGroups: NavGroup[] = [
    {
      groupName: "Workspace",
      items: [
        {
          name: "Dashboard",
          href: `/w/${context.tenantSlug}/dashboard`,
          icon: LayoutDashboard,
        },
        ...(isOwnerOrAdmin
          ? [
              {
                name: "Decision Inbox",
                href: `/w/${context.tenantSlug}/inbox`,
                icon: Inbox,
              },
            ]
          : []),
        {
          name: "My Work Today",
          href: `/w/${context.tenantSlug}/my-work`,
          icon: CheckSquare,
        },
        {
          name: isOwnerOrAdmin ? "Studio Tasks" : "My Tasks",
          href: `/w/${context.tenantSlug}/tasks`,
          icon: Layers,
        },
        ...(isOwnerOrAdmin
          ? [
              {
                name: "Workload & Capacity",
                href: `/w/${context.tenantSlug}/capacity`,
                icon: TrendingUp,
              },
            ]
          : []),
      ],
    },
    {
      groupName: "Projects & Sites",
      items: [
        {
          name: "Projects",
          href: `/w/${context.tenantSlug}/projects`,
          icon: FolderKanban,
        },
        ...(isOwnerOrAdmin
          ? [
              {
                name: "Project Templates",
                href: `/w/${context.tenantSlug}/templates`,
                icon: FileText,
              },
            ]
          : []),
        {
          name: "Site Visits & Issues",
          href: `/w/${context.tenantSlug}/visits`,
          icon: MapPin,
        },
        {
          name: "Drawings & Approvals",
          href: `/w/${context.tenantSlug}/drawings`,
          icon: FileCheck2,
        },
      ],
    },
    {
      groupName: "People & Practice",
      items: [
        {
          name: "Studio Team",
          href: `/w/${context.tenantSlug}/team`,
          icon: Users,
        },
        ...(isOwnerOrAdmin
          ? [
              {
                name: "Staff Leaves",
                href: `/w/${context.tenantSlug}/leave`,
                icon: Calendar,
              },
              {
                name: "Attendance",
                href: `/w/${context.tenantSlug}/attendance`,
                icon: Clock,
              },
              {
                name: "Employee Performance",
                href: `/w/${context.tenantSlug}/employee-performance`,
                icon: TrendingUp,
              },
              {
                name: "Enterprise Payroll",
                href: `/w/${context.tenantSlug}/payroll`,
                icon: CreditCard,
              },
              {
                name: "Salary Calculator",
                href: `/w/${context.tenantSlug}/payroll/calculate`,
                icon: Calculator,
              },
              {
                name: "Executive Tasks",
                href: `/w/${context.tenantSlug}/executive-tasks`,
                icon: Layers,
              },
              {
                name: "Studio Meetings",
                href: `/w/${context.tenantSlug}/meetings`,
                icon: Clock,
              },
            ]
          : [
              {
                name: "My Leave",
                href: `/w/${context.tenantSlug}/leave/my-leave`,
                icon: Calendar,
              },
            ]),
      ],
    },
    {
      groupName: "Operations",
      items: [
        ...(hasFinance
          ? [
              {
                name: "Project Finance",
                href: `/w/${context.tenantSlug}/finance`,
                icon: Receipt,
              },
            ]
          : []),
        ...(isOwnerOrAdmin
          ? [
              {
                name: "Vendor CRM",
                href: `/w/${context.tenantSlug}/vendors`,
                icon: Briefcase,
              },
            ]
          : [
              {
                name: "Vendor Directory",
                href: `/w/${context.tenantSlug}/vendors/directory`,
                icon: Briefcase,
              },
            ]),
        {
          name: "Contractors",
          href: `/w/${context.tenantSlug}/contractors`,
          icon: Wrench,
        },
        {
          name: "Consultants",
          href: `/w/${context.tenantSlug}/consultants`,
          icon: Briefcase,
        },
        {
          name: "Clients & Directory",
          href: `/w/${context.tenantSlug}/directory`,
          icon: Building,
        },
        ...(isOwnerOrAdmin
          ? [
              {
                name: "Integration Health",
                href: `/w/${context.tenantSlug}/integrations`,
                icon: Activity,
              },
            ]
          : []),
        {
          name: "Profile & Records",
          href: `/w/${context.tenantSlug}/profile`,
          icon: User,
        },
      ],
    },
  ];

  const userInitials = context.userFullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  // -------------------------------------------------------------
  // RENDER: Collapsed Desktop Rail (Image E Left Treatment)
  // -------------------------------------------------------------
  if (isCollapsed) {
    return (
      <aside
        className="w-[78px] shrink-0 h-screen sticky top-0 z-30 p-2.5 hidden lg:flex flex-col"
        aria-label="Studio Navigation (Collapsed)"
        suppressHydrationWarning
      >
        <div className="h-full bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between py-3.5 px-2">
          {/* Top: Logo & Expand Trigger */}
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              suppressHydrationWarning
              onClick={toggleCollapse}
              title="Expand Sidebar"
              className="p-2 text-slate-500 hover:text-[#3562E8] hover:bg-slate-100 rounded-2xl transition-all cursor-pointer"
            >
              <PanelLeftOpen className="w-5 h-5" />
            </button>

            <div className="w-10 h-10 rounded-2xl overflow-hidden bg-[#0B122B] p-0.5 border border-amber-400/20 shadow-xs shrink-0 flex items-center justify-center">
              <Image
                src="/icons/icon-192.png"
                alt="Studio Logo"
                width={36}
                height={36}
                className="w-full h-full object-cover rounded-xl"
              />
            </div>

            <div className="w-6 h-px bg-slate-200/80 my-1" />
          </div>

          {/* Middle: Vertical Icon Rail */}
          <div className="flex-1 overflow-y-auto no-scrollbar py-2 space-y-2 flex flex-col items-center">
            {navGroups.flatMap((g) => g.items).map((item) => {
              const isDashboard = item.href.endsWith("/dashboard");
              const isActive = isDashboard
                ? pathname.startsWith(item.href) ||
                  pathname === `/w/${context.tenantSlug}` ||
                  pathname === `/w/${context.tenantSlug}/`
                : pathname === item.href ||
                  pathname.startsWith(item.href + "/");
              const Icon = item.icon;

              return (
                <div key={item.name} className="relative group flex justify-center">
                  <Link
                    href={item.href}
                    prefetch={false}
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                      isActive
                        ? "bg-[#3562E8] text-white shadow-md shadow-[#3562E8]/25"
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/80"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </Link>

                  {/* Tooltip on hover */}
                  <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-xl whitespace-nowrap shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                    {item.name}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom: User avatar & Logout */}
          <div className="flex flex-col items-center gap-2 pt-2 border-t border-slate-200/80">
            <Link
              href={`/w/${context.tenantSlug}/profile`}
              title={`${context.userFullName} (${context.role})`}
              className="w-9 h-9 rounded-2xl bg-[#CEDEFF] text-[#2C308D] font-bold text-xs flex items-center justify-center hover:ring-2 hover:ring-[#3562E8] transition-all"
            >
              {userInitials}
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    );
  }

  // -------------------------------------------------------------
  // RENDER: Expanded Desktop Sidebar (Image E Full Treatment)
  // -------------------------------------------------------------
  const sidebarContent = (
    <div className="h-full bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between overflow-hidden">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
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
            <h2 className="text-sm font-bold text-[#0B122B] truncate tracking-tight">
              {context.tenantName}
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] text-slate-500 font-mono uppercase tracking-wider">
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
          title="Collapse navigation"
          className="p-2 text-slate-400 hover:text-[#3562E8] hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
        >
          {isMobileOpen ? <X className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
        </button>
      </div>

      {/* Scrollable Navigation Body */}
      <nav className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6 text-xs" aria-label="Studio Sections">
        {navGroups.map((group) => (
          <div key={group.groupName} className="space-y-1.5">
            {/* Subtle Group Category Label */}
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {group.groupName}
            </div>

            {/* Group Navigation Links */}
            <div className="space-y-1">
              {group.items.map((item) => {
                const isDashboard = item.href.endsWith("/dashboard");
                const isActive = isDashboard
                  ? pathname.startsWith(item.href) ||
                    pathname === `/w/${context.tenantSlug}` ||
                    pathname === `/w/${context.tenantSlug}/`
                  : pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                const Icon = item.icon;

                return (
                  <div key={item.name} className="space-y-1">
                    <Link
                      href={item.href}
                      prefetch={false}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-medium transition-all group ${
                        isActive
                          ? "bg-[#3562E8] text-white font-semibold shadow-sm shadow-[#3562E8]/20"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-400 group-hover:text-slate-700"}`} />
                        <span className="truncate">{item.name}</span>
                      </div>

                      {item.badge && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isActive
                              ? "bg-white/20 text-white"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>

                    {/* Nested Sub-route Guide (Image E vertical line style) */}
                    {item.children && item.children.length > 0 && (
                      <div className="ml-5 pl-3 border-l-2 border-slate-200/80 space-y-1 py-1">
                        {item.children.map((child) => {
                          const isChildActive = pathname === child.href;
                          return (
                            <Link
                              key={child.name}
                              href={child.href}
                              className={`block px-2.5 py-1.5 rounded-xl text-[11px] transition-colors ${
                                isChildActive
                                  ? "bg-white text-[#3562E8] font-bold shadow-2xs border border-slate-200/60"
                                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/50"
                              }`}
                            >
                              {child.name}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer Profile & Actions */}
      <div className="p-3.5 border-t border-slate-100 bg-slate-50/50 space-y-3 shrink-0">
        <PwaInstallButton />

        <div className="flex items-center justify-between gap-2">
          <Link
            href={`/w/${context.tenantSlug}/profile`}
            className="flex items-center gap-2.5 min-w-0 group hover:opacity-90 transition-opacity"
          >
            <div className="w-9 h-9 rounded-2xl bg-[#CEDEFF] text-[#2C308D] font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
              {userInitials}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate group-hover:text-[#3562E8] transition-colors">
                {context.userFullName}
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                {context.designation || (context.role === "OWNER" ? "Principal Architect" : context.role)}
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                <span>{context.employeeId || "OWNER"}</span>
                <span>•</span>
                <span className="font-semibold text-[#3562E8]">{context.role}</span>
              </div>
            </div>
          </Link>

          <button
            type="button"
            suppressHydrationWarning
            onClick={handleLogout}
            title="Sign out of workspace"
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <div className="text-[10px] text-slate-400 flex items-center justify-between pt-2 border-t border-slate-200/60">
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3 text-[#3562E8]" />
            <span>Encrypted Session</span>
          </span>
          <span className="font-mono">{context.timezone.split("/")[1] || "Kolkata"}</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Inset Floating Sidebar (Image E) */}
      <aside
        className="w-[276px] shrink-0 h-screen sticky top-0 z-30 p-2.5 hidden lg:block"
        aria-label="Studio Navigation"
        suppressHydrationWarning
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div
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
