import { prisma } from "../src/server/db/prisma";
import bcrypt from "bcryptjs";
import { TenantRole, UserAccountState } from "@prisma/client";

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: "100percentdesign" } });
  if (!tenant) {
    console.error("Workspace 100percentdesign not found!");
    return;
  }

  const standardPassword = "Saksham@2003";
  const passwordHash = await bcrypt.hash(standardPassword, 10);

  const roster = [
    {
      employeeId: "EMP-001",
      email: "designsaksham1@gmail.com",
      fullName: "Saksham Lanjewar",
      role: TenantRole.OWNER,
      designation: "Studio Administrator & Owner",
      department: "Administration",
      phone: "+91 9359379523",
    },
    {
      employeeId: "DSB001",
      email: "designgaurav0@gmail.com",
      fullName: "Gaurav Bhusari",
      role: TenantRole.OWNER,
      designation: "Boss & Partner",
      department: "Interior Design",
      phone: "",
    },
    {
      employeeId: "DSB002",
      email: "designpriyanka0@gmail.com",
      fullName: "Priyanka Bhusari",
      role: TenantRole.OWNER,
      designation: "Boss & Partner",
      department: "Architecture",
      phone: "",
    },
    {
      employeeId: "EMP-002",
      email: "designkajal18@gmail.com",
      fullName: "Kajal Dahikar",
      role: TenantRole.EMPLOYEE,
      designation: "Architect",
      department: "Architecture",
      phone: "9730431755",
    },
    {
      employeeId: "EMP-003",
      email: "designsoham10@gmail.com",
      fullName: "Soham Talwekar",
      role: TenantRole.EMPLOYEE,
      designation: "Civil Engineer",
      department: "Civil",
      phone: "7249787592",
    },
    {
      employeeId: "EMP-004",
      email: "apoorvapimparkar@gmail.com",
      altEmail: "designapoorva03@gmail.com",
      fullName: "Apoorva Pimparkar",
      role: TenantRole.EMPLOYEE,
      designation: "Architect",
      department: "Architecture",
      phone: "9158841595",
    },
    {
      employeeId: "EMP-005",
      email: "designsapna1999@gmail.com",
      fullName: "Sapna Belsare",
      role: TenantRole.EMPLOYEE,
      designation: "Interior Designer",
      department: "Interior Design",
      phone: "7709903503",
    },
    {
      employeeId: "EMP-006",
      email: "vshinde951104@gmail.com",
      altEmail: "designvaishnavi@gmail.com",
      fullName: "Vaishnavi Shinde",
      role: TenantRole.EMPLOYEE,
      designation: "Architect",
      department: "Architecture",
      phone: "8999039313",
    },
    {
      employeeId: "EMP-007",
      email: "designvedant03@gmail.com",
      fullName: "Vedant Kadu",
      role: TenantRole.EMPLOYEE,
      designation: "Architect",
      department: "Architecture",
      phone: "9970649168",
    },
    {
      employeeId: "EMP-008",
      email: "pruthatembhekar@gmail.com",
      altEmail: "designprutha@gmail.com",
      fullName: "Prutha Tembhekar",
      role: TenantRole.EMPLOYEE,
      designation: "Architect",
      department: "Architecture",
      phone: "9284140280",
    },
    {
      employeeId: "EMP-009",
      email: "designanshul18@gmail.com",
      fullName: "Anshul Thool",
      role: TenantRole.EMPLOYEE,
      designation: "Architect",
      department: "Architecture",
      phone: "9960268678",
    },
    {
      employeeId: "EMP-010",
      email: "santosh70hb@gmail.com",
      altEmail: "designsantosh@gmail.com",
      fullName: "Santosh Bhalerao",
      role: TenantRole.EMPLOYEE,
      designation: "Civil Engineer",
      department: "Civil",
      phone: "9860565152",
    },
    {
      employeeId: "EMP-011",
      email: "designbhavika7@gmail.com",
      altEmail: "designbhavika04@gmail.com",
      fullName: "Bhavika Manekar",
      role: TenantRole.EMPLOYEE,
      designation: "Civil Engineer",
      department: "Civil",
      phone: "9657925336",
    },
    {
      employeeId: "EMP-012",
      email: "designaishwarya03@gmail.com",
      fullName: "Aishwarya Tagde",
      role: TenantRole.EMPLOYEE,
      designation: "Civil Engineer",
      department: "Civil",
      phone: "7741862635",
    },
    {
      employeeId: "EMP-013",
      email: "dumreyash45@gmail.com",
      fullName: "Yash Dumre",
      role: TenantRole.EMPLOYEE,
      designation: "Architectural Drafter",
      department: "Architecture",
      phone: "",
    },
    {
      employeeId: "EMP-014",
      email: "usha17218@gmail.com",
      fullName: "Usha",
      role: TenantRole.EMPLOYEE,
      designation: "Office Staff",
      department: "Administration",
      phone: "",
    },
  ];

  console.log(`Synchronizing ${roster.length} studio accounts with active credentials...`);

  for (const item of roster) {
    // 1. Upsert Primary User
    let user = await prisma.user.findUnique({
      where: { email: item.email },
    });

    if (!user && item.altEmail) {
      user = await prisma.user.findUnique({
        where: { email: item.altEmail },
      });
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: item.email,
          fullName: item.fullName,
          passwordHash,
          accountState: UserAccountState.ACTIVE,
        },
      });
      console.log(`Created user ${item.email}`);
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          accountState: UserAccountState.ACTIVE,
          fullName: item.fullName,
        },
      });
      console.log(`Updated user ${user.email} with active password`);
    }

    // Also sync alt email user if specified
    if (item.altEmail) {
      let altUser = await prisma.user.findUnique({ where: { email: item.altEmail } });
      if (!altUser) {
        altUser = await prisma.user.create({
          data: {
            email: item.altEmail,
            fullName: item.fullName,
            passwordHash,
            accountState: UserAccountState.ACTIVE,
          },
        });
      } else {
        await prisma.user.update({
          where: { id: altUser.id },
          data: { passwordHash, accountState: UserAccountState.ACTIVE },
        });
      }
    }

    // 2. Upsert Membership in 100percentdesign
    let membership = await prisma.tenantMembership.findUnique({
      where: {
        tenantId_userId: {
          tenantId: tenant.id,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      membership = await prisma.tenantMembership.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          role: item.role,
          isActive: true,
          hasFinanceAccess: item.role === TenantRole.OWNER,
        },
      });
      console.log(`Created membership for ${user.email}`);
    } else {
      membership = await prisma.tenantMembership.update({
        where: { id: membership.id },
        data: {
          role: item.role,
          isActive: true,
          hasFinanceAccess: item.role === TenantRole.OWNER || membership.hasFinanceAccess,
        },
      });
      console.log(`Updated membership for ${user.email}`);
    }

    // 3. Upsert Employee Record
    // Note: ensure no duplicate tenantId_employeeId collision
    const existingWithEmpId = await prisma.employee.findUnique({
      where: {
        tenantId_employeeId: {
          tenantId: tenant.id,
          employeeId: item.employeeId,
        },
      },
    });

    if (existingWithEmpId && existingWithEmpId.membershipId !== membership.id) {
      // Free up the desired employeeId if taken by old placeholder
      await prisma.employee.update({
        where: { id: existingWithEmpId.id },
        data: { employeeId: `OLD-${existingWithEmpId.employeeId}-${Date.now().toString().slice(-4)}` },
      });
    }

    let employee = await prisma.employee.findUnique({
      where: { membershipId: membership.id },
    });

    if (!employee) {
      employee = await prisma.employee.create({
        data: {
          tenantId: tenant.id,
          membershipId: membership.id,
          employeeId: item.employeeId,
          department: item.department,
          designation: item.designation,
          phone: item.phone || null,
          employmentStatus: "ACTIVE",
          joinDate: new Date("2024-01-01"),
        },
      });
      console.log(`Created employee record ${item.employeeId} for ${user.email}`);
    } else {
      await prisma.employee.update({
        where: { id: employee.id },
        data: {
          employeeId: item.employeeId,
          department: item.department,
          designation: item.designation,
          phone: item.phone || employee.phone,
          employmentStatus: "ACTIVE",
        },
      });
      console.log(`Updated employee ${employee.employeeId} -> ${item.employeeId} for ${user.email}`);
    }
  }

  console.log("✅ All accounts synchronized successfully with password 'Saksham@2003'!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
