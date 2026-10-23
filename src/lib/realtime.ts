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
  } = {}
) {
  const { intervalMs = 20000, enabled = true } = options;
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let timer: NodeJS.Timeout | null = null;

    // 1. Periodic background refresh
    if (intervalMs > 0) {
      timer = setInterval(() => {
        if (document.visibilityState === "visible") {
          onRefreshRef.current();
        }
      }, intervalMs);
    }

    // 2. Tab focus / visibility change revalidation
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        onRefreshRef.current();
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
            onRefreshRef.current();
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
            onRefreshRef.current();
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
  }, [enabled, intervalMs, JSON.stringify(eventTypes)]);
}
