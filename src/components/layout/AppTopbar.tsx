"use client";

import React from "react";
import Link from "next/link";
import { TenantContext } from "@/server/tenancy/context";
import { Menu, MapPin } from "lucide-react";
import { NotificationDropdown } from "./NotificationDropdown";
import { UserProfileDropdown } from "./UserProfileDropdown";
import { PwaInstallButton } from "@/components/pwa/PwaInstallButton";

interface AppTopbarProps {
  context: TenantContext;
}

export function AppTopbar({ context }: AppTopbarProps) {
  const handleOpenMobileSidebar = () => {
    window.dispatchEvent(new CustomEvent("open-mobile-sidebar"));
  };

  return (
    <header
      className="h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20"
      suppressHydrationWarning
    >
      {/* Left: Mobile Drawer Trigger & Workspace Badge */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={handleOpenMobileSidebar}
          className="w-10 h-10 -ml-1 text-slate-600 hover:text-[#3562E8] hover:bg-slate-100 rounded-xl lg:hidden cursor-pointer transition-colors flex items-center justify-center shrink-0 touch-target"
          title="Open Navigation"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 min-w-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span className="font-bold tracking-tight truncate max-w-[130px] sm:max-w-[220px] md:max-w-none">
            {context.tenantName}
          </span>
          <span className="text-slate-300 hidden md:inline">/</span>
          <span className="text-slate-500 font-normal hidden md:inline">Active Studio Workspace</span>
        </div>
      </div>

      {/* Right: Notifications & Executive Profile */}
      <div className="flex items-center gap-3">
        <NotificationDropdown context={context} />
        <div className="h-5 w-px bg-slate-200" />
        <UserProfileDropdown context={context} />
      </div>
    </header>
  );
}
