"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

export interface StudioRealtimeEvent {
  id: string;
  type: "TASK_UPDATED" | "DECISION_UPDATED" | "VISIT_LOGGED" | "DRAWING_UPDATED" | "MEETING_SCHEDULED" | "METRICS_REFRESH";
  tenantId: string;
  timestamp: string;
  actorId?: string;
  actorName?: string;
  payload?: Record<string, any>;
}

interface UseStudioRealtimeOptions {
  workspaceSlug: string;
  enabled?: boolean;
  onEvent?: (event: StudioRealtimeEvent) => void;
  autoRefresh?: boolean;
}

export function useStudioRealtime({
  workspaceSlug,
  enabled = true,
  onEvent,
  autoRefresh = true,
}: UseStudioRealtimeOptions) {
  const router = useRouter();
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<StudioRealtimeEvent | null>(null);
  const [lastHeartbeat, setLastHeartbeat] = useState<number>(Date.now());
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const refreshDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const triggerRefresh = useCallback(() => {
    if (!autoRefresh) return;
    if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current);
    refreshDebounceRef.current = setTimeout(() => {
      router.refresh();
    }, 300); // 300ms debounce
  }, [autoRefresh, router]);

  useEffect(() => {
    if (!enabled || !workspaceSlug) return;

    let isMounted = true;

    function connect() {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const url = `/api/realtime/stream?workspaceSlug=${encodeURIComponent(workspaceSlug)}`;
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.addEventListener("handshake", () => {
        if (!isMounted) return;
        setIsConnected(true);
        setLastHeartbeat(Date.now());
      });

      es.addEventListener("studio_update", (e: MessageEvent) => {
        if (!isMounted) return;
        try {
          const event: StudioRealtimeEvent = JSON.parse(e.data);
          setLastEvent(event);
          setLastHeartbeat(Date.now());
          if (onEvent) onEvent(event);
          triggerRefresh();
        } catch {
          // ignore parse error
        }
      });

      es.onopen = () => {
        if (isMounted) setIsConnected(true);
      };

      es.onerror = () => {
        if (!isMounted) return;
        setIsConnected(false);
        es.close();
        // Exponential backoff reconnect
        if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = setTimeout(() => {
          if (isMounted) connect();
        }, 5000);
      };
    }

    connect();

    return () => {
      isMounted = false;
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [workspaceSlug, enabled, onEvent, triggerRefresh]);

  return {
    isConnected,
    lastEvent,
    lastHeartbeat,
    forceRefresh: triggerRefresh,
  };
}
