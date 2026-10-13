import { NextRequest, NextResponse } from "next/server";
import { getTenantContextFromSession } from "@/server/auth/session";
import { respondToRFI, closeRFI } from "@/server/modules/rfis/service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ rfiId: string }> }
) {
  try {
    const context = await getTenantContextFromSession();
    if (!context) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const { rfiId } = await params;
    const body = await request.json();

    if (body.action === "RESPOND") {
      if (!body.resolutionNotes) {
        return NextResponse.json(
          { error: "Resolution notes are required to respond to RFI" },
          { status: 400 }
        );
      }
      const updated = await respondToRFI(context, {
        rfiId,
        resolutionNotes: body.resolutionNotes,
      });
      return NextResponse.json(updated);
    } else if (body.action === "CLOSE") {
      const updated = await closeRFI(context, rfiId);
      return NextResponse.json(updated);
    } else {
      return NextResponse.json(
        { error: "Invalid action. Supported actions: RESPOND, CLOSE" },
        { status: 400 }
      );
    }
  } catch (error: any) {
    const status = error.name === "ForbiddenException" ? 403 : 500;
    return NextResponse.json(
      { error: error.message || "Failed to update RFI" },
      { status }
    );
  }
}
