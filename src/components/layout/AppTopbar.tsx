"use client";

import React from "react";
import Link from "next/link";
import { TenantContext } from "@/server/tenancy/context";
import { MapPin } from "lucide-react";
import { NotificationDropdown } from "./NotificationDropdown";
import { UserProfileDropdown } from "./UserProfileDropdown";
import { PwaInstallButton } from "@/components/pwa/PwaInstallButton";

interface AppTopbarProps {
  context: TenantContext;
}

export function AppTopbar({ context }: AppTopbarProps) {
  return (
    <header className="h-16 bg-white border-b border-[#E2E6F0] px-6 flex items-center justify-between sticky top-0 z-10" suppressHydrationWarning>
      {/* Studio Location & Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#1F1F1F]">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>{context.tenantName}</span>
          <span className="text-[#A8B1CE]">/</span>
          <span className="text-[#696E82] font-normal">Active Studio Workspace</span>
        </div>
      </div>

      {/* Right Action Bar */}
      <div className="flex items-center gap-3">
        {/* Voice & Grammar Status Indicator */}
        <div 
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-[#F8F9FD] border border-[#E2E6F0] rounded-lg text-[11px] font-semibold text-[#696E82]"
          title="Voice-to-Text (Ctrl+Shift+V) & Grammar Auto-Correct (Ctrl+Shift+G) active across all text fields"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>Voice & Grammar Active</span>
        </div>

        {/* Quick App Install Button */}
        <PwaInstallButton variant="compact" />

        {/* Quick Check-In Button */}
        <Link
          href={`/w/${context.tenantSlug}/visits`}
          suppressHydrationWarning
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#5A81FA] hover:bg-[#426EE8] text-white text-xs font-medium rounded-lg shadow-sm transition-all cursor-pointer"
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Check In at Site</span>
        </Link>

        {/* Notification Dropdown */}
        <NotificationDropdown context={context} />

        <div className="h-6 w-px bg-[#E2E6F0]" />

        {/* Executive User Profile Dropdown */}
        <UserProfileDropdown context={context} />
      </div>
    </header>
  );
}
