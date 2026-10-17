"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TenantContext } from "@/server/tenancy/context";
import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  HardHat,
  Clock,
  Calendar,
  Menu,
} from "lucide-react";

interface MobileBottomNavProps {
  context: TenantContext;
}

export function MobileBottomNav({ context }: MobileBottomNavProps) {
  const pathname = usePathname();
  const slug = context.tenantSlug;
  const isLeader = context.role === "OWNER" || context.role === "ADMIN";

  const handleOpenMenu = () => {
    window.dispatchEvent(new CustomEvent("open-mobile-sidebar"));
  };

  const navItems = isLeader
    ? [
        {
          name: "Day",
          href: `/w/${slug}/dashboard/${context.role.toLowerCase()}`,
          icon: LayoutDashboard,
        },
        {
          name: "Projects",
          href: `/w/${slug}/projects`,
          icon: FolderKanban,
        },
        {
          name: "Tasks",
          href: `/w/${slug}/tasks`,
          icon: CheckSquare,
        },
        {
          name: "Visits",
          href: `/w/${slug}/visits`,
          icon: HardHat,
        },
      ]
    : [
        {
          name: "Day",
          href: `/w/${slug}/dashboard/employee`,
          icon: LayoutDashboard,
        },
        {
          name: "Tasks",
          href: `/w/${slug}/tasks`,
          icon: CheckSquare,
        },
        {
          name: "Attendance",
          href: `/w/${slug}/attendance`,
          icon: Clock,
        },
        {
          name: "Leaves",
          href: `/w/${slug}/leave/my-leave`,
          icon: Calendar,
        },
      ];

  return (
    <nav
      aria-label="Mobile studio navigation"
      className="fixed bottom-2.5 inset-x-3 sm:inset-x-6 z-40 max-w-md mx-auto bg-slate-950/90 backdrop-blur-xl border border-white/10 shadow-[0_12px_36px_rgba(0,0,0,0.36)] rounded-2xl p-1.5 lg:hidden pb-safe select-none"
    >
      <div className="grid grid-cols-5 items-center gap-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href.includes("dashboard") && pathname?.includes("dashboard"));
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              prefetch={true}
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-150 active:scale-95 ${
                isActive
                  ? "bg-[#3562E8] text-white shadow-md shadow-[#3562E8]/40 font-bold"
                  : "text-slate-400 hover:text-white hover:bg-white/5 font-medium"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="text-[10px] font-mono tracking-tight truncate mt-0.5">
                {item.name}
              </span>
            </Link>
          );
        })}

        {/* Studio Menu Button */}
        <button
          type="button"
          onClick={handleOpenMenu}
          aria-label="Open full studio menu"
          className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 font-medium transition-all duration-150 active:scale-95 cursor-pointer"
        >
          <Menu className="w-4 h-4 shrink-0" />
          <span className="text-[10px] font-mono tracking-tight truncate mt-0.5">Menu</span>
        </button>
      </div>
    </nav>
  );
}
