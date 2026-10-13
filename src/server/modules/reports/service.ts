import { prisma } from "../../db/prisma";
import { TenantContext, assertAdminOrOwner } from "../../tenancy/context";
import { sanitizeSpreadsheetFormula } from "../ingest/csv";
import { formatDateOnly } from "../leave/policy";

/**
 * Generates Leave Summary CSV export
 */
export async function generateLeaveSummaryReportCSV(
  context: TenantContext,
  year?: number,
  month?: number
): Promise<string> {
  assertAdminOrOwner(context);

  const whereClause: any = {
    tenantId: context.tenantId,
    deletedAt: null,
  };

  if (year && month) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    whereClause.startDate = { gte: start, lte: end };
  }

  const leaves = await prisma.studioLeaveRequest.findMany({
    where: whereClause,
    include: {
      employee: {
        include: {
          membership: { include: { user: { select: { fullName: true, email: true } } } },
        },
      },
      reviewedBy: {
        include: { user: { select: { fullName: true } } },
      },
    },
    orderBy: { startDate: "asc" },
  });

  const headers = [
    "Leave ID",
    "Employee ID",
    "Employee Name",
    "Department",
    "Start Date",
    "End Date",
    "Days",
    "Leave Type",
    "Status",
    "Is Paid Eligible",
    "Short Notice",
    "Reason",
    "Reviewed By",
  ];

  const rows = [headers.join(",")];

  for (const l of leaves) {
    const empName = l.employeeNameRaw || l.employee.membership.user.fullName;
    const revName = l.reviewedBy?.user?.fullName || "Unreviewed";

    const cols = [
      `"${sanitizeSpreadsheetFormula(l.id)}"`,
      `"${sanitizeSpreadsheetFormula(l.employee.employeeId)}"`,
      `"${sanitizeSpreadsheetFormula(empName)}"`,
      `"${sanitizeSpreadsheetFormula(l.employee.department || "General")}"`,
      formatDateOnly(l.startDate),
      formatDateOnly(l.endDate),
      Number(l.days).toFixed(3),
      `"${sanitizeSpreadsheetFormula(l.leaveType)}"`,
      l.status,
      l.isPaidEligible ? "YES" : "NO",
      l.isShortNotice ? "YES" : "NO",
      `"${sanitizeSpreadsheetFormula(l.reason || "").replace(/"/g, '""')}"`,
      `"${sanitizeSpreadsheetFormula(revName)}"`,
    ];

    rows.push(cols.join(","));
  }

  return rows.join("\r\n");
}
