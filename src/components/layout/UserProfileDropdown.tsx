"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TenantContext } from "@/server/tenancy/context";
import {
  User,
  Shield,
  Briefcase,
  Building,
  Mail,
  Phone,
  Clock,
  LogOut,
  ChevronDown,
  IdCard,
} from "lucide-react";

interface UserProfileDropdownProps {
  context: TenantContext;
}

export function UserProfileDropdown({ context }: UserProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown on click outside or escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push(`/w/${context.tenantSlug}/login`);
    } catch {
      window.location.href = `/w/${context.tenantSlug}/login`;
    }
  };

  const initials = context.userFullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case "OWNER":
        return "bg-[#CEDEFF] text-[#2C308D] border-[#A8B1CE]";
      case "ADMIN":
        return "bg-purple-50 text-purple-700 border-purple-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="relative" ref={dropdownRef} suppressHydrationWarning>
      {/* Topbar User Button Trigger */}
      <button
        type="button"
        suppressHydrationWarning
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2.5 p-1.5 pr-2.5 rounded-xl border transition-all cursor-pointer ${
          isOpen
            ? "bg-[#F2F4FF] border-[#A8B1CE] shadow-2xs"
            : "bg-white hover:bg-[#F8F9FD] border-[#E2E6F0]"
        }`}
      >
        {/* Avatar with status indicator */}
        <div className="relative">
          {context.avatarUrl ? (
            <img
              src={context.avatarUrl}
              alt={context.userFullName}
              className="w-8 h-8 rounded-lg object-cover shadow-2xs"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-[#5A81FA] text-white font-bold text-xs flex items-center justify-center shadow-2xs tracking-wider">
              {initials}
            </div>
          )}
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
        </div>

        {/* User Info (Hidden on very small screens) */}
        <div className="text-left hidden sm:block">
          <div className="type-button-label text-[#1F1F1F] leading-tight truncate max-w-[130px]">
            {context.userFullName}
          </div>
          <div className="type-metadata text-[#4B5565] flex items-center gap-1 font-medium">
            <span>{context.employeeId || "OWNER"}</span>
            <span>•</span>
            <span className="text-[#3562E8] font-semibold">{context.role}</span>
          </div>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-[#696E82] transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Account Profile Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-84 sm:w-96 max-w-[calc(100vw-2rem)] bg-white border border-[#E2E6F0] rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Header Card */}
          <div className="p-5 bg-gradient-to-b from-[#F8F9FD] to-white border-b border-[#E2E6F0]">
            <div className="flex items-start gap-3.5">
              <div className="relative shrink-0">
                {context.avatarUrl ? (
                  <img
                    src={context.avatarUrl}
                    alt={context.userFullName}
                    className="w-12 h-12 rounded-xl object-cover shadow-sm"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#5A81FA] to-[#2C308D] text-white font-bold text-base flex items-center justify-center shadow-sm">
                    {initials}
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="type-card-title text-[#1F1F1F] truncate">{context.userFullName}</h3>
                  <span
                    className={`type-badge font-bold px-2 py-0.5 rounded-md border ${getRoleBadgeStyle(
                      context.role
                    )}`}
                  >
                    {context.role === "OWNER" ? "BOSS / PARTNER" : context.role}
                  </span>
                </div>

                <div className="text-xs text-[#696E82] truncate mt-0.5 font-medium">
                  {context.designation ||
                    (context.role === "OWNER"
                      ? "Principal Architect & Studio Boss"
                      : context.role === "ADMIN"
                      ? "Studio Operations Lead"
                      : "Project Architect")}
                </div>

                <div className="type-metadata text-[#4B5565] truncate mt-0.5 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 shrink-0 text-[#696E82]" />
                  <span className="truncate">{context.userEmail}</span>
                </div>
              </div>
            </div>

            {/* Badges strip */}
            <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-[#E2E6F0]">
              <div className="p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl space-y-0.5">
                <span className="type-badge text-[#4B5565] font-semibold flex items-center gap-1.5">
                  <IdCard className="w-3.5 h-3.5 text-[#3562E8]" />
                  <span>Employee ID</span>
                </span>
                <span className="type-tabular font-mono font-semibold text-[#1F1F1F] block">
                  {context.employeeId || "OWNER-01"}
                </span>
              </div>

              <div className="p-2.5 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl space-y-0.5">
                <span className="type-badge text-[#4B5565] font-semibold flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-[#3562E8]" />
                  <span>Department</span>
                </span>
                <span className="type-body-compact font-semibold text-[#1F1F1F] truncate block">
                  {context.department || (context.role === "OWNER" ? "Leadership" : "Architecture")}
                </span>
              </div>
            </div>
          </div>

          {/* Studio Workspace Context */}
          <div className="p-3.5 bg-[#F8F9FD] border-b border-[#E2E6F0] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="type-badge text-[#4B5565] font-medium">Active Practice</span>
              <span className="type-body-compact font-semibold text-[#1F1F1F]">{context.tenantName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="type-badge text-[#4B5565] font-medium">Workspace Slug</span>
              <span className="font-mono type-tabular text-[#3562E8] font-semibold">{context.tenantSlug}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="type-badge text-[#4B5565] font-medium">Session Status</span>
              <span className="inline-flex items-center gap-1.5 type-badge text-emerald-800 font-medium">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                <span>Encrypted • Asia/Kolkata</span>
              </span>
            </div>
          </div>

          {/* Profile & Official Record Link */}
          <div className="p-3 bg-white border-b border-[#E2E6F0]">
            <Link
              href={`/w/${context.tenantSlug}/profile`}
              onClick={() => setIsOpen(false)}
              className="w-full py-2 px-3 bg-[#F2F4FF] hover:bg-[#5A81FA] text-[#2C308D] hover:text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-2">
                <IdCard className="w-4 h-4 text-[#5A81FA] group-hover:text-white transition-colors" />
                <span>View Profile & Official Record</span>
              </div>
              <span className="text-xs font-bold">→</span>
            </Link>
          </div>

          {/* Sign Out Action Button */}
          <div className="p-3 bg-[#F8F9FD] flex items-center justify-between">
            <Link
              href={`/w/${context.tenantSlug}/login`}
              onClick={() => setIsOpen(false)}
              className="text-xs text-[#696E82] hover:text-[#1F1F1F] hover:underline font-medium"
            >
              Switch Workspace →
            </Link>

            <button
              type="button"
              suppressHydrationWarning
              onClick={handleLogout}
              className="px-3.5 py-1.5 bg-white hover:bg-red-50 text-red-700 hover:text-red-800 border border-red-200 rounded-xl text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
