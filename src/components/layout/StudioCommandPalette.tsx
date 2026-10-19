"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { TenantContext } from "@/server/tenancy/context";
import {
  Search,
  LayoutDashboard,
  Inbox,
  CheckSquare,
  Layers,
  FolderKanban,
  MapPin,
  FileCheck2,
  Users,
  Calendar,
  Clock,
  TrendingUp,
  CreditCard,
  Receipt,
  Briefcase,
  Building,
  User,
  Activity,
  ArrowRight,
  Plus,
  ShieldCheck,
  Command,
  CornerDownLeft,
  X,
} from "lucide-react";

interface StudioCommandPaletteProps {
  context: TenantContext;
}

interface CommandItem {
  id: string;
  title: string;
  category: "Navigation" | "Projects" | "Quick Actions" | "People";
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  href?: string;
  action?: () => void;
  roles?: string[];
}

export function StudioCommandPalette({ context }: StudioCommandPaletteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const slug = context.tenantSlug;
  const isPrivileged = context.role === "OWNER" || context.role === "ADMIN";

  // Build commands
  const commands: CommandItem[] = useMemo(() => {
    const list: CommandItem[] = [
      // Navigation
      {
        id: "nav-dash",
        title: "Go to Dashboard",
        category: "Navigation",
        icon: LayoutDashboard,
        shortcut: "G D",
        href: `/w/${slug}/dashboard`,
      },
      ...(isPrivileged
        ? [
            {
              id: "nav-inbox",
              title: "Open Decision Inbox",
              category: "Navigation",
              icon: Inbox,
              shortcut: "G I",
              href: `/w/${slug}/inbox`,
            },
          ]
        : []),
      {
        id: "nav-my-work",
        title: "My Work Today",
        category: "Navigation",
        icon: CheckSquare,
        shortcut: "G W",
        href: `/w/${slug}/my-work`,
      },
      {
        id: "nav-tasks",
        title: isPrivileged ? "Studio Deliverables & Tasks" : "My Project Tasks",
        category: "Navigation",
        icon: Layers,
        shortcut: "G T",
        href: `/w/${slug}/tasks`,
      },
      {
        id: "nav-projects",
        title: "Projects & Blueprint Registry",
        category: "Navigation",
        icon: FolderKanban,
        shortcut: "G P",
        href: `/w/${slug}/projects`,
      },
      {
        id: "nav-visits",
        title: "Site Visits & GPS Check-In",
        category: "Navigation",
        icon: MapPin,
        shortcut: "G V",
        href: `/w/${slug}/visits`,
      },
      {
        id: "nav-drawings",
        title: "Drawings & Client Approvals",
        category: "Navigation",
        icon: FileCheck2,
        href: `/w/${slug}/drawings`,
      },
      {
        id: "nav-team",
        title: "Studio Team Directory",
        category: "Navigation",
        icon: Users,
        href: `/w/${slug}/team`,
      },
      ...(isPrivileged
        ? [
            {
              id: "nav-capacity",
              title: "Workload & Capacity Forecast",
              category: "Navigation",
              icon: TrendingUp,
              href: `/w/${slug}/capacity`,
            },
            {
              id: "nav-performance",
              title: "Employee 9-Box Performance",
              category: "Navigation",
              icon: TrendingUp,
              href: `/w/${slug}/employee-performance`,
            },
            {
              id: "nav-payroll",
              title: "Enterprise Payroll & Salary Calculator",
              category: "Navigation",
              icon: CreditCard,
              href: `/w/${slug}/payroll`,
            },
            {
              id: "nav-finance",
              title: "Project Finance & Billing Milestones",
              category: "Navigation",
              icon: Receipt,
              href: `/w/${slug}/finance`,
            },
            {
              id: "nav-integrations",
              title: "Integration Health & Realtime Status",
              category: "Navigation",
              icon: Activity,
              href: `/w/${slug}/integrations`,
            },
            {
              id: "nav-meetings",
              title: "Studio Meetings & Executive MoM",
              category: "Navigation",
              icon: Clock,
              shortcut: "G M",
              href: `/w/${slug}/meetings`,
            },
          ]
        : []),
      {
        id: "nav-attendance",
        title: "Attendance & Shift Punch",
        category: "Navigation",
        icon: Clock,
        href: `/w/${slug}/attendance`,
      },
      {
        id: "nav-leave",
        title: isPrivileged ? "Staff Leaves & Approval Calendar" : "My Leave Balance",
        category: "Navigation",
        icon: Calendar,
        href: isPrivileged ? `/w/${slug}/leave` : `/w/${slug}/leave/my-leave`,
      },
      {
        id: "nav-profile",
        title: "Profile & Official Records",
        category: "Navigation",
        icon: User,
        href: `/w/${slug}/profile`,
      },

      // Projects shortcuts
      {
        id: "proj-act",
        title: "Project: ACT-1952 — The Glass Pavilion",
        category: "Projects",
        icon: FolderKanban,
        href: `/w/${slug}/projects?search=ACT-1952`,
      },
      {
        id: "proj-cnc",
        title: "Project: CNC-4565 — Horizon Luxury Villa",
        category: "Projects",
        icon: FolderKanban,
        href: `/w/${slug}/projects?search=CNC-4565`,
      },

      // Quick Actions
      ...(isPrivileged
        ? [
            {
              id: "act-create-task",
              title: "Create New Deliverable",
              category: "Quick Actions",
              icon: Plus,
              action: () => {
                router.push(`/w/${slug}/tasks?action=new`);
              },
            },
            {
              id: "act-create-meeting",
              title: "Schedule Studio Meeting & MoM",
              category: "Quick Actions",
              icon: Clock,
              action: () => {
                router.push(`/w/${slug}/meetings?action=new`);
              },
            },
          ]
        : []),
      {
        id: "act-punch-visit",
        title: "Fast GPS Site Check-in",
        category: "Quick Actions",
        icon: MapPin,
        action: () => {
          router.push(`/w/${slug}/visits?action=checkin`);
        },
      },
      {
        id: "act-apply-leave",
        title: "Submit Leave Application",
        category: "Quick Actions",
        icon: Calendar,
        action: () => {
          router.push(`/w/${slug}/leave/my-leave?action=apply`);
        },
      },
    ];

    return list;
  }, [slug, isPrivileged, router]);

  // Global keydown listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    const handleCustomOpen = () => setIsOpen(true);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-command-palette", handleCustomOpen);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-command-palette", handleCustomOpen);
    };
  }, [isOpen]);

  // Auto focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Filter commands by query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
    const lower = query.toLowerCase().trim();
    return commands.filter(
      (c) =>
        c.title.toLowerCase().includes(lower) ||
        c.category.toLowerCase().includes(lower) ||
        (c.shortcut && c.shortcut.toLowerCase().includes(lower))
    );
  }, [commands, query]);

  // Handle keyboard navigation inside command list
  const handleKeyDownList = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const current = filteredCommands[selectedIndex];
      if (current) executeCommand(current);
    }
  };

  const executeCommand = (cmd: CommandItem) => {
    setIsOpen(false);
    if (cmd.action) {
      cmd.action();
    } else if (cmd.href) {
      router.push(cmd.href);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in-0 duration-150"
      onClick={() => setIsOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Studio Command Palette"
    >
      <div
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDownList}
      >
        {/* Search Input Bar */}
        <div className="relative px-5 py-4 border-b border-slate-100 flex items-center gap-3 bg-white shrink-0">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search commands, projects, deliverables, team... (↑↓ to navigate)"
            className="w-full bg-transparent type-input-value font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 type-badge font-mono font-semibold text-slate-500 bg-slate-100 border border-slate-200 rounded-lg shrink-0">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-slate-100/60">
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Search className="w-8 h-8 mx-auto opacity-40" />
              <p className="type-body-compact font-medium">No results found for &ldquo;{query}&rdquo;</p>
              <p className="type-helper text-slate-400">Try searching for &quot;Projects&quot;, &quot;Tasks&quot;, or &quot;Leaves&quot;</p>
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = cmd.icon;

              return (
                <div
                  key={cmd.id}
                  onClick={() => executeCommand(cmd)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl cursor-pointer transition-all ${
                    isSelected
                      ? "bg-[#3562E8] text-white shadow-sm shadow-[#3562E8]/20"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="type-minor-heading truncate leading-tight">
                        {cmd.title}
                      </div>
                      <div
                        className={`type-badge font-medium mt-0.5 ${
                          isSelected ? "text-blue-100" : "text-slate-400"
                        }`}
                      >
                        {cmd.category}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {cmd.shortcut && (
                      <span
                        className={`type-badge font-mono font-semibold px-1.5 py-0.5 rounded-md ${
                          isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {cmd.shortcut}
                      </span>
                    )}
                    {isSelected && <CornerDownLeft className="w-3.5 h-3.5 opacity-80" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer / Helper Bar */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between type-helper text-slate-500 shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 font-mono">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px]">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px]">↓</kbd>
              <span>to navigate</span>
            </span>
            <span className="flex items-center gap-1 font-mono">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px]">↵</kbd>
              <span>to select</span>
            </span>
          </div>
          <span className="font-semibold text-slate-400">100% DESIGN Command Center</span>
        </div>
      </div>
    </div>
  );
}
