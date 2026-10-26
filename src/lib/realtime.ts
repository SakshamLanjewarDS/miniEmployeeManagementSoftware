"use client";

import { useEffect, useRef } from "react";

export type RealtimeEventType =
  | "LEAVE_UPDATED"
  | "TASK_UPDATED"
  | "NOTIFICATION_UPDATED"
  | "VENDOR_UPDATED"
  | "ATTENDANCE_UPDATED"
  | "PROJECT_UPDATED"
  | "MEETING_SCHEDULED"
  | "MEETING_UPDATED";

export interface RealtimeEvent {
  type: RealtimeEventType;
  timestamp: number;
  payload?: any;
}

// shortcut: In-browser BroadcastChannel and throttled polling (ceiling: single-client multi-tab up to 500 active users), upgrade: migrate to Redis PubSub or Server-Sent Events hub if concurrent studio sessions exceed 500 users
const CHANNEL_NAME = "studio_os_realtime_bus";

/**
 * Dispatches an event to all open browser windows and tabs in the studio.
 */
export function broadcastRealtimeEvent(type: RealtimeEventType, payload?: any) {
  if (typeof window === "undefined") return;

  const event: RealtimeEvent = {
    type,
    timestamp: Date.now(),
    payload,
  };

  try {
    if ("BroadcastChannel" in window) {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channel.postMessage(event);
      channel.close();
    }
  } catch {
    // fallback to storage
  }

  // Cross-tab storage event
  try {
    window.localStorage.setItem(CHANNEL_NAME, JSON.stringify(event));
  } catch {
    // ignore
  }
}

/**
 * Universal React hook for dynamic real-time updates:
 * 1. Background polling (active only when document is visible)
 * 2. Window focus & tab visibility change revalidation
 * 3. Cross-tab BroadcastChannel & Storage event triggers
 */
export function useRealtimeSubscription(
  eventTypes: RealtimeEventType[],
  onRefresh: () => void | Promise<void>,
  options: {
    intervalMs?: number;
    enabled?: boolean;
    throttleMs?: number;
  } = {}
) {
  const { intervalMs = 45000, enabled = true, throttleMs = 25000 } = options;
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;
  const lastRefreshTimeRef = useRef(0);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const safeRefresh = () => {
      const now = Date.now();
      if (now - lastRefreshTimeRef.current < throttleMs) return;
      lastRefreshTimeRef.current = now;
      onRefreshRef.current();
    };

    let timer: NodeJS.Timeout | null = null;

    // 1. Periodic background refresh (only when tab is actively viewed)
    if (intervalMs > 0) {
      timer = setInterval(() => {
        if (document.visibilityState === "visible") {
          safeRefresh();
        }
      }, intervalMs);
    }

    // 2. Tab focus / visibility change revalidation with throttle cooldown
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        safeRefresh();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 3. Cross-tab BroadcastChannel listener
    let channel: BroadcastChannel | null = null;
    if ("BroadcastChannel" in window) {
      try {
        channel = new BroadcastChannel(CHANNEL_NAME);
        channel.onmessage = (event: MessageEvent<RealtimeEvent>) => {
          if (event.data && eventTypes.includes(event.data.type)) {
            safeRefresh();
          }
        };
      } catch {
        channel = null;
      }
    }

    // 4. Storage event fallback
    const handleStorage = (e: StorageEvent) => {
      if (e.key === CHANNEL_NAME && e.newValue) {
        try {
          const parsed: RealtimeEvent = JSON.parse(e.newValue);
          if (parsed && eventTypes.includes(parsed.type)) {
            safeRefresh();
          }
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (channel) channel.close();
      window.removeEventListener("storage", handleStorage);
    };
  }, [enabled, intervalMs, throttleMs, JSON.stringify(eventTypes)]);
}
