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
      label: "Calculator",
      href: `/w/${workspaceSlug}/payroll/calculate`,
      icon: Calculator,
    },
  ];

  return (
    <nav
      aria-label="Payroll local navigation"
      className="inline-flex items-center gap-1 p-1 bg-[#F4F6FB] border border-[#E2E6F0] rounded-xl mb-3 shadow-2xs"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <Link
            key={tab.id}
            href={tab.href}
            prefetch={false}
            aria-current={isActive ? "page" : undefined}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg type-nav-label font-semibold transition-all ${
              isActive
                ? "bg-[#1456F0] text-white shadow-2xs"
                : "text-[#696E82] hover:text-[#1F1F1F] hover:bg-white/60"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
