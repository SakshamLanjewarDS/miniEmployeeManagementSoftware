import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { Prisma } from "@prisma/client";

const Decimal = Prisma.Decimal;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || req.headers.get("x-workspace-slug");

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Leadership privileges required to view compensations" },
        { status: 403 }
      );
    }

    const employeeId = searchParams.get("employeeId") || undefined;

    const whereClause: any = { tenantId: ctx.tenantId, isCurrent: true };
    if (employeeId) whereClause.employeeId = employeeId;

    const compensations = await prisma.studioEmployeeCompensation.findMany({
      where: whereClause,
      include: {
        employee: {
          include: {
            membership: {
              include: { user: true },
            },
          },
        },
      },
      orderBy: { employee: { employeeId: "asc" } },
    });

    return NextResponse.json({ success: true, compensations });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load compensations" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const workspaceSlug = body.workspaceSlug || req.headers.get("x-workspace-slug");

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Leadership privileges required to configure compensation" },
        { status: 403 }
      );
    }

    const {
      employeeId, // employee UUID or employeeId code
      baseMonthlySalary,
      rateCalculationMode = "FIXED_30", // FIXED_30, CALENDAR_DAYS, WORKING_DAYS
      bankName,
      accountHolderName,
      accountNumber,
      ifscCode,
      upiId,
      panNumber,
      notes,
    } = body;

    if (!employeeId || baseMonthlySalary === undefined || Number(baseMonthlySalary) <= 0) {
      return NextResponse.json(
        { error: "Employee and positive baseMonthlySalary are required." },
        { status: 400 }
      );
    }

    // Resolve employee
    const employee = await prisma.employee.findFirst({
      where: {
        tenantId: ctx.tenantId,
        OR: [{ id: employeeId }, { employeeId: employeeId }],
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee record not found" }, { status: 404 });
    }

    // Mark previous active compensation as historical
    await prisma.studioEmployeeCompensation.updateMany({
      where: {
        tenantId: ctx.tenantId,
        employeeId: employee.id,
        isCurrent: true,
      },
      data: {
        isCurrent: false,
        effectiveTo: new Date(),
      },
    });

    // Create current effective compensation
    const newComp = await prisma.studioEmployeeCompensation.create({
      data: {
        tenantId: ctx.tenantId,
        employeeId: employee.id,
        effectiveFrom: new Date(),
        baseMonthlySalary: new Decimal(Number(baseMonthlySalary)),
        rateCalculationMode: ["FIXED_30", "CALENDAR_DAYS", "WORKING_DAYS"].includes(rateCalculationMode)
          ? rateCalculationMode
          : "FIXED_30",
        bankName: bankName?.trim() || null,
        accountHolderName: accountHolderName?.trim() || null,
        accountNumber: accountNumber ? String(accountNumber).trim() : null,
        ifscCode: ifscCode?.trim() || null,
        upiId: upiId?.trim() || null,
        panNumber: panNumber?.trim() || null,
        isCurrent: true,
        notes: notes?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, compensation: newComp }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save compensation" }, { status: 500 });
  }
}

/**
 * PUT: Quick Batch Setup / Seed standard studio compensations for all team members lacking salary
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const workspaceSlug = body.workspaceSlug || req.headers.get("x-workspace-slug");

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Find all employees without active compensation
    const employees = await prisma.employee.findMany({
      where: { tenantId: ctx.tenantId },
      include: {
        compensations: { where: { isCurrent: true } },
        membership: { include: { user: true } },
      },
    });

    let configuredCount = 0;

    for (const emp of employees) {
      if (emp.compensations.length === 0) {
        // Derive realistic studio tier based on designation or department
        const designation = (emp.designation || "").toLowerCase();
        let baseSalary = 35000;
        let mode = "FIXED_30";

        if (designation.includes("principal") || designation.includes("founder") || designation.includes("lead")) {
          baseSalary = 85000;
        } else if (designation.includes("senior") || designation.includes("project architect")) {
          baseSalary = 55000;
        } else if (designation.includes("specialist") || designation.includes("3d") || designation.includes("interior")) {
          baseSalary = 40000;
        } else if (designation.includes("junior") || designation.includes("trainee") || designation.includes("intern")) {
          baseSalary = 25000;
        }

        await prisma.studioEmployeeCompensation.create({
          data: {
            tenantId: ctx.tenantId,
            employeeId: emp.id,
            effectiveFrom: new Date("2026-01-01"),
            baseMonthlySalary: new Decimal(baseSalary),
            rateCalculationMode: mode,
            bankName: "HDFC Bank",
            accountHolderName: emp.membership.user.fullName,
            accountNumber: `00${Math.floor(1000000000 + Math.random() * 9000000000)}`,
            ifscCode: "HDFC0001244",
            isCurrent: true,
            notes: "Auto-configured Studio Standard Salary Tier",
          },
        });
        configuredCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Configured standard compensation for ${configuredCount} studio staff members.`,
      configuredCount,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to batch setup compensation" }, { status: 500 });
  }
}
