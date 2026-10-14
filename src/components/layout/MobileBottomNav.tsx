"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TenantContext } from "@/server/tenancy/context";
import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  Inbox,
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
          name: "Dashboard",
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
          name: "Inbox",
          href: `/w/${slug}/inbox`,
          icon: Inbox,
        },
      ]
    : [
        {
          name: "Today",
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
      aria-label="Mobile primary navigation"
      className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] lg:hidden pb-safe"
    >
      <div className="grid grid-cols-5 h-14 max-w-md mx-auto items-stretch">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href.includes("dashboard") && pathname?.includes("dashboard"));
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-1 touch-target transition-all ${
                isActive
                  ? "text-[#3562E8] font-bold"
                  : "text-slate-500 hover:text-slate-900 font-medium"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                  isActive ? "bg-blue-50 text-[#3562E8]" : "text-slate-500"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
              </div>
              <span className="text-[10px] leading-tight truncate mt-0.5">{item.name}</span>
            </Link>
          );
        })}

        {/* Menu button */}
        <button
          type="button"
          onClick={handleOpenMenu}
          aria-label="Open full studio menu"
          className="flex flex-col items-center justify-center py-1 px-1 text-slate-500 hover:text-slate-900 font-medium touch-target cursor-pointer transition-colors"
        >
          <div className="w-7 h-7 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100">
            <Menu className="w-4 h-4 shrink-0" />
          </div>
          <span className="text-[10px] leading-tight truncate mt-0.5">Menu</span>
        </button>
      </div>
    </nav>
  );
}
