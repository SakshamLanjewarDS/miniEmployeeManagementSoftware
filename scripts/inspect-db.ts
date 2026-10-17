import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function run() {
  const tenants = await prisma.tenant.findMany({ select: { id: true, slug: true, name: true } });
  console.log("TENANTS:", tenants);

  const projects = await prisma.project.findMany({ select: { id: true, code: true, name: true, createdAt: true } });
  console.log("PROJECTS (" + projects.length + "):", projects);

  const tasks = await prisma.task.findMany({ select: { id: true, title: true, createdAt: true } });
  console.log("TASKS (" + tasks.length + "):", tasks.slice(0, 10));

  const employees = await prisma.employee.findMany({
    include: {
      membership: {
        include: {
          user: { select: { fullName: true, email: true } },
        },
      },
    },
  });
  console.log("EMPLOYEES (" + employees.length + "):", employees.map(e => ({
    id: e.id,
    empId: e.employeeId,
    name: e.membership?.user?.fullName,
    email: e.membership?.user?.email,
    designation: e.designation,
  })));

  await prisma.$disconnect();
}

run();
