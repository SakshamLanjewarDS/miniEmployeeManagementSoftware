"use client";

import React from "react";
import Link from "next/link";
import { TenantContext } from "@/server/tenancy/context";
import { Menu, MapPin, Search } from "lucide-react";
import { NotificationDropdown } from "./NotificationDropdown";
import { UserProfileDropdown } from "./UserProfileDropdown";

interface AppTopbarProps {
  context: TenantContext;
}

export function AppTopbar({ context }: AppTopbarProps) {
  const handleOpenMobileSidebar = () => {
    window.dispatchEvent(new CustomEvent("open-mobile-sidebar"));
  };

  const handleOpenCommandPalette = () => {
    window.dispatchEvent(new CustomEvent("open-command-palette"));
  };

  return (
    <header
      className="h-14 sm:h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-20"
      suppressHydrationWarning
    >
      {/* Left: Mobile Drawer Trigger (strictly hidden on desktop) & Workspace Badge */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          type="button"
          suppressHydrationWarning
          onClick={handleOpenMobileSidebar}
          className="w-9 h-9 -ml-1 text-slate-600 hover:text-[#3562E8] hover:bg-slate-100 rounded-xl cursor-pointer transition-colors flex items-center justify-center shrink-0 lg:!hidden topbar-mobile-menu-btn active:scale-95"
          title="Open Navigation"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2 text-sm font-semibold text-slate-900 min-w-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200/60 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
            <span className="font-semibold truncate max-w-[140px] sm:max-w-[240px] text-slate-800 type-badge">
              {context.tenantName}
            </span>
          </div>
          <span className="text-slate-300 hidden md:inline">/</span>
          <span className="text-slate-500 font-normal hidden md:inline type-helper">Studio OS</span>
        </div>
      </div>

      {/* Center: Command Palette Trigger Button (Cmd+K) */}
      <button
        type="button"
        suppressHydrationWarning
        onClick={handleOpenCommandPalette}
        className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 text-xs text-slate-500 bg-slate-100/80 hover:bg-white hover:text-slate-900 border border-slate-200/80 hover:border-[#3562E8]/40 rounded-xl transition-all duration-150 cursor-pointer shadow-2xs hover:shadow-xs group press-feedback"
        title="Open Command Palette (⌘K)"
      >
        <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#3562E8] transition-colors" />
        <span className="font-medium text-slate-600 hidden md:inline text-xs sm:text-sm">Quick find or jump...</span>
        <kbd className="type-badge font-mono font-medium bg-white px-1.5 py-0.5 rounded-md border border-slate-200/80 text-slate-500 shadow-2xs">
          ⌘K
        </kbd>
      </button>

      {/* Right: Notifications & Executive Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        <NotificationDropdown context={context} />
        <div className="h-4 w-px bg-slate-200" />
        <UserProfileDropdown context={context} />
      </div>
    </header>
  );
}
