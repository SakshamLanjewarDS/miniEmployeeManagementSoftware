"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Video,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Bell,
  Layers,
  FileCheck2,
  MapPin,
  ExternalLink,
  CheckCheck,
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

export default function NotificationsPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceSlug = params?.workspaceSlug as string;

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/notifications?workspaceSlug=${workspaceSlug}`);
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceSlug) {
      fetchNotifications();
    }
  }, [workspaceSlug]);

  // Mark single as read
  const handleMarkAsRead = async (id: string) => {
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceSlug,
          notificationId: id,
        }),
      });
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);

      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceSlug,
          markAll: true,
        }),
      });
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
  };

  // Relative short time (e.g. 1h, 2h, 1d) matching Image A
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

  // Categorize notifications into groups (TODAY, YESTERDAY, EARLIER)
  const groupedNotifications = useMemo(() => {
    const today: NotificationItem[] = [];
    const yesterday: NotificationItem[] = [];
    const earlier: NotificationItem[] = [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

    notifications.forEach((item) => {
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
  }, [notifications]);

  // Icon styling mapping matching Image A
  const getIconConfig = (item: NotificationItem) => {
    const lowerTitle = (item.title || "").toLowerCase();
    const lowerMsg = (item.message || "").toLowerCase();

    // Cancelled / Blocker / Alert (Red/Coral circle)
    if (
      lowerTitle.includes("cancel") ||
      lowerTitle.includes("blocked") ||
      lowerTitle.includes("defect") ||
      lowerTitle.includes("alert")
    ) {
      return {
        bg: "bg-[#FEECEC]",
        color: "text-[#EF4444]",
        icon: <Calendar className="w-5 h-5 stroke-[2]" />,
      };
    }

    // Video / Inspection / Site Visit (Green circle with Video/Camera)
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

    // Success / Completed / Appointment Success (Green circle with Calendar/Check)
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

    // Payment / Finance (Blue circle with Wallet/Card)
    if (
      lowerTitle.includes("payment") ||
      lowerTitle.includes("paypal") ||
      lowerTitle.includes("stripe") ||
      lowerTitle.includes("invoice") ||
      item.type === "FINANCE"
    ) {
      return {
        bg: "bg-[#EBF3FF]",
        color: "text-[#2563EB]",
        icon: <CreditCard className="w-5 h-5 stroke-[2]" />,
      };
    }

    // Default: Schedule changed / Update / Task (Blue circle with Calendar/Clock)
    return {
      bg: "bg-[#EBF3FF]",
      color: "text-[#2563EB]",
      icon: <Calendar className="w-5 h-5 stroke-[2]" />,
    };
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] py-4 sm:py-8 px-3 sm:px-4 flex justify-center">
      {/* Mobile/Tablet Card Frame matching Image A */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col min-h-[640px]">
        {/* ============================================================== */}
        {/* TOP APP BAR: Back Button + "Notification" + "2 NEW" Pill Badge */}
        {/* ============================================================== */}
        <header className="px-5 pt-6 pb-4 flex items-center justify-between border-b border-slate-100/80 bg-white">
          {/* Circular Back Button */}
          <button
            type="button"
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full border border-slate-200/80 bg-white flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Title */}
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Notification
          </h1>

          {/* Blue Pill Badge matching Image A */}
          <div className="flex items-center">
            {unreadCount > 0 ? (
              <span className="bg-[#0066FF] text-white text-xs font-bold px-3 py-1 rounded-full shadow-2xs">
                {unreadCount} NEW
              </span>
            ) : (
              <span className="bg-slate-100 text-slate-500 text-xs font-semibold px-3 py-1 rounded-full">
                0 NEW
              </span>
            )}
          </div>
        </header>

        {/* Content Region */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100/80">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-medium">Loading notifications...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-20 px-6 text-center text-slate-400 space-y-3">
              <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Bell className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Notifications</h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                You're completely up to date. You will receive notifications when tasks are assigned, reviewed, or updated.
              </p>
            </div>
          ) : (
            <>
              {/* ======================================================== */}
              {/* GROUP 1: TODAY                                           */}
              {/* ======================================================== */}
              {groupedNotifications.today.length > 0 && (
                <section className="py-2">
                  {/* Group Header */}
                  <div className="px-5 py-3 flex items-center justify-between">
                    <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                      TODAY
                    </span>
                    <button
                      type="button"
                      onClick={handleMarkAllAsRead}
                      className="text-xs font-semibold text-[#0066FF] hover:underline cursor-pointer"
                    >
                      Mark all as read
                    </button>
                  </div>

                  {/* List of items */}
                  <div>
                    {groupedNotifications.today.map((item) => {
                      const iconConfig = getIconConfig(item);
                      const isUnread = !item.isRead;

                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            if (isUnread) handleMarkAsRead(item.id);
                            if (item.link) router.push(item.link);
                          }}
                          className={`px-5 py-3.5 flex items-start gap-3.5 transition-colors cursor-pointer group ${
                            isUnread ? "bg-[#F4F8FF] hover:bg-[#EBF2FF]" : "hover:bg-slate-50/80 bg-white"
                          }`}
                        >
                          {/* Circular Icon Badge */}
                          <div
                            className={`w-11 h-11 rounded-full ${iconConfig.bg} ${iconConfig.color} flex items-center justify-center shrink-0 mt-0.5`}
                          >
                            {iconConfig.icon}
                          </div>

                          {/* Middle: Title & Message */}
                          <div className="flex-1 min-w-0 pr-1">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                                {item.title}
                              </h3>
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

              {/* ======================================================== */}
              {/* GROUP 2: YESTERDAY                                       */}
              {/* ======================================================== */}
              {groupedNotifications.yesterday.length > 0 && (
                <section className="py-2">
                  {/* Group Header */}
                  <div className="px-5 py-3 flex items-center justify-between">
                    <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                      YESTERDAY
                    </span>
                    <button
                      type="button"
                      onClick={handleMarkAllAsRead}
                      className="text-xs font-semibold text-[#0066FF] hover:underline cursor-pointer"
                    >
                      Mark all as read
                    </button>
                  </div>

                  {/* List of items */}
                  <div>
                    {groupedNotifications.yesterday.map((item) => {
                      const iconConfig = getIconConfig(item);
                      const isUnread = !item.isRead;

                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            if (isUnread) handleMarkAsRead(item.id);
                            if (item.link) router.push(item.link);
                          }}
                          className={`px-5 py-3.5 flex items-start gap-3.5 transition-colors cursor-pointer group ${
                            isUnread ? "bg-[#F4F8FF] hover:bg-[#EBF2FF]" : "hover:bg-slate-50/80 bg-white"
                          }`}
                        >
                          {/* Circular Icon Badge */}
                          <div
                            className={`w-11 h-11 rounded-full ${iconConfig.bg} ${iconConfig.color} flex items-center justify-center shrink-0 mt-0.5`}
                          >
                            {iconConfig.icon}
                          </div>

                          {/* Middle: Title & Message */}
                          <div className="flex-1 min-w-0 pr-1">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                                {item.title}
                              </h3>
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

              {/* ======================================================== */}
              {/* GROUP 3: EARLIER                                         */}
              {/* ======================================================== */}
              {groupedNotifications.earlier.length > 0 && (
                <section className="py-2">
                  <div className="px-5 py-3 flex items-center justify-between">
                    <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                      EARLIER
                    </span>
                    <button
                      type="button"
                      onClick={handleMarkAllAsRead}
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
                            if (isUnread) handleMarkAsRead(item.id);
                            if (item.link) router.push(item.link);
                          }}
                          className={`px-5 py-3.5 flex items-start gap-3.5 transition-colors cursor-pointer group ${
                            isUnread ? "bg-[#F4F8FF] hover:bg-[#EBF2FF]" : "hover:bg-slate-50/80 bg-white"
                          }`}
                        >
                          <div
                            className={`w-11 h-11 rounded-full ${iconConfig.bg} ${iconConfig.color} flex items-center justify-center shrink-0 mt-0.5`}
                          >
                            {iconConfig.icon}
                          </div>

                          <div className="flex-1 min-w-0 pr-1">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                                {item.title}
                              </h3>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
