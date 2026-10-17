import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";

const VALID_REAL_EMAILS = new Set([
  "designsaksham1@gmail.com",
  "designaishwarya03@gmail.com",
  "designsoham10@gmail.com",
  "designsapna1999@gmail.com",
  "designanshul18@gmail.com",
  "dumreyash45@gmail.com",
  "designkajal18@gmail.com",
  "usha17218@gmail.com",
  "vshinde951104@gmail.com",
  "santosh70hb@gmail.com",
  "pruthatembhekar@gmail.com",
  "apoorvapimparkar@gmail.com",
  "designbhavika7@gmail.com",
]);

import { getCurrentTenantContext } from "@/server/auth/session";

export async function GET(req: NextRequest) {
  const ctx = await getCurrentTenantContext("100percentdesign");
  if (!ctx || (ctx.role !== "OWNER" && ctx.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden: Admin or Owner access required" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const shouldExecute = searchParams.get("execute") === "true";

  if (!shouldExecute) {
    const allUsers = await prisma.user.findMany({
      select: { id: true, email: true, fullName: true },
    });
    const dummyUsers = allUsers.filter((u) => !VALID_REAL_EMAILS.has(u.email.toLowerCase()));
    const validUsers = allUsers.filter((u) => VALID_REAL_EMAILS.has(u.email.toLowerCase()));

    const allTasks = await prisma.task.findMany({
      select: { id: true, title: true, status: true, priority: true },
    });
    const dummyTasks = allTasks.filter(
      (t) =>
        t.title.includes("Test ") ||
        t.title.includes("RBAC") ||
        t.title.includes("Isolation") ||
        t.title.includes("Other Employee") ||
        t.title === "Fast-Track Client Deliverable"
    );

    return NextResponse.json({
      message: "Preview mode. Pass ?execute=true to perform cleanup.",
      totalUsers: allUsers.length,
      validUsersCount: validUsers.length,
      dummyUsersCount: dummyUsers.length,
      dummyUsers: dummyUsers.map((u) => `${u.fullName} (${u.email})`),
      totalTasks: allTasks.length,
      dummyTasksCount: dummyTasks.length,
      dummyTasks: dummyTasks.map((t) => t.title),
    });
  }

  try {
    return await performCleanup();
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack });
  }
}

export async function POST() {
  try {
    return await performCleanup();
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack });
  }
}

async function performCleanup() {
  const results: any = {
    deletedUsers: 0,
    deletedMemberships: 0,
    deletedEmployees: 0,
    deletedTasks: 0,
    deletedTestTenants: 0,
    retainedUsers: [],
    retainedTasks: [],
  };

  // 1. Identify dummy users
  const allUsers = await prisma.user.findMany({
    include: {
      memberships: {
        include: {
          employee: true,
        },
      },
    },
  });

  const dummyUsers = allUsers.filter((u) => !VALID_REAL_EMAILS.has(u.email.toLowerCase()));
  const dummyUserIds = dummyUsers.map((u) => u.id);
  const dummyMembershipIds = dummyUsers.flatMap((u) => u.memberships.map((m) => m.id));
  const dummyEmployeeIds = dummyUsers
    .flatMap((u) => u.memberships.map((m) => m.employee?.id))
    .filter(Boolean) as string[];

  // 2. Cascade delete records tied to dummy memberships & employees
  if (dummyMembershipIds.length > 0) {
    await prisma.session.deleteMany({
      where: { userId: { in: dummyUserIds } },
    });

    await prisma.taskChecklistItem.deleteMany({
      where: {
        OR: [
          { assignedMemberId: { in: dummyMembershipIds } },
          { completedById: { in: dummyMembershipIds } },
        ],
      },
    });

    await prisma.taskAssignment.deleteMany({
      where: { membershipId: { in: dummyMembershipIds } },
    });

    await prisma.taskComment.deleteMany({
      where: { authorId: { in: dummyMembershipIds } },
    });

    await prisma.taskActivityHistory.deleteMany({
      where: { actorId: { in: dummyMembershipIds } },
    });

    await prisma.taskClarificationReply.deleteMany({
      where: { authorId: { in: dummyMembershipIds } },
    });

    await prisma.taskClarification.deleteMany({
      where: { authorId: { in: dummyMembershipIds } },
    });

    await prisma.task.updateMany({
      where: { assigneeId: { in: dummyMembershipIds } },
      data: { assigneeId: null },
    });

    const ownerUser = await prisma.user.findFirst({
      where: { email: "designsaksham1@gmail.com" },
      include: { memberships: true },
    });
    const ownerMembershipId = ownerUser?.memberships[0]?.id;

    if (ownerMembershipId) {
      await prisma.task.updateMany({
        where: { creatorId: { in: dummyMembershipIds } },
        data: { creatorId: ownerMembershipId },
      });
    } else {
      await prisma.task.deleteMany({
        where: { creatorId: { in: dummyMembershipIds } },
      });
    }

    await prisma.task.updateMany({
      where: { reviewerId: { in: dummyMembershipIds } },
      data: { reviewerId: null },
    });

    await prisma.projectMember.deleteMany({
      where: { membershipId: { in: dummyMembershipIds } },
    });

    await prisma.project.updateMany({
      where: { projectArchitectId: { in: dummyMembershipIds } },
      data: { projectArchitectId: null },
    });
    await prisma.project.updateMany({
      where: { projectManagerId: { in: dummyMembershipIds } },
      data: { projectManagerId: null },
    });
    await prisma.project.updateMany({
      where: { projectCoordinatorId: { in: dummyMembershipIds } },
      data: { projectCoordinatorId: null },
    });

    await prisma.profileChangeRequest.deleteMany({
      where: { requesterId: { in: dummyMembershipIds } },
    });

    await prisma.notification.deleteMany({
      where: { recipientId: { in: dummyMembershipIds } },
    });

    await prisma.siteVisitEvent.deleteMany({
      where: {
        visit: {
          OR: [
            { employeeId: { in: dummyMembershipIds } },
            { reviewerId: { in: dummyMembershipIds } },
          ],
        },
      },
    });

    await prisma.siteVisit.deleteMany({
      where: {
        OR: [
          { employeeId: { in: dummyMembershipIds } },
          { reviewerId: { in: dummyMembershipIds } },
        ],
      },
    });

    // Clean HR modules for dummy employees
    if (dummyEmployeeIds.length > 0) {
      await prisma.studioLeaveCancellationRequest.deleteMany({
        where: {
          employeeId: { in: dummyEmployeeIds },
        },
      });

      await prisma.studioLeaveRequest.deleteMany({
        where: { employeeId: { in: dummyEmployeeIds } },
      });

      await prisma.studioAttendanceRecord.deleteMany({
        where: { employeeId: { in: dummyEmployeeIds } },
      });

      await prisma.studioEmployeeCompensation.deleteMany({
        where: { employeeId: { in: dummyEmployeeIds } },
      });

      await prisma.studioAdvanceLoan.deleteMany({
        where: { employeeId: { in: dummyEmployeeIds } },
      });

      await prisma.studioPayrollAdjustment.deleteMany({
        where: { employeeId: { in: dummyEmployeeIds } },
      });

      await prisma.studioPayrollRecord.deleteMany({
        where: { employeeId: { in: dummyEmployeeIds } },
      });

      const delEmps = await prisma.employee.deleteMany({
        where: { id: { in: dummyEmployeeIds } },
      });
      results.deletedEmployees = delEmps.count;
    }

    const delMems = await prisma.tenantMembership.deleteMany({
      where: { id: { in: dummyMembershipIds } },
    });
    results.deletedMemberships = delMems.count;
  }

  if (dummyUserIds.length > 0) {
    const delUsers = await prisma.user.deleteMany({
      where: { id: { in: dummyUserIds } },
    });
    results.deletedUsers = delUsers.count;
  }

  // 3. Clean dummy / duplicate tasks
  const allTasks = await prisma.task.findMany({
    select: { id: true, title: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const dummyTaskIds: string[] = [];
  const seenCanonicalTitles = new Set<string>();

  for (const t of allTasks) {
    const isExplicitDummy =
      t.title.includes("Test ") ||
      t.title.includes("RBAC") ||
      t.title.includes("Isolation") ||
      t.title.includes("Other Employee") ||
      t.title.toLowerCase().includes("dummy") ||
      t.title === "Fast-Track Client Deliverable";

    if (isExplicitDummy) {
      dummyTaskIds.push(t.id);
      continue;
    }

    // De-duplicate repeated tasks (keep only 1 canonical instance)
    if (seenCanonicalTitles.has(t.title)) {
      dummyTaskIds.push(t.id);
    } else {
      seenCanonicalTitles.add(t.title);
    }
  }

  if (dummyTaskIds.length > 0) {
    await prisma.taskChecklistItem.deleteMany({
      where: { taskId: { in: dummyTaskIds } },
    });
    await prisma.taskAssignment.deleteMany({
      where: { taskId: { in: dummyTaskIds } },
    });
    await prisma.taskComment.deleteMany({
      where: { taskId: { in: dummyTaskIds } },
    });
    await prisma.taskActivityHistory.deleteMany({
      where: { taskId: { in: dummyTaskIds } },
    });
    await prisma.taskClarification.deleteMany({
      where: { taskId: { in: dummyTaskIds } },
    });

    const delTasks = await prisma.task.deleteMany({
      where: { id: { in: dummyTaskIds } },
    });
    results.deletedTasks = delTasks.count;
  }

  // 4. Clean test tenants (e.g. apex-studio if empty or test)
  const testTenants = await prisma.tenant.findMany({
    where: { slug: { not: "100percentdesign" } },
  });
  for (const tt of testTenants) {
    await prisma.tenantMembership.deleteMany({ where: { tenantId: tt.id } });
    await prisma.project.deleteMany({ where: { tenantId: tt.id } });
    await prisma.tenant.delete({ where: { id: tt.id } });
    results.deletedTestTenants++;
  }

  // 5. Query remaining valid real state
  const remainingUsers = await prisma.user.findMany({
    select: {
      email: true,
      fullName: true,
      memberships: {
        select: {
          role: true,
          employee: { select: { employeeId: true, designation: true } },
        },
      },
    },
  });

  const remainingTasks = await prisma.task.findMany({
    select: { id: true, title: true, status: true, priority: true },
  });

  results.retainedUsers = remainingUsers.map((u) => ({
    name: u.fullName,
    email: u.email,
    role: u.memberships[0]?.role,
    employeeId: u.memberships[0]?.employee?.employeeId,
  }));
  results.retainedTasks = remainingTasks;

  return NextResponse.json({
    success: true,
    message: "Purged all dummy and test data successfully.",
    results,
  });
}
