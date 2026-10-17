import { NextRequest } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import {
  subscribeStudioEvents,
  StudioRealtimeEvent,
} from "@/server/realtime/eventBus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug =
      searchParams.get("workspaceSlug") || req.headers.get("x-workspace-slug");

    if (!workspaceSlug) {
      return new Response("Missing workspaceSlug", { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return new Response("Unauthorized", { status: 401 });
    }

    const encoder = new TextEncoder();
    let isClosed = false;

    const stream = new ReadableStream({
      start(controller) {
        // Send initial handshake
        const initialData = JSON.stringify({
          status: "connected",
          tenantId: ctx.tenantId,
          workspaceSlug,
          connectedAt: new Date().toISOString(),
        });
        controller.enqueue(encoder.encode(`event: handshake\ndata: ${initialData}\n\n`));

        // Event listener for this tenant workspace
        const unsubscribe = subscribeStudioEvents(
          ctx.tenantId,
          (event: StudioRealtimeEvent) => {
            if (isClosed) return;
            try {
              const data = JSON.stringify(event);
              controller.enqueue(encoder.encode(`event: studio_update\ndata: ${data}\n\n`));
            } catch (err) {
              // Failed enqueue, stream may be ending
            }
          }
        );

        // Keep-alive heartbeat interval (every 25 seconds)
        const pingInterval = setInterval(() => {
          if (isClosed) {
            clearInterval(pingInterval);
            return;
          }
          try {
            controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`));
          } catch {
            clearInterval(pingInterval);
          }
        }, 25000);

        // Handle disconnect/abort
        const cleanup = () => {
          if (isClosed) return;
          isClosed = true;
          clearInterval(pingInterval);
          unsubscribe();
          try {
            controller.close();
          } catch {
            // Already closed
          }
        };

        req.signal.addEventListener("abort", cleanup);
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform, no-store, must-revalidate",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error: any) {
    return new Response(`Server error: ${error?.message || error}`, { status: 500 });
  }
}
