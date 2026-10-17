"use client";

import React from "react";
import Link from "next/link";
import { CreditCard, Calculator } from "lucide-react";

interface PayrollSubNavProps {
  workspaceSlug: string;
  activeTab: "overview" | "calculate";
}

export function PayrollSubNav({ workspaceSlug, activeTab }: PayrollSubNavProps) {
  const tabs = [
    {
      id: "overview",
      label: "Overview",
      href: `/w/${workspaceSlug}/payroll`,
      icon: CreditCard,
    },
    {
      id: "calculate",
      label: "Salary Calculator",
      href: `/w/${workspaceSlug}/payroll/calculate`,
      icon: Calculator,
    },
  ];

  return (
    <nav
      aria-label="Payroll local navigation"
      className="inline-flex items-center gap-1.5 p-1 bg-white border border-[#E2E6F0] rounded-2xl shadow-2xs mb-2"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <Link
            key={tab.id}
            href={tab.href}
            prefetch={true}
            aria-current={isActive ? "page" : undefined}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              isActive
                ? "bg-[#3562E8] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-slate-400"}`} />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
