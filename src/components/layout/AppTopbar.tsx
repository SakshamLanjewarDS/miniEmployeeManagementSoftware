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



        {/* Notification Dropdown */}
        <NotificationDropdown context={context} />

        <div className="h-6 w-px bg-[#E2E6F0]" />

        {/* Executive User Profile Dropdown */}
        <UserProfileDropdown context={context} />
      </div>
    </header>
  );
}
