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
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleOpenMobileSidebar}
          className="p-2 -ml-2 text-slate-500 hover:text-[#3562E8] hover:bg-slate-100 rounded-xl lg:hidden cursor-pointer transition-colors"
          title="Open Navigation"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="font-bold tracking-tight">{context.tenantName}</span>
          <span className="text-slate-300 hidden sm:inline">/</span>
          <span className="text-slate-500 font-normal hidden sm:inline">Active Studio Workspace</span>
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
