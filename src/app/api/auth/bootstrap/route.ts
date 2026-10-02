import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { ensureDefaultBootstrap } from "@/server/db/bootstrap";

export async function GET() {
  try {
    // 1. Run bootstrap to ensure default tenants & accounts exist
    await ensureDefaultBootstrap();

    // 2. Query summary
    const tenants = await prisma.tenant.findMany({
      select: { slug: true, name: true, lifecycleState: true },
    });

    const users = await prisma.user.findMany({
      select: { email: true, fullName: true },
    });

    const employees = await prisma.employee.findMany({
      select: { employeeId: true, designation: true },
    });

    return NextResponse.json({
      success: true,
      message: "Database connected and bootstrapped successfully!",
      tenants,
      totalUsers: users.length,
      employees: employees.map((e) => e.employeeId),
      recommendedLogin: {
        workspace: "100percentdesign",
        url: "/w/100percentdesign/login",
        defaultAdminEmployeeId: "EMP-001",
        defaultAdminEmail: "designsaksham1@gmail.com (or admin@100percentdesign.in)",
        acceptedPasswords: ["Password@123", "Saksham@2003", "StudioPassword2026!"],
      },
    });
  } catch (err: any) {
    console.error("Bootstrap API error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to connect to database",
        code: err.code || "DB_ERROR",
        hint: "Verify DATABASE_URL in your Render dashboard environment variables.",
      },
      { status: 500 }
    );
  }
}
