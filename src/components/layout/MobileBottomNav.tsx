"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TenantContext } from "@/server/tenancy/context";
import {
  LayoutDashboard,
  Layers,
  MapPin,
  Clock,
  Calendar,
  MoreHorizontal,
} from "lucide-react";

interface MobileBottomNavProps {
  context: TenantContext;
}

export function MobileBottomNav({ context }: MobileBottomNavProps) {
  const pathname = usePathname();
  const slug = context.tenantSlug;
  const isLeader = context.role === "OWNER" || context.role === "ADMIN";

  const [decisionCount, setDecisionCount] = useState<number | null>(null);

  useEffect(() => {
    if (!isLeader) return;
    let isMounted = true;
    const fetchDecisionCount = async () => {
      try {
        const res = await fetch(`/api/inbox?workspaceSlug=${encodeURIComponent(slug)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted) return;
        const count = isLeader ? (data?.counts?.myDecisions ?? data?.counts?.total ?? null) : (data?.counts?.total ?? null);
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
  }, [slug, isLeader]);

  const handleOpenMore = () => {
    window.dispatchEvent(new CustomEvent("open-mobile-sidebar"));
  };

  // Role-specific navigation items exactly as requested:
  // Owner & Admin: Dashboard - Studio Task - Site Visits - Meetings - More
  // Employee: Dashboard - Task - Site Visits - Meetings - Leaves - More
  const navItems = isLeader
    ? [
        {
          name: "Dashboard",
          href: `/w/${slug}/dashboard/${context.role.toLowerCase()}`,
          icon: LayoutDashboard,
          isActive: pathname?.includes("/dashboard"),
        },
        {
          name: "Studio Task",
          href: `/w/${slug}/tasks`,
          icon: Layers,
          isActive: pathname?.includes("/tasks"),
        },
        {
          name: "Site Visits",
          href: `/w/${slug}/visits`,
          icon: MapPin,
          isActive: pathname?.includes("/visits"),
        },
        {
          name: "Meetings",
          href: `/w/${slug}/meetings`,
          icon: Clock,
          isActive: pathname?.includes("/meetings"),
        },
      ]
    : [
        {
          name: "Dashboard",
          href: `/w/${slug}/dashboard/employee`,
          icon: LayoutDashboard,
          isActive: pathname?.includes("/dashboard"),
        },
        {
          name: "Task",
          href: `/w/${slug}/tasks`,
          icon: Layers,
          isActive: pathname?.includes("/tasks") || pathname?.includes("/my-work"),
        },
        {
          name: "Site Visits",
          href: `/w/${slug}/visits`,
          icon: MapPin,
          isActive: pathname?.includes("/visits"),
        },
        {
          name: "Meetings",
          href: `/w/${slug}/meetings`,
          icon: Clock,
          isActive: pathname?.includes("/meetings"),
        },
        {
          name: "Leaves",
          href: `/w/${slug}/leave/my-leave`,
          icon: Calendar,
          isActive: pathname?.includes("/leave"),
        },
      ];

  return (
    <nav
      aria-label="Mobile studio navigation"
      className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] lg:hidden pb-[max(env(safe-area-inset-bottom),0.35rem)] select-none"
    >
      <div
        className={`grid ${
          isLeader ? "grid-cols-5" : "grid-cols-6"
        } items-center h-14 max-w-lg mx-auto px-1`}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              prefetch={false}
              className={`relative flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all duration-150 active:scale-95 ${
                item.isActive
                  ? "text-[#2563EB] font-bold"
                  : "text-[#64748B] hover:text-[#0F172A] font-medium"
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 shrink-0 transition-transform ${
                    item.isActive ? "stroke-[2.2]" : "stroke-[1.8]"
                  }`}
                />
              </div>
              <span className="type-badge font-medium tracking-normal mt-0.5 truncate max-w-full text-center leading-tight">
                {item.name}
              </span>
            </Link>
          );
        })}

        {/* More Button */}
        <button
          type="button"
          onClick={handleOpenMore}
          aria-label="Open more studio options"
          className="relative flex flex-col items-center justify-center py-1 px-0.5 rounded-xl text-[#64748B] hover:text-[#0F172A] font-medium transition-all duration-150 active:scale-95 cursor-pointer"
        >
          <div className="relative">
            <MoreHorizontal className="w-5 h-5 shrink-0 stroke-[1.8]" />
            {decisionCount !== null && decisionCount > 0 && (
              <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white type-badge font-semibold flex items-center justify-center border-2 border-white shadow-xs">
                {decisionCount > 99 ? "99+" : decisionCount}
              </span>
            )}
          </div>
          <span className="type-badge font-medium tracking-normal mt-0.5 truncate max-w-full text-center leading-tight">
            More
          </span>
        </button>
      </div>
    </nav>
  );
}
