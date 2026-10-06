import { prisma } from "../src/server/db/prisma";

async function main() {
  const tenants = await prisma.tenant.findMany({ select: { id: true, slug: true, name: true } });
  for (const tenant of tenants) {
    console.log(`\n=== TENANT: ${tenant.name} (${tenant.slug}) ===`);
    
    const memberships = await prisma.tenantMembership.findMany({
      where: { tenantId: tenant.id },
      include: {
        user: { select: { fullName: true, email: true } },
      },
    });
    console.log("MEMBERS:");
    for (const m of memberships) {
      console.log(`- [${m.id}] ${m.user.fullName} (${m.user.email})`);
    }

    const projects = await prisma.project.findMany({
      where: { tenantId: tenant.id },
      select: {
        id: true,
        code: true,
        name: true,
        projectType: true,
        projectArchitect: { select: { user: { select: { fullName: true } } } },
        projectManager: { select: { user: { select: { fullName: true } } } },
        projectCoordinator: { select: { user: { select: { fullName: true } } } },
        _count: { select: { tasks: true } },
      },
      orderBy: { code: "asc" },
    });
    console.log(`\nTOTAL PROJECTS: ${projects.length}`);
    for (const p of projects) {
      console.log(`CODE: ${p.code} | NAME: "${p.name}" | TYPE: "${p.projectType}" | TASKS: ${p._count.tasks} | ARCH1: ${p.projectArchitect?.user.fullName || "-"} | ARCH2: ${p.projectManager?.user.fullName || "-"} | COORD: ${p.projectCoordinator?.user.fullName || "-"}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
