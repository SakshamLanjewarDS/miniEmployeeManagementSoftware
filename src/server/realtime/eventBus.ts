import { EventEmitter } from "events";

export type StudioEventType =
  | "TASK_UPDATED"
  | "DECISION_UPDATED"
  | "VISIT_LOGGED"
  | "DRAWING_UPDATED"
  | "MEETING_SCHEDULED"
  | "METRICS_REFRESH";

export interface StudioRealtimeEvent {
  id: string;
  type: StudioEventType;
  tenantId: string;
  timestamp: string;
  actorId?: string;
  actorName?: string;
  payload?: Record<string, any>;
}

// Preserve singleton across Next.js Hot Reloads
const globalForEvents = globalThis as unknown as {
  __studioEventBus?: EventEmitter;
};

export const studioEventBus: EventEmitter =
  globalForEvents.__studioEventBus || new EventEmitter();

if (process.env.NODE_ENV !== "production") {
  globalForEvents.__studioEventBus = studioEventBus;
}

// Increase max listeners for multi-client connections in studio
studioEventBus.setMaxListeners(200);

/**
 * Broadcast an event to all connected clients in a specific tenant workspace.
 */
export function broadcastStudioEvent(
  tenantId: string,
  event: Omit<StudioRealtimeEvent, "id" | "tenantId" | "timestamp">
) {
  const fullEvent: StudioRealtimeEvent = {
    ...event,
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    tenantId,
    timestamp: new Date().toISOString(),
  };

  const channel = `tenant:${tenantId}`;
  studioEventBus.emit(channel, fullEvent);
  return fullEvent;
}

/**
 * Subscribe to realtime studio events for a specific tenant workspace.
 * Returns an unsubscription function.
 */
export function subscribeStudioEvents(
  tenantId: string,
  listener: (event: StudioRealtimeEvent) => void
): () => void {
  const channel = `tenant:${tenantId}`;
  studioEventBus.on(channel, listener);

  return () => {
    studioEventBus.off(channel, listener);
  };
}
