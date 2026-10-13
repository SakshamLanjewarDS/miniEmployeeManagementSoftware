import { NextRequest, NextResponse } from "next/server";
import { getTenantContextFromSession } from "@/server/tenancy/context";
import {
  listApprovalDelegations,
  createApprovalDelegation,
  revokeApprovalDelegation,
} from "@/server/modules/inbox/delegation";

export async function GET() {
  try {
    const context = await getTenantContextFromSession();
    if (!context) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const delegations = await listApprovalDelegations(context);
    return NextResponse.json({ delegations });
  } catch (error: any) {
    const status = error.name === "ForbiddenException" ? 403 : 500;
    return NextResponse.json(
      { error: error.message || "Failed to load delegations" },
      { status }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getTenantContextFromSession();
    if (!context) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const body = await request.json();
    if (!body.delegateeMembershipId || !body.scope || !body.validFrom || !body.validUntil || !body.reason) {
      return NextResponse.json(
        { error: "Delegatee, scope, validFrom, validUntil, and reason are required" },
        { status: 400 }
      );
    }

    const record = await createApprovalDelegation(context, {
      delegateeMembershipId: body.delegateeMembershipId,
      scope: body.scope,
      validFrom: body.validFrom,
      validUntil: body.validUntil,
      reason: body.reason,
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error: any) {
    const status = error.name === "ForbiddenException" ? 403 : 500;
    return NextResponse.json(
      { error: error.message || "Failed to create delegation" },
      { status }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const context = await getTenantContextFromSession();
    if (!context) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const delegationId = searchParams.get("id");
    if (!delegationId) {
      return NextResponse.json({ error: "Delegation ID is required" }, { status: 400 });
    }

    await revokeApprovalDelegation(context, delegationId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    const status = error.name === "ForbiddenException" ? 403 : 500;
    return NextResponse.json(
      { error: error.message || "Failed to revoke delegation" },
      { status }
    );
  }
}
