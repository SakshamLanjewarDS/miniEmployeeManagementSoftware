"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { TenantContext } from "@/server/tenancy/context";
import {
  Bell,
  CheckCircle2,
  CheckCheck,
  CheckSquare,
  FileCheck2,
  MapPin,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  Clock,
  Layers,
  X,
} from "lucide-react";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  type?: "TASK" | "DRAWING" | "VISIT" | "SYSTEM" | "FINANCE";
  createdAt: string;
}

interface NotificationDropdownProps {
  context: TenantContext;
}

export function NotificationDropdown({ context }: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<"ALL" | "UNREAD" | "TASK" | "DRAWING" | "VISIT">("ALL");
  const [loading, setLoading] = useState(false);
  const [activeToast, setActiveToast] = useState<NotificationItem | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const knownNotificationIdsRef = useRef<Set<string>>(new Set());
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Pleasant Web Audio synthetic notification chime (D5 -> A5 -> D6)
  const playNotificationChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880, now + 0.12);
      osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.28); // D6

      gainNode.gain.setValueAtTime(0.18, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.12);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.45);
    } catch {
      // Audio playback might be prevented by browser auto-play policy before user gesture
    }
  };

  // Fetch notifications with real-time detection
  const fetchNotifications = async (isInitial = false) => {
    try {
      const res = await fetch(`/api/notifications?workspaceSlug=${context.tenantSlug}`);
      if (!res.ok) return;

      const data = await res.json();
      const incomingList: NotificationItem[] = data.notifications || [];
      const newCount = data.unreadCount || 0;

      if (isInitial) {
        // Seed known IDs so we don't trigger sound/toast for old existing items
        knownNotificationIdsRef.current = new Set(incomingList.map((n) => n.id));
      } else {
        // Detect newly arrived unread notifications
        const freshUnread = incomingList.filter(
          (n) => !n.isRead && !knownNotificationIdsRef.current.has(n.id)
        );

        if (freshUnread.length > 0) {
          const newest = freshUnread[0];
          freshUnread.forEach((n) => knownNotificationIdsRef.current.add(n.id));

          // Trigger live toast and chime
          setActiveToast(newest);
          playNotificationChime();

          // Native desktop notification if permitted
          if (
            typeof window !== "undefined" &&
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            new Notification(newest.title, {
              body: newest.message,
              icon: "/brand/100percentdesign-logo.svg",
            });
          }

          // Auto dismiss toast after 6 seconds
          if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
          toastTimeoutRef.current = setTimeout(() => {
            setActiveToast(null);
          }, 6000);
        }
      }

      setNotifications(incomingList);
      setUnreadCount(newCount);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  };

  // Background polling every 45 seconds + immediate check on tab focus
  useEffect(() => {
    fetchNotifications(true);

    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchNotifications(false);
      }
    }, 45000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchNotifications(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [context.tenantSlug]);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const markAsRead = async (notificationId: string) => {
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceSlug: context.tenantSlug,
          notificationId,
        }),
      });
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);

      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceSlug: context.tenantSlug,
          markAll: true,
        }),
      });
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "UNREAD") return !n.isRead;
    if (filter === "TASK") return n.type === "TASK";
    if (filter === "DRAWING") return n.type === "DRAWING";
    if (filter === "VISIT") return n.type === "VISIT";
    return true;
  });

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return "Yesterday";
      return `${diffDays}d ago`;
    } catch {
      return "Recent";
    }
  };

  const getTypeIcon = (type?: string) => {
    switch (type) {
      case "TASK":
        return <CheckSquare className="w-4 h-4 text-emerald-600" />;
      case "DRAWING":
        return <FileCheck2 className="w-4 h-4 text-blue-600" />;
      case "VISIT":
        return <MapPin className="w-4 h-4 text-amber-600" />;
      default:
        return <ShieldCheck className="w-4 h-4 text-[#5A81FA]" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef} suppressHydrationWarning>
      {/* Bell Trigger Button */}
      <button
        type="button"
        suppressHydrationWarning
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className={`relative p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
          isOpen
            ? "bg-[#5A81FA] text-white shadow-sm"
            : "text-[#696E82] hover:text-[#1F1F1F] hover:bg-[#F2F4FF]"
        }`}
        title="Activity & Notifications"
      >
        <Bell className="w-4 h-4" />
        {mounted && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#C85A32] text-white text-[10px] font-bold flex items-center justify-center shadow-xs animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white border border-[#E2E6F0] rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Header with User Metadata */}
          <div className="p-4 border-b border-[#E2E6F0] bg-[#F8F9FD]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#5A81FA] text-white flex items-center justify-center">
                  <Bell className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#1F1F1F]">Activity & Notifications</h3>
                  <span className="text-[10px] text-[#696E82]">
                    {unreadCount} unread update{unreadCount === 1 ? "" : "s"}
                  </span>
                </div>
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-[11px] font-semibold text-[#5A81FA] hover:text-[#426EE8] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
            </div>

            {/* Recipient User Banner */}
            <div className="mt-2.5 p-2 bg-white border border-[#E2E6F0] rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-full bg-[#CEDEFF] text-[#2C308D] font-bold text-[10px] flex items-center justify-center shrink-0">
                  {context.userFullName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-[#1F1F1F] truncate block text-[11px]">
                    {context.userFullName}
                  </span>
                  <span className="text-[10px] text-[#696E82]">
                    {context.employeeId || "OWNER"} • {context.designation || context.role}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#CEDEFF] text-[#2C308D] shrink-0 border border-[#A8B1CE]">
                {context.role}
              </span>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 mt-3 overflow-x-auto pb-0.5">
              {[
                { key: "ALL", label: "All" },
                { key: "UNREAD", label: `Unread (${unreadCount})` },
                { key: "TASK", label: "Tasks" },
                { key: "DRAWING", label: "Drawings" },
                { key: "VISIT", label: "Visits" },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setFilter(t.key as any)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors cursor-pointer shrink-0 ${
                    filter === t.key
                      ? "bg-[#5A81FA] text-white font-semibold"
                      : "bg-white text-[#696E82] hover:bg-[#F2F4FF] border border-[#E2E6F0]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notifications Scroll List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[#E2E6F0]/60">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="text-xs font-semibold text-[#1F1F1F]">You're all caught up!</p>
                <p className="text-[11px] text-[#696E82]">
                  No notifications match your current filter.
                </p>
              </div>
            ) : (
              filteredNotifications.map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 transition-colors flex items-start gap-3 group relative ${
                    item.isRead ? "bg-white hover:bg-[#F8F9FD]" : "bg-[#F2F4FF] hover:bg-[#CEDEFF]/30"
                  }`}
                >
                  <div className="mt-0.5 shrink-0 p-1.5 rounded-lg bg-white border border-[#E2E6F0] shadow-2xs">
                    {getTypeIcon(item.type)}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4
                        className={`text-xs tracking-tight ${
                          item.isRead ? "font-semibold text-[#1F1F1F]" : "font-bold text-[#1F1F1F]"
                        }`}
                      >
                        {item.title}
                      </h4>
                      {!item.isRead && (
                        <span className="w-2 h-2 rounded-full bg-[#5A81FA] shrink-0 mt-1" />
                      )}
                    </div>

                    <p className="text-[11px] text-[#696E82] leading-relaxed line-clamp-2">
                      {item.message}
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-[#696E82] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatRelativeTime(item.createdAt)}</span>
                      </span>

                      <div className="flex items-center gap-2">
                        {!item.isRead && (
                          <button
                            type="button"
                            onClick={() => markAsRead(item.id)}
                            className="text-[10px] text-[#5A81FA] hover:underline font-semibold cursor-pointer"
                          >
                            Mark read
                          </button>
                        )}
                        {item.link && (
                          <Link
                            href={item.link}
                            onClick={() => {
                              markAsRead(item.id);
                              setIsOpen(false);
                            }}
                            className="text-[10px] font-semibold text-[#5A81FA] hover:text-[#426EE8] flex items-center gap-0.5 hover:underline cursor-pointer"
                          >
                            <span>Open</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-[#F8F9FD] border-t border-[#E2E6F0] flex items-center justify-between text-[10px] text-[#696E82]">
            <span className="flex items-center gap-1 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Synced • {context.timezone.split("/")[1] || "Kolkata"}</span>
            </span>
            <Link
              href={`/w/${context.tenantSlug}/tasks`}
              onClick={() => setIsOpen(false)}
              className="font-semibold text-[#5A81FA] hover:underline"
            >
              Task Dashboard →
            </Link>
          </div>
        </div>
      )}

      {/* Real-Time Live Floating Toast Alert */}
      {activeToast && (
        <div className="fixed top-16 right-6 z-[9999] max-w-sm w-full bg-white/95 backdrop-blur-md border border-[#CEDEFF] shadow-2xl rounded-2xl p-4 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#5A81FA] text-white flex items-center justify-center shrink-0 shadow-sm animate-bounce">
              <Bell className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#5A81FA] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                  Live Notification
                </span>
                <button
                  type="button"
                  onClick={() => setActiveToast(null)}
                  className="text-[#696E82] hover:text-[#1F1F1F] p-0.5 rounded-md hover:bg-black/5 cursor-pointer"
                  title="Close"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <h4 className="text-xs font-bold text-[#1F1F1F] mt-1 truncate">
                {activeToast.title}
              </h4>
              <p className="text-[11px] text-[#696E82] mt-0.5 line-clamp-2 leading-relaxed">
                {activeToast.message}
              </p>
              {activeToast.link && (
                <div className="mt-2.5 flex items-center gap-2">
                  <Link
                    href={activeToast.link}
                    onClick={() => {
                      markAsRead(activeToast.id);
                      setActiveToast(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#5A81FA] hover:bg-[#426EE8] text-white text-[10px] font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    <span>View Task Details</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      markAsRead(activeToast.id);
                      setActiveToast(null);
                    }}
                    className="text-[10px] text-[#696E82] hover:text-[#1F1F1F] hover:underline cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
