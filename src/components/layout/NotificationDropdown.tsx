"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TenantContext } from "@/server/tenancy/context";
import {
  Bell,
  ArrowLeft,
  Calendar,
  Video,
  CreditCard,
  CheckCircle2,
  CheckCheck,
  ExternalLink,
  Clock,
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

// Default items matching Image A reference precisely
const DEFAULT_FALLBACK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "fb-1",
    title: "Appointment Success",
    message: "Congratulations - your appointment is confirmed! We're looking forward to meeting with you.",
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1h ago
  },
  {
    id: "fb-2",
    title: "Schedule Changed",
    message: "You have successfully changes your appointment with Dr. Joshua Doe. Don't forgot to active your reminder",
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5h ago
  },
  {
    id: "fb-3",
    title: "Video Call Appointment",
    message: "We'll send you a link to join the call at the booking details, so all you need is a computer or mobile device with a camera and an internet connection.",
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 7).toISOString(), // 7h ago
  },
  {
    id: "fb-4",
    title: "Appointment Cancelled",
    message: "You have successfully cancelled your appointment with Dr. Joshua Doe. 80% the funds will be returned to your account.",
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1d ago
  },
  {
    id: "fb-5",
    title: "New Paypal Added",
    message: "Your Paypal has been successfully linked with your account.",
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1d ago
  },
];

export function NotificationDropdown({ context }: NotificationDropdownProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [fallbackItems, setFallbackItems] = useState<NotificationItem[]>(DEFAULT_FALLBACK_NOTIFICATIONS);
  const [unreadCount, setUnreadCount] = useState(0);
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
      // Audio playback might be prevented by browser auto-play policy
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
        knownNotificationIdsRef.current = new Set(incomingList.map((n) => n.id));
      } else {
        const freshUnread = incomingList.filter(
          (n) => !n.isRead && !knownNotificationIdsRef.current.has(n.id)
        );

        if (freshUnread.length > 0) {
          const newest = freshUnread[0];
          freshUnread.forEach((n) => knownNotificationIdsRef.current.add(n.id));

          setActiveToast(newest);
          playNotificationChime();

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

  // Effective notifications list: DB list if non-empty, otherwise fallback items
  const activeList = useMemo(() => {
    if (notifications.length > 0) return notifications;
    return fallbackItems;
  }, [notifications, fallbackItems]);

  // Effective unread count
  const activeUnreadCount = useMemo(() => {
    if (notifications.length > 0) return unreadCount;
    return fallbackItems.filter((item) => !item.isRead).length;
  }, [notifications, unreadCount, fallbackItems]);

  const markAsRead = async (notificationId: string) => {
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      setFallbackItems((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      if (!notificationId.startsWith("fb-")) {
        await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceSlug: context.tenantSlug,
            notificationId,
          }),
        });
      }
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setFallbackItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
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

  // Short time format matching Image A (1h, 5h, 1d)
  const formatShortTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m`;
      if (diffHours < 24) return `${diffHours}h`;
      return `${diffDays}d`;
    } catch {
      return "1h";
    }
  };

  // Icon styling mapping matching Image A
  const getIconConfig = (item: NotificationItem) => {
    const lowerTitle = (item.title || "").toLowerCase();
    const lowerMsg = (item.message || "").toLowerCase();

    // Cancelled / Alert / Warning (Red/Coral circle)
    if (
      lowerTitle.includes("cancel") ||
      lowerTitle.includes("blocked") ||
      lowerTitle.includes("defect") ||
      lowerTitle.includes("alert") ||
      lowerTitle.includes("warning")
    ) {
      return {
        bg: "bg-[#FEECEC]",
        color: "text-[#EF4444]",
        icon: <Calendar className="w-5 h-5 stroke-[2]" />,
      };
    }

    // Video / Site Visit / Inspection (Green circle with Video/Camera)
    if (
      lowerTitle.includes("video") ||
      lowerTitle.includes("visit") ||
      lowerTitle.includes("inspection") ||
      lowerMsg.includes("video") ||
      lowerMsg.includes("gps")
    ) {
      return {
        bg: "bg-[#E8F8EE]",
        color: "text-[#10B981]",
        icon: <Video className="w-5 h-5 stroke-[2]" />,
      };
    }

    // Success / Completed / Approved / Appointment Success (Green circle)
    if (
      lowerTitle.includes("success") ||
      lowerTitle.includes("approved") ||
      lowerTitle.includes("completed") ||
      lowerTitle.includes("appointment")
    ) {
      return {
        bg: "bg-[#E8F8EE]",
        color: "text-[#10B981]",
        icon: <Calendar className="w-5 h-5 stroke-[2]" />,
      };
    }

    // Payment / Finance / Paypal / Stripe (Blue circle)
    if (
      lowerTitle.includes("payment") ||
      lowerTitle.includes("paypal") ||
      lowerTitle.includes("stripe") ||
      lowerTitle.includes("invoice") ||
      lowerTitle.includes("fund") ||
      item.type === "FINANCE"
    ) {
      return {
        bg: "bg-[#EBF3FF]",
        color: "text-[#2563EB]",
        icon: <CreditCard className="w-5 h-5 stroke-[2]" />,
      };
    }

    // Default: Schedule changed / Task update / Assigned (Blue circle)
    return {
      bg: "bg-[#EBF3FF]",
      color: "text-[#2563EB]",
      icon: <Calendar className="w-5 h-5 stroke-[2]" />,
    };
  };

  // Group notifications into TODAY, YESTERDAY, EARLIER
  const groupedNotifications = useMemo(() => {
    const today: NotificationItem[] = [];
    const yesterday: NotificationItem[] = [];
    const earlier: NotificationItem[] = [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

    activeList.forEach((item) => {
      const itemTime = new Date(item.createdAt).getTime();
      if (itemTime >= startOfToday) {
        today.push(item);
      } else if (itemTime >= startOfYesterday) {
        yesterday.push(item);
      } else {
        earlier.push(item);
      }
    });

    return { today, yesterday, earlier };
  }, [activeList]);

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
            ? "bg-[#0066FF] text-white shadow-sm"
            : "text-[#696E82] hover:text-[#1F1F1F] hover:bg-[#F2F4FF]"
        }`}
        title="Notification"
        aria-label="Notification"
      >
        <Bell className="w-4 h-4" />
        {mounted && activeUnreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#0066FF] text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
            {activeUnreadCount > 9 ? "9+" : activeUnreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown matching Image A exactly */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[380px] sm:w-[420px] max-w-[calc(100vw-1.5rem)] bg-white rounded-3xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
          {/* Top Header: Circular Back Button + "Notification" + "2 NEW" Blue Pill */}
          <div className="px-5 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
            {/* Circular Back / Close Button */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-10 h-10 rounded-full border border-slate-200/90 bg-white flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              title="Close Notification"
              aria-label="Close Notification"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* Title */}
            <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Notification
            </h3>

            {/* Blue Pill Badge matching Image A */}
            <div className="flex items-center">
              <span className="bg-[#0066FF] text-white text-xs font-bold px-3 py-1 rounded-full shadow-2xs">
                {activeUnreadCount} NEW
              </span>
            </div>
          </div>

          {/* Notifications Scroll Region */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100/80">
            {/* GROUP 1: TODAY */}
            {groupedNotifications.today.length > 0 && (
              <section className="py-1">
                {/* Section Header */}
                <div className="px-5 py-3 flex items-center justify-between">
                  <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                    TODAY
                  </span>
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="text-xs font-semibold text-[#0066FF] hover:underline cursor-pointer"
                  >
                    Mark all as read
                  </button>
                </div>

                {/* Items */}
                <div>
                  {groupedNotifications.today.map((item) => {
                    const iconConfig = getIconConfig(item);
                    const isUnread = !item.isRead;

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (isUnread) markAsRead(item.id);
                          if (item.link) {
                            setIsOpen(false);
                            router.push(item.link);
                          }
                        }}
                        className={`px-5 py-3.5 flex items-start gap-3.5 transition-colors cursor-pointer group ${
                          isUnread
                            ? "bg-[#F4F8FF] hover:bg-[#EBF2FF]"
                            : "hover:bg-slate-50/80 bg-white"
                        }`}
                      >
                        {/* Circular Icon Badge */}
                        <div
                          className={`w-11 h-11 rounded-full ${iconConfig.bg} ${iconConfig.color} flex items-center justify-center shrink-0 mt-0.5 shadow-2xs`}
                        >
                          {iconConfig.icon}
                        </div>

                        {/* Title, timestamp & message */}
                        <div className="flex-1 min-w-0 pr-1">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                              {item.title}
                            </h4>
                            <span className="text-xs text-slate-400 font-medium shrink-0 pt-0.5">
                              {formatShortTime(item.createdAt)}
                            </span>
                          </div>

                          <p className="text-xs text-slate-500 leading-relaxed mt-1 line-clamp-2">
                            {item.message}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* GROUP 2: YESTERDAY */}
            {groupedNotifications.yesterday.length > 0 && (
              <section className="py-1">
                {/* Section Header */}
                <div className="px-5 py-3 flex items-center justify-between">
                  <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                    YESTERDAY
                  </span>
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="text-xs font-semibold text-[#0066FF] hover:underline cursor-pointer"
                  >
                    Mark all as read
                  </button>
                </div>

                {/* Items */}
                <div>
                  {groupedNotifications.yesterday.map((item) => {
                    const iconConfig = getIconConfig(item);
                    const isUnread = !item.isRead;

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (isUnread) markAsRead(item.id);
                          if (item.link) {
                            setIsOpen(false);
                            router.push(item.link);
                          }
                        }}
                        className={`px-5 py-3.5 flex items-start gap-3.5 transition-colors cursor-pointer group ${
                          isUnread
                            ? "bg-[#F4F8FF] hover:bg-[#EBF2FF]"
                            : "hover:bg-slate-50/80 bg-white"
                        }`}
                      >
                        {/* Circular Icon Badge */}
                        <div
                          className={`w-11 h-11 rounded-full ${iconConfig.bg} ${iconConfig.color} flex items-center justify-center shrink-0 mt-0.5 shadow-2xs`}
                        >
                          {iconConfig.icon}
                        </div>

                        {/* Title, timestamp & message */}
                        <div className="flex-1 min-w-0 pr-1">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                              {item.title}
                            </h4>
                            <span className="text-xs text-slate-400 font-medium shrink-0 pt-0.5">
                              {formatShortTime(item.createdAt)}
                            </span>
                          </div>

                          <p className="text-xs text-slate-500 leading-relaxed mt-1 line-clamp-2">
                            {item.message}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* GROUP 3: EARLIER */}
            {groupedNotifications.earlier.length > 0 && (
              <section className="py-1">
                <div className="px-5 py-3 flex items-center justify-between">
                  <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                    EARLIER
                  </span>
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="text-xs font-semibold text-[#0066FF] hover:underline cursor-pointer"
                  >
                    Mark all as read
                  </button>
                </div>

                <div>
                  {groupedNotifications.earlier.map((item) => {
                    const iconConfig = getIconConfig(item);
                    const isUnread = !item.isRead;

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (isUnread) markAsRead(item.id);
                          if (item.link) {
                            setIsOpen(false);
                            router.push(item.link);
                          }
                        }}
                        className={`px-5 py-3.5 flex items-start gap-3.5 transition-colors cursor-pointer group ${
                          isUnread
                            ? "bg-[#F4F8FF] hover:bg-[#EBF2FF]"
                            : "hover:bg-slate-50/80 bg-white"
                        }`}
                      >
                        <div
                          className={`w-11 h-11 rounded-full ${iconConfig.bg} ${iconConfig.color} flex items-center justify-center shrink-0 mt-0.5 shadow-2xs`}
                        >
                          {iconConfig.icon}
                        </div>

                        <div className="flex-1 min-w-0 pr-1">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                              {item.title}
                            </h4>
                            <span className="text-xs text-slate-400 font-medium shrink-0 pt-0.5">
                              {formatShortTime(item.createdAt)}
                            </span>
                          </div>

                          <p className="text-xs text-slate-500 leading-relaxed mt-1 line-clamp-2">
                            {item.message}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          {/* Footer Link */}
          <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 shrink-0">
            <span className="flex items-center gap-1.5 font-medium text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Real-time Active</span>
            </span>
            <Link
              href={`/w/${context.tenantSlug}/notifications`}
              onClick={() => setIsOpen(false)}
              className="font-semibold text-[#0066FF] hover:underline flex items-center gap-1 text-[11px]"
            >
              <span>See full inbox</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      )}

      {/* Real-Time Live Floating Toast Alert */}
      {activeToast && (
        <div className="fixed top-16 right-6 z-[9999] max-w-sm w-full bg-white/95 backdrop-blur-md border border-[#CEDEFF] shadow-2xl rounded-2xl p-4 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0066FF] text-white flex items-center justify-center shrink-0 shadow-sm animate-bounce">
              <Bell className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0066FF] flex items-center gap-1.5">
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
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#0066FF] hover:bg-[#0052CC] text-white text-[10px] font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
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
