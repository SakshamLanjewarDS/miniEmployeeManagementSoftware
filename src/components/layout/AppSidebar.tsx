"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { TenantContext } from "@/server/tenancy/context";
import {
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
} from "lucide-react";
import { PwaInstallButton } from "@/components/pwa/PwaInstallButton";

interface AppSidebarProps {
  context: TenantContext;
}

export function AppSidebar({ context }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push(`/w/${context.tenantSlug}/login`);
    } catch {
      window.location.href = `/w/${context.tenantSlug}/login`;
    }
  };

  const navItems = [
    {
      name:
        context.role === "OWNER" || context.role === "ADMIN"
          ? "Studio Tasks"
          : "My Tasks",
      href: `/w/${context.tenantSlug}/tasks`,
      icon: CheckSquare,
    },
    {
      name: "Projects",
      href: `/w/${context.tenantSlug}/projects`,
      icon: FolderKanban,
    },
    {
      name: "Site Visits & GPS",
      href: `/w/${context.tenantSlug}/visits`,
      icon: MapPin,
    },
    {
      name: "Drawings & Approvals",
      href: `/w/${context.tenantSlug}/drawings`,
      icon: FileCheck2,
    },
    ...(context.role === "OWNER" || context.role === "ADMIN" || context.hasFinanceAccess
      ? [
          {
            name: "Project Finance",
            href: `/w/${context.tenantSlug}/finance`,
            icon: Receipt,
          },
        ]
      : []),
    {
      name: "Studio Team",
      href: `/w/${context.tenantSlug}/team`,
      icon: Users,
    },
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
  ];

  return (
    <aside className="w-64 bg-white border-r border-[#E2E6F0] flex flex-col justify-between shrink-0 h-screen sticky top-0">
      {/* Brand Header */}
      <div>
        <div className="p-4 border-b border-[#E2E6F0] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm shrink-0 bg-[#0B122B] p-0.5 border border-amber-400/20">
            <Image
              src="/icons/icon-192.png"
              alt="100% DESIGN Studio Logo"
              width={40}
              height={40}
              className="w-full h-full object-cover rounded-lg"
            />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-[#1F1F1F] truncate">{context.tenantName}</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[11px] text-[#696E82] font-medium font-mono uppercase tracking-wider">
                {context.tenantSlug}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                prefetch={true}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? "bg-[#5A81FA] text-white shadow-xs font-semibold"
                    : "text-[#696E82] hover:bg-[#F2F4FF] hover:text-[#1F1F1F]"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-[#696E82]"}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Footer */}
      <div className="p-4 border-t border-[#E2E6F0] bg-[#F8F9FD] space-y-3">
        <PwaInstallButton />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#CEDEFF] text-[#2C308D] font-bold text-xs flex items-center justify-center shrink-0">
              {context.userFullName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .substring(0, 2)}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[#1F1F1F] truncate">{context.userFullName}</div>
              <div className="text-[10px] text-[#696E82] truncate font-medium">
                {context.designation || (context.role === "OWNER" ? "Principal Architect" : context.role)}
              </div>
              <div className="text-[10px] text-[#696E82] flex items-center gap-1 font-mono mt-0.5">
                <span>{context.employeeId || "OWNER"}</span>
                <span>•</span>
                <span className="font-semibold text-[#5A81FA]">{context.role}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            suppressHydrationWarning
            onClick={handleLogout}
            title="Sign out"
            className="p-1.5 text-[#696E82] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <div className="text-[10px] text-[#696E82] flex items-center justify-between pt-2 border-t border-[#E2E6F0]">
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3 text-[#5A81FA]" />
            <span>Secure Session</span>
          </span>
          <span className="font-mono">{context.timezone.split("/")[1] || "Kolkata"}</span>
        </div>
      </div>
    </aside>
  );
}
