import { prisma } from "../src/server/db/prisma";

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: "100percentdesign" } });
  if (!tenant) return console.log("Tenant not found");

  const empCount = await prisma.employee.count({ where: { tenantId: tenant.id } });
  const compCount = await prisma.studioEmployeeCompensation.count({ where: { tenantId: tenant.id } });
  const payrollCount = await prisma.studioPayrollRecord.count({ where: { tenantId: tenant.id } });

  console.log(`Employees: ${empCount}, Compensations: ${compCount}, Payroll Records: ${payrollCount}`);

  const employees = await prisma.employee.findMany({
    where: { tenantId: tenant.id },
    include: {
      membership: { include: { user: true } },
      compensations: true,
      leaveRequests: true,
    },
    take: 10,
  });

  for (const emp of employees) {
    const comp = emp.compensations[0];
    console.log(`- ${emp.employeeId} | ${emp.membership.user.fullName} | Base: ${comp ? comp.baseMonthlySalary : "NO COMPENSATION"} | Leaves: ${emp.leaveRequests.length}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
